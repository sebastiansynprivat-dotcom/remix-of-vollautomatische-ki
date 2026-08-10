CREATE TABLE IF NOT EXISTS public.model_stats_daily (
  id bigint generated always as identity primary key,
  model_id uuid REFERENCES public.model_profiles(id) ON DELETE CASCADE,
  stat_date date NOT NULL,
  messages_sent int NOT NULL DEFAULT 0,
  messages_received int NOT NULL DEFAULT 0,
  offers_made int NOT NULL DEFAULT 0,
  offers_accepted int NOT NULL DEFAULT 0,
  revenue_cents int NOT NULL DEFAULT 0,
  active_conversations int NOT NULL DEFAULT 0,
  inactive_stops int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, stat_date)
);

GRANT SELECT ON public.model_stats_daily TO authenticated;
GRANT ALL ON public.model_stats_daily TO service_role;

ALTER TABLE public.model_stats_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY model_stats_read ON public.model_stats_daily
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER trg_model_stats_daily_updated
  BEFORE UPDATE ON public.model_stats_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();