-- Run this entire file in your Supabase project:
-- Dashboard → SQL Editor → New query → paste → Run

-- Workspaces
create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);
alter table public.workspaces enable row level security;
create policy "Users manage own workspaces" on public.workspaces
  for all using (auth.uid() = user_id);

-- Bookmarks
create table public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null,
  url text not null,
  created_at timestamptz default now()
);
alter table public.bookmarks enable row level security;
create policy "Users manage own bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id);

-- Notes
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);
alter table public.notes enable row level security;
create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id);
