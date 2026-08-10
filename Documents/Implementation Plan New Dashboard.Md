# Dashboard Rework — Match Reference Design

Rework the dashboard page to match the provided dark-mode reference image layout. The key mapping changes:
- **"Quick Notes" → Tasks** (show recent tasks with title, description snippet, and time ago)
- **"Active Sprints" → Notes** (list notes from the `notes` Supabase table with title and progress-style display)
- **Keep sidenav unchanged**

The reference image has a bento-grid layout with these widgets:
1. **Greeting header** — "Good afternoon, Creator" with date/time + search shortcut
2. **Tasks card** (top-left) — List of recent tasks with title, description preview, and relative time
3. **Today schedule** (top-center) — Today's events/calendar entries
4. **System widgets** (top-right) — CPU, network, SSD, weather (decorative/mock)
5. **Calculator** (bottom-left) — Simple calculator widget
6. **Notes card** (bottom-center) — List of notes with title and a progress bar

## Proposed Changes

### Dashboard Page

#### [MODIFY] [Dashboard.tsx](file:///c:/WORK/PROJECTS/DEV/task-manager-zero/src/pages/Dashboard.tsx)

Completely rework this page with the new bento-grid layout:

- **Remove** the current KPI cards grid, `RecentActivity`, and `QuickActions` components
- **Add greeting header** with dynamic time-of-day greeting, user name from profile, formatted date/time, and a `⌘K` search badge
- **Add Tasks widget** — fetch recent tasks from Supabase `tasks` table, display title + description snippet + relative timestamp ("2h ago"). Include a `+` button and note icon header
- **Add Today widget** — show today's events/schedule entries with time slots (mock data initially since events table is commented out)
- **Add system stat widgets** — CPU Load, Network speed, SSD Status, Weather (decorative/hardcoded — these are purely cosmetic to match the reference)
- **Add Calculator widget** — a functional simple calculator
- **Add Notes widget** — fetch from Supabase `notes` table, display note titles with a progress-bar style indicator

### Removed Components (no longer imported by Dashboard)

The following components will **not be deleted** but will no longer be imported by `Dashboard.tsx`:
- `KPICard.tsx` — still available for other pages
- `RecentActivity.tsx` — still available for other pages
- `QuickActions.tsx` — still available for other pages

### Dashboard Layout Header

#### [MODIFY] [DashboardLayout.tsx](file:///c:/WORK/PROJECTS/DEV/task-manager-zero/src/components/DashboardLayout.tsx)

- **Hide the "Dashboard Overview" header** when on the dashboard route, since the greeting in the dashboard page itself serves as the header. Alternatively, make the header text dynamic or simply remove the title text for the dashboard page and let each page set its own header.

### CSS

#### [MODIFY] [index.css](file:///c:/WORK/PROJECTS/DEV/task-manager-zero/src/index.css)

- Add any additional CSS variables or utility classes needed for the bento grid, widget backgrounds, and the darker card surfaces visible in the design

## Verification Plan

### Manual Verification
1. Open the app at `http://localhost:5173/` in the browser
2. Verify the dashboard loads with the new bento-grid layout
3. Confirm the **Tasks** widget shows tasks from Supabase (there are 24 tasks in the DB)
4. Confirm the **Notes** widget shows notes (currently 0 — should show empty state)
5. Confirm the greeting shows the correct time-of-day greeting and current date
6. Confirm the system widgets (CPU, SSD, Weather) render as decorative elements
7. Confirm the calculator is functional (basic arithmetic)
8. Confirm the **sidenav is unchanged** — all menu items still navigate correctly
9. Verify dark mode styling matches the warm dark tones of the reference image
