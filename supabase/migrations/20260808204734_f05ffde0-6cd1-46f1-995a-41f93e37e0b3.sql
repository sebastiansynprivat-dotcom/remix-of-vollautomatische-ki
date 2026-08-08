DO $$
DECLARE conv_ids uuid[]; fan_ids uuid[];
BEGIN
  SELECT array_agg(conversation_id) INTO conv_ids FROM public.sim_runs;
  IF conv_ids IS NULL THEN conv_ids := '{}'; END IF;
  SELECT array_agg(fan_id) INTO fan_ids FROM public.conversations WHERE id = ANY(conv_ids);
  IF fan_ids IS NULL THEN fan_ids := '{}'; END IF;

  DELETE FROM public.sim_telemetry;
  DELETE FROM public.messages WHERE conversation_id = ANY(conv_ids);
  DELETE FROM public.fan_brain WHERE fan_id = ANY(fan_ids);
  UPDATE public.conversations SET last_message_preview = NULL, unread_count = 0,
    last_message_from_model = false, last_message_at = now() WHERE id = ANY(conv_ids);
  DELETE FROM public.sim_runs;

  INSERT INTO public.sim_runs (conversation_id, persona, state, sim_day, turn_count, session_turn,
    phase, purchases_in_session, max_sim_days, last_followup_day, gap_hours, next_run_at, started_at, locked_at)
  SELECT c.id, p.persona, 'running', 1, 0, 0, 'active', 0, 14, 0, 0, now(), now(), NULL
  FROM (SELECT unnest(ARRAY['never_buyer','whale_all','dirty_talker','bonder','bargain_hunter','skeptic','shy_quiet','chaos_burster','ghoster','starter_buyer']) AS persona,
               generate_series(1,10) AS rn) p
  JOIN (SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM public.conversations WHERE id = ANY(conv_ids)) c
    ON c.rn = p.rn;
END $$;