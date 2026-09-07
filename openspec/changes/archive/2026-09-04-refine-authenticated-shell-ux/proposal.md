## Why

The authenticated shell currently compresses page context, academy context, account actions, and redundant right-rail summaries into a rigid desktop layout. This reduces usable workspace on operational pages such as student administration and makes the interface feel visually crowded despite the existing mobile-first foundation.

## What Changes

- Redesign the authenticated topbar so page title, academy context, role, result/status chips, and account access have clear responsive hierarchy.
- Remove redundant right context panels from pages where the rail does not provide actionable operational context, starting with student administration.
- Preserve the context rail only for session, synchronization, alert, or page-specific information that helps the user act without leaving the current task.
- Improve the desktop sidebar visual treatment with clearer active state, better icon hierarchy, grouped navigation, and stronger product identity.
- Keep mobile as the ergonomic baseline with compact app bar, bottom navigation, touch-safe controls, and content-first ordering.
- Apply the refined UX/UI direction to student administration as the first representative screen, while keeping the pattern reusable for dashboard, agenda, finance, reports, profile, and attendance.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `product-experience-shell`: refine shell behavior for topbar hierarchy, contextual rail visibility, account/academy context, and responsive navigation.
- `design-system`: refine visual requirements for sidebar, topbar, density, interactive states, and desktop/mobile composition.

## Impact

- Affected code: authenticated shell, primary navigation, account context menu, student administration page, and any operational page that currently passes non-actionable context into the shell.
- No database, API, authentication, tenant selection, role, or persistence changes are expected.
- Validation should include mobile and desktop responsive checks, keyboard focus, accessible names, and regression coverage for shell/navigation behavior.
