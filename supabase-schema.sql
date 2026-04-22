-- Run this entire file in your Supabase project:
-- Dashboard → SQL Editor → New query → paste → Run

-- ─── Workspaces ────────────────────────────────────────────────
create table public.workspaces (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);
alter table public.workspaces enable row level security;
create policy "Users manage own workspaces" on public.workspaces
  for all using (auth.uid() = user_id);

-- ─── Sections ──────────────────────────────────────────────────
create table public.sections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  name text not null default 'Untitled',
  position integer not null default 0,
  col_index integer not null default 0,
  collapsed boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz default now()
);
alter table public.sections enable row level security;
create policy "Users manage own sections" on public.sections
  for all using (auth.uid() = user_id);

-- ─── Links ─────────────────────────────────────────────────────
create table public.links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  section_id uuid references public.sections(id) on delete cascade not null,
  title text not null,
  url text not null,
  position integer not null default 0,
  color text default '',
  created_at timestamptz default now()
);
alter table public.links enable row level security;
create policy "Users manage own links" on public.links
  for all using (auth.uid() = user_id);

-- ─── Notes ─────────────────────────────────────────────────────
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

-- ─── Bookmarks ─────────────────────────────────────────────────
create table public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  title text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz default now()
);
alter table public.bookmarks enable row level security;
create policy "Users manage own bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id);

-- ─── User Settings (theme, preferences) ───────────────────────
create table public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  theme jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.user_settings enable row level security;
create policy "Users manage own settings" on public.user_settings
  for all using (auth.uid() = user_id);
