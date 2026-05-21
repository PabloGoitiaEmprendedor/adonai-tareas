-- Add sheets_connected to settings table if it doesn't exist
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS sheets_connected BOOLEAN DEFAULT false;

-- Create google_sheets_tokens table
CREATE TABLE IF NOT EXISTS public.google_sheets_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.google_sheets_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for google_sheets_tokens
CREATE POLICY "Users can view own sheets tokens"
ON public.google_sheets_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sheets tokens"
ON public.google_sheets_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sheets tokens"
ON public.google_sheets_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sheets tokens"
ON public.google_sheets_tokens FOR DELETE
USING (auth.uid() = user_id);
