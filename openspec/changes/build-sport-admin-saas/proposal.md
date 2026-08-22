## Why

La plataforma debe convertir la operacion dispersa de instructores independientes en un SaaS multi-tenant seguro, mobile-first y escalable. El alcance actual cubre un modulo operativo, pero deja sin definir identidad, clientes, agenda, membresias, finanzas, administracion de tenants y monetizacion de la propia plataforma.

## What Changes

- Construir la base Next.js App Router con PWA instalable y experiencia mobile-first.
- Incorporar autenticacion, onboarding, roles, tenants y aislamiento estricto con Supabase Auth y PostgreSQL RLS.
- Incorporar gestion de alumnos, locaciones, disciplinas, horarios, clases, sesiones e inscripciones.
- Incorporar membresias, vencimientos, pagos registrados e ingresos mensuales proyectados del instructor.
- Incorporar evolucion deportiva configurable con JSONB, salud, lesiones, alertas, asistencia en lote y riesgo de abandono.
- Incorporar Realtime para cambios operativos y una estrategia offline progresiva con cache de sesion, IndexedDB, cola idempotente y resolucion de conflictos.
- Incorporar backoffice del administrador SaaS para altas, activacion, planes, limites, estados de cuenta, auditoria e indicadores financieros.
- Incorporar notificaciones y reportes para vencimientos, ausencias, alertas de salud, pagos y actividad de tenants.
- Separar contablemente los cobros del instructor a sus alumnos de la suscripcion que el instructor paga a la plataforma SaaS.
- Implementar por fases: foundation y operacion basica; offline, Realtime y auditoria avanzada; analitica, sincronizacion avanzada y notificaciones push.

Orden logico de entrega:

1. Fundacion tecnica.
2. Identidad y multi-tenancy, con RLS como puerta obligatoria.
3. Operacion del instructor.
4. Sesiones y asistencia como primer flujo vertical.
5. Evolucion y salud.
6. Finanzas del instructor.
7. Backoffice SaaS y billing.
8. Offline y Realtime.
9. Notificaciones y reportes avanzados.

Cada etapa SHALL cumplir sus pruebas y criterios de salida antes de desbloquear la siguiente. En particular, ningun modulo de negocio se considera listo antes de validar aislamiento cross-tenant.

MVP inicial:

- Foundation, autenticacion, tenants y RLS.
- Alumnos, locaciones y sesiones manuales.
- Membresias basicas.
- Asistencia por lote.
- Alertas de salud basicas con permisos y auditoria.
- PWA instalable y cache de la sesion actual.
- Proyeccion financiera basica.

Quedan fuera del primer corte la cola offline completa, Realtime, billing SaaS automatizado, dashboards financieros avanzados, push notifications y metricas tipadas para analitica masiva.

## Capabilities

### New Capabilities

- `platform-foundation`: Autenticacion, onboarding, tenants, roles, RLS, configuracion de cuenta y base PWA.
- `instructor-operations`: Alumnos, locaciones, disciplinas, horarios, sesiones, inscripciones y flujo diario del instructor.
- `evolution-health-attendance`: Metricas configurables, historial deportivo, salud, lesiones, asistencia, alertas, abandono y captura offline.
- `instructor-finance`: Planes de membresia, vencimientos, pagos registrados y proyeccion de ingresos mensuales.
- `saas-administration-billing`: Administracion global de tenants, suscripciones SaaS, cobros, estados, limites y KPIs financieros.
- `notifications-reporting`: Notificaciones, reportes operativos, indicadores y entregas push o por canales configurables.

### Modified Capabilities

<!-- No existing main capabilities are defined. El cambio activo evolution-health-attendance se mantiene separado y no se modifica. -->

## Impact

- Aplicacion Next.js App Router, rutas protegidas, Server Actions o handlers y componentes responsive.
- Supabase Auth, PostgreSQL, RLS, Realtime, migraciones y politicas de privacidad.
- Persistencia local PWA con service worker e IndexedDB, sincronizacion y telemetria.
- APIs y modelo relacional multi-tenant para operacion, salud y finanzas.
- Integracion futura con proveedor de pagos para suscripciones SaaS y, si se habilita, cobros de alumnos.
- Backoffice separado por permisos del instructor y sin acceso medico automatico.
- Pruebas de seguridad cross-tenant, flujos moviles, finanzas, offline, Realtime y migraciones.
- Puertas de calidad por fase: build y despliegue; aislamiento RLS; flujo operativo completo; finanzas reconciliables; sincronizacion tolerante a fallos; y privacidad aprobada para produccion.
