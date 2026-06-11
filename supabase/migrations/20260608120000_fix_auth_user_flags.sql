-- Function to fix auth.users flags that prevent session creation
-- Called from Edge Function via supabaseAdmin.rpc()
CREATE OR REPLACE FUNCTION public.fix_auth_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
BEGIN
  UPDATE auth.users
  SET 
    is_sso_user = false,
    is_anonymous = false,
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmed_at = COALESCE(confirmed_at, now()),
    updated_at = now()
  WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;
