-- Create landing_stats table for tracking landing page metrics
CREATE TABLE IF NOT EXISTS public.landing_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    event_name TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.landing_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public tracking)
CREATE POLICY "Allow public insert" ON public.landing_stats
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users (Admin) to select
CREATE POLICY "Allow authenticated select" ON public.landing_stats
    FOR SELECT TO authenticated USING (true);
