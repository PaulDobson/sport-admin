# Implementation Notes

## 1.1 Visual Audit

- Base styles define dark tokens in `src/presentation/styles/globals.css`, but components already use additional semantic tokens such as `success`, `warning`, `destructive`, `info`, `navigation`, `navigation-active`, `surface-raised`, `surface-overlay`, `secondary`, and related foreground tokens. The visual foundation should make those tokens explicit and coherent.
- Component geometry is inconsistent across the shell and pages: `rounded-md`, `rounded-xl`, `rounded-2xl`, `rounded-full`, `shadow-lg`, and `shadow-2xl` appear in shared presentation components and dashboard routes. The refresh should narrow these into product-level rules for controls, menus, cards, and operational panels.
- Focus states exist on some interactive surfaces, especially account/profile controls, but are not universal across navigation, cards, links, and form actions. The implementation should promote a shared focus treatment.
- Reusable primitives already cover `IconButton`, `Avatar`, `StatusBadge`, `EmptyState`, `Skeleton`, and `Alert`; they are the right starting point for product states rather than adding one-off patterns per route.
- Offline/synchronization behavior exists in `OfflineSynchronization` with online, offline, syncing, pending, and conflict labels. Its state language should align with shared alert/status primitives and remain visible without blocking work.
- The current shell already supports desktop sidebar, mobile bottom navigation, topbar actions, and an optional context rail. The main opportunity is visual refinement, better responsive spacing, and consistent use across route content.

## Validation Notes

- Focused component and route-adjacent tests cover shell regions, mobile safe-area spacing classes, account menu behavior, current-session panel context, offline/synchronization states, profile maintenance panels, attendance forms, finance plan forms, student detail forms, and report exports.
- Playwright mobile and desktop projects passed public login overflow, keyboard accessibility, and PWA asset checks. Authenticated shell Playwright tests were skipped because `E2E_EMAIL` and `E2E_PASSWORD` are not configured in this environment; authenticated shell behavior is covered by focused unit/component tests in this pass.

## 5.5 Requirement Coverage Review

- `design-system` Dirección visual de producto operativo: covered by explicit semantic tokens, shared primitives, refreshed shell/navigation surfaces, and route usage in Inicio, Agenda, Alumnos, Finanzas, Reportes, asistencia, perfil, and backoffice.
- `design-system` Densidad responsive diferenciada: covered by desktop shell rail/sidebar layout, mobile bottom navigation safe-area contract, and Playwright mobile/desktop public overflow checks.
- `design-system` Sistema de estados de producto: covered by `StatusBadge`, `SyncStatusBadge`, `EmptyState`, `Skeleton`, named `Alert`, offline/sync conflict tests, and route empty states.
- `design-system` Fundamentos visuales estables: covered by declared product tokens, Manrope/JetBrains Mono typography, tabular metric numbers, shared radii/elevation direction, and focused primitive tests.
- `product-experience-shell` Shell desktop de consola operativa: covered by `AppShell` desktop sidebar/topbar/main/context regions and shell tests.
- `product-experience-shell` Experiencia móvil priorizada por tarea actual: covered by mobile navigation safe-area tests, bottom navigation classes, quick action composition, and mobile Playwright public checks.
- `product-experience-shell` Perfil y cuenta como superficie de mantenimiento: covered by account menu tests and `ProfileMaintenancePanels` tests for identity, organization, security, notifications, and preferences without fake controls.
- `product-experience-shell` Panel de información de sesión y jornada: covered by `CurrentSessionPanel` tests for active/upcoming session state, location, attendance counts, and role-allowed action.
- `product-experience-shell` Contexto de sesión, organización y sincronización siempre comprensible: covered by account organization display, offline/sync status labels, pending/conflict tests, and context rail usage across operational routes.
