## Context

`src/app/page.tsx` actualmente renderiza componentes de demo de un template de design system (`Navbar`, `FormsShowcase`, `Footer`) sin relación con Sport Admin. El proyecto usa Next.js App Router (Server Components por defecto), Tailwind con tokens de marca en `src/presentation/styles/globals.css`, y no tiene ninguna librería de animación instalada. La identidad de marca visible hoy es `ProductMark` ("Sport Admin", ícono "SA", esquema de color oscuro). Ver [proposal.md](./proposal.md) para la motivación.

## Goals / Non-Goals

**Goals:**

- Reemplazar el contenido placeholder de `/` por una landing page real, coherente con la identidad de marca existente.
- Introducir Framer Motion como única nueva dependencia de animación, con un patrón reutilizable que respete `prefers-reduced-motion`.
- Producir ilustraciones abstractas propias (SVG/componentes) usando los tokens de color existentes, sin depender de bancos de imágenes externos ni assets binarios pesados.
- Mantener la landing como Server Component en la mayor parte posible, aislando la interactividad/animación en componentes cliente puntuales.

**Non-Goals:**

- No se rediseña el shell autenticado (`AppShell`, `product-experience-shell`) ni ninguna ruta bajo `/dashboard`.
- No se implementa personalización de contenido por rol o por tenant en la landing.
- No se agregan analíticas de conversión ni experimentación A/B en este cambio.
- No se reemplaza `design-system-preview.html`; sigue existiendo como playground interno si algo lo referencia.

## Decisions

- **Framer Motion vs. animaciones CSS puras**: se elige Framer Motion (confirmado por el usuario) por su soporte de primitives declarativas (`whileInView`, `staggerChildren`) que simplifican animaciones de scroll consistentes entre secciones, y por su integración directa con `useReducedMotion()` para accesibilidad. Alternativa descartada: CSS/`@keyframes` + `IntersectionObserver` manual, más verboso de mantener a través de múltiples secciones.
- **Composición del layout**: `src/app/page.tsx` queda como Server Component delgado que ensambla secciones desde `src/presentation/components/marketing/`; solo las secciones con animación (`Hero`, `BenefitsSection`, etc.) son Client Components (`"use client"`), minimizando el JS enviado.
- **Ilustraciones**: se construyen como componentes SVG inline en React (no archivos binarios en `public/`), reutilizando variables de color de Tailwind (`fill="var(--color-primary)"` etc.) para que seguir la paleta sea automático y no dependan de assets externos versionados aparte.
- **Detección de sesión activa**: la landing usa el mismo `loadOperationalContext()` que ya usa `/dashboard` para decidir el destino del CTA principal (ver Requirement "Redirección de visitantes con sesión activa"). Esto mantiene una única fuente de verdad para resolver sesión/membresía en vez de duplicar lógica de auth.
- **Reemplazo de componentes de demo**: `Navbar`, `Footer` y `FormsShowcase` dejan de importarse desde `page.tsx`; no se eliminan del repo en este cambio para no romper `design-system-preview.html` si los referencia.

## Risks / Trade-offs

- [Framer Motion incrementa el bundle de cliente] → Mitigado limitando `"use client"` a las secciones que realmente animan y usando `whileInView` con `once: true` para evitar recálculos innecesarios.
- [Contenido de copy puede quedar genérico] → Mitigado redactando mensajes concretos por beneficio (financiero, visibilidad, crecimiento) como exige el spec, revisados como parte de la tarea de contenido antes de maquetar.
- [Ilustraciones SVG inline pueden crecer en complejidad/mantenimiento] → Mitigado manteniéndolas simples (formas geométricas/abstractas), como componentes propios reutilizables en `marketing/illustrations/`.

## Migration Plan

- Cambio aislado a una ruta pública sin datos persistentes ni migraciones. Despliegue estándar; rollback es revertir el commit que reemplaza `page.tsx`.
