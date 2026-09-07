## 1. Primitivos de carga

- [x] 1.1 Agregar `Spinner` (motivo cronómetro, `framer-motion`, `aria-hidden`, respeta `prefers-reduced-motion`) a `src/presentation/components/primitives.tsx` y verificar con un test de componente que renderiza y que no anima con `motion-reduce`.
- [x] 1.2 Extender `Button` con prop `isLoading` que antepone `Spinner`, fuerza `disabled` y no cambia el ancho del control; verificar con test de componente que el texto y el nombre accesible se conservan.

## 2. Barra de progreso de navegación

- [x] 2.1 Crear `NavigationProgressBar` (client component, motivo carril de pista) que arranca en click sobre anchors internos y se completa al cambiar `usePathname()`/`useSearchParams()`; verificar con test de componente los casos: anchor interno, anchor externo/`target="_blank"`/`download` (no arranca), y `defaultPrevented` (no arranca).
- [x] 2.2 Montar `NavigationProgressBar` una sola vez en `src/app/layout.tsx` y verificar que se ve en una ruta con shell (`/dashboard`) y una sin shell (`/log-in`) sin duplicarse.
- [x] 2.3 Verificar accesibilidad: `role="progressbar"` o equivalente con `aria-hidden` si es puramente decorativa dado que ya existe `aria-busy` en los `loading.tsx`, y que no introduce foco atrapado.

## 3. Cobertura de esqueletos de carga restantes

- [x] 3.1 Crear `loading.tsx` para `/log-in`, `/sign-up`, `/onboarding` y `/reset-password` siguiendo el patrón de `aria-busy`/`aria-label` de `src/app/dashboard/loading.tsx`, adaptado a su layout de una columna; verificar que cada uno renderiza sin errores de tipos. `/select-tenant` se omite: no existe `page.tsx` para esa ruta en este repositorio (solo `actions.ts`), por lo que no hay segmento donde montar el loader.

## 4. Adopción en formularios existentes

- [x] 4.1 Migrar los botones de envío en `log-in-form.tsx`, `sign-up-form.tsx`, `onboarding-form.tsx`, `confirm-password-form.tsx`, `attendance-form.tsx`, `plan-form.tsx`, `tenant-status-form.tsx` y `plan-limits-form.tsx` de `<button disabled={pending}>` a `<Button isLoading={pending}>`, conservando el texto condicional actual; verificar que los tests existentes de cada formulario siguen pasando.
- [x] 4.2 Ejecutar la suite de tests de componentes (`pnpm vitest` o script equivalente del proyecto) y verificar que no hay regresiones tras la migración.

## 5. Especificación

- [x] 5.1 Ejecutar `openspec validate add-sport-loading-indicators --strict` y verificar que no reporta errores antes de archivar el change.
