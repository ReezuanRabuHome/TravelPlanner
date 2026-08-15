-- Row level security: the trip owner is the only identity that can read or write
-- through the public API. Family read-only access never uses these policies —
-- it goes through server code that validates a share token and uses the service role.

alter table public.trips       enable row level security;
alter table public.trip_days   enable row level security;
alter table public.bookings    enable row level security;
alter table public.events      enable row level security;
alter table public.prep_items  enable row level security;
alter table public.documents   enable row level security;
alter table public.share_links enable row level security;

-- helper: does the current user own this trip?
create or replace function public.owns_trip(p_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id and t.owner_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------- trips
drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select using (owner_id = (select auth.uid()));

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips
  for insert with check (owner_id = (select auth.uid()));

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
  for delete using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------- child tables
do $$
declare
  t text;
  policy_name text;
begin
  foreach t in array array['trip_days', 'bookings', 'events', 'prep_items', 'documents', 'share_links']
  loop
    -- Build the policy name first: format('%I_owner_all', t) would splice the
    -- suffix outside the quoting that %I applies, which breaks the moment a
    -- table name needs quoting.
    policy_name := t || '_owner_all';

    execute format('drop policy if exists %I on public.%I', policy_name, t);
    execute format(
      'create policy %I on public.%I for all
         using (public.owns_trip(trip_id))
         with check (public.owns_trip(trip_id))', policy_name, t);
  end loop;
end
$$;
