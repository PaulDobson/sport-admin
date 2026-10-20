## Context

See [proposal.md](./proposal.md) for motivation. Agenda currently consumes the instructor-day query, which returns at most 20 open sessions. Scheduling already separates server-side authorization/data loading from interactive forms and Server Actions. Navigation uses a shared destination model but attendance routes fall outside the Agenda pathname prefix.

This change crosses navigation, route headers, session presentation and programming integration, so a shared design is necessary. Existing uncommitted work must be preserved.

## Goals / Non-Goals

**Goals:**
- Derive navigation state and role visibility consistently across sidebar, mobile navigation and subsection links.
- Render session groups, status and capacity using real server-loaded data.
- Preserve working forms, tenant isolation, authorization and attendance behavior.

**Non-Goals:**
- Historical calendar, new date-range queries, session editing/cancellation, enrollment management or database migrations.
- Fabricated occupancy trends, instructor analytics or unsupported controls.

## Decisions

### 1. Agenda is the parent, not another sessions destination

Keep `/dashboard/schedule` as Sesiones and `/dashboard/schedule/programming` as Programacion. Display subordinate links beneath Agenda on desktop and a reusable secondary navigation on both pages, including mobile. Map `/dashboard/sessions/.../attendance` to Agenda and Sesiones. Provide a visible attendance return link to Agenda.

Use one shared definition for labels, routes and role visibility rather than duplicating permissions across sidebar and pages. Keep the mobile bottom navigation unchanged. A separate top-level Sesiones item was rejected because it duplicates Agenda and consumes scarce mobile navigation space.

### 2. Server-render the agenda and its navigation

Keep authentication, catalog/session queries, filtering and derived indicators in Server Components. Use ordinary links and GET forms for filters, preserving progressive navigation without introducing client-side fetching. Keep Client Components only where pathname-aware shell navigation or scheduling form state requires them; continue existing Server Actions.

Extract a small presentation component/helper only where it is shared or independently testable; do not add a generic calendar abstraction or dependencies.

### 3. Explicit chronological groups and one operational clock

Capture `now` once per page request. Use `America/Santiago`, matching current programming defaults, consistently for group keys, date labels and displayed session times. Label the displayed timezone. Sort by start time, group by local date, and determine each session's current/future state from its own interval, not only `currentSession`.

A full calendar/date picker is rejected for this iteration because the existing query is a bounded upcoming-session list, not a historical or date-range calendar. Communicate that up to 20 open sessions are displayed; metrics use only the filtered set.

### 4. Visual hierarchy and responsive layout

Use existing Surface, StatusBadge, button patterns and theme tokens. Provide a roomy max-width header with scheduling action for authorized roles, subsection navigation, compact summary metrics and a dedicated location-filter surface. Show date groups with session cards emphasizing time, location and attendance.

Cards show confirmed/capacity, remaining seats and waitlist count. Clamp visual occupancy to 0-100% and remaining seats to at least zero. Give the occupancy meter an accessible name and numeric value; use textual status alongside colors. Preserve visible keyboard focus and minimum 44 px touch targets for newly introduced links/actions.

Keep class/location setup panels stacked and roomy. Clarify that one-off and recurring schedules are alternatives, not required sequential steps; retaining preparation guidance must not imply that existing catalogs need to be recreated.

## Risks / Trade-offs

- A limited dataset could be mistaken for the whole schedule -> explicitly label the 20-session scope and filtered indicators.
- Timezone differs from a session's original publishing timezone -> use and label the existing operational timezone consistently; configurable timezone is deferred.
- More than one session may be in progress -> classify every session independently.
- Nested links could mark multiple pages current -> identify the parent as active visually while reserving page-current semantics for the selected leaf.
- Existing dirty worktree -> inspect touched files and apply surgical changes without reverting unrelated work.

## Migration Plan

No schema or route migration. Validate navigation, permissions, date grouping, capacity boundaries, empty states and existing programming forms with focused tests. Run lint/typecheck and verify responsive behavior at 375 px and 1280 px. Deploy as a presentation/navigation change; rollback only the implementation changes from this change, preserving unrelated work.

## Approved Validation Unblock

The user authorized fixing the existing browser Supabase configuration error found during attendance validation. The browser client imported the server environment module and therefore performed dynamic `process.env[name]` lookups that Next.js cannot inline. Use static references to the public URL and anon key directly in the browser client, preserve explicit missing-variable errors, and do not import server secret readers. Cover public configuration and missing variables with tests, document rebuild requirements, and verify the actual client-rendered attendance page.
