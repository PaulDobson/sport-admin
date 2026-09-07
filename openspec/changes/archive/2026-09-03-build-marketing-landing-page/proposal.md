## Why

La ruta pública `/` (`src/app/page.tsx`) es un placeholder heredado de un template de design system ("PawTrack", "Jenny Wilson", "Design system preview") sin relación con Sport Admin. Es el primer contacto de cualquier visitante o instructor potencial con el producto, y hoy no comunica ninguna propuesta de valor real, lo que compromete conversión y credibilidad de marca.

## What Changes

- Reemplazar el contenido placeholder de `/` por una landing page de marketing con hero section, secciones de valor y llamados a la acción hacia `/sign-up` y `/log-in`.
- Redactar contenido orientado a instructores/dueños de box que gestionan alumnos, sesiones y cobros, destacando el valor de una buena gestión: control financiero, visibilidad de alumnos y oportunidad de crecimiento.
- Incorporar animaciones de entrada/scroll con Framer Motion (respetando `prefers-reduced-motion`) e ilustraciones abstractas con la paleta de marca existente (tokens de `globals.css`).
- Añadir Framer Motion como nueva dependencia del proyecto.
- Retirar los componentes de demo del design system (`Navbar`, `Footer`, `FormsShowcase` como landing) del árbol de páginas públicas; quedan disponibles solo si algo los sigue referenciando desde `design-system-preview.html`.

## Capabilities

### New Capabilities

- `marketing-site`: Landing page pública que presenta la propuesta de valor de Sport Admin a visitantes no autenticados, con hero, secciones de beneficios y llamados a la acción hacia registro/login.

### Modified Capabilities

- (ninguna)

## Impact

- Código: `src/app/page.tsx`, nuevos componentes de presentación bajo `src/presentation/components/marketing/`, `package.json` (dependencia `framer-motion`).
- Assets: nuevas ilustraciones SVG/abstractas bajo `public/` o inline como componentes.
- Sin impacto en rutas autenticadas, dominio, aplicación ni infraestructura existentes.
