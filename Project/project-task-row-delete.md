# Project task row delete (trash icon)

## Goal

On the **project detail** task list, add a trash icon on the right of each task row (where the red box is in the screenshot). Clicking it **deletes the task from the `tasks` table**, then refreshes the list.

## Approach

Extend shared `TaskRow` with an **optional** `onDelete` callback. Only `ProjectDetail` passes it, so `/tasks` stays unchanged. Icon is hover-visible on the right; click stops row-select propagation.

## Changes

### 1. `src/components/TaskRow.tsx`

- Import `Trash2` from `lucide-react` (and `Button` only if matching existing icon-button patterns; a plain `button` is fine to match expand/status controls).
- Add optional prop:
  ```ts
  onDelete?: (task: Task) => void;
  ```
- Render trash on the **right** of the row (after the title block), aligned to the red-box position:
  - `opacity-0 group-hover:opacity-100` (row already has `group`)
  - `e.stopPropagation()` so it does not open the details sidebar
  - destructive/muted hover styling consistent with `TaskDetailsSidebar` subtask delete
- Pass `onDelete` through to nested subtask `TaskRow`s so expanded children get the same control.

### 2. `src/pages/ProjectDetail.tsx`

- Generalize delete to accept a task (not only the sidebar selection):
  ```ts
  const handleDeleteTask = async (task?: Task) => {
    const target = task ?? selectedTask;
    if (!target) return;
    if (!confirm("Are you sure you want to delete this task?")) return;
    // supabase.from("tasks").delete().eq("id", target.id)
    // toast + close sidebar if target.id === selectedTask?.id
    // fetchTasks()
  };
  ```
- Wire row:
  ```tsx
  <TaskRow
    ...
    onDelete={handleDeleteTask}
  />
  ```
- Keep sidebar `onDelete={() => handleDeleteTask()}` (or `handleDeleteTask` bound to selected) so existing drawer delete still works.

## Behavior

| Action | Result |
|--------|--------|
| Click trash | Confirm → `DELETE` row in `tasks` by `id` → list refresh |
| Click rest of row | Still opens `TaskDetailsSidebar` |
| `/tasks` page | No trash (no `onDelete` prop) |

## Out of scope

- Soft-delete / “remove from project only” (`project_id = null`) — user asked to **delete from the table**
- Cascading subtask delete policy beyond current DB behavior
- Changing Tasks page row UI

## Verification

1. Open a project with tasks → hover a row → trash appears on the right.
2. Click trash → confirm → task gone from list and from DB; count updates.
3. Clicking trash does not open the sidebar.
4. Sidebar delete still works.
5. `/tasks` list has no new trash icon.
