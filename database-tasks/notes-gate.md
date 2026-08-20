# Notes Gate — Setup & Fix

## Symptom

Tools -> Notes card asks for a key. If the user has no key set in their profile, access is denied.

## Root Cause / Design

Notes access is gated by a per-user key stored in `profiles.notes_key`. If that column is NULL (or the profile row doesn't exist), any entered key is rejected. The user must set a key first from Settings -> Data tab.

## Schema

Two new tables (see `supabase/migrations/20260820120000_create_notes.sql`):

- **profiles**: `user_id` PK, `notes_key` (nullable), timestamps. RLS: SELECT/INSERT/UPDATE on `auth.uid() = user_id`.
- **notes**: `id` PK, `user_id` FK, `title`, `body`, timestamps. RLS: full CRUD on `auth.uid() = user_id`.

Both reuse `public.update_updated_at_column()` for `updated_at` triggers.

## Fix

Paste `supabase/fix_notes.sql` into **Supabase Dashboard -> SQL Editor** and run it. It is idempotent (safe to re-run).

After running, regenerate TypeScript types:

```bash
npx supabase gen types typescript --project-id qbuetuutztckgwifszes > src/integrations/supabase/types.ts
```

## Verification

1. Run the SQL block.
2. Confirm the final `SELECT` returns 3 policies for `profiles` and 4 for `notes`.
3. In the app, sign in and go to Settings -> Data -> set a Notes Access Key.
4. Tools -> Notes -> enter the key -> list renders.
5. Wrong key -> "Incorrect key" error.
6. Deep-link to `/notes` without unlocking -> bounces to `/tools`.

## Files Touched

- `supabase/migrations/20260820120000_create_notes.sql` - migration.
- `supabase/fix_notes.sql` - idempotent paste-ready SQL.
- `database-tasks/notes-gate.md` - this document.
- `src/lib/notesGate.ts` - `verifyNotesKey()`, `setNotesKey()`.
- `src/components/NotesGateDialog.tsx` - key prompt dialog.
- `src/pages/Notes.tsx` - gated notes list + "New note" form.
- `src/pages/Tools.tsx` - Notes card wired to dialog.
- `src/pages/Settings.tsx` - Data tab: Notes Access Key field.
- `src/App.tsx` - `/notes` route.
