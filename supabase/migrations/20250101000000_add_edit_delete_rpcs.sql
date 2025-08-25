-- ============================
-- Add missing edit/delete RPCs for Phase 2
-- ============================

-- 9) Update an item (editor only)
create or replace function public.update_item_with_editor_token(
  etoken text,
  item_id uuid,
  p_label text default null,
  p_qty numeric default null,
  p_unit_price numeric default null,
  p_emoji text default null
) returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
  _i public.items;
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

  update public.items set
    label = coalesce(p_label, label),
    qty = coalesce(p_qty, qty),
    unit_price = coalesce(p_unit_price, unit_price),
    emoji = coalesce(p_emoji, emoji)
  where id = item_id
  returning * into _i;

  return _i;
end;
$$;
grant execute on function public.update_item_with_editor_token(text, uuid, text, numeric, numeric, text) to anon, authenticated;

-- 10) Delete an item (editor only) - cascades to item_shares
create or replace function public.delete_item_with_editor_token(
  etoken text,
  item_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
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

  -- Delete the item (cascades to item_shares due to FK constraint)
  delete from public.items where id = item_id;
  
  return true;
end;
$$;
grant execute on function public.delete_item_with_editor_token(text, uuid) to anon, authenticated;

-- 11) Update a person (editor only)
create or replace function public.update_person_with_editor_token(
  etoken text,
  person_id uuid,
  p_name text default null,
  p_avatar_url text default null,
  p_venmo text default null
) returns public.people
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
  _p public.people;
begin
  -- Validate editor owns the bill that owns the person
  select exists (
    select 1
    from public.people p
    join public.bills b on b.id = p.bill_id
    where p.id = person_id
      and b.editor_token = etoken
  ) into _ok;

  if not _ok then
    raise exception 'invalid editor token';
  end if;

  update public.people set
    name = coalesce(p_name, name),
    avatar_url = coalesce(p_avatar_url, avatar_url),
    venmo_handle = public.normalize_handle(p_venmo)
  where id = person_id
  returning * into _p;

  return _p;
end;
$$;
grant execute on function public.update_person_with_editor_token(text, uuid, text, text, text) to anon, authenticated;

-- 12) Delete a person (editor only) - cascades to item_shares
create or replace function public.delete_person_with_editor_token(
  etoken text,
  person_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
begin
  -- Validate editor owns the bill that owns the person
  select exists (
    select 1
    from public.people p
    join public.bills b on b.id = p.bill_id
    where p.id = person_id
      and b.editor_token = etoken
  ) into _ok;

  if not _ok then
    raise exception 'invalid editor token';
  end if;

  -- Delete the person (cascades to item_shares due to FK constraint)
  delete from public.people where id = person_id;
  
  return true;
end;
$$;
grant execute on function public.delete_person_with_editor_token(text, uuid) to anon, authenticated;
