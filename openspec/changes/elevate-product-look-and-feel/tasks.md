## 1. Visual Foundation

- [x] 1.1 Audit current tokens, radii, shadows, typography, spacing, focus, and state classes across presentation components and verify the findings are captured in the implementation notes or PR summary
- [x] 1.2 Update shared design tokens and base styles for the quiet professional console direction and verify the app renders dark mode, semantic states, focus rings, and stable typography in the design-system preview or a local browser check
- [x] 1.3 Refine shared primitives for buttons, cards, badges, form controls, empty states, loading states, error states, and offline/sync indicators and verify unit or component tests cover accessible names and stable rendered states

## 2. Authenticated Shell And Navigation

- [x] 2.1 Refine the desktop shell into left navigation, contextual topbar, main work area, and collapsible context rail and verify desktop routes keep navigation visible with the active section identified
- [x] 2.2 Refine mobile shell spacing, app bar, bottom navigation, safe-area padding, and central quick action and verify mobile routes do not overlap content, forms, or critical actions
- [x] 2.3 Review role-aware navigation destinations and report access patterns and verify each role sees only permitted destinations with existing navigation tests updated or passing
- [x] 2.4 Add or update shell accessibility coverage for keyboard focus, skip link, menu dismissal, aria labels, and tab order and verify the shell tests plus the accessibility e2e check pass

## 3. Account, Profile, And Operational Context

- [x] 3.1 Refine the account context menu for identity, tenant, role, location, profile access, and sign-out and verify menu tests cover tenant switching, accessible labels, and dismissal behavior
- [x] 3.2 Redesign the profile maintenance surface into identity, security, organization, notifications, and preferences sections and verify unsupported preferences are informational rather than editable controls
- [x] 3.3 Refine the current or next session panel as a reusable operational context surface and verify it shows status, time, location, attendance counts, and role-allowed actions in desktop and mobile compositions
- [x] 3.4 Refine synchronization and offline status presentation in the shell or relevant route surfaces and verify pending, synced, error, and conflict states communicate text plus semantic status

## 4. Main Operational Screens

- [x] 4.1 Apply the refreshed layout and component patterns to Inicio and verify current session priority, jornada metrics, location filtering, and quick links remain usable on mobile and desktop
- [x] 4.2 Apply the refreshed patterns to Agenda and attendance entry points and verify session lists, current-session actions, and attendance links remain visible and role-correct
- [x] 4.3 Apply the refreshed patterns to Alumnos and student detail surfaces and verify status indicators, forms, empty states, and detail actions remain accessible and responsive
- [x] 4.4 Apply the refreshed patterns to Finanzas and Reportes and verify metric alignment, projected progress, exports, filters, and secondary report access work without horizontal scrolling
- [x] 4.5 Review backoffice shell compatibility with shared tokens and primitives and verify its administrative context remains visually distinct from the instructor operational shell

## 5. Validation And Polish

- [x] 5.1 Run focused unit/component tests for touched presentation and dashboard files and verify all relevant tests pass
- [x] 5.2 Run lint and typecheck for the project and verify no new diagnostics are introduced by the visual refresh
- [x] 5.3 Run responsive e2e or browser checks for representative mobile and desktop viewports and verify navigation, profile, session context, forms, and bottom navigation do not overlap
- [x] 5.4 Run accessibility checks for authenticated shell routes and verify focus visibility, accessible names, contrast, and keyboard operation meet the updated specs
- [x] 5.5 Review the final UI against the OpenSpec requirements and verify each added scenario in `design-system` and `product-experience-shell` has an implementation note, test, or manual validation result
