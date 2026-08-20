-- Idempotent setup for public.projects + RLS policies
-- Safe to re-run. Assumes the projects table already exists.

-- ── 1. Ensure projects table exists (no-op if already present) ───────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  color TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes (idempotent via IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS projects_user_status_idx ON public.projects (user_id, status);

-- Link tasks to projects (nullable). Skip if column already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.tasks
      ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS tasks_user_project_idx ON public.tasks (user_id, project_id);

-- ── 2. Enable RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ── 3. Drop existing policies (idempotent re-creation) ──────────────────────
DROP POLICY IF EXISTS "Users can view their own projects"   ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects"  ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects"  ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects"  ON public.projects;

-- ── 4. Recreate RLS policies ────────────────────────────────────────────────
CREATE POLICY "Users can view their own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── 5. updated_at trigger (idempotent) ──────────────────────────────────────
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── 6. Verify ───────────────────────────────────────────────────────────────
-- Should list 4 policies for public.projects
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'public.projects'::regclass
ORDER BY polname;
