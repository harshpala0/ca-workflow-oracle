CREATE OR REPLACE FUNCTION public.ensure_my_profile() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u auth.users; f uuid; c uuid; r public.app_role;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1));
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()) THEN RETURN; END IF;
 SELECT * INTO u FROM auth.users WHERE id=auth.uid();
 IF u.id IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u.id) THEN RAISE EXCEPTION 'Existing account needs administrator repair'; END IF;
 IF coalesce(u.raw_app_meta_data->>'invited','false')='true' THEN
  f:=nullif(u.raw_app_meta_data->>'firm_id','')::uuid;
  r:=(u.raw_app_meta_data->>'role')::public.app_role;
  c:=nullif(u.raw_app_meta_data->>'client_id','')::uuid;
  IF r IS NULL OR r NOT IN ('admin','team_leader','member','client') OR NOT EXISTS(SELECT 1 FROM public.firms WHERE id=f AND is_active) THEN RAISE EXCEPTION 'Contact your firm administrator to restore access'; END IF;
  IF (r='client' AND c IS NULL) OR (c IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.clients WHERE id=c AND firm_id=f)) THEN RAISE EXCEPTION 'Invalid client invitation'; END IF;
 ELSE
  INSERT INTO public.firms(name) VALUES(coalesce(nullif(trim(u.raw_user_meta_data->>'firm_name'),''),'My CA Firm')) RETURNING id INTO f;
  r:='admin';
 END IF;
 INSERT INTO public.profiles(id,firm_id,full_name,email,client_id) VALUES(u.id,f,coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),u.email,c);
 INSERT INTO public.user_roles(user_id,role) VALUES(u.id,r);
END; $$;
REVOKE ALL ON FUNCTION public.ensure_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;
COMMENT ON FUNCTION public.ensure_my_profile() IS 'Idempotently repairs only the authenticated caller missing signup profile. Invitations use trusted app metadata; independent accounts receive a new isolated firm.';