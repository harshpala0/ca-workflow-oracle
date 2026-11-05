CREATE TABLE public.audit_programs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
 name text NOT NULL, engagement_type text NOT NULL DEFAULT 'Statutory Audit', items jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_programs TO authenticated;
GRANT ALL ON public.audit_programs TO service_role;
ALTER TABLE public.audit_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff programs" ON public.audit_programs FOR ALL TO authenticated USING (firm_id = public.my_firm_id() AND public.is_staff()) WITH CHECK (firm_id = public.my_firm_id() AND public.is_staff());
ALTER TABLE public.tasks ADD COLUMN working_paper_ref text;
ALTER TABLE public.tasks ADD COLUMN program_item_key text;
CREATE UNIQUE INDEX tasks_program_item_unique ON public.tasks(engagement_id, program_item_key) WHERE program_item_key IS NOT NULL;
CREATE OR REPLACE FUNCTION public.import_clients_engagements(_fy text, _rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE f uuid := public.my_firm_id(); r jsonb; e jsonb; d jsonb; cid uuid; cc int:=0; cs int:=0; ec int:=0; es int:=0; dc int:=0;
BEGIN
 IF f IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Staff access required'; END IF;
 IF _fy !~ '^\d{4}-\d{2}$' OR jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid import'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(f::text, 0));
 FOR r IN SELECT value FROM jsonb_array_elements(_rows) LOOP
  IF coalesce(trim(r->>'name'),'') = '' THEN RAISE EXCEPTION 'Client name is required'; END IF;
  cid := NULL;
  SELECT id INTO cid FROM public.clients WHERE firm_id=f AND ((nullif(trim(r->>'pan'),'') IS NOT NULL AND upper(trim(pan))=upper(trim(r->>'pan'))) OR lower(trim(name))=lower(trim(r->>'name'))) ORDER BY CASE WHEN nullif(trim(r->>'pan'),'') IS NOT NULL AND upper(trim(pan))=upper(trim(r->>'pan')) THEN 0 ELSE 1 END, created_at LIMIT 1;
  IF cid IS NULL THEN
   INSERT INTO public.clients(firm_id,name,pan,gstin,entity_type,contact_person,contact_phone,contact_email,address,created_by)
   VALUES(f,trim(r->>'name'),nullif(r->>'pan',''),nullif(r->>'gstin',''),nullif(r->>'entity_type',''),nullif(r->>'contact_person',''),nullif(r->>'contact_phone',''),nullif(r->>'contact_email',''),nullif(r->>'address',''),auth.uid()) RETURNING id INTO cid;
   cc:=cc+1;
  ELSE cs:=cs+1; END IF;
  IF jsonb_array_length(r->'packs') > 0 THEN UPDATE public.clients SET compliance_packs=ARRAY(SELECT jsonb_array_elements_text(r->'packs')) WHERE id=cid AND firm_id=f; END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(r->'engagements') LOOP
   IF EXISTS(SELECT 1 FROM public.engagements WHERE firm_id=f AND client_id=cid AND engagement_type=e->>'type' AND financial_year=_fy) THEN es:=es+1;
   ELSE INSERT INTO public.engagements(firm_id,client_id,title,engagement_type,financial_year,created_by) VALUES(f,cid,(r->>'name') || ' – ' || (e->>'label') || ' FY ' || _fy,e->>'type',_fy,auth.uid()); ec:=ec+1; END IF;
  END LOOP;
  FOR d IN SELECT value FROM jsonb_array_elements(coalesce(r->'deadlines','[]'::jsonb)) LOOP
   IF NOT EXISTS(SELECT 1 FROM public.compliance_items WHERE firm_id=f AND client_id=cid AND title=d->>'title' AND financial_year=_fy) THEN
    INSERT INTO public.compliance_items(firm_id,client_id,title,category,due_date,financial_year) VALUES(f,cid,d->>'title',d->>'category',(d->>'due_date')::date,_fy); dc:=dc+1;
   END IF;
  END LOOP;
 END LOOP;
 RETURN jsonb_build_object('clients_created',cc,'clients_reused',cs,'engagements_created',ec,'engagements_skipped',es,'calendar_added',dc);
END; $$;
REVOKE ALL ON FUNCTION public.import_clients_engagements(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_clients_engagements(text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.apply_audit_program(_program_id uuid, _engagement_ids uuid[], _item_indexes int[]) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE f uuid:=public.my_firm_id(); p public.audit_programs; eid uuid; ix int; item jsonb; added int:=0; skipped int:=0; count_added int;
BEGIN
 IF f IS NULL OR NOT public.is_staff() THEN RAISE EXCEPTION 'Staff access required'; END IF;
 SELECT * INTO p FROM public.audit_programs WHERE id=_program_id AND firm_id=f;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Program not found'; END IF;
 IF cardinality(_engagement_ids) NOT BETWEEN 1 AND 100 OR cardinality(_item_indexes) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Select engagements and procedures'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(f::text,0));
 FOREACH eid IN ARRAY _engagement_ids LOOP
  IF NOT EXISTS(SELECT 1 FROM public.engagements WHERE id=eid AND firm_id=f) THEN RAISE EXCEPTION 'Engagement not found'; END IF;
  FOREACH ix IN ARRAY _item_indexes LOOP
   IF ix<0 OR ix>=jsonb_array_length(p.items) THEN RAISE EXCEPTION 'Invalid procedure'; END IF;
   item:=p.items->ix;
   IF coalesce(trim(item->>'title'),'')='' THEN RAISE EXCEPTION 'Procedure title required'; END IF;
   INSERT INTO public.tasks(firm_id,engagement_id,title,area,priority,working_paper_ref,program_item_key,created_by)
   VALUES(f,eid,item->>'title',nullif(item->>'area',''),coalesce(item->>'priority','Medium'),nullif(item->>'reference',''),p.id::text || ':' || ix::text,auth.uid()) ON CONFLICT(engagement_id,program_item_key) WHERE program_item_key IS NOT NULL DO NOTHING;
   GET DIAGNOSTICS count_added=ROW_COUNT;
   added:=added+count_added; skipped:=skipped+1-count_added;
  END LOOP;
 END LOOP;
 RETURN jsonb_build_object('tasks_created',added,'tasks_skipped',skipped);
END; $$;
REVOKE ALL ON FUNCTION public.apply_audit_program(uuid,uuid[],int[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_audit_program(uuid,uuid[],int[]) TO authenticated;