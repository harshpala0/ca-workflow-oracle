create or replace function public.my_firm_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.firm_id from public.profiles p join public.firms f on f.id = p.firm_id
  where p.id = auth.uid() and f.is_active
$$;