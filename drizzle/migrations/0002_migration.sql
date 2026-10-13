
alter table public.tasks add constraint tasks_assignee_fk foreign key (assignee_id) references public.profiles(id) on delete set null;
alter table public.time_logs add constraint time_logs_user_fk foreign key (user_id) references public.profiles(id) on delete cascade;
