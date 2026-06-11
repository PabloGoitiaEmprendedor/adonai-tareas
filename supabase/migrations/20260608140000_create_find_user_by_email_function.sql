CREATE OR REPLACE FUNCTION public.find_user_by_email(target_email TEXT)
RETURNS TABLE (id uuid, email TEXT, is_sso_user BOOLEAN, is_anonymous BOOLEAN, email_confirmed_at TIMESTAMPTZ, confirmed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.is_sso_user, u.is_anonymous, u.email_confirmed_at, u.confirmed_at
  FROM auth.users u
  WHERE u.email = target_email
  LIMIT 1;
END;
$$;
