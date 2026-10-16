CREATE TABLE public.day_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  auditor_name text,
  work jsonb NOT NULL DEFAULT '[]'::jsonb,
  sampling jsonb NOT NULL DEFAULT '[]'::jsonb,
  observations jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_plan text,
  is_confirmed boolean NOT NULL DEFAULT false,
  confirmed_by text,
  confirmed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_logs TO authenticated;
GRANT ALL ON public.day_logs TO service_role;
ALTER TABLE public.day_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all" ON public.day_logs FOR ALL TO authenticated
  USING (firm_id = my_firm_id() AND is_staff() AND NOT is_confirmed)
  WITH CHECK (firm_id = my_firm_id() AND is_staff());
CREATE POLICY "staff read" ON public.day_logs FOR SELECT TO authenticated
  USING (firm_id = my_firm_id() AND is_staff());
CREATE POLICY "client reads own" ON public.day_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM engagements e WHERE e.id = day_logs.engagement_id AND e.client_id = my_client_id()));
CREATE POLICY "client confirms" ON public.day_logs FOR UPDATE TO authenticated
  USING (NOT is_confirmed AND EXISTS (SELECT 1 FROM engagements e WHERE e.id = day_logs.engagement_id AND e.client_id = my_client_id()))
  WITH CHECK (is_confirmed AND EXISTS (SELECT 1 FROM engagements e WHERE e.id = day_logs.engagement_id AND e.client_id = my_client_id()));