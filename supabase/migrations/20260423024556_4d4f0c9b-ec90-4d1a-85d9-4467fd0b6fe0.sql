ALTER TABLE public.notion_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notion tokens"
ON public.notion_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notion tokens"
ON public.notion_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notion tokens"
ON public.notion_tokens FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notion tokens"
ON public.notion_tokens FOR DELETE USING (auth.uid() = user_id);