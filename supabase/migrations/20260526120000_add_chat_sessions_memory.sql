-- Tabla de sesiones de chat persistentes
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat sessions"
  ON chat_sessions FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- Tabla de memoria del usuario (hechos aprendidos por el agente)
CREATE TABLE IF NOT EXISTS chat_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  confidence REAL NOT NULL DEFAULT 0.7,
  source TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own memories"
  ON chat_memories FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX idx_chat_memories_user_id ON chat_memories(user_id);
CREATE INDEX idx_chat_memories_category ON chat_memories(category);

-- Tabla de system prompts globales (admin)
CREATE TABLE IF NOT EXISTS chat_global_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_global_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage global prompts"
  ON chat_global_prompts FOR ALL
  USING (is_adonai_admin());

CREATE POLICY "Anyone can read active prompt"
  ON chat_global_prompts FOR SELECT
  USING (is_active = true);
