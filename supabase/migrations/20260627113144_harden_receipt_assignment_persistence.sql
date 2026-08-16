create extension if not exists pgcrypto;

create table if not exists public.tabby_receipts (
  id uuid primary key default gen_random_uuid(),
  editor_token text not null unique,
  viewer_token text not null unique,
  title text,
  place text,
  date date,
  created_at timestamptz not null default now(),
  subtotal numeric(10, 2) not null default 0,
  sales_tax numeric(10, 2) not null default 0,
  tip numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  service_fee numeric(10, 2) not null default 0
);

create table if not exists public.tabby_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.tabby_receipts(id) on delete cascade,
  label text not null,
  unit_price numeric(12, 4) not null default 0,
  qty integer not null default 1 check (qty > 0),
  emoji text,
  price numeric(12, 4) generated always as (unit_price * qty) stored
);

create table if not exists public.tabby_people (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.tabby_receipts(id) on delete cascade,
  name text not null,
  avatar_url text,
  venmo_handle text,
  personal_credit numeric(10, 2) not null default 0,
  credit_note text
);

create table if not exists public.tabby_item_shares (
  item_id uuid not null references public.tabby_items(id) on delete cascade,
  person_id uuid not null references public.tabby_people(id) on delete cascade,
  weight numeric(10, 4) not null default 1 check (weight > 0),
  primary key (item_id, person_id)
);

alter table if exists public.tabby_receipts
  add column if not exists editor_token text,
  add column if not exists viewer_token text,
  add column if not exists title text,
  add column if not exists place text,
  add column if not exists date date,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists subtotal numeric(10, 2) not null default 0,
  add column if not exists sales_tax numeric(10, 2) not null default 0,
  add column if not exists tip numeric(10, 2) not null default 0;

alter table if exists public.tabby_items
  add column if not exists receipt_id uuid references public.tabby_receipts(id) on delete cascade,
  add column if not exists label text,
  add column if not exists unit_price numeric(12, 4) not null default 0,
  add column if not exists qty integer not null default 1,
  add column if not exists emoji text;

create unique index if not exists tabby_receipts_editor_token_key
  on public.tabby_receipts(editor_token)
  where editor_token is not null;

create unique index if not exists tabby_receipts_viewer_token_key
  on public.tabby_receipts(viewer_token)
  where viewer_token is not null;

create index if not exists tabby_items_receipt_id_idx
  on public.tabby_items(receipt_id);

create index if not exists tabby_people_receipt_id_idx
  on public.tabby_people(receipt_id);

create unique index if not exists tabby_item_shares_item_person_key
  on public.tabby_item_shares(item_id, person_id);

alter table public.tabby_receipts enable row level security;
alter table public.tabby_items enable row level security;
alter table public.tabby_people enable row level security;
alter table public.tabby_item_shares enable row level security;

alter table if exists public.tabby_people
  add column if not exists personal_credit numeric(10, 2) not null default 0,
  add column if not exists credit_note text;

alter table if exists public.tabby_receipts
  add column if not exists discount numeric(10, 2) not null default 0,
  add column if not exists service_fee numeric(10, 2) not null default 0;

create or replace function public.save_receipt_assignments(
  p_token text,
  p_people jsonb,
  p_shares jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_receipt_id uuid;
  v_person jsonb;
  v_share jsonb;
  v_person_id uuid;
  v_person_map jsonb := '{}'::jsonb;
  v_people jsonb := '[]'::jsonb;
  v_shares jsonb := '[]'::jsonb;
  v_invalid_items text[];
begin
  select id
    into v_receipt_id
    from public.tabby_receipts
   where editor_token = p_token
      or viewer_token = p_token
   limit 1;

  if v_receipt_id is null then
    raise exception 'Receipt not found';
  end if;

  select array_agg(distinct share_item.item_id)
    into v_invalid_items
    from jsonb_to_recordset(coalesce(p_shares, '[]'::jsonb)) as share_item(item_id text)
   where not exists (
     select 1
       from public.tabby_items item
      where item.receipt_id = v_receipt_id
        and item.id::text = share_item.item_id
   );

  if coalesce(array_length(v_invalid_items, 1), 0) > 0 then
    raise exception 'Some items do not belong to this receipt: %', array_to_string(v_invalid_items, ', ');
  end if;

  delete from public.tabby_item_shares
   where item_id in (
     select id from public.tabby_items where receipt_id = v_receipt_id
   );

  delete from public.tabby_people
   where receipt_id = v_receipt_id;

  for v_person in
    select value from jsonb_array_elements(coalesce(p_people, '[]'::jsonb))
  loop
    insert into public.tabby_people (
      receipt_id,
      name,
      avatar_url,
      venmo_handle,
      personal_credit,
      credit_note
    )
    values (
      v_receipt_id,
      v_person->>'name',
      nullif(v_person->>'avatar_url', ''),
      nullif(v_person->>'venmo_handle', ''),
      greatest(coalesce(nullif(v_person->>'personal_credit', '')::numeric, 0), 0),
      nullif(v_person->>'credit_note', '')
    )
    returning id into v_person_id;

    if v_person ? 'id' then
      v_person_map := v_person_map || jsonb_build_object(v_person->>'id', v_person_id::text);
    end if;

    v_people := v_people || jsonb_build_array(
      jsonb_build_object(
        'id', v_person_id,
        'client_id', v_person->>'id',
        'name', v_person->>'name',
        'avatar_url', nullif(v_person->>'avatar_url', ''),
        'venmo_handle', nullif(v_person->>'venmo_handle', ''),
        'personal_credit', greatest(coalesce(nullif(v_person->>'personal_credit', '')::numeric, 0), 0),
        'credit_note', nullif(v_person->>'credit_note', '')
      )
    );
  end loop;

  for v_share in
    select value from jsonb_array_elements(coalesce(p_shares, '[]'::jsonb))
  loop
    insert into public.tabby_item_shares (item_id, person_id, weight)
    values (
      (v_share->>'item_id')::uuid,
      coalesce(v_person_map->>(v_share->>'person_id'), v_share->>'person_id')::uuid,
      greatest(coalesce(nullif(v_share->>'weight', '')::numeric, 1), 0.0001)
    )
    returning person_id into v_person_id;

    v_shares := v_shares || jsonb_build_array(
      jsonb_build_object(
        'item_id', v_share->>'item_id',
        'person_id', v_person_id,
        'weight', greatest(coalesce(nullif(v_share->>'weight', '')::numeric, 1), 0.0001)
      )
    );
  end loop;

  return jsonb_build_object(
    'people', v_people,
    'peopleCount', jsonb_array_length(v_people),
    'shares', v_shares,
    'sharesCount', jsonb_array_length(v_shares)
  );
end;
$$;

revoke all on function public.save_receipt_assignments(text, jsonb, jsonb) from public;
grant execute on function public.save_receipt_assignments(text, jsonb, jsonb) to service_role;
