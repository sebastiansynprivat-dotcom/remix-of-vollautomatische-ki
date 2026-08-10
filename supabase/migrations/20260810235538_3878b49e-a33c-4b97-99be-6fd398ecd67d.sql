alter table public.model_profiles add column if not exists birthplace text;
alter table public.model_profiles add column if not exists physical jsonb;
alter table public.model_profiles add column if not exists favorites jsonb;
alter table public.model_profiles add column if not exists content_info text;
alter table public.model_profiles add column if not exists no_gos text;
alter table public.model_profiles add column if not exists additional_info text;
alter table public.model_profiles add column if not exists dream text;