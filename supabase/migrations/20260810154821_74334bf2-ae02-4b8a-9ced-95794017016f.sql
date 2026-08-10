create table if not exists public.model_assets (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references public.model_profiles(id) on delete cascade,
  url text not null,
  thumbnail_url text,
  media_type text not null default 'photo',
  description text,
  tier int not null default 1 check (tier between 1 and 5),
  category text not null default 'portrait',
  tags text[] not null default '{}',
  value_cents int not null default 0,
  note text,
  use_count int not null default 0,
  response_count int not null default 0,
  revenue_total_cents int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.model_assets to authenticated;
grant all on public.model_assets to service_role;

alter table public.model_assets enable row level security;

create policy model_assets_read on public.model_assets
  for select to authenticated using (true);
create policy model_assets_write on public.model_assets
  for all to authenticated using (true) with check (true);

create index if not exists model_assets_model_idx on public.model_assets(model_id);
create index if not exists model_assets_tier_idx on public.model_assets(tier);
create index if not exists model_assets_value_idx on public.model_assets(value_cents);

create trigger trg_model_assets_updated
  before update on public.model_assets
  for each row execute function public.update_updated_at_column();

alter table public.messages add column if not exists asset_id uuid
  references public.model_assets(id) on delete set null;