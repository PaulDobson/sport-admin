## Why

Sport Admin already has functional authenticated surfaces, but the general look and feel still reads closer to an MVP than a polished operational product. This change raises the product experience by defining a cohesive mobile-first interface vision and a desktop console layout that makes navigation, session context, profile maintenance, and operational status feel deliberate and production-ready.

## What Changes

- Define a product-grade visual direction for operational surfaces, including density, hierarchy, rhythm, elevation, and semantic state treatment.
- Strengthen the authenticated shell so desktop uses a persistent sidebar, contextual topbar, main work area, and optional operational context rail instead of a widened mobile layout.
- Keep mobile as the primary ergonomic baseline with compact app bar, one-hand bottom navigation, contextual quick action, and current-session priority.
- Expand profile and account UX from a simple account menu into a clear quick account surface plus a complete profile maintenance area for identity, security, organization, notifications, and available preferences.
- Formalize the session information panel as a core product pattern that communicates current or next session state, attendance context, synchronization state, and allowed actions.
- Define expectations for navigation, empty/loading/error/offline states, and responsive behavior across the main operational modules.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `design-system`: Elevate the visual language requirements from reusable tokens and components into a coherent product-grade interface system with explicit responsive density, layout, and state expectations.
- `product-experience-shell`: Extend the authenticated shell requirements for desktop navigation, mobile navigation, profile/account maintenance, session context, and operational status surfaces.

## Impact

- Affects presentation components for the authenticated app shell, navigation, account/profile surfaces, current-session context, primitives, and responsive page composition.
- Affects dashboard, agenda, students, finance, reports, attendance, and profile screens insofar as they consume the shared shell and design-system patterns.
- No expected changes to public APIs, persistence schema, billing behavior, or tenant permission rules beyond ensuring UI only exposes actions supported by existing capabilities.
