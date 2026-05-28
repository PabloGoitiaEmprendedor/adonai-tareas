CREATE OR REPLACE FUNCTION public.migrate_anonymous_data(old_user_id uuid, new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF old_user_id IS NULL OR new_user_id IS NULL OR old_user_id = new_user_id THEN
    RETURN;
  END IF;

  IF auth.uid() <> new_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO profiles (
    user_id,
    email,
    name,
    onboarding_completed,
    main_goal_id,
    organization_style,
    preferred_input,
    theme,
    timezone,
    accent_color
  )
  SELECT
    new_user_id,
    dest.email,
    src.name,
    src.onboarding_completed,
    src.main_goal_id,
    src.organization_style,
    src.preferred_input,
    src.theme,
    src.timezone,
    src.accent_color
  FROM profiles src
  LEFT JOIN profiles dest ON dest.user_id = new_user_id
  WHERE src.user_id = old_user_id
  ON CONFLICT (user_id) DO UPDATE
  SET name = EXCLUDED.name,
      email = COALESCE(profiles.email, EXCLUDED.email),
      onboarding_completed = EXCLUDED.onboarding_completed,
      main_goal_id = EXCLUDED.main_goal_id,
      organization_style = EXCLUDED.organization_style,
      preferred_input = EXCLUDED.preferred_input,
      theme = EXCLUDED.theme,
      timezone = EXCLUDED.timezone,
      accent_color = EXCLUDED.accent_color;

  INSERT INTO settings (
    user_id,
    focus_level,
    notifications_enabled,
    reminder_style,
    voice_enabled
  )
  SELECT
    new_user_id,
    focus_level,
    notifications_enabled,
    reminder_style,
    voice_enabled
  FROM settings
  WHERE user_id = old_user_id
  ON CONFLICT (user_id) DO UPDATE
  SET focus_level = EXCLUDED.focus_level,
      notifications_enabled = EXCLUDED.notifications_enabled,
      reminder_style = EXCLUDED.reminder_style,
      voice_enabled = EXCLUDED.voice_enabled;

  INSERT INTO experiment_metrics (
    user_id,
    day_1_used,
    day_2_used,
    day_3_used,
    last_active_date,
    level,
    streak_current,
    streak_max,
    tasks_completed_total,
    updated_at,
    user_activated,
    user_retained,
    xp_total
  )
  SELECT
    new_user_id,
    day_1_used,
    day_2_used,
    day_3_used,
    last_active_date,
    level,
    streak_current,
    streak_max,
    tasks_completed_total,
    updated_at,
    user_activated,
    user_retained,
    xp_total
  FROM experiment_metrics
  WHERE user_id = old_user_id
  ON CONFLICT (user_id) DO UPDATE
  SET day_1_used = EXCLUDED.day_1_used,
      day_2_used = EXCLUDED.day_2_used,
      day_3_used = EXCLUDED.day_3_used,
      last_active_date = EXCLUDED.last_active_date,
      level = GREATEST(experiment_metrics.level, EXCLUDED.level),
      streak_current = GREATEST(COALESCE(experiment_metrics.streak_current, 0), COALESCE(EXCLUDED.streak_current, 0)),
      streak_max = GREATEST(COALESCE(experiment_metrics.streak_max, 0), COALESCE(EXCLUDED.streak_max, 0)),
      tasks_completed_total = GREATEST(experiment_metrics.tasks_completed_total, EXCLUDED.tasks_completed_total),
      updated_at = now(),
      user_activated = COALESCE(EXCLUDED.user_activated, experiment_metrics.user_activated),
      user_retained = COALESCE(EXCLUDED.user_retained, experiment_metrics.user_retained),
      xp_total = GREATEST(experiment_metrics.xp_total, EXCLUDED.xp_total);

  UPDATE tasks SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE recurrence_rules SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE usage_events SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE daily_priorities SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE folders SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE goals SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE time_blocks SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE user_email_settings SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE contexts SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE user_achievements SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE user_context SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE voice_inputs SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE weekly_reviews SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE image_captures SET user_id = new_user_id WHERE user_id = old_user_id;
END;
$$;
