alter type public.app_role add value if not exists 'super_admin';

alter table public.firms add column if not exists notify_email text;
alter table public.firms add column if not exists notify_phone text;
alter table public.firms add column if not exists notify_from_name text;
alter table public.firms add column if not exists is_active boolean not null default true;

alter table public.clients add column if not exists compliance_packs text[] not null default '{GST,TDS,Income Tax}';
alter table public.tasks add column if not exists compliance_item_id uuid references public.compliance_items(id) on delete set null;

create table public.audit_papers (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  client_info jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (engagement_id)
);
grant select, insert, update, delete on public.audit_papers to authenticated;
grant all on public.audit_papers to service_role;
alter table public.audit_papers enable row level security;
create policy "staff all" on public.audit_papers for all to authenticated
  using (firm_id = public.my_firm_id() and public.is_staff())
  with check (firm_id = public.my_firm_id() and public.is_staff());

create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  channel text not null,
  subject text,
  body text not null,
  sent_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert on public.message_log to authenticated;
grant all on public.message_log to service_role;
alter table public.message_log enable row level security;
create policy "managers read" on public.message_log for select to authenticated
  using (firm_id = public.my_firm_id() and public.is_firm_manager());
create policy "staff insert" on public.message_log for insert to authenticated
  with check (firm_id = public.my_firm_id() and public.is_staff() and sent_by = auth.uid());