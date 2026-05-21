CREATE OR REPLACE FUNCTION migrate_anonymous_data(old_user_id uuid, new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() <> new_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Merge old profile data into the new row (no deletes)
  UPDATE profiles dest
  SET name = src.name,
      email = src.email,
      onboarding_completed = src.onboarding_completed,
      main_goal_id = src.main_goal_id,
      organization_style = src.organization_style,
      preferred_input = src.preferred_input,
      theme = src.theme,
      timezone = src.timezone,
      accent_color = src.accent_color
  FROM profiles src
  WHERE src.user_id = old_user_id AND dest.user_id = new_user_id;

  -- Merge old settings into the new row
  UPDATE settings dest
  SET focus_level = src.focus_level,
      notifications_enabled = src.notifications_enabled,
      reminder_style = src.reminder_style,
      voice_enabled = src.voice_enabled
  FROM settings src
  WHERE src.user_id = old_user_id AND dest.user_id = new_user_id;

  -- Reassign tables that can have multiple rows per user
  UPDATE tasks SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE recurrence_rules SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE usage_events SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE daily_priorities SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE folders SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE goals SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE time_blocks SET user_id = new_user_id WHERE user_id = old_user_id;
  UPDATE user_email_settings SET user_id = new_user_id WHERE user_id = old_user_id;
END;
$$;
