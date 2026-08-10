-- PART 1: platform connections
CREATE TABLE IF NOT EXISTS public.profile_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.model_profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  account_handle text,
  is_connected boolean NOT NULL DEFAULT false,
  auto_mode_enabled boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  connection_status text NOT NULL DEFAULT 'disconnected',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_platforms TO authenticated;
GRANT ALL ON public.profile_platforms TO service_role;
ALTER TABLE public.profile_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read platform links" ON public.profile_platforms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage platform links" ON public.profile_platforms
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_profile_platforms_updated BEFORE UPDATE ON public.profile_platforms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PART 2: system events
CREATE TABLE IF NOT EXISTS public.system_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid REFERENCES public.model_profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  message text NOT NULL,
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_events_created_idx ON public.system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS system_events_profile_idx ON public.system_events(profile_id);
GRANT SELECT ON public.system_events TO authenticated;
GRANT ALL ON public.system_events TO service_role;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read events" ON public.system_events
  FOR SELECT TO authenticated USING (true);

-- PART 3: template inheritance
ALTER TABLE public.model_profiles ADD COLUMN IF NOT EXISTS parent_template_id uuid REFERENCES public.model_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.model_profiles ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

-- PART 4: global limits + request log
CREATE TABLE IF NOT EXISTS public.system_limits (
  id int PRIMARY KEY DEFAULT 1,
  max_requests_per_minute int NOT NULL DEFAULT 60,
  max_concurrent_profiles int NOT NULL DEFAULT 20,
  max_daily_cost_cents int NOT NULL DEFAULT 5000,
  current_daily_cost_cents int NOT NULL DEFAULT 0,
  current_rpm int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_limits_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.system_limits TO authenticated;
GRANT ALL ON public.system_limits TO service_role;
ALTER TABLE public.system_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read limits" ON public.system_limits
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage limits" ON public.system_limits
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.system_limits (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.api_request_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id uuid REFERENCES public.model_profiles(id) ON DELETE SET NULL,
  endpoint text,
  tokens_used int NOT NULL DEFAULT 0,
  cost_cents int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_request_log_created_idx ON public.api_request_log(created_at DESC);
GRANT SELECT ON public.api_request_log TO authenticated;
GRANT ALL ON public.api_request_log TO service_role;
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read api log" ON public.api_request_log
  FOR SELECT TO authenticated USING (true);