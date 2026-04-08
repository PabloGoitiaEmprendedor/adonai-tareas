
INSERT INTO storage.buckets (id, name, public) VALUES ('context-files', 'context-files', false);

CREATE POLICY "Users can view own context files"
ON storage.objects FOR SELECT
USING (bucket_id = 'context-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own context files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'context-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own context files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'context-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own context files"
ON storage.objects FOR DELETE
USING (bucket_id = 'context-files' AND auth.uid()::text = (storage.foldername(name))[1]);
