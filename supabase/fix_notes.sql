-- Idempotent setup for public.profiles + public.notes + RLS policies
-- Safe to re-run. Paste into Supabase Dashboard -> SQL Editor.
--
-- Handles two cases for public.profiles:
--   1. Table does not exist -> create with id PK (Supabase convention)
--   2. Table already exists -> add notes_key column if missing

-- ── 0. Ensure update_updated_at_column() exists ─────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── 1. profiles table (per-user settings) ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      notes_key TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
  ELSE
    -- profiles already exists (Supabase default uses `id` as PK).
    -- Add notes_key if it is missing.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'notes_key'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN notes_key TEXT;
    END IF;

    -- Ensure created_at/updated_at exist too (defensive)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.profiles
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.profiles
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    END IF;
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"  ON public.profiles;

-- Detect the PK column name: prefer `id`, fall back to `user_id`.
DO $$
DECLARE
  pk_col TEXT;
BEGIN
  SELECT a.attname
  INTO pk_col
  FROM pg_index i
  JOIN pg_attribute a
    ON a.attrelid = i.indrelid
       AND a.attnum = ANY (i.indkey)
  WHERE i.indrelid = 'public.profiles'::regclass
    AND i.indisprimary
  LIMIT 1;

  IF pk_col IS NULL THEN
    pk_col := 'id';
  END IF;

  EXECUTE format(
    'CREATE POLICY "Users can view their own profile"
       ON public.profiles FOR SELECT
       USING (auth.uid() = %I)',
    pk_col
  );
  EXECUTE format(
    'CREATE POLICY "Users can insert their own profile"
       ON public.profiles FOR INSERT
       WITH CHECK (auth.uid() = %I)',
    pk_col
  );
  EXECUTE format(
    'CREATE POLICY "Users can update their own profile"
       ON public.profiles FOR UPDATE
       USING (auth.uid() = %I)',
    pk_col
  );
END $$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. notes table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes (user_id);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notes"    ON public.notes;
DROP POLICY IF EXISTS "Users can create their own notes"   ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes"  ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes"  ON public.notes;

CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ── 3. Verify ───────────────────────────────────────────────────────────────
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid IN ('public.profiles'::regclass, 'public.notes'::regclass)
ORDER BY polrelid::regclass::text, polname;
