-- FRIDAY studio: database til den interne kundeside.
-- Kør hele filen i Supabase: SQL Editor → New query → indsæt → Run.
-- Til sidst vises jeres hemmelige nøgle. Den skal stå i linket til den interne side.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'website' check (source in ('website', 'manual')),
  status text not null default 'ny' check (status in ('ny', 'planlagt', 'holdt', 'tilbud', 'vundet', 'tabt')),
  name text not null,
  company text,
  email text,
  phone text,
  address text,
  topics text[] not null default '{}',
  preferred_date date,
  preferred_time text,
  message text,
  owner text check (owner in ('Jomaa', 'Ahmad')),
  meeting_at timestamptz,
  meeting_place text,
  budget text,
  deadline date
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  author text check (author in ('Jomaa', 'Ahmad')),
  kind text not null default 'note' check (kind in ('samtale', 'ide', 'oenske', 'naeste', 'note')),
  body text not null
);
create index if not exists notes_customer_idx on notes(customer_id, created_at desc);

-- Den hemmelige nøgle. Tabellen kan ikke læses udefra.
create table if not exists access_keys (
  key text primary key,
  created_at timestamptz not null default now()
);
insert into access_keys (key)
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  where not exists (select 1 from access_keys);

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists customers_touch on customers;
create trigger customers_touch before update on customers for each row execute function touch_updated_at();

-- Sikkerhed: hjemmesiden må kun oprette nye bookinger. Alt andet går gennem funktionerne i adgang.sql, som kræver nøglen.
alter table customers enable row level security;
alter table notes enable row level security;
alter table access_keys enable row level security;

drop policy if exists "website creates bookings" on customers;
create policy "website creates bookings" on customers for insert to anon
  with check (source = 'website' and status = 'ny' and owner is null and meeting_at is null and budget is null and deadline is null);

-- Kør derefter også supabase/adgang.sql.

-- Jeres nøgle:
select key as "Jeres hemmelige nøgle" from access_keys;
