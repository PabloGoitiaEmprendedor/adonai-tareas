-- Table for per-friend folder sharing
CREATE TABLE public.folder_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  shared_with_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(folder_id, shared_with_id)
);

ALTER TABLE public.folder_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage folder shares"
  ON public.folder_shares FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Shared user can view their shares"
  ON public.folder_shares FOR SELECT
  TO authenticated
  USING (auth.uid() = shared_with_id);

DROP POLICY IF EXISTS "Friends can view public folders" ON public.folders;

CREATE POLICY "Shared friends can view folders"
  ON public.folders FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.folder_shares fs
      WHERE fs.folder_id = folders.id
        AND fs.shared_with_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Friends can view tasks in public folders" ON public.tasks;
DROP POLICY IF EXISTS "Friends can update tasks in public folders" ON public.tasks;

CREATE POLICY "Shared friends can view tasks in shared folders"
  ON public.tasks FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.folder_shares fs
      WHERE fs.folder_id = tasks.folder_id
        AND fs.shared_with_id = auth.uid()
    )
  );

CREATE POLICY "Shared friends can update tasks in shared folders"
  ON public.tasks FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.folder_shares fs
      WHERE fs.folder_id = tasks.folder_id
        AND fs.shared_with_id = auth.uid()
    )
  );