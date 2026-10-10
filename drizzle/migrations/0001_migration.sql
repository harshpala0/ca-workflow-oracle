
drop policy "firm members read portal files" on storage.objects;
drop policy "firm members upload portal files" on storage.objects;
create policy "portal files read" on storage.objects for select to authenticated
  using (bucket_id = 'portal-files' and (storage.foldername(name))[1] = public.my_firm_id()::text
    and (public.is_staff() or (storage.foldername(name))[2] = public.my_client_id()::text));
create policy "portal files upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'portal-files' and (storage.foldername(name))[1] = public.my_firm_id()::text
    and (public.is_staff() or (storage.foldername(name))[2] = public.my_client_id()::text));
