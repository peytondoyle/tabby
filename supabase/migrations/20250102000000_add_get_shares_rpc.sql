-- Add RPC to get item shares by bill token
create or replace function public.get_shares_by_token(bill_token text)
returns table(item_id uuid, person_id uuid, weight numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select s.item_id, s.person_id, s.weight
  from public.item_shares s
  join public.items i on i.id = s.item_id
  join public.bills b on b.id = i.bill_id
  where b.editor_token = bill_token or b.viewer_token = bill_token;
end;
$$;

grant execute on function public.get_shares_by_token(text) to anon, authenticated;