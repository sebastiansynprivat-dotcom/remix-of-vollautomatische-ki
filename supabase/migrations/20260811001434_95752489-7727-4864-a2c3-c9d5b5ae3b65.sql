CREATE TABLE IF NOT EXISTS public.content_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES public.model_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  time_of_day text NOT NULL DEFAULT 'any',
  price_cents int NOT NULL DEFAULT 0,
  tier int NOT NULL DEFAULT 1,
  tags text[] NOT NULL DEFAULT '{}',
  cover_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_sets TO authenticated;
GRANT ALL ON public.content_sets TO service_role;

ALTER TABLE public.content_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_sets_read" ON public.content_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "content_sets_write" ON public.content_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_content_sets_updated
BEFORE UPDATE ON public.content_sets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.model_assets ADD COLUMN IF NOT EXISTS set_id uuid REFERENCES public.content_sets(id) ON DELETE CASCADE;
ALTER TABLE public.model_assets ADD COLUMN IF NOT EXISTS sequence_order int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS content_sets_model_idx ON public.content_sets(model_id);
CREATE INDEX IF NOT EXISTS model_assets_set_idx ON public.model_assets(set_id);