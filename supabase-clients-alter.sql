-- Add total_value column to clients for displaying current client value
alter table public.clients
  add column if not exists total_value numeric(12,2) not null default 0;

create index if not exists idx_clients_total_value on public.clients(total_value);



