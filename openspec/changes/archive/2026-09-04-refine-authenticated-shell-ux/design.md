## Context

The current authenticated shell already provides a desktop sidebar, sticky topbar, mobile bottom navigation, account context menu, and optional context rail. Operational pages decide whether to pass `context`, and the shell currently turns any context into a fixed desktop rail. On student administration, that rail repeats academy and result information already available elsewhere, reducing table width and making the topbar feel crowded.

## Goals / Non-Goals

**Goals:**

- Refine the shell composition without changing authentication, tenant selection, role permissions, or data-fetching behavior.
- Make the topbar responsive enough to carry page, academy, role, account, and compact status/result information without visual crowding.
- Make the desktop context rail intentional: present only when it gives actionable session, synchronization, alert, or page-specific context.
- Improve sidebar polish and navigation scanability while preserving existing destinations and role-aware filtering.
- Use student administration as the first representative screen for the wider pattern.

**Non-Goals:**

- Replacing the current routing model, app shell API wholesale, or navigation domain definitions.
- Adding new persisted preferences, new tenant switching semantics, or new operational data.
- Redesigning domain workflows such as student creation, exports, attendance, billing, or report calculations.

## Decisions

### Make the context rail opt-in by usefulness, not by presence

Keep the shell capable of rendering a desktop rail, but treat it as a high-value operational region. Pages should stop passing rail content when the content is only a duplicate summary, especially on table-heavy screens.

Alternative considered: remove the rail from the shell entirely. This would reclaim space, but it would weaken dashboard and attendance-style workflows where current session or synchronization context is genuinely useful.

### Move academy and role context into topbar/header hierarchy

The topbar should expose page title as the primary label and academy/role as supporting context. On desktop, compact result chips or state chips can sit beside account actions. On mobile, the same information should collapse into a concise app-bar stack.

Alternative considered: leave academy context in a right rail. This makes the information visible, but forces users to sacrifice work area for context that belongs in the global header.

### Give student administration full content width on desktop

Student administration should remove its redundant right rail and place count/status context near the table header or page header. The table and filters should use the recovered width first, with mobile retaining a one-column content flow.

Alternative considered: keep the rail and shrink table columns. This preserves the existing geometry but directly worsens scanability for contacts, dates, status, and actions.

### Improve sidebar visual hierarchy through grouping and active affordances

The sidebar should keep the existing navigation destinations but render them with stronger product identity, optional section labels, icon containers, and a clearer active indicator. Active state should not rely on color alone.

Alternative considered: only adjust colors. That may look marginally better but does not solve scanability or make the navigation feel intentionally designed.

### Keep mobile first while improving desktop density

Mobile remains the baseline for task order, touch targets, bottom navigation, and compact account access. Desktop should not simply scale that layout; it should provide more working width and better simultaneous context only where useful.

Alternative considered: optimize desktop first and retrofit mobile. That risks regressing the current reachable mobile navigation and form ergonomics.

## Risks / Trade-offs

- Inconsistent rail usage across pages -> Mitigation: document rail criteria and apply first to students, then audit finance, reports, schedule, profile, dashboard, and attendance.
- Topbar may become overloaded again -> Mitigation: define strict hierarchy: page title first, academy/role second, compact chips third, account action last.
- Sidebar grouping can hide familiar destinations -> Mitigation: keep all existing labels visible and preserve current route order unless validation shows a better grouping.
- Wider desktop content can make line lengths too long -> Mitigation: preserve max-width constraints for narrative surfaces while allowing table-heavy screens to use more width.
- Visual polish can regress accessibility -> Mitigation: validate keyboard focus, accessible names, contrast, active state text/icon affordances, and mobile tap targets.

## Migration Plan

1. Adjust shell and navigation primitives to support refined topbar/sidebar presentation and intentional rail usage.
2. Update student administration to remove redundant rail content and integrate academy, role, result count, filters, and actions into the main work area.
3. Audit other operational pages and remove or preserve rail usage based on whether the rail provides actionable context.
4. Validate responsive behavior at mobile, tablet, and desktop widths, including table usability and topbar wrapping.
5. Roll back by reverting presentation-layer changes; no data or API migration is required.
