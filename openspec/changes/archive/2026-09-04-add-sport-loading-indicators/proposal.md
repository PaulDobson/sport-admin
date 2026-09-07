## Why

Hoy la única señal de "el sistema está trabajando" es el texto de un botón ("Guardando…") y, en dos rutas, un esqueleto de carga. No existe una señal inmediata al navegar entre pantallas ni un lenguaje visual propio que comunique progreso de forma consistente. El spec de `design-system` ya exige que todo componente interactivo tenga un estado de carga estable y perceptible, pero no está implementado de forma uniforme ni con identidad visual.

## What Changes

- Agregar una barra de progreso de navegación global (motivo "carril de pista"), montada una sola vez en el layout raíz, que arranca al hacer click en un enlace interno y se completa cuando la navegación termina.
- Agregar un componente `Spinner` con motivo de cronómetro (manecilla girando) para reemplazar/acompañar el texto de "procesando" en botones y acciones de servidor, sin alterar dimensiones del control.
- Extender la primitiva `Button` para aceptar un estado `isLoading` que renderiza el `Spinner` junto al texto existente.
- Completar la cobertura de esqueletos de carga (`loading.tsx`) en las rutas que aún no lo tienen (`log-in`, `sign-up`, `onboarding`, `select-tenant`, `reset-password`).
- Adoptar `Button`/`isLoading` en los formularios existentes que hoy solo deshabilitan el botón y cambian su texto.

## Capabilities

### New Capabilities

(ninguna: se trata de la implementación concreta de un requirement ya existente)

### Modified Capabilities

- `design-system`: el requirement "Estados completos de componente" pasa de exigir un estado de carga genérico a especificar un lenguaje visual de carga concreto (barra de navegación con motivo deportivo y spinner de cronómetro) aplicable a navegación entre pantallas y a acciones de servidor.

## Impact

- `src/app/layout.tsx` (montaje de la barra de navegación global).
- `src/presentation/components/primitives.tsx` (nuevo `Spinner`, extensión de `Button`).
- Formularios existentes que usan `useActionState` (log-in, sign-up, onboarding, reset-password, asistencia, finanzas, backoffice de tenants).
- Nuevos `loading.tsx` para rutas sin shell autenticado.
- Sin nuevas dependencias: se reutiliza `framer-motion`, ya presente en `package.json`.
