-- Adiciona columna email a google_calendar_tokens si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema='public' 
      AND table_name='google_calendar_tokens' 
      AND column_name='email'
  ) THEN
    ALTER TABLE public.google_calendar_tokens ADD COLUMN email TEXT;
  END IF;
END $$;
