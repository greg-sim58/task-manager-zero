# Code Review Report (Pass 2)

## 1. Security: Implicit Reliance on RLS (Tasks)
**Severity:** High
**File:** `src/pages/Tasks.tsx`
**Lines:** 75-78

```tsx
const { data, error } = await supabase
  .from("tasks")
  .select("*")
  .order("created_at", { ascending: false });
```

**Issue:**
The query selects all tasks without an explicit `.eq('user_id', user.id)` filter. It relies entirely on Row Level Security (RLS) policies. If RLS is disabled or misconfigured (e.g., during a migration or debugging session), this query will leak every user's tasks to any authenticated user.

**Suggested Fixes:**
1.  Get the current user's ID from the session and add `.eq('user_id', session.user.id)` to the query chain.
2.  Ensure RLS is enabled on the `tasks` table in Supabase.

## 2. Security: Implicit Reliance on RLS (Events)
**Severity:** High
**File:** `src/pages/Dashboard.tsx`
**Lines:** 75-81

```tsx
const { data: events } = await supabase
  .from("events")
  .select("title, date, time")
  // ...
```

**Issue:**
Similar to the Tasks issue, the Dashboard fetches upcoming events without filtering by user. This potentially exposes one user's calendar events to another if RLS is not strictly enforced.

**Suggested Fixes:**
1.  Add `.eq('user_id', session.user.id)` to the query.

## 3. Security/Performance: Insecure Realtime Subscription
**Severity:** Medium
**File:** `src/pages/Dashboard.tsx`
**Lines:** 28-41

```tsx
supabase
  .channel('events-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, ...)
```

**Issue:**
The realtime subscription listens to *all* changes on the `events` table.
1.  **Security**: If RLS doesn't apply to Realtime (it requires specific setup in Supabase called "Replica Identity" and "Enable RLS for Realtime"), a user might receive events belonging to others.
2.  **Performance**: The client receives a websocket message for *every* event created by *any* user, wasting bandwidth and client CPU filtering irrelevant events.

**Suggested Fixes:**
1.  Add a filter to the subscription: `filter: 'user_id=eq.' + user.id`.
```tsx
.on('postgres_changes', 
  { event: '*', schema: 'public', table: 'events', filter: `user_id=eq.${user.id}` }, 
  callback
)
```

## 4. Stability: Exchange Rate API Reliability
**Severity:** Low (External Dependency)
**File:** `src/pages/Dashboard.tsx`
**Lines:** 85

```tsx
fetch("https://api.exchangerate-api.com/v4/latest/ZAR")
```

**Issue:**
This is a free, public API endpoint. If it goes down or introduces rate limits, the Dashboard will show "Loading rates..." indefinitely or error out.

**Suggested Fixes:**
1.  Cache the result in `localStorage` or `sessionStorage` for 24 hours to reduce API calls and provide offline support.
2.  Add a timeout to the fetch request to prevent hanging.
