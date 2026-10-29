-- FRIDAY studio: dashboard, kontaktlog og projektforløb.
-- Kør efter schema.sql og adgang.sql. Filen kan køres flere gange uden problemer.

-- Faser: salg (ny → tilbud, tabt) og udførelse (vundet → leveret).
alter table customers drop constraint if exists customers_status_check;
alter table customers add constraint customers_status_check check (status in (
  'ny', 'planlagt', 'holdt', 'tilbud', 'tabt',
  'vundet', 'udvikling', 'gennemgang', 'rettelser', 'godkendelse', 'leveret'));
alter table customers add column if not exists next_followup date;
alter table customers add column if not exists price text;
alter table customers add column if not exists product_url text;
alter table customers add column if not exists won_at timestamptz;

-- Kontaktlog: én post pr. kontakt med kunden.
alter table notes drop constraint if exists notes_kind_check;
alter table notes add constraint notes_kind_check check (kind in (
  'moede', 'telefon', 'mail', 'besoeg', 'sms', 'note', 'status',
  'samtale', 'ide', 'oenske', 'naeste'));
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'notes' and column_name = 'contact_at') then
    alter table notes add column contact_at timestamptz not null default now();
    update notes set contact_at = created_at;
  end if;
end $$;
alter table notes add column if not exists ideas text;
alter table notes add column if not exists wishes text;
alter table notes add column if not exists next_step text;
alter table notes alter column body drop not null;

create or replace function crm_update(k text, cid uuid, p jsonb) returns customers language plpgsql security definer set search_path = public as $$
declare r customers;
begin
  perform crm_auth(k);
  select * into r from customers where id = cid;
  if not found then raise exception 'Kunden findes ikke'; end if;
  r := jsonb_populate_record(r, p - 'id' - 'created_at' - 'updated_at');
  update customers set
    status = r.status, name = r.name, company = r.company, email = r.email, phone = r.phone,
    address = r.address, topics = coalesce(r.topics, '{}'), owner = r.owner, meeting_at = r.meeting_at,
    meeting_place = r.meeting_place, budget = r.budget, deadline = r.deadline,
    preferred_date = r.preferred_date, preferred_time = r.preferred_time, message = r.message, source = r.source,
    next_followup = r.next_followup, price = r.price, product_url = r.product_url, won_at = r.won_at
  where id = cid returning * into r;
  return r;
end $$;

create or replace function crm_add_note(k text, n jsonb) returns notes language plpgsql security definer set search_path = public as $$
declare r notes;
begin
  perform crm_auth(k);
  insert into notes (customer_id, author, kind, body, contact_at, ideas, wishes, next_step)
  values ((n->>'customer_id')::uuid, n->>'author', coalesce(n->>'kind', 'note'), n->>'body',
          coalesce((n->>'contact_at')::timestamptz, now()), n->>'ideas', n->>'wishes', n->>'next_step')
  returning * into r;
  return r;
end $$;

create or replace function crm_notes(k text, cid uuid) returns setof notes language plpgsql stable security definer set search_path = public as $$
begin
  perform crm_auth(k);
  return query select * from notes where customer_id = cid order by contact_at desc, created_at desc;
end $$;

-- Antal kontakter og seneste kontakt pr. kunde (statusændringer tæller ikke som kontakt).
create or replace function crm_note_stats(k text) returns table(customer_id uuid, notes bigint, last_contact timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform crm_auth(k);
  return query select n.customer_id, count(*), max(n.contact_at) from notes n where n.kind <> 'status' group by n.customer_id;
end $$;

-- Seneste aktivitet på tværs af kunder til overblikket.
create or replace function crm_recent(k text, lim int default 15) returns table(
  id uuid, customer_id uuid, contact_at timestamptz, author text, kind text, body text,
  ideas text, wishes text, next_step text, customer text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform crm_auth(k);
  return query select n.id, n.customer_id, n.contact_at, n.author, n.kind, n.body, n.ideas, n.wishes, n.next_step,
    coalesce(c.company, c.name)
  from notes n join customers c on c.id = n.customer_id
  order by n.created_at desc limit lim;
end $$;

select 'Færdig. Genindlæs den interne side.' as status;
