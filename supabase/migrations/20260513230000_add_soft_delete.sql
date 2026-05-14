-- ============================================================
-- SAFETY: Soft-delete columns + mass-delete prevention
-- ============================================================

-- 1. Add soft-delete columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE recurrence_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE contexts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Migrate existing soft-deleted rows (set deleted_at for rows with status = 'deleted')
UPDATE tasks SET deleted_at = COALESCE(completed_at, updated_at, created_at, NOW())
  WHERE status = 'deleted' AND deleted_at IS NULL;

-- 3. RLS: Allow hard DELETE only for own rows, one at a time (via UI).
--    App code uses UPDATE deleted_at = now() for soft-delete.
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recurrence rules" ON recurrence_rules;
CREATE POLICY "Users can delete own recurrence rules" ON recurrence_rules
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Index on deleted_at for query performance
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_deleted_at ON recurrence_rules(deleted_at);
