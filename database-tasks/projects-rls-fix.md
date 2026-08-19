# Projects RLS Fix — INSERT Policy Missing

## Symptom

Creating a new project fails with:

```
new row violates row-level security policy for table "projects"
```

## Root Cause

The `projects` table exists with RLS enabled, but the **INSERT** policy
(`WITH CHECK (auth.uid() = user_id)`) is missing on the remote Supabase database.
With RLS on and no matching `WITH CHECK` policy, every insert is rejected —
even though `Projects.tsx:168` correctly passes `user_id` after an auth check.

Local migration `supabase/migrations/2026_train.py create_projects.sql` was
generated but never applied to the remote DB.

## Fix

Paste the SQL below into **Supabase Dashboard → SQL Editor** and run it.

```sql
-- Idempotent RLS setup for public.projects
-- Safe to re-run; skips objects that already exist.

-- 1. Enable RLS (no-op if already enabled)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (so re-runs don't conflict)
DROP POLICY IF EXISTS "Users can view their own projects"   ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects"  ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects"  ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects"  ON public.projects;

-- 3. Recreate all four RLS policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- 4. (Re)create updated_at trigger
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Verify — should list 4 policies
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'public.projects'::regclass
ORDER BY polname;
```

## Verification

1. Run the SQL block above.
2. Confirm the final `SELECT` returns 4 rows (SELECT, INSERT, UPDATE, DELETE).
3. In the app, sign in and create a new project — should succeed without the
   RLS error.

## Files Touched

- `supabase/fix_projects_rls.sql` — standalone SQL version of the fix.
- `database-tasks/projects-rls-fix.md` — this document.
