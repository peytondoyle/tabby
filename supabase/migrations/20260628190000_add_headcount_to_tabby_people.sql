alter table if exists public.tabby_people
  add column if not exists headcount integer not null default 1;

alter table if exists public.tabby_people
  alter column headcount set default 1;

update public.tabby_people
  set headcount = greatest(coalesce(headcount, 1), 1)
  where headcount is null or headcount < 1;

alter table if exists public.tabby_people
  add constraint if not exists tabby_people_headcount_positive check (headcount > 0);

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
      headcount,
      personal_credit,
      credit_note
    )
    values (
      v_receipt_id,
      v_person->>'name',
      nullif(v_person->>'avatar_url', ''),
      nullif(v_person->>'venmo_handle', ''),
      greatest(coalesce(nullif(v_person->>'headcount', '')::integer, 1), 1),
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
        'headcount', greatest(coalesce(nullif(v_person->>'headcount', '')::integer, 1), 1),
        'venmo_handle', nullif(v_person->>'venmo_handle', ''),
        'personal_credit', greatest(coalesce(nullif(v_person->>'personal_credit', '')::numeric, 0), 0),
        'credit_note', nullif(v_person->>'credit_note', '')
      )
    );
  end loop;

  for v_share in
    select value from jsonb_to_recordset(coalesce(p_shares, '[]'::jsonb))
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
