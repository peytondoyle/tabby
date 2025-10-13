-- ============================
-- Food Icons Cache Table
-- Shared icon cache for ALL users
-- ============================

-- Table to store generated food icons
create table if not exists public.food_icons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Food item identifier (normalized lowercase for matching)
  food_name text not null unique,

  -- Original name variants (for better matching)
  name_variants text[] not null default '{}',

  -- Generated icon URL (from DALL-E 3)
  icon_url text not null,

  -- Generation metadata
  generation_prompt text not null,
  dalle_model text not null default 'dall-e-3',
  image_size text not null default '1024x1024',
  image_quality text not null default 'standard',

  -- Usage statistics
  usage_count integer not null default 1,
  last_used_at timestamptz not null default now(),

  -- Moderation/quality flags
  is_approved boolean not null default true,
  is_flagged boolean not null default false,
  flag_reason text
);

-- Indexes for fast lookup
create index if not exists idx_food_icons_name on public.food_icons(food_name);
create index if not exists idx_food_icons_usage on public.food_icons(usage_count desc, last_used_at desc);
create index if not exists idx_food_icons_approved on public.food_icons(is_approved) where is_approved = true;

-- RLS: Allow read access for all (icons are public)
alter table public.food_icons enable row level security;

-- Public read policy (anyone can read approved icons)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
    and tablename='food_icons'
    and policyname='public_read_approved_icons'
  ) then
    create policy "public_read_approved_icons"
    on public.food_icons
    for select
    to anon, authenticated
    using (is_approved = true);
  end if;
end$$;

-- Function to get or mark an icon for generation
-- This allows atomic "get if exists, else mark as pending"
create or replace function public.get_or_reserve_food_icon(
  p_food_name text,
  p_name_variants text[] default '{}'
)
returns table (
  icon_id uuid,
  icon_url text,
  needs_generation boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  _normalized_name text;
  _existing_icon public.food_icons;
begin
  -- Normalize food name (lowercase, trim)
  _normalized_name := lower(trim(p_food_name));

  -- Try to find existing icon
  select * into _existing_icon
  from public.food_icons
  where food_name = _normalized_name
  and is_approved = true
  limit 1;

  if found then
    -- Update usage stats
    update public.food_icons
    set usage_count = usage_count + 1,
        last_used_at = now()
    where id = _existing_icon.id;

    -- Return existing icon
    return query select
      _existing_icon.id,
      _existing_icon.icon_url,
      false as needs_generation;
  else
    -- No existing icon, return signal to generate
    return query select
      null::uuid as icon_id,
      null::text as icon_url,
      true as needs_generation;
  end if;
end;
$$;
grant execute on function public.get_or_reserve_food_icon(text, text[]) to anon, authenticated;

-- Function to store a newly generated icon
create or replace function public.store_food_icon(
  p_food_name text,
  p_name_variants text[],
  p_icon_url text,
  p_prompt text,
  p_model text default 'dall-e-3',
  p_size text default '1024x1024',
  p_quality text default 'standard'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _normalized_name text;
  _icon_id uuid;
begin
  -- Normalize food name
  _normalized_name := lower(trim(p_food_name));

  -- Insert new icon (on conflict, update the URL)
  insert into public.food_icons (
    food_name,
    name_variants,
    icon_url,
    generation_prompt,
    dalle_model,
    image_size,
    image_quality
  )
  values (
    _normalized_name,
    p_name_variants,
    p_icon_url,
    p_prompt,
    p_model,
    p_size,
    p_quality
  )
  on conflict (food_name) do update set
    icon_url = excluded.icon_url,
    generation_prompt = excluded.generation_prompt,
    usage_count = public.food_icons.usage_count + 1,
    last_used_at = now()
  returning id into _icon_id;

  return _icon_id;
end;
$$;
grant execute on function public.store_food_icon(text, text[], text, text, text, text, text) to anon, authenticated;

-- Function to get multiple icons at once (batch lookup)
create or replace function public.get_food_icons_batch(
  p_food_names text[]
)
returns table (
  food_name text,
  icon_url text
)
language sql
security definer
set search_path = public
as $$
  select
    f.food_name,
    f.icon_url
  from public.food_icons f
  where f.food_name = any(p_food_names)
  and f.is_approved = true;
$$;
grant execute on function public.get_food_icons_batch(text[]) to anon, authenticated;

-- Comment for documentation
comment on table public.food_icons is 'Shared cache of AI-generated food icons, accessible to all users for consistent beautiful food item visualization';
