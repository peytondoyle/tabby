-- ============================
-- Tabby Seed: Sample Bill Data
-- ============================

-- Create a sample bill with people and items
do $$
declare
  b_id uuid := gen_random_uuid();
  e_token text := encode(gen_random_bytes(16), 'hex');
  v_token text := encode(gen_random_bytes(16), 'hex');
  p1_id uuid := gen_random_uuid();
  p2_id uuid := gen_random_uuid();
  p3_id uuid := gen_random_uuid();
  i1_id uuid := gen_random_uuid();
  i2_id uuid := gen_random_uuid();
  i3_id uuid := gen_random_uuid();
begin
  -- Insert sample bill
  insert into public.bills (id, title, place, date, subtotal, sales_tax, tip, editor_token, viewer_token)
  values (b_id, 'Tabby Test Bill', 'Billy''s Cafe', now()::date, 60.14, 5.16, 13.06, e_token, v_token);
  
  -- Insert people
  insert into public.people (id, bill_id, name, venmo_handle)
  values 
    (p1_id, b_id, 'Louis', '@louis-dev'),
    (p2_id, b_id, 'Peyton', '@peyton-tabby'),
    (p3_id, b_id, 'Avery', '@avery-split');
  
  -- Insert items
  insert into public.items (id, bill_id, label, qty, unit_price, emoji)
  values 
    (i1_id, b_id, 'Eggs Benedict', 1, 12.34, '🥚'),
    (i2_id, b_id, 'Bacon & Toast', 1, 8.49, '🥓'),
    (i3_id, b_id, 'Coffee', 2, 3.50, '☕');
  
  -- Insert item shares (Louis gets eggs, Peyton gets bacon, both share coffee)
  insert into public.item_shares (item_id, person_id, weight)
  values 
    (i1_id, p1_id, 1),  -- Louis gets eggs
    (i2_id, p2_id, 1),  -- Peyton gets bacon  
    (i3_id, p1_id, 1),  -- Louis gets 1 coffee
    (i3_id, p2_id, 1);  -- Peyton gets 1 coffee
  
  -- Log the tokens for easy access
  raise notice 'Sample bill created with editor_token: %', e_token;
  raise notice 'Sample bill created with viewer_token: %', v_token;
end$$;
