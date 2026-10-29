-- FRIDAY studio: adgang til den interne side.
-- Den interne side sender den hemmelige nøgle med til disse funktioner.
-- Uden den rigtige nøgle kan man kun oprette nye bookinger fra hjemmesiden.

drop policy if exists "team manages customers" on customers;
drop policy if exists "team manages notes" on notes;
drop function if exists is_team();

create or replace function crm_auth(k text) returns void language plpgsql stable security definer set search_path = public as $$
begin
  if k is null or not exists (select 1 from access_keys where key = k) then
    raise exception 'Forkert nøgle' using errcode = '28000';
  end if;
end $$;

create or replace function crm_check(k text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from access_keys where key = k);
$$;

create or replace function crm_customers(k text) returns setof customers language plpgsql stable security definer set search_path = public as $$
begin
  perform crm_auth(k);
  return query select * from customers order by created_at desc;
end $$;

create or replace function crm_note_counts(k text) returns table(customer_id uuid) language plpgsql stable security definer set search_path = public as $$
begin
  perform crm_auth(k);
  return query select n.customer_id from notes n;
end $$;

create or replace function crm_notes(k text, cid uuid) returns setof notes language plpgsql stable security definer set search_path = public as $$
begin
  perform crm_auth(k);
  return query select * from notes where customer_id = cid order by created_at desc;
end $$;

create or replace function crm_create(k text, c jsonb) returns customers language plpgsql security definer set search_path = public as $$
declare r customers;
begin
  perform crm_auth(k);
  r := jsonb_populate_record(null::customers,
    jsonb_build_object('source', 'manual', 'status', 'ny', 'topics', '[]'::jsonb) || jsonb_strip_nulls(c)
    || jsonb_build_object('id', gen_random_uuid(), 'created_at', now(), 'updated_at', now()));
  insert into customers select r.* returning * into r;
  return r;
end $$;

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
    preferred_date = r.preferred_date, preferred_time = r.preferred_time, message = r.message, source = r.source
  where id = cid returning * into r;
  return r;
end $$;

create or replace function crm_delete(k text, cid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  perform crm_auth(k);
  delete from customers where id = cid;
end $$;

create or replace function crm_add_note(k text, n jsonb) returns notes language plpgsql security definer set search_path = public as $$
declare r notes;
begin
  perform crm_auth(k);
  insert into notes (customer_id, author, kind, body)
  values ((n->>'customer_id')::uuid, n->>'author', coalesce(n->>'kind', 'note'), n->>'body')
  returning * into r;
  return r;
end $$;

create or replace function crm_delete_note(k text, nid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  perform crm_auth(k);
  delete from notes where id = nid;
end $$;

select 'Færdig. Genindlæs den interne side.' as status;
