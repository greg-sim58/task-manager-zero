# Add Secure Notes — Plan

## Goal

Tools page "Notes" link opens a gated notes list. User must enter a per-user key (alphanumeric, min 4 chars) before the list is shown. If no key is set in the user's profile, access is denied. The user sets the key from Settings → Data tab.

## Schema

### `profiles` table (per-user settings)

- `user_id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE`
- `notes_key TEXT` (nullable — NULL means no access)
- `created_at`, `updated_at`
- RLS: SELECT/INSERT/UPDATE on `auth.uid() = user_id`
- `updated_at` trigger reusing `public.update_updated_at_column()`

### `notes` table

- `id UUID PK`, `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
- `title TEXT NOT NULL`, `body TEXT`, `created_at`, `updated_at`
- RLS: full CRUD on `auth.uid() = user_id`
- `updated_at` trigger
- Indexes on `user_id`

## Helper — `src/lib/notesGate.ts`

```ts
verifyNotesKey(userId, enteredKey): Promise<boolean>
  // SELECT notes_key FROM profiles WHERE user_id = ?
  // NULL or no row or mismatch -> false
  // match -> true

setNotesKey(userId, key): Promise<void>
  // UPSERT into profiles (user_id, notes_key, updated_at)
```

Both log errors to `console.error` and return false/void — never throw.

## UI components

### `NotesGateDialog.tsx`

shadcn Dialog with:
- Password-type Input
- Format validation `/^[A-Za-z0-9]{4,}$/` (disable Submit until valid)
- `verifyNotesKey()` on submit -> `onUnlock()` callback on success
- Error state: "Incorrect key" inline

### `Notes.tsx` page

- Mount guard: `sessionStorage.getItem('notes-unlocked')` else `navigate('/tools')`
- `fetchNotes()` -> list (title + body preview + timestamp)
- Empty state card (matches `Projects.tsx`)
- "New note" button -> inline form (title Input + body Textarea + Save)
- Realtime subscription on `notes` -> refetch
- Cleanup channel on unmount

## Edits

| File | Change |
|------|--------|
| `src/pages/Tools.tsx` | Notes card `onClick` -> open dialog; `onUnlock` -> set sessionStorage + `navigate('/notes')` |
| `src/pages/Settings.tsx` | Data tab: "Notes Access Key" Input (password) + Save button wired to `setNotesKey()` |
| `src/App.tsx` | Add `<Route path="/notes" element={<Notes />} />` inside `DashboardLayout` |

## New files

- `supabase/migrations/20260820120000_create_notes.sql`
- `supabase/fix_notes.sql` (idempotent paste-ready)
- `database-tasks/notes-gate.md`
- `src/lib/notesGate.ts`
- `src/components/NotesGateDialog.tsx`
- `src/pages/Notes.tsx`

## Flow

```
Tools -> click "Notes" card
  -> NotesGateDialog opens
  -> user enters key (alphanumeric, >=4 chars)
  -> verifyNotesKey(user.id, enteredKey)
       - if profile.notes_key IS NULL       -> return false (deny)
       - if enteredKey === profile.notes_key -> return true
       - else                                -> return false
  -> on success:
       sessionStorage.setItem('notes-unlocked', '1')
       navigate('/notes')
  -> on failure: show "Incorrect key", keep dialog open

/notes page:
  -> on mount, check sessionStorage 'notes-unlocked'
       - not set -> navigate('/tools') (bounce back)
       - set -> fetchNotes(), render list + "New note" button
  -> "New note" opens inline form (title Input + body Textarea + Save)
       -> supabase.from('notes').insert([{ title, body, user_id }])
       -> refetch, close form
  -> Realtime subscription on 'notes' table -> refetch
  -> Empty state: "No notes yet." card

Settings -> Data tab:
  -> "Notes Access Key" Input (type=password, alphanumeric, >=4 chars)
  -> Save button -> setNotesKey(user.id, key)
       -> upsert into profiles (insert if no row, update if exists)
       -> toast "Key saved"
```

## Validation rules

- Alphanumeric only: `/^[A-Za-z0-9]+$/`
- Minimum 4 characters
- No max (or reasonable cap, e.g. 64)
- Submit button disabled until valid format
- Inline error message on format violation

## Prerequisites before testing

1. Apply `supabase/fix_notes.sql` via Dashboard SQL Editor.
2. Regenerate `src/integrations/supabase/types.ts` via Supabase CLI.
3. `npm run lint && npm run build`

## Verification checklist

1. Fresh user, no key set: Tools -> Notes -> enter anything -> "Incorrect key." Access denied.
2. Settings -> Data -> set key "abcd" -> Save -> toast.
3. Tools -> Notes -> enter "abcd" -> navigates to `/notes`, list renders.
4. Wrong key "xyz" -> "Incorrect key", stays on dialog.
5. Deep-link to `/notes` without unlocking -> bounces to `/tools`.
6. "New note" form: create a note -> appears in list.
7. Refresh tab -> still unlocked. Close tab + reopen -> re-prompts.
