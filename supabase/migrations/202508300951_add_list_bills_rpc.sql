-- Add proper list_bills RPC function for MyBillsPage
-- Returns bills with correct shape: token field and total_amount calculation

create or replace function public.list_bills()
returns table (
  id uuid,
  token text,
  title text,
  place text,
  date date,
  created_at timestamptz,
  item_count bigint,
  people_count bigint,
  total_amount numeric
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    b.editor_token as token,
    b.title,
    b.place,
    b.date,
    b.created_at,
    coalesce(ic.item_count, 0) as item_count,
    coalesce(pc.people_count, 0) as people_count,
    coalesce(b.subtotal, 0) + coalesce(b.sales_tax, 0) + coalesce(b.tip, 0) as total_amount
  from public.bills b
  left join (
    select bill_id, count(*) as item_count
    from public.items
    group by bill_id
  ) ic on ic.bill_id = b.id
  left join (
    select bill_id, count(*) as people_count
    from public.people
    group by bill_id
  ) pc on pc.bill_id = b.id
  order by b.created_at desc;
$$;

grant execute on function public.list_bills() to anon, authenticated;