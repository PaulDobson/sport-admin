## Why

Los instructores independientes necesitan registrar asistencia, evolucion y condiciones de salud de alumnos que entrenan en distintas locaciones, con poco tiempo y conectividad irregular. Este cambio establece el modulo operativo que permite tomar decisiones seguras antes de una clase y conservar un historial util sin convertir cada tipo de disciplina en una migracion de base de datos.

## What Changes

- Incorporar metricas deportivas configurables por instructor, con definiciones de tipo, unidad y validaciones, y valores almacenados de forma flexible.
- Incorporar historial temporal de mediciones, observaciones y evolucion por alumno.
- Incorporar perfiles de salud, lesiones, restricciones y alertas operativas con semaforo.
- Incorporar registro de asistencia por sesion optimizado para movil y operaciones en lote.
- Incorporar alertas de riesgo de abandono basadas en ausencias y baja asistencia.
- Incorporar aislamiento multi-tenant mediante Supabase Auth y PostgreSQL Row Level Security.
- Incorporar actualizaciones Realtime para asistencia y cambios relevantes en alertas de salud.
- Incorporar experiencia PWA mobile-first con datos de sesion disponibles offline, cola local de operaciones y sincronizacion idempotente al recuperar conectividad.
- Mantener auditoria y control de acceso especifico para datos de salud; el administrador SaaS no obtiene acceso automatico al historial medico.
- Dejar fuera de este cambio la facturacion de suscripciones SaaS, pagos de alumnos y los indicadores financieros globales.

## Capabilities

### New Capabilities

- `evolution-health-attendance`: Registro de evolucion deportiva, salud, asistencia, alertas operativas, aislamiento multi-tenant y operacion movil offline.

### Modified Capabilities

<!-- No existing capabilities are defined in the repository. -->

## Impact

- Next.js App Router y PWA: pantallas mobile-first para sesion, asistencia, alertas y evolucion.
- Supabase Auth, PostgreSQL, RLS y Realtime: autenticacion, aislamiento por tenant, persistencia y propagacion de cambios.
- Persistencia local del navegador: service worker, IndexedDB y cola de sincronizacion offline.
- Modelo de datos: alumnos, sesiones, metricas, mediciones, condiciones de salud, lesiones, asistencias, alertas y auditoria.
- APIs o Server Actions: validacion de tenant, escrituras idempotentes, sincronizacion y resolucion de conflictos.
- Dependencias operativas: politicas de privacidad, consentimiento y retencion aplicables a datos de salud.
