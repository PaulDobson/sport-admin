## 1. Shell and Navigation Foundation

- [x] 1.1 Refine the authenticated shell topbar layout to separate page title, academy/role context, compact chips, and account actions; verify with the existing shell tests or a focused component render check.
- [x] 1.2 Update desktop sidebar presentation with clearer product identity, grouped navigation affordances, icon hierarchy, active state, hover state, and focus state; verify active navigation remains correct for each existing destination.
- [x] 1.3 Preserve mobile app bar and bottom navigation ergonomics while adapting the new visual hierarchy; verify mobile navigation does not overlap content or critical controls at narrow viewport widths.

## 2. Context Rail Behavior

- [x] 2.1 Define and apply page-level criteria for passing desktop rail content only when it provides actionable session, synchronization, alert, or page-specific context; verify redundant rails are omitted from data-heavy pages.
- [x] 2.2 Keep dashboard and attendance-style context available when current or next session information is useful; verify session actions remain visible and authorized by role/state.
- [x] 2.3 Audit finance, reports, schedule, profile, and student detail pages for rail usefulness; verify each page either keeps an actionable rail or uses full-width main content.

## 3. Student Administration UX/UI

- [x] 3.1 Remove the redundant right rail from student administration and move academy, role, and result context into topbar or page/table headers; verify desktop table and filters gain usable width.
- [x] 3.2 Improve student administration header, filter layout, action placement, and empty/result states for mobile-first behavior and desktop scanability; verify controls wrap cleanly without text overlap.
- [x] 3.3 Ensure create, edit, archive, export, and view actions still operate against the visible active academy; verify existing route/action behavior remains tenant-scoped.

## 4. Validation

- [x] 4.1 Run the focused unit/component tests covering shell, navigation, and student administration; verify all touched tests pass.
- [x] 4.2 Run responsive browser checks for mobile and desktop student administration; verify topbar hierarchy, sidebar active state, bottom navigation, table usability, and absence of redundant right rail.
- [x] 4.3 Run accessibility checks for keyboard focus, accessible names, active state communication, contrast, and touch target sizes; verify no new accessibility regressions are introduced.
