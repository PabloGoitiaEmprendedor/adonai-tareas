-- Friends can view tasks in public folders
CREATE POLICY "Friends can view tasks in public folders"
ON public.tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.folders f
    WHERE f.id = tasks.folder_id
      AND f.is_public = true
      AND EXISTS (
        SELECT 1 FROM public.friendships fr
        WHERE fr.status = 'accepted'
          AND (
            (fr.requester_id = auth.uid() AND fr.addressee_id = f.user_id)
            OR (fr.addressee_id = auth.uid() AND fr.requester_id = f.user_id)
          )
      )
  )
);

-- Friends can update tasks in public folders
CREATE POLICY "Friends can update tasks in public folders"
ON public.tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.folders f
    WHERE f.id = tasks.folder_id
      AND f.is_public = true
      AND EXISTS (
        SELECT 1 FROM public.friendships fr
        WHERE fr.status = 'accepted'
          AND (
            (fr.requester_id = auth.uid() AND fr.addressee_id = f.user_id)
            OR (fr.addressee_id = auth.uid() AND fr.requester_id = f.user_id)
          )
      )
  )
);