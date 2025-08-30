-- ============================
-- Add create_bill RPC function for receipt scanning
-- ============================

-- Create bill function
create or replace function public.create_bill(
  p_title text,
  p_place text default null,
  p_date text default null,
  sales_tax numeric default 0,
  tip numeric default 0,
  tax_split_method text default 'proportional',
  tip_split_method text default 'proportional'
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  _bill public.bills;
  _editor_token text;
  _viewer_token text;
  _result json;
begin
  -- Generate tokens
  _editor_token := 'e_' || encode(gen_random_bytes(16), 'hex');
  _viewer_token := 'v_' || encode(gen_random_bytes(16), 'hex');
  
  -- Insert new bill
  insert into public.bills (
    title,
    place,
    date,
    sales_tax,
    tip,
    tax_split_method,
    tip_split_method,
    editor_token,
    viewer_token
  ) values (
    p_title,
    p_place,
    coalesce(p_date, current_date::text),
    sales_tax,
    tip,
    tax_split_method,
    tip_split_method,
    _editor_token,
    _viewer_token
  ) returning * into _bill;
  
  -- Return bill data with tokens
  _result := json_build_object(
    'id', _bill.id,
    'token', _editor_token,
    'viewer_token', _viewer_token,
    'title', _bill.title,
    'place', _bill.place,
    'date', _bill.date
  );
  
  return _result;
end;
$$;

grant execute on function public.create_bill(text, text, text, numeric, numeric, text, text) to anon, authenticated;

-- Create item function for receipt scanning
create or replace function public.create_item(
  bill_id uuid,
  emoji text,
  label text,
  price numeric,
  quantity numeric default 1,
  unit_price numeric default null,
  source text default 'manual'
) returns public.items
language plpgsql
security definer
set search_path = public
as $$
declare
  _item public.items;
begin
  -- Insert new item
  insert into public.items (
    bill_id,
    emoji,
    label,
    qty,
    unit_price
  ) values (
    bill_id,
    emoji,
    label,
    quantity,
    coalesce(unit_price, price / quantity)
  ) returning * into _item;
  
  return _item;
end;
$$;

grant execute on function public.create_item(uuid, text, text, numeric, numeric, numeric, text) to anon, authenticated;