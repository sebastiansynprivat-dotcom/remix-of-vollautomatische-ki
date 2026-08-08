CREATE TABLE IF NOT EXISTS public.sim_telemetry (
  id bigint generated always as identity primary key,
  sim_run_id uuid REFERENCES public.sim_runs(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  persona text,
  sim_day int,
  turn_count int,
  offer_no int,
  offer_price_cents int,
  offer_purchased boolean,
  offer_retry_count int DEFAULT 0,
  model_msg_count int,
  fan_msg_count int,
  model_total_chars int,
  fan_total_chars int,
  repetition_dropped int DEFAULT 0,
  phase text,
  session_turn int,
  model_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sim_telemetry TO authenticated;
GRANT ALL ON public.sim_telemetry TO service_role;

ALTER TABLE public.sim_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY sim_telemetry_read ON public.sim_telemetry FOR SELECT TO authenticated USING (true);
CREATE POLICY sim_telemetry_write ON public.sim_telemetry FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sim_telemetry_created_at ON public.sim_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_telemetry_persona ON public.sim_telemetry(persona);