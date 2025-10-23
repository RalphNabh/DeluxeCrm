-- Estimates schema

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  status text not null default 'Draft' check (status in ('Draft','Sent','Approved','Rejected','Scheduled','Completed')),
  subtotal numeric(12,2) default 0,
  tax numeric(12,2) default 0,
  total numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit text default 'unit',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0
);

alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;

create policy "Users can read own estimates" on public.estimates for select using (auth.uid() = user_id);
create policy "Users can insert own estimates" on public.estimates for insert with check (auth.uid() = user_id);
create policy "Users can update own estimates" on public.estimates for update using (auth.uid() = user_id);
create policy "Users can delete own estimates" on public.estimates for delete using (auth.uid() = user_id);

create policy "Users can read own estimate items" on public.estimate_line_items for select using (
  exists(select 1 from public.estimates e where e.id = estimate_id and e.user_id = auth.uid())
);
create policy "Users can insert own estimate items" on public.estimate_line_items for insert with check (
  exists(select 1 from public.estimates e where e.id = estimate_id and e.user_id = auth.uid())
);
create policy "Users can update own estimate items" on public.estimate_line_items for update using (
  exists(select 1 from public.estimates e where e.id = estimate_id and e.user_id = auth.uid())
);
create policy "Users can delete own estimate items" on public.estimate_line_items for delete using (
  exists(select 1 from public.estimates e where e.id = estimate_id and e.user_id = auth.uid())
);

create or replace function public.handle_estimates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_estimates_updated_at on public.estimates;
create trigger handle_estimates_updated_at
  before update on public.estimates
  for each row execute procedure public.handle_estimates_updated_at();

create index if not exists idx_estimates_user_id on public.estimates(user_id);
create index if not exists idx_estimates_client_id on public.estimates(client_id);
create index if not exists idx_estimates_status on public.estimates(status);


