-- ============================
-- Tabby Init: schema + RLS + RPCs + storage
-- ============================

-- Extensions
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists "uuid-ossp";

-- ---------- TABLES ----------
-- Bills
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  place text,
  date date,
  currency char(3) not null default 'USD',
  subtotal numeric not null default 0,
  sales_tax numeric not null default 0,
  tip numeric not null default 0,
  tax_split_method text not null default 'proportional' check (tax_split_method in ('proportional','even')),
  tip_split_method text not null default 'proportional' check (tip_split_method in ('proportional','even')),
  include_zero_item_people boolean not null default true,
  editor_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  viewer_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  receipt_file_path text,
  ocr_json jsonb,
  trip_id uuid
);

-- People
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  name text not null,
  avatar_url text,
  venmo_handle text,
  is_archived boolean not null default false
);
create index if not exists idx_people_bill on public.people(bill_id);

-- Items
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  label text not null,
  emoji text,
  qty numeric not null default 1,
  unit_price numeric not null default 0,
  price numeric generated always as (coalesce(qty,1) * unit_price) stored
);
create index if not exists idx_items_bill on public.items(bill_id);

-- Item shares (many-to-many)
create table if not exists public.item_shares (
  item_id uuid not null references public.items(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  weight numeric not null default 1,
  primary key (item_id, person_id)
);
create index if not exists idx_shares_person on public.item_shares(person_id);

-- Optional groups/couples (purely view layer; no ownership changes)
create table if not exists public.bill_groups (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  name text not null,
  is_temporary boolean not null default true
);
create table if not exists public.bill_group_members (
  group_id uuid not null references public.bill_groups(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (group_id, person_id)
);
create index if not exists idx_groups_bill on public.bill_groups(bill_id);

-- Optional trips (folders)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null
);
alter table public.bills
  add constraint bills_trip_fk foreign key (trip_id) references public.trips(id) on delete set null;

-- ---------- RLS BASELINE ----------
-- We will enforce access through RPCs, not direct table selects.
alter table public.bills enable row level security;
alter table public.people enable row level security;
alter table public.items enable row level security;
alter table public.item_shares enable row level security;
alter table public.bill_groups enable row level security;
alter table public.bill_group_members enable row level security;
alter table public.trips enable row level security;

-- Deny by default: revoke direct table access from anon (and authenticated) to force RPC usage.
revoke all on public.bills               from anon, authenticated;
revoke all on public.people              from anon, authenticated;
revoke all on public.items               from anon, authenticated;
revoke all on public.item_shares         from anon, authenticated;
revoke all on public.bill_groups         from anon, authenticated;
revoke all on public.bill_group_members  from anon, authenticated;
revoke all on public.trips               from anon, authenticated;

-- Minimal permissive policies to allow RPC security-definer functions to operate.
-- (Security definer runs with table owner privileges, so RLS must allow owner.)
-- Keep generic “true” policies to avoid blocking the definer; we still gate access inside RPCs.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bills' and policyname='owner_can_do_anything') then
    create policy "owner_can_do_anything" on public.bills using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='people' and policyname='owner_can_do_anything') then
    create policy "owner_can_do_anything" on public.people using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='items' and policyname='owner_can_do_anything') then
    create policy "owner_can_do_anything" on public.items using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='item_shares' and policyname='owner_can_do_anything') then
    create policy "owner_can_do_anything" on public.item_shares using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bill_groups' and policyname='owner_can_do_anything') then
    create policy "owner_can_do_anything" on public.bill_groups using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bill_group_members' and policyname='owner_can_do_anything') then
    create policy "owner_can_do_anything" on public.bill_group_members using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips' and policyname='owner_can_do_anything') then
    create policy "owner_can_do_anything" on public.trips using (true) with check (true);
  end if;
end$$;

-- Note: The *real* access control is enforced inside RPCs via token checks.
-- Later, if/when you add Supabase Auth, replace with proper RLS policies checking auth.uid().

-- ---------- HELPER FUNCTIONS ----------
-- Normalize venmo handle (strip leading '@', trim)
create or replace function public.normalize_handle(h text)
returns text language sql immutable as $$
  select nullif(regexp_replace(coalesce(h,''), '^\s*@?', ''), '');
$$;

-- ---------- SECURITY-DEFINER RPCs (TOKEN-GATED) ----------
-- 1) Read a bill by either viewer or editor token
create or replace function public.get_bill_by_token(bill_token text)
returns setof public.bills
language sql
security definer
set search_path = public
as $$
  select b.*
  from public.bills b
  where b.viewer_token = bill_token
     or b.editor_token = bill_token;
$$;
grant execute on function public.get_bill_by_token(text) to anon, authenticated;

-- 2) People for a bill by token
create or replace function public.get_people_by_token(bill_token text)
returns setof public.people
language sql
security definer
set search_path = public
as $$
  select p.*
  from public.people p
  join public.bills b on b.id = p.bill_id
  where b.viewer_token = bill_token
     or b.editor_token = bill_token;
$$;
grant execute on function public.get_people_by_token(text) to anon, authenticated;

-- 3) Items for a bill by token
create or replace function public.get_items_by_token(bill_token text)
returns setof public.items
language sql
security definer
set search_path = public
as $$
  select i.*
  from public.items i
  join public.bills b on b.id = i.bill_id
  where b.viewer_token = bill_token
     or b.editor_token = bill_token;
$$;
grant execute on function public.get_items_by_token(text) to anon, authenticated;

-- 4) Item shares for a bill by token
create or replace function public.get_item_shares_by_token(bill_token text)
returns setof public.item_shares
language sql
security definer
set search_path = public
as $$
  select s.*
  from public.item_shares s
  join public.items i on i.id = s.item_id
  join public.bills b on b.id = i.bill_id
  where b.viewer_token = bill_token
     or b.editor_token = bill_token;
$$;
grant execute on function public.get_item_shares_by_token(text) to anon, authenticated;

-- 5) Add a person (editor only)
create or replace function public.add_person_with_editor_token(
  etoken text,
  bill_id uuid,
  person_name text,
  avatar_url text default null,
  venmo text default null
) returns public.people
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
  _p public.people;
begin
  select true into _ok from public.bills where id = bill_id and editor_token = etoken;
  if not _ok then
    raise exception 'invalid editor token';
  end if;

  insert into public.people (bill_id, name, avatar_url, venmo_handle)
  values (bill_id, person_name, avatar_url, public.normalize_handle(venmo))
  returning * into _p;

  return _p;
end;
$$;
grant execute on function public.add_person_with_editor_token(text, uuid, text, text, text) to anon, authenticated;

-- 6) Add an item (editor only)
create or replace function public.add_item_with_editor_token(
  etoken text,
  bill_id uuid,
  label text,
  qty numeric default 1,
  unit_price numeric default 0,
  emoji text default null
) returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
  _i public.items;
begin
  select true into _ok from public.bills where id = bill_id and editor_token = etoken;
  if not _ok then
    raise exception 'invalid editor token';
  end if;

  insert into public.items (bill_id, label, qty, unit_price, emoji)
  values (bill_id, label, coalesce(qty,1), coalesce(unit_price,0), emoji)
  returning * into _i;

  return _i;
end;
$$;
grant execute on function public.add_item_with_editor_token(text, uuid, text, numeric, numeric, text) to anon, authenticated;

-- 7) Upsert an item share (assign item to person with weight) (editor only)
create or replace function public.upsert_item_share_with_editor_token(
  etoken text,
  item_id uuid,
  person_id uuid,
  weight numeric default 1
) returns public.item_shares
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
  _s public.item_shares;
begin
  -- Validate editor owns the bill that owns the item
  select exists (
    select 1
    from public.items i
    join public.bills b on b.id = i.bill_id
    where i.id = item_id
      and b.editor_token = etoken
  ) into _ok;

  if not _ok then
    raise exception 'invalid editor token';
  end if;

  insert into public.item_shares (item_id, person_id, weight)
  values (item_id, person_id, coalesce(weight,1))
  on conflict (item_id, person_id) do update set weight = excluded.weight
  returning * into _s;

  return _s;
end;
$$;
grant execute on function public.upsert_item_share_with_editor_token(text, uuid, uuid, numeric) to anon, authenticated;

-- 8) Update bill fields (editor only) – e.g., tax/tip/methods
create or replace function public.update_bill_fields_with_editor_token(
  etoken text,
  bill_id uuid,
  p_title text default null,
  p_place text default null,
  p_date date default null,
  p_currency char(3) default null,
  p_subtotal numeric default null,
  p_sales_tax numeric default null,
  p_tip numeric default null,
  p_tax_split_method text default null,
  p_tip_split_method text default null,
  p_include_zero boolean default null
) returns public.bills
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
  _b public.bills;
begin
  select true into _ok from public.bills where id = bill_id and editor_token = etoken;
  if not _ok then
    raise exception 'invalid editor token';
  end if;

  update public.bills set
    title = coalesce(p_title, title),
    place = coalesce(p_place, place),
    date = coalesce(p_date, date),
    currency = coalesce(p_currency, currency),
    subtotal = coalesce(p_subtotal, subtotal),
    sales_tax = coalesce(p_sales_tax, sales_tax),
    tip = coalesce(p_tip, tip),
    tax_split_method = coalesce(p_tax_split_method, tax_split_method),
    tip_split_method = coalesce(p_tip_split_method, tip_split_method),
    include_zero_item_people = coalesce(p_include_zero, include_zero_item_people)
  where id = bill_id
  returning * into _b;

  return _b;
end;
$$;
grant execute on function public.update_bill_fields_with_editor_token(text, uuid, text, text, date, char(3), numeric, numeric, numeric, text, text, boolean)
to anon, authenticated;

-- ---------- STORAGE (Supabase) ----------
-- Create buckets (SQL equivalent of CLI create-bucket)
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('thumbs', 'thumbs', true)
on conflict (id) do nothing;

-- Storage policies
-- receipts: private (no anon access; downloads will use signed URLs generated server-side)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='deny_receipts_anon'
  ) then
    create policy "deny_receipts_anon"
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id <> 'receipts');
  end if;
end$$;

-- thumbs: allow public read, block writes (except service role)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='allow_thumbs_read'
  ) then
    create policy "allow_thumbs_read"
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id = 'thumbs');
  end if;
end$$;

-- ---------- INDEX HINTS ----------
create index if not exists idx_bills_tokens on public.bills(viewer_token, editor_token);

-- ---------- (Optional) Minimal Seed Example ----------
-- Uncomment and tweak if you want a first bill to appear immediately
-- do $$
-- declare
--   b_id uuid := gen_random_uuid();
--   e_token text := encode(gen_random_bytes(16), 'hex');
--   v_token text := encode(gen_random_bytes(16), 'hex');
-- begin
--   insert into public.bills (id,title,place,date,subtotal,sales_tax,tip,editor_token,viewer_token)
--   values (b_id,'Tabby Test Bill','Billy''s Cafe',now()::date,60.14,5.16,13.06,e_token,v_token);
--   insert into public.people (bill_id,name) values (b_id,'Louis'), (b_id,'Peyton'), (b_id,'Avery');
--   insert into public.items (bill_id,label,qty,unit_price,emoji)
--   values (b_id,'Eggs',1,12.34,'🥚'), (b_id,'Bacon',1,8.49,'🥓'), (b_id,'Coffee',2,3.50,'☕');
-- end$$;