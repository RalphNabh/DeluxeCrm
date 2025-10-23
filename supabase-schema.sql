-- Create the clients table
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.clients enable row level security;

-- Create RLS policies
create policy "Users can read own clients"
on public.clients for select
using (auth.uid() = user_id);

create policy "Users can insert own clients"
on public.clients for insert
with check (auth.uid() = user_id);

create policy "Users can update own clients"
on public.clients for update
using (auth.uid() = user_id);

create policy "Users can delete own clients"
on public.clients for delete
using (auth.uid() = user_id);

-- Create function to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger handle_clients_updated_at
  before update on public.clients
  for each row execute procedure public.handle_updated_at();

-- Create an index on user_id for better performance
create index idx_clients_user_id on public.clients(user_id);

-- Insert some sample data (optional - remove if you don't want sample data)
-- Note: This will only work after you have created a user account
-- You can uncomment this after signing up for the first time
/*
insert into public.clients (user_id, name, email, phone, address, notes) values
  ((select auth.uid()), 'John Smith', 'john@example.com', '555-0123', '123 Main St, City, State', 'Regular customer, prefers morning appointments'),
  ((select auth.uid()), 'Sarah Johnson', 'sarah@example.com', '555-0456', '456 Oak Ave, City, State', 'New customer, interested in landscaping'),
  ((select auth.uid()), 'Mike Wilson', 'mike@example.com', '555-0789', '789 Pine Rd, City, State', 'Commercial property owner');
*/

