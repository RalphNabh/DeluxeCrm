-- Invoices schema
-- Tables: invoices, invoice_line_items, payments
-- Complete financial management system

-- invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  estimate_id uuid references public.estimates(id),
  invoice_number text not null,
  status text not null default 'Draft', -- Draft, Sent, Paid, Overdue, Cancelled
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- invoice line items
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'unit',
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_method text not null, -- Cash, Check, Credit Card, Bank Transfer
  payment_date date not null,
  reference text, -- Check number, transaction ID, etc.
  notes text,
  created_at timestamptz not null default now()
);

-- updated_at triggers
create trigger invoices_updated_at
before update on public.invoices
for each row execute function public.handle_updated_at();

-- RLS
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments enable row level security;

-- Policies
create policy "Enable read own invoices" on public.invoices
for select using (auth.uid() = user_id);
create policy "Enable insert own invoices" on public.invoices
for insert with check (auth.uid() = user_id);
create policy "Enable update own invoices" on public.invoices
for update using (auth.uid() = user_id);
create policy "Enable delete own invoices" on public.invoices
for delete using (auth.uid() = user_id);

create policy "Enable read own invoice line items" on public.invoice_line_items
for select using (auth.uid() = (select user_id from public.invoices where id = invoice_id));
create policy "Enable insert own invoice line items" on public.invoice_line_items
for insert with check (auth.uid() = (select user_id from public.invoices where id = invoice_id));
create policy "Enable update own invoice line items" on public.invoice_line_items
for update using (auth.uid() = (select user_id from public.invoices where id = invoice_id));
create policy "Enable delete own invoice line items" on public.invoice_line_items
for delete using (auth.uid() = (select user_id from public.invoices where id = invoice_id));

create policy "Enable read own payments" on public.payments
for select using (auth.uid() = user_id);
create policy "Enable insert own payments" on public.payments
for insert with check (auth.uid() = user_id);
create policy "Enable update own payments" on public.payments
for update using (auth.uid() = user_id);
create policy "Enable delete own payments" on public.payments
for delete using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_invoices_user_status on public.invoices(user_id, status);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_estimate on public.invoices(estimate_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id);
create index if not exists idx_payments_user on public.payments(user_id);

