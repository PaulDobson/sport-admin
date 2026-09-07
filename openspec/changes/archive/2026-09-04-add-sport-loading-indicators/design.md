## Context

El shell autenticado (`AppShell`) ya es el único punto donde conviven la topbar móvil y desktop; las rutas sin sesión (`log-in`, `sign-up`, `onboarding`, `select-tenant`, `reset-password`) renderizan `<main>` propio sin shell compartido. Los formularios ya exponen un booleano `pending` vía `useActionState` y hoy solo cambian el texto del botón. `framer-motion` ya es dependencia del proyecto. Ver proposal.md - Why.

## Goals / Non-Goals

**Goals:**

- Dar feedback inmediato (antes de que responda el servidor) al navegar entre pantallas.
- Dar feedback visual consistente durante acciones de servidor, con identidad deportiva propia.
- No introducir dependencias nuevas ni penalizar el bundle.
- Cumplir el requirement de design-system: sin desplazamientos de layout, sin depender solo de color, respetando `prefers-reduced-motion`.

**Non-Goals:**

- No se rediseñan los esqueletos (`Skeleton`, `loading.tsx`) existentes más allá de agregarlos donde faltan; su contenido sigue siendo el placeholder de layout, no el spinner de marca.
- No se cubre aquí el estado de sincronización offline (`SyncStatusBadge`/`OfflineSynchronization`), que ya tiene su propio lenguaje visual y queda fuera de alcance.
- No se migra ningún formulario a una librería de manejo de estado distinta a `useActionState`.

## Decisions

### 1. Barra de progreso de navegación sin librería externa

Se construye un componente cliente `NavigationProgressBar`, montado una sola vez en `src/app/layout.tsx` (cubre rutas con y sin shell). Detecta el inicio de navegación escuchando clicks a nivel `document` sobre anchors internos (mismo origen, sin `target="_blank"`, sin modificadores de teclado) y arranca la barra de inmediato; detecta el fin de navegación comparando `usePathname()` + `useSearchParams()` antes/después vía `useEffect`. Se descarta usar `useLinkStatus` (Next 15+) porque solo informa el estado de un `<Link>` puntual, no una señal global agregada de toda la app.

Alternativas consideradas: agregar `nprogress`/`nextjs-toploader` (descartado: dependencia nueva innecesaria dado que el patrón de click+pathname es simple de replicar); envolver cada `<Link>` con `onNavigate` (descartado: requiere tocar cada punto de uso en vez de un único listener global).

### 2. Spinner de cronómetro como primitivo compartido

Se agrega `Spinner` a `src/presentation/components/primitives.tsx`: SVG de cronómetro con una manecilla animada por `framer-motion` (rotación continua), tamaño fijo (`h-4 w-4` por defecto), `aria-hidden="true"` porque el estado accesible lo comunica el texto adyacente (botón sigue anunciando "Guardando…" vía su propio contenido, no el ícono).

### 3. `Button` con `isLoading`

Se extiende la primitiva `Button` (no se crean componentes nuevos por formulario) para aceptar `isLoading?: boolean`: cuando es `true`, antepone `<Spinner />` a `children`, fuerza `disabled`, y reserva el ancho del ícono con `gap` fijo para que el texto no salte. Los formularios existentes pasan a usar `<Button isLoading={pending}>` en lugar de `<button disabled={pending}>` con texto condicional manual, conservando el texto (icono + texto, no lo reemplaza) para no perder la etiqueta accesible ya validada por los tests existentes.

### 4. Cobertura de `loading.tsx` restante

Se replican los `loading.tsx` de `/dashboard` y `/backoffice` (mismo patrón: `aria-busy`, `aria-label`, esqueletos con `animate-pulse`) para `/log-in`, `/sign-up`, `/onboarding`, `/select-tenant`, `/reset-password`, ajustando el contenedor a un layout centrado de una columna (igual que sus páginas reales) en vez del layout con sidebar.

## Risks / Trade-offs

- [Riesgo] El listener global de clicks podría interceptar enlaces que abren modales o usan `preventDefault` internamente → Mitigación: solo actuar sobre anchors con `href` interno, sin `target`, sin `download`, y verificar `defaultPrevented` antes de arrancar la barra.
- [Riesgo] Animaciones continuas (manecilla del cronómetro) pueden distraer o violar accesibilidad → Mitigación: respetar `prefers-reduced-motion` (mismo criterio que `Skeleton` ya usa con `motion-reduce:animate-none`), mostrando un estado estático equivalente.
- [Trade-off] Detectar el fin de navegación por cambio de `pathname`/`searchParams` no cubre revalidaciones que no cambian la URL (p. ej. `router.refresh()`); se acepta porque esos casos ya usan el spinner de acción (`isLoading` del formulario/botón que los dispara).

## Migration Plan

- Cambios aditivos y de bajo riesgo: se puede desplegar `NavigationProgressBar` y `Spinner` sin migrar formularios de inmediato.
- Migración de formularios a `Button isLoading` se hace archivo por archivo; cada uno mantiene su comportamiento y tests existentes (solo cambia el marcado del botón, no el estado `pending` ni las etiquetas).
- Sin cambios de esquema de datos ni de API; no requiere rollback especial más allá de revertir el commit.
