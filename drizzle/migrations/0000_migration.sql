
create type public.app_role as enum ('admin','team_leader','member','client');

create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reg_no text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  firm_id uuid references public.firms(id) on delete cascade,
  full_name text not null default '',
  email text,
  client_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  name text not null,
  pan text, gstin text, address text,
  contact_person text, contact_phone text, contact_email text,
  entity_type text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_client_fk foreign key (client_id) references public.clients(id) on delete set null;

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  engagement_type text not null default 'Statutory Audit',
  financial_year text not null default '2026-27',
  period_from date, period_to date, due_date date,
  team_leader_id uuid,
  status text not null default 'Active',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete cascade,
  title text not null,
  description text, area text,
  assignee_id uuid,
  status text not null default 'Pending' check (status in ('Pending','In Progress','Completed','Under Review','Approved','Rejected')),
  priority text not null default 'Medium',
  due_date date,
  estimated_hours numeric,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.time_logs (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid not null,
  log_date date not null default current_date,
  hours numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.queries (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  query_text text not null,
  response text,
  status text not null default 'Open' check (status in ('Open','Responded','Closed')),
  raised_by uuid,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete set null,
  invoice_no text not null,
  invoice_date date not null default current_date,
  description text,
  amount numeric not null default 0,
  gst_percent numeric not null default 18,
  gst_amount numeric generated always as (round(amount * gst_percent / 100, 2)) stored,
  total_amount numeric generated always as (round(amount + amount * gst_percent / 100, 2)) stored,
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid','Partial','Paid')),
  amount_received numeric not null default 0,
  payment_date date,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.doc_register (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  doc_type text not null check (doc_type in ('Inward','Outward')),
  doc_name text not null,
  doc_category text,
  doc_date date not null default current_date,
  party text,
  reference_no text,
  status text not null default 'Received' check (status in ('Received','Acknowledged','Dispatched','Returned','Pending')),
  remarks text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.compliance_items (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  category text not null default 'GST',
  due_date date not null,
  financial_year text,
  status text not null default 'Pending' check (status in ('Pending','Filed','Missed')),
  filed_on date,
  remarks text,
  created_at timestamptz not null default now()
);

create table public.doc_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'Open' check (status in ('Open','Uploaded','Closed')),
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.portal_files (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  request_id uuid not null references public.doc_requests(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text,
  created_at timestamptz not null default now()
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.my_firm_id()
returns uuid language sql stable security definer set search_path = public as $$
  select firm_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','team_leader','member'))
$$;

create or replace function public.is_firm_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','team_leader'))
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_firm uuid;
begin
  if coalesce(new.raw_app_meta_data->>'invited','false') = 'true' then
    insert into public.profiles (id, firm_id, full_name, email, client_id)
    values (new.id, (new.raw_app_meta_data->>'firm_id')::uuid,
            coalesce(new.raw_user_meta_data->>'full_name',''), new.email,
            nullif(new.raw_app_meta_data->>'client_id','')::uuid);
    insert into public.user_roles (user_id, role) values (new.id, (new.raw_app_meta_data->>'role')::public.app_role);
  else
    insert into public.firms (name) values (coalesce(nullif(new.raw_user_meta_data->>'firm_name',''), 'My CA Firm')) returning id into new_firm;
    insert into public.profiles (id, firm_id, full_name, email)
    values (new.id, new_firm, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.email);
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

grant select, update on public.firms to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.clients, public.engagements, public.tasks, public.time_logs, public.queries,
  public.invoices, public.doc_register, public.compliance_items, public.doc_requests, public.portal_files, public.activity_log to authenticated;
grant all on public.firms, public.profiles, public.user_roles, public.clients, public.engagements, public.tasks, public.time_logs,
  public.queries, public.invoices, public.doc_register, public.compliance_items, public.doc_requests, public.portal_files, public.activity_log to service_role;

alter table public.firms enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.clients enable row level security;
alter table public.engagements enable row level security;
alter table public.tasks enable row level security;
alter table public.time_logs enable row level security;
alter table public.queries enable row level security;
alter table public.invoices enable row level security;
alter table public.doc_register enable row level security;
alter table public.compliance_items enable row level security;
alter table public.doc_requests enable row level security;
alter table public.portal_files enable row level security;
alter table public.activity_log enable row level security;

create policy "members read own firm" on public.firms for select to authenticated using (id = public.my_firm_id());
create policy "admin updates firm" on public.firms for update to authenticated using (id = public.my_firm_id() and public.has_role(auth.uid(),'admin'));

create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid() or (firm_id = public.my_firm_id() and public.is_staff()));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or (public.is_staff() and exists (select 1 from public.profiles p where p.id = user_roles.user_id and p.firm_id = public.my_firm_id())));

create policy "staff all" on public.clients for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff());
create policy "client reads self" on public.clients for select to authenticated using (id = public.my_client_id());

create policy "staff all" on public.engagements for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff());
create policy "client reads own" on public.engagements for select to authenticated using (client_id = public.my_client_id());

create policy "staff all" on public.tasks for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff());
create policy "staff all" on public.time_logs for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff() and user_id = auth.uid());

create policy "staff all" on public.queries for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff());
create policy "client reads own" on public.queries for select to authenticated using (exists (select 1 from public.engagements e where e.id = queries.engagement_id and e.client_id = public.my_client_id()));
create policy "client responds" on public.queries for update to authenticated using (exists (select 1 from public.engagements e where e.id = queries.engagement_id and e.client_id = public.my_client_id())) with check (status = 'Responded');

create policy "managers all" on public.invoices for all to authenticated using (firm_id = public.my_firm_id() and public.is_firm_manager()) with check (firm_id = public.my_firm_id() and public.is_firm_manager());
create policy "client reads own" on public.invoices for select to authenticated using (client_id = public.my_client_id());

create policy "staff all" on public.doc_register for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff());

create policy "staff all" on public.compliance_items for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff());
create policy "client reads own" on public.compliance_items for select to authenticated using (client_id = public.my_client_id());

create policy "staff all" on public.doc_requests for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff());
create policy "client reads own" on public.doc_requests for select to authenticated using (client_id = public.my_client_id());
create policy "client marks uploaded" on public.doc_requests for update to authenticated using (client_id = public.my_client_id()) with check (client_id = public.my_client_id() and status = 'Uploaded');

create policy "staff all" on public.portal_files for all to authenticated using (firm_id = public.my_firm_id() and public.is_staff()) with check (firm_id = public.my_firm_id() and public.is_staff());
create policy "client reads own" on public.portal_files for select to authenticated using (exists (select 1 from public.doc_requests r where r.id = portal_files.request_id and r.client_id = public.my_client_id()));
create policy "client uploads" on public.portal_files for insert to authenticated with check (firm_id = public.my_firm_id() and uploaded_by = auth.uid() and exists (select 1 from public.doc_requests r where r.id = portal_files.request_id and r.client_id = public.my_client_id()));

create policy "staff read" on public.activity_log for select to authenticated using (firm_id = public.my_firm_id() and public.is_firm_manager());
create policy "insert own" on public.activity_log for insert to authenticated with check (firm_id = public.my_firm_id() and user_id = auth.uid());

create policy "firm members read portal files" on storage.objects for select to authenticated
  using (bucket_id = 'portal-files' and (storage.foldername(name))[1] = public.my_firm_id()::text);
create policy "firm members upload portal files" on storage.objects for insert to authenticated
  with check (bucket_id = 'portal-files' and (storage.foldername(name))[1] = public.my_firm_id()::text);
