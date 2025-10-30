-- Multitenancy base schema for Kartarkiv
-- Creates clubs/access_requests tables and scopes tenant data via club_id

begin;

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text unique,
  logo_url text,
  color text default '#109771',
  stripe_customer_id text,
  clerk_org_id text unique,
  b2_prefix text,
  status text not null default 'active',
  created_at timestamptz default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  club_name text not null,
  contact_name text not null,
  contact_email text not null,
  expected_size_gb numeric,
  message text,
  status text not null default 'pending',
  decision_reason text,
  decided_at timestamptz,
  club_id uuid references public.clubs(id),
  created_at timestamptz default now()
);

alter table public.maps add column if not exists club_id uuid references public.clubs(id);
alter table public.storage_usage add column if not exists club_id uuid references public.clubs(id);
alter table public.invoices add column if not exists club_id uuid references public.clubs(id);
alter table public.invoice_items add column if not exists club_id uuid references public.clubs(id);
alter table public.announcements add column if not exists club_id uuid references public.clubs(id);
alter table public.api_logs add column if not exists club_id uuid references public.clubs(id);
alter table public.club_invoices add column if not exists club_id uuid references public.clubs(id);
alter table public.club_invoice_items add column if not exists club_id uuid references public.clubs(id);

create index if not exists idx_maps_club_id on public.maps (club_id);
create index if not exists idx_storage_usage_club_id_created_at on public.storage_usage (club_id, created_at);
create index if not exists idx_invoices_club_id_created_at on public.invoices (club_id, created_at);
create index if not exists idx_invoice_items_club_id on public.invoice_items (club_id);
create index if not exists idx_announcements_club_id on public.announcements (club_id);
create index if not exists idx_api_logs_club_id on public.api_logs (club_id);
create index if not exists idx_club_invoices_club_id_created_at on public.club_invoices (club_id, created_at);
create index if not exists idx_club_invoice_items_club_id on public.club_invoice_items (club_id);

-- Helper to extract Clerk organization claim from the JWT
create or replace function public.current_clerk_org_id()
returns text
language sql
stable
as
$$
select nullif(
  coalesce(
    coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb->>'organization_id',
    coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb->>'org_id',
    current_setting('app.current_clerk_org_id', true)
  ),
  ''
);
$$;

-- Helper to find current club id from Clerk organization claim
create or replace function public.current_club_id()
returns uuid
language sql
stable
as
$$
select coalesce(
  (
    select c.id
    from public.clubs c
    where c.clerk_org_id = public.current_clerk_org_id()
    limit 1
  ),
  nullif(current_setting('app.current_club_id', true), '')::uuid
);
$$;

-- Ensure all tables have RLS enabled and policies tied to the Clerk org claim
alter table public.maps enable row level security;
alter table public.storage_usage enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.announcements enable row level security;
alter table public.api_logs enable row level security;
alter table public.club_invoices enable row level security;
alter table public.club_invoice_items enable row level security;

-- Generic policy helpers reused across tables
create or replace function public.ensure_club_match(club uuid)
returns boolean
language sql
stable
as
$$
select (
  public.current_club_id() is not null
  and club = public.current_club_id()
);
$$;

create or replace function public.allow_club_write(club uuid)
returns boolean
language sql
stable
as
$$
select (
  public.current_club_id() is not null
  and club = public.current_club_id()
);
$$;

-- Policies per table
create policy if not exists maps_select_same_club
on public.maps
for select
using (public.ensure_club_match(club_id));

create policy if not exists maps_modify_same_club
on public.maps
for all
using (public.ensure_club_match(club_id))
with check (public.allow_club_write(club_id));

create policy if not exists storage_usage_select_same_club
on public.storage_usage
for select
using (public.ensure_club_match(club_id));

create policy if not exists storage_usage_modify_same_club
on public.storage_usage
for all
using (public.ensure_club_match(club_id))
with check (public.allow_club_write(club_id));

create policy if not exists invoices_select_same_club
on public.invoices
for select
using (public.ensure_club_match(club_id));

create policy if not exists invoices_modify_same_club
on public.invoices
for all
using (public.ensure_club_match(club_id))
with check (public.allow_club_write(club_id));

create policy if not exists invoice_items_select_same_club
on public.invoice_items
for select
using (public.ensure_club_match(club_id));

create policy if not exists invoice_items_modify_same_club
on public.invoice_items
for all
using (public.ensure_club_match(club_id))
with check (public.allow_club_write(club_id));

create policy if not exists announcements_select_same_club
on public.announcements
for select
using (public.ensure_club_match(club_id));

create policy if not exists announcements_modify_same_club
on public.announcements
for all
using (public.ensure_club_match(club_id))
with check (public.allow_club_write(club_id));

create policy if not exists api_logs_select_same_club
on public.api_logs
for select
using (public.ensure_club_match(club_id));

create policy if not exists api_logs_modify_same_club
on public.api_logs
for all
using (public.ensure_club_match(club_id))
with check (public.allow_club_write(club_id));

create policy if not exists club_invoices_select_same_club
on public.club_invoices
for select
using (public.ensure_club_match(club_id));

create policy if not exists club_invoices_modify_same_club
on public.club_invoices
for all
using (public.ensure_club_match(club_id))
with check (public.allow_club_write(club_id));

create policy if not exists club_invoice_items_select_same_club
on public.club_invoice_items
for select
using (public.ensure_club_match(club_id));

create policy if not exists club_invoice_items_modify_same_club
on public.club_invoice_items
for all
using (public.ensure_club_match(club_id))
with check (public.allow_club_write(club_id));

commit;
