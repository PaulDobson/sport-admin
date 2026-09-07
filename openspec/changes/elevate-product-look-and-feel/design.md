## Context

The current product already has an authenticated shell, role-aware operational navigation, account context menu, profile page, current-session panel, and dark semantic tokens. The main design challenge is not introducing a new app structure from scratch, but turning the existing pieces into a cohesive product experience across mobile and desktop.

The change affects shared presentation patterns and multiple operational routes. It should preserve existing tenant, role, authentication, and synchronization rules while improving how those rules are expressed in the UI.

## Goals / Non-Goals

**Goals:**

- Establish a product-grade visual direction for Sport Admin as an operational sports management console.
- Make desktop a first-class layout with persistent navigation, topbar context, main work region, and contextual rail.
- Preserve mobile-first ergonomics with bottom navigation, compact app bar, quick action, and current-session priority.
- Make account, profile, tenant, location, session, and synchronization context visible and understandable without interrupting core work.
- Define reusable UI states and responsive patterns that can be applied across dashboard, schedule, students, finance, reports, attendance, and profile surfaces.

**Non-Goals:**

- Redesigning domain workflows, permission rules, billing behavior, or persistence schema.
- Adding preference categories that cannot yet be persisted.
- Introducing a separate design system dependency unless implementation later proves an existing dependency is insufficient.
- Replacing the existing OpenSpec capabilities; this change extends `design-system` and `product-experience-shell`.

## Decisions

### Desktop becomes an operational console

Use desktop space for simultaneous regions: left navigation, topbar context, primary work area, and optional right context rail. This makes desktop useful for repeated operations such as attendance, student review, session preparation, and finance checks.

Alternative considered: reuse the mobile flow at larger widths with wider cards. This is simpler, but it wastes desktop space and keeps users moving between views for information that can be visible at once.

### Mobile remains the ergonomic baseline

Keep mobile as the baseline for reachability and task order: app bar, bottom navigation, central quick action, vertical content flow, and current-session priority. Desktop enhancements must not make mobile a secondary afterthought.

Alternative considered: design desktop first and collapse later. That risks burying session context and primary actions behind cramped mobile adaptations.

### Session context is a product primitive

Treat current or next session information as a core shell-level product pattern, not a dashboard-only card. On desktop it can live in the context rail; on mobile it should appear as the first operational block or a compact access point from relevant routes.

Alternative considered: keep session context inside each page independently. That creates inconsistent behavior and makes attendance/synchronization status harder to find.

### Account and profile split into quick context and maintenance

Use the account menu for quick identity, tenant, role, location, and sign-out actions. Use the profile page for complete maintenance of identity, security, organization, notifications, and real preferences. Unsupported preferences should be represented as unavailable or informational, not as controls that pretend to save.

Alternative considered: put all account controls in the dropdown. That overloads a transient menu and makes maintenance flows feel fragile.

### Visual language favors operational clarity over decoration

Use a restrained dark product language with strong typographic hierarchy, stable metrics, semantic status tokens, clear focus states, and purposeful elevation. Brand color should guide hierarchy and action rather than tint every surface.

Alternative considered: use a marketing-style dashboard aesthetic with large decorative cards and heavy gradients. That would look more dramatic, but it would reduce scanability for repeated operational use.

### States are designed as reusable patterns

Loading, empty, error, offline, pending synchronization, conflict, active, disabled, and focus states should share visual and textual conventions. This avoids each page inventing its own fallback behavior and supports accessibility validation.

Alternative considered: fix states route by route as they appear. That is faster initially but creates inconsistent UX and increases future maintenance.

### Visual identity baseline is a quiet professional console

Use a restrained professional console as the baseline, with athletic cues reserved for hierarchy, motion, icons, and selected accent moments. This keeps the product credible for repeated daily operations while still feeling specific to sports administration.

Alternative considered: a more expressive high-contrast athletic interface everywhere. That can feel energetic, but it risks reducing readability and making finance, attendance, and profile maintenance feel noisy.

### Context rail appears only when it carries useful operational context

On desktop, reserve the context rail for current or next session, synchronization state, tenant/location context, or a page-specific operational summary. When none of those are useful, collapse the rail and let the main work area use the space.

Alternative considered: always reserve the rail at wide breakpoints. That gives consistent geometry, but it can create empty-feeling screens when there is no live context.

### Preference controls require persistence

Only render editable notification or preference controls when the product can persist and reflect the setting. Until then, present those categories as unavailable or informational states.

Alternative considered: show disabled or placeholder toggles for future preferences. That makes the surface look fuller, but it can mislead users about what the product supports.

## Risks / Trade-offs

- Broad visual scope -> Mitigation: implement through shared shell, primitives, tokens, and a small set of representative screens before expanding.
- Desktop density can become cluttered -> Mitigation: define region responsibilities clearly: navigation selects area, topbar carries global context, main region carries the task, context rail carries current session/status.
- Mobile bottom navigation can compete with forms -> Mitigation: reserve bottom padding, keep primary screen actions within content, and validate on narrow viewports.
- Profile preferences may imply unavailable persistence -> Mitigation: only render editable controls for supported persisted preferences; use informational states for future categories.
- Visual refresh can regress accessibility -> Mitigation: validate focus order, accessible names, contrast, reduced layout shift, and touch target sizes as part of implementation tasks.
- Reusable components may be over-abstracted too early -> Mitigation: promote patterns after they are used by at least two operational surfaces or clearly belong to the shell.

## Migration Plan

1. Update shared tokens and primitive state treatments first so later page work has a stable base.
2. Refine authenticated shell composition for desktop and mobile without changing route protection or role rules.
3. Improve account menu, profile page, and session context as shared surfaces.
4. Apply the refreshed patterns to representative operational routes: dashboard, schedule, students, finance, reports, and attendance.
5. Validate responsive behavior, keyboard navigation, accessible names, visual states, and offline/synchronization messaging.
6. Roll back by reverting presentation-layer changes; no database or API migration is expected.
