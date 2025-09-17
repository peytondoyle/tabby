-- Add constraints and improvements to item_shares table
-- This migration adds weight validation, unique constraints, and better conflict handling

-- Add CHECK constraint to ensure weight > 0
ALTER TABLE public.item_shares 
ADD CONSTRAINT check_weight_positive CHECK (weight > 0);

-- Add unique index on (item_id, person_id) if it doesn't exist
-- (This should already exist as primary key, but let's be explicit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_shares_unique 
ON public.item_shares(item_id, person_id);

-- Add trigger to clamp excessive weights (> 100) for safety
CREATE OR REPLACE FUNCTION public.clamp_item_share_weight()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clamp weight to reasonable range (1-100)
  IF NEW.weight > 100 THEN
    NEW.weight := 100;
  ELSIF NEW.weight <= 0 THEN
    RAISE EXCEPTION 'Weight must be greater than 0';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_clamp_item_share_weight ON public.item_shares;
CREATE TRIGGER trigger_clamp_item_share_weight
  BEFORE INSERT OR UPDATE ON public.item_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.clamp_item_share_weight();

-- Update the upsert function to handle conflicts better
CREATE OR REPLACE FUNCTION public.upsert_item_share_with_editor_token(
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
  _existing_weight numeric;
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

  -- Validate weight before processing
  if weight <= 0 then
    raise exception 'Weight must be greater than 0';
  end if;

  -- Check if share already exists to handle weight updates
  select s.weight into _existing_weight
  from public.item_shares s
  where s.item_id = upsert_item_share_with_editor_token.item_id
    and s.person_id = upsert_item_share_with_editor_token.person_id;

  if _existing_weight is not null then
    -- Update existing share: add 1 to current weight (or preserve and normalize)
    insert into public.item_shares (item_id, person_id, weight)
    values (item_id, person_id, _existing_weight + 1)
    on conflict (item_id, person_id) do update set weight = excluded.weight
    returning * into _s;
  else
    -- Create new share with specified weight
    insert into public.item_shares (item_id, person_id, weight)
    values (item_id, person_id, coalesce(weight, 1))
    on conflict (item_id, person_id) do update set weight = excluded.weight
    returning * into _s;
  end if;

  return _s;
end;
$$;

-- Add RPC for bulk upserting multiple item shares
CREATE OR REPLACE FUNCTION public.bulk_upsert_item_shares_with_editor_token(
  etoken text,
  shares jsonb -- Array of {item_id, person_id, weight} objects
) returns table(item_id uuid, person_id uuid, weight numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean;
  _share jsonb;
  _item_id uuid;
  _person_id uuid;
  _weight numeric;
begin
  -- Validate editor token
  select exists (
    select 1
    from public.bills b
    where b.editor_token = etoken
  ) into _ok;

  if not _ok then
    raise exception 'invalid editor token';
  end if;

  -- Process each share
  for _share in select * from jsonb_array_elements(shares)
  loop
    _item_id := (_share->>'item_id')::uuid;
    _person_id := (_share->>'person_id')::uuid;
    _weight := coalesce((_share->>'weight')::numeric, 1);

    -- Validate weight
    if _weight <= 0 then
      raise exception 'Weight must be greater than 0 for item %', _item_id;
    end if;

    -- Upsert the share
    insert into public.item_shares (item_id, person_id, weight)
    values (_item_id, _person_id, _weight)
    on conflict (item_id, person_id) do update set weight = excluded.weight;
  end loop;

  -- Return all shares for this bill
  return query
  select s.item_id, s.person_id, s.weight
  from public.item_shares s
  join public.items i on i.id = s.item_id
  join public.bills b on b.id = i.bill_id
  where b.editor_token = etoken;
end;
$$;

grant execute on function public.bulk_upsert_item_shares_with_editor_token(text, jsonb) to anon, authenticated;
