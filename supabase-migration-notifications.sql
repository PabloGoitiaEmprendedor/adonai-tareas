-- Ejecuta esto en el SQL Editor de Supabase (https://supabase.com/dashboard/project/bpckgibqjrqdxzbvtiyn/sql/new)

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'user')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Solo el admin (pablogoitiaemprendedor@gmail.com) puede ver y crear notificaciones
CREATE POLICY "Admin can manage notifications"
  ON admin_notifications
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Todos los usuarios autenticados pueden leer las notificaciones dirigidas a ellos
CREATE POLICY "Users can read notifications"
  ON admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    target_type = 'all'
    OR target_user_id = auth.uid()
  );
