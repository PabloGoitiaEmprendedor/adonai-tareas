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

  -- Merge user_context (handles unique user_id constraint)
  INSERT INTO user_context (
    user_id,
    occupation,
    industry,
    work_hours,
    personal_goals,
    work_style,
    energy_patterns,
    recurring_commitments,
    imported_context,
    ai_learned_patterns,
    priorities_summary,
    life_areas,
    gender,
    age_range,
    family_status,
    location,
    hobbies,
    stress_level,
    biggest_challenge,
    daily_routine_summary
  )
  SELECT
    new_user_id,
    occupation,
    industry,
    work_hours,
    personal_goals,
    work_style,
    energy_patterns,
    recurring_commitments,
    imported_context,
    ai_learned_patterns,
    priorities_summary,
    life_areas,
    gender,
    age_range,
    family_status,
    location,
    hobbies,
    stress_level,
    biggest_challenge,
    daily_routine_summary
  FROM user_context
  WHERE user_id = old_user_id
  ON CONFLICT (user_id) DO UPDATE
  SET occupation = COALESCE(user_context.occupation, EXCLUDED.occupation),
      industry = COALESCE(user_context.industry, EXCLUDED.industry),
      work_hours = COALESCE(user_context.work_hours, EXCLUDED.work_hours),
      personal_goals = COALESCE(user_context.personal_goals, EXCLUDED.personal_goals),
      work_style = COALESCE(user_context.work_style, EXCLUDED.work_style),
      energy_patterns = COALESCE(user_context.energy_patterns, EXCLUDED.energy_patterns),
      recurring_commitments = COALESCE(user_context.recurring_commitments, EXCLUDED.recurring_commitments),
      imported_context = COALESCE(user_context.imported_context, EXCLUDED.imported_context),
      ai_learned_patterns = EXCLUDED.ai_learned_patterns,
      priorities_summary = COALESCE(user_context.priorities_summary, EXCLUDED.priorities_summary),
      life_areas = EXCLUDED.life_areas,
      gender = COALESCE(user_context.gender, EXCLUDED.gender),
      age_range = COALESCE(user_context.age_range, EXCLUDED.age_range),
      family_status = COALESCE(user_context.family_status, EXCLUDED.family_status),
      location = COALESCE(user_context.location, EXCLUDED.location),
      hobbies = COALESCE(user_context.hobbies, EXCLUDED.hobbies),
      stress_level = COALESCE(user_context.stress_level, EXCLUDED.stress_level),
      biggest_challenge = COALESCE(user_context.biggest_challenge, EXCLUDED.biggest_challenge),
      daily_routine_summary = COALESCE(user_context.daily_routine_summary, EXCLUDED.daily_routine_summary);

  DELETE FROM user_context WHERE user_id = old_user_id;

  -- Merge user_achievements (handles UNIQUE(user_id, achievement_id))
  DELETE FROM user_achievements
  WHERE user_id = old_user_id
    AND achievement_id IN (
      SELECT achievement_id FROM user_achievements WHERE user_id = new_user_id
    );
  UPDATE user_achievements SET user_id = new_user_id WHERE user_id = old_user_id;

  -- Merge duplicate contexts (same user_id and name)
  UPDATE tasks t
  SET context_id = dest.id
  FROM contexts src
  JOIN contexts dest ON LOWER(dest.name) = LOWER(src.name) AND dest.user_id = new_user_id
  WHERE t.user_id = old_user_id
    AND t.context_id = src.id
    AND src.user_id = old_user_id;

  DELETE FROM contexts src
  WHERE src.user_id = old_user_id
    AND EXISTS (
      SELECT 1 FROM contexts dest 
      WHERE dest.user_id = new_user_id 
        AND LOWER(dest.name) = LOWER(src.name)
    );
  UPDATE contexts SET user_id = new_user_id WHERE user_id = old_user_id;

  -- Merge duplicate daily_priorities (same user_id and date)
  UPDATE daily_priorities dest
  SET task_ids = ARRAY(
        SELECT DISTINCT unnest(dest.task_ids || src.task_ids)
      ),
      intention = COALESCE(dest.intention, src.intention),
      mood_start = COALESCE(dest.mood_start, src.mood_start),
      mood_end = COALESCE(dest.mood_end, src.mood_end)
  FROM daily_priorities src
  WHERE src.user_id = old_user_id
    AND dest.user_id = new_user_id
    AND dest.date = src.date;

  DELETE FROM daily_priorities src
  WHERE src.user_id = old_user_id
    AND EXISTS (
      SELECT 1 FROM daily_priorities dest
      WHERE dest.user_id = new_user_id
        AND dest.date = src.date
    );
  UPDATE daily_priorities SET user_id = new_user_id WHERE user_id = old_user_id;

  -- Merge duplicate weekly_reviews (same user_id and week_start)
  UPDATE weekly_reviews dest
  SET tasks_completed = dest.tasks_completed + src.tasks_completed,
      tasks_skipped = dest.tasks_skipped + src.tasks_skipped,
      top_goal_id = COALESCE(dest.top_goal_id, src.top_goal_id),
      reflection = CASE 
        WHEN dest.reflection IS NOT NULL AND src.reflection IS NOT NULL AND dest.reflection <> src.reflection 
        THEN dest.reflection || E'\n' || src.reflection 
        ELSE COALESCE(dest.reflection, src.reflection) 
      END
  FROM weekly_reviews src
  WHERE src.user_id = old_user_id
    AND dest.user_id = new_user_id
    AND dest.week_start = src.week_start;

  DELETE FROM weekly_reviews src
  WHERE src.user_id = old_user_id
    AND EXISTS (
      SELECT 1 FROM weekly_reviews dest
      WHERE dest.user_id = new_user_id
        AND dest.week_start = src.week_start
    );
  UPDATE weekly_reviews SET user_id = new_user_id WHERE user_id = old_user_id;

  -- Update other simple tables
  UPDATE tasks SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE recurrence_rules SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE usage_events SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE folders SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE goals SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE time_blocks SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE voice_inputs SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE image_captures SET user_id = new_user_id WHERE user_id = old_user_id;
END;
$$;
