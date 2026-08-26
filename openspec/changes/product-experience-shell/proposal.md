## Why

La experiencia autenticada funciona como un conjunto de pantallas independientes y no conserva navegación, identidad ni contexto operativo entre rutas. Para evolucionar desde una interfaz orientada a MVP hacia un producto SaaS coherente, la aplicación necesita un shell adaptativo y un lenguaje visual que aproveche desktop sin degradar la operación mobile-first.

## What Changes

- Incorporar un shell autenticado responsive con sidebar y topbar en desktop, y navegación inferior con app bar en móvil.
- Definir una arquitectura de información estable para Inicio, Agenda, Alumnos, Finanzas y Reportes, con una acción operativa rápida accesible desde la navegación principal.
- Mantener visibles el tenant, la locación, el rol, la conectividad y el estado de sincronización cuando sean relevantes para la operación.
- Añadir un panel contextual para la sesión actual con horario, locación, asistencia, sincronización y acciones según su estado.
- Añadir acceso rápido al perfil y una superficie completa para mantener datos personales, seguridad, notificaciones, preferencias y contexto organizacional.
- Establecer un shell separado para backoffice que comparta el lenguaje visual sin mezclar navegación ni permisos con la operación del instructor.
- Ampliar el sistema visual desde una composición exclusivamente móvil hacia reglas responsive de densidad, tipografía, superficies, estados y jerarquía para móvil y desktop.
- Cubrir estados de carga, vacío, error, offline, navegación activa y permisos insuficientes como parte integral de la experiencia.

## Capabilities

### New Capabilities

- `product-experience-shell`: Shell autenticado adaptativo, navegación principal, contexto operativo, perfil, sesión actual y separación de backoffice.

### Modified Capabilities

- `design-system`: Ampliar el alcance mobile actual a una identidad visual responsive de producto y definir variantes de navegación, densidad y superficies para desktop.

## Impact

- Afecta layouts y rutas autenticadas bajo `src/app/dashboard` y `src/app/backoffice`, además de componentes compartidos de presentación y estilos globales.
- Requiere componer identidad de usuario, memberships, tenant, locación, sesión operativa y sincronización en layouts compartidos.
- Reorganiza navegación y presentación sin cambiar los contratos de dominio existentes de alumnos, sesiones, asistencia o finanzas.
- Requiere validación responsive, accesibilidad, navegación por teclado y pruebas end-to-end de continuidad entre secciones.
