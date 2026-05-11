create table if not exists public.analytics_events (
    id uuid default gen_random_uuid() primary key,
    event_name text not null,
    metadata jsonb default '{}'::jsonb,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.analytics_events enable row level security;

-- Allow insert from anyone (anonymous or authenticated)
create policy "Allow inserts to analytics_events" 
    on public.analytics_events for insert 
    with check (true);
