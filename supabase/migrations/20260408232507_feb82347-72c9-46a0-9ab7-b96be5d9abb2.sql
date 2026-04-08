
-- Friendships table (must be created first, referenced by folders policy)
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can create friend requests" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update received requests" ON public.friendships FOR UPDATE USING (auth.uid() = addressee_id);
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Folders table
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4BE277',
  icon TEXT DEFAULT 'folder',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Friends can view public folders" ON public.folders FOR SELECT USING (
  is_public = true AND EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = auth.uid() AND addressee_id = folders.user_id)
      OR (addressee_id = auth.uid() AND requester_id = folders.user_id)
    )
  )
);

-- Recurrence rules table
CREATE TABLE public.recurrence_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  interval INTEGER NOT NULL DEFAULT 1,
  days_of_week INTEGER[] DEFAULT '{}',
  day_of_month INTEGER,
  month_of_year INTEGER,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurrence rules" ON public.recurrence_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurrence rules" ON public.recurrence_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurrence rules" ON public.recurrence_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurrence rules" ON public.recurrence_rules FOR DELETE USING (auth.uid() = user_id);

-- Add folder_id and recurrence_id to tasks
ALTER TABLE public.tasks ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN recurrence_id UUID REFERENCES public.recurrence_rules(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_profiles_name ON public.profiles(name);
CREATE INDEX idx_folders_user_id ON public.folders(user_id);
CREATE INDEX idx_tasks_folder_id ON public.tasks(folder_id);
CREATE INDEX idx_friendships_users ON public.friendships(requester_id, addressee_id);

-- Allow authenticated users to search profiles for friend discovery
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
