-- Boarding Pass / Travel Planner — core schema
-- One owner per trip. Family members get read-only access through share links.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- trips
create table if not exists public.trips (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  destination   text,
  start_date    date not null,
  end_date      date not null,
  -- where the trip happens, and where you came from (for the two-clock header)
  timezone      text not null default 'UTC',
  home_timezone text not null default 'UTC',
  travellers    integer not null default 1 check (travellers > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists trips_owner_idx on public.trips (owner_id, start_date desc);

-- ---------------------------------------------------------------- days
create table if not exists public.trip_days (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  day_number integer not null check (day_number > 0),
  date       date not null,
  title      text,
  summary    text,
  unique (trip_id, day_number)
);

create index if not exists trip_days_trip_idx on public.trip_days (trip_id, day_number);

-- ---------------------------------------------------------------- bookings
-- The fixed points of a trip: flights, car hire, stays, paid activities.
create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  kind       text not null check (kind in ('flight', 'car', 'stay', 'activity', 'other')),
  title      text not null,
  subtitle   text,
  reference  text,
  status     text not null default 'confirmed'
             check (status in ('confirmed', 'pending', 'balance_due', 'cancelled')),
  -- Wall-clock local time at the place it happens. A 03:00 car return means 03:00
  -- in Perth whether you read it from Perth or from home, so these are deliberately
  -- NOT timestamptz — there is no instant to convert, only a time on a clock.
  starts_at  timestamp,
  ends_at    timestamp,
  -- kind-specific extras: iata codes, plate number, address, seat, fare class…
  details    jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

create index if not exists bookings_trip_idx on public.bookings (trip_id, sort_order);

-- ---------------------------------------------------------------- events
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  day_id     uuid not null references public.trip_days (id) on delete cascade,
  -- null start_time means "planned, but no time set yet" — rendered as an outline item
  start_time time,
  end_time   time,
  title      text not null,
  note       text,
  kind       text,
  bullets    text[] not null default '{}',
  booking_id uuid references public.bookings (id) on delete set null,
  sort_order integer not null default 0,
  done       boolean not null default false
);

create index if not exists events_day_idx on public.events (day_id, sort_order);
create index if not exists events_trip_idx on public.events (trip_id);

-- ---------------------------------------------------------------- prep items
-- The "things to bring / prepare" column. day_id null = trip-wide.
create table if not exists public.prep_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  day_id     uuid references public.trip_days (id) on delete cascade,
  label      text not null,
  done       boolean not null default false,
  sort_order integer not null default 0
);

create index if not exists prep_items_day_idx on public.prep_items (trip_id, day_id, sort_order);

-- ---------------------------------------------------------------- documents
-- A row with storage_path = null is a placeholder: a document you know you need
-- but haven't uploaded yet. That is what drives the "Missing" flags.
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips (id) on delete cascade,
  day_id       uuid references public.trip_days (id) on delete set null,
  booking_id   uuid references public.bookings (id) on delete set null,
  label        text not null,
  file_name    text,
  storage_path text unique,
  mime_type    text,
  size_bytes   bigint,
  -- null needed_on = trip-wide, needed every day (passports, insurance)
  needed_on    date,
  created_at   timestamptz not null default now()
);

create index if not exists documents_trip_idx on public.documents (trip_id, needed_on);
create index if not exists documents_day_idx on public.documents (day_id);

-- ---------------------------------------------------------------- share links
create table if not exists public.share_links (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  token      text not null unique,
  label      text,
  revoked    boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen  timestamptz
);

create index if not exists share_links_token_idx on public.share_links (token) where revoked = false;

-- ---------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_touch_updated_at on public.trips;
create trigger trips_touch_updated_at
  before update on public.trips
  for each row execute function public.touch_updated_at();
