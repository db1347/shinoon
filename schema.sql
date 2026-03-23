-- =============================================================================
-- schema.sql
-- Supabase / PostgreSQL schema for the Shinoon (שינועים) transport mission system.
-- Run this in the Supabase SQL editor or via `supabase db push`.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role        as enum ('manager', 'driver');
create type user_status      as enum ('available', 'on_mission', 'offline');
create type mission_priority as enum ('low', 'normal', 'high', 'urgent');
create type mission_status   as enum (
  'pending', 'accepted', 'en_route', 'completed', 'cancelled'
);

-- ---------------------------------------------------------------------------
-- Table: users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id         uuid        primary key default uuid_generate_v4(),
  full_name  text        not null,
  role       user_role   not null default 'driver',
  phone      text,
  status     user_status not null default 'offline',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Table: missions
-- ---------------------------------------------------------------------------
create table if not exists public.missions (
  id                 uuid             primary key default uuid_generate_v4(),
  title              text             not null,
  pickup_location    text             not null,
  destination        text             not null,
  notes              text,
  priority           mission_priority not null default 'normal',
  status             mission_status   not null default 'pending',
  broadcast          boolean          not null default false,
  assigned_driver_id uuid             references public.users(id) on delete set null,
  created_by         uuid             not null references public.users(id) on delete restrict,
  created_at         timestamptz      not null default now(),
  updated_at         timestamptz      not null default now(),
  accepted_at        timestamptz,
  completed_at       timestamptz
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_missions_status             on public.missions (status);
create index if not exists idx_missions_assigned_driver_id on public.missions (assigned_driver_id);
create index if not exists idx_missions_created_at         on public.missions (created_at desc);
create index if not exists idx_missions_driver_status      on public.missions (assigned_driver_id, status);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger missions_set_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users    enable row level security;
alter table public.missions enable row level security;

create or replace function public.current_user_role()
returns user_role language sql stable security definer as $$
  select role from public.users where id = auth.uid();
$$;

-- users policies
create policy "managers_read_all_users"   on public.users for select using (public.current_user_role() = 'manager');
create policy "users_read_own_record"     on public.users for select using (id = auth.uid());
create policy "managers_insert_users"     on public.users for insert with check (public.current_user_role() = 'manager');
create policy "managers_update_all_users" on public.users for update using (public.current_user_role() = 'manager');
create policy "drivers_update_own_record" on public.users for update using (id = auth.uid());

-- missions policies
create policy "managers_read_all_missions"
  on public.missions for select using (public.current_user_role() = 'manager');

create policy "drivers_read_own_or_broadcast_missions"
  on public.missions for select
  using (
    public.current_user_role() = 'driver'
    and (
      assigned_driver_id = auth.uid()
      or (broadcast = true and status = 'pending')
    )
  );

create policy "managers_insert_missions"
  on public.missions for insert with check (public.current_user_role() = 'manager');

create policy "managers_update_all_missions"
  on public.missions for update using (public.current_user_role() = 'manager');

create policy "drivers_update_own_mission_status"
  on public.missions for update
  using (public.current_user_role() = 'driver' and assigned_driver_id = auth.uid())
  with check (public.current_user_role() = 'driver' and assigned_driver_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.missions;
