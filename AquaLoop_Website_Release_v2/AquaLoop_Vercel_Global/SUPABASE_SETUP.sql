-- AquaLoop Global MVP database setup
-- Run this entire file once in Supabase -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null unique,
  name text not null,
  tank_capacity_l numeric not null check (tank_capacity_l > 0),
  filter_capacity_l numeric not null default 500 check (filter_capacity_l > 0),
  filter_start_total_l numeric not null default 0,
  tank_start_total_l numeric not null default 0,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.device_credentials (
  device_ref uuid primary key references public.devices(id) on delete cascade,
  secret_hash text not null
);

create table if not exists public.device_latest (
  device_ref uuid primary key references public.devices(id) on delete cascade,
  tds numeric,
  turbidity numeric,
  flow_rate numeric,
  total_litres numeric not null default 0,
  sensor_timestamp timestamptz not null default now(),
  uptime_ms bigint
);

create table if not exists public.telemetry_history (
  id bigint generated always as identity primary key,
  device_ref uuid not null references public.devices(id) on delete cascade,
  tds numeric,
  turbidity numeric,
  flow_rate numeric,
  total_litres numeric not null default 0,
  sensor_timestamp timestamptz not null default now(),
  uptime_ms bigint
);

create index if not exists telemetry_history_device_time_idx
  on public.telemetry_history(device_ref, sensor_timestamp desc);

alter table public.devices enable row level security;
alter table public.device_credentials enable row level security;
alter table public.device_latest enable row level security;
alter table public.telemetry_history enable row level security;

-- Owners may only read their own device metadata.
drop policy if exists "owners_select_devices" on public.devices;
create policy "owners_select_devices"
  on public.devices for select
  using (owner_id = auth.uid());

-- All device creation and reset writes go through authenticated Vercel API routes.
-- No client insert/update policy is intentionally provided.

-- Device credentials are server-only: no public/client policy.

-- Owners may read latest telemetry for their own devices.
drop policy if exists "owners_select_latest" on public.device_latest;
create policy "owners_select_latest"
  on public.device_latest for select
  using (
    exists (
      select 1 from public.devices d
      where d.id = device_latest.device_ref
        and d.owner_id = auth.uid()
    )
  );

-- Owners may read telemetry history for their own devices.
drop policy if exists "owners_select_history" on public.telemetry_history;
create policy "owners_select_history"
  on public.telemetry_history for select
  using (
    exists (
      select 1 from public.devices d
      where d.id = telemetry_history.device_ref
        and d.owner_id = auth.uid()
    )
  );

-- Enable Realtime updates for the single latest row per device.
do $$
begin
  alter publication supabase_realtime add table public.device_latest;
exception
  when duplicate_object then null;
end $$;
