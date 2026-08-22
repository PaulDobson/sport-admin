## Context

La plataforma parte desde cero y debe atender a instructores independientes que trabajan en multiples locaciones. El stack acordado es Next.js App Router con PWA y despliegue en Vercel, Supabase Auth, PostgreSQL y Realtime. El cambio operativo `evolution-health-attendance` permanece activo como referencia historica; esta propuesta define la plataforma completa y sus fronteras.

## Goals / Non-Goals

**Goals:**

- Entregar una base SaaS multi-tenant segura desde el primer despliegue.
- Separar dominios de identidad, operacion, salud, finanzas del instructor, administracion SaaS y notificaciones.
- Habilitar una primera fase util con auth, RLS, alumnos, agenda, membresias, asistencia y PWA.
- Evolucionar a offline, Realtime, auditoria, analitica y push sin reemplazar el modelo base.
- Mantener una diferencia clara entre dinero de alumnos y facturacion SaaS.
- Permitir que las metricas deportivas evolucionen sin migraciones por disciplina.

**Non-Goals:**

- Gestion de gimnasios como negocios: torniquetes, inventario, mantenimiento o sedes propias.
- Historia clinica o diagnostico medico.
- Marketplace, nomina de instructores o contabilidad fiscal completa en la primera entrega.
- Offline universal de todas las pantallas.
- Microservicios antes de que existan necesidades de escala demostradas.

## Decisions

### Arquitectura modular monolitica

Se usara un solo proyecto Next.js con modulos de dominio y Supabase como backend gestionado. Las rutas protegidas y Server Actions o handlers validaran identidad y casos de uso, mientras PostgreSQL sera la autoridad final de integridad y RLS. Esta forma reduce complejidad operacional en Vercel y deja fronteras claras para extraer procesos asincronos mas adelante.

Alternativa descartada: microservicios iniciales, porque multiplican despliegues, observabilidad y contratos antes de validar el producto.

### Modelo multi-tenant explicito

Todas las entidades de negocio tendran `tenant_id`. `tenant_memberships` relacionara el usuario autenticado, tenant, rol y estado. RLS se habilitara en cada tabla expuesta y se probaran SELECT, INSERT, UPDATE y DELETE con tenants cruzados. La service role key no se enviara al navegador. Funciones de autorizacion pequenas evitaran depender de filtros de UI o de un tenant enviado por el cliente.

El administrador SaaS tendra tablas y permisos propios para estado de cuenta, planes, cobros e indicadores. No tendra acceso medico por defecto.

### PostgreSQL relacional con JSONB selectivo

El nucleo de identidad, alumnos, agenda, membresias, pagos, asistencia y auditoria sera relacional. Las metricas tendran `metric_definitions` y evaluaciones con `values JSONB`, conservando relacionalmente tenant, alumno, fecha y autor. Tipos, unidades, slugs y reglas se validaran antes de guardar. Indices por tenant/alumno/fecha y GIN solo donde haya consultas JSON frecuentes evitaran que JSONB se convierta en un campo sin control.

Para analitica de alto volumen se podra crear una proyeccion tipada o tabla de hechos. No se iniciara con EAV puro ni NoSQL puro.

### Finanzas como eventos y proyecciones

Membresias, pagos, descuentos, creditos, mora y cobros SaaS tendran eventos auditables. Las cifras se separaran en contratado, cobrable y cobrado. Las vistas o jobs agregados calcularan MRR, ARR, proyecciones mensuales e indicadores con periodo y moneda. Los eventos historicos no se sobrescribiran para permitir conciliacion y reconstruccion.

### PWA progresiva

Fase 1 cacheara app shell y la sesion actual. Fase 2 agregara IndexedDB para sesion precargada y cola de comandos offline, con `operation_id` unico, reintentos y estados pendiente/sincronizado/conflicto. Al reconectar se resincronizara por `updated_at` o version; Realtime no se tratara como historial durable. Alertas de salud mostrarán frescura y exigiran verificacion manual cuando la copia sea antigua.

Alternativa descartada: solo cache HTTP o `localStorage`, porque no resuelven escrituras offline, durabilidad estructurada ni conflictos.

### Realtime acotado y notificaciones asincronas

Realtime se usara para asistencia y alertas de la sesion abierta, con canales limitados por tenant y alcance autorizado. Notificaciones push, email u otros canales se procesaran asincronamente con preferencias, reintentos e idempotencia. Los payloads medicos se minimizaran.

### Fases de entrega

- Fase 1, MVP: estructura del proyecto, Auth, onboarding, tenants, roles, RLS, alumnos, locaciones, agenda, sesiones manuales, membresias basicas, asistencia, alertas de salud basicas con auditoria, proyeccion financiera basica, PWA instalable y cache de sesion.
- Fase 2: backoffice SaaS inicial, planes y limites, IndexedDB, cola offline, idempotencia, Realtime, auditoria sensible avanzada y conflictos.
- Fase 3: metricas tipadas para analitica, dashboards agregados, sincronizacion avanzada, proveedor de pagos SaaS y notificaciones push.

La dependencia entre fases es estricta: RLS probado desbloquea operacion; alumnos y sesiones desbloquean asistencia, salud y finanzas; backoffice establece limites y estados de tenant antes de habilitar sincronizacion avanzada; y los eventos producidos por esos dominios desbloquean notificaciones y reportes.

La Fase 1 debe demostrar el flujo vertical `login → alumno → sesion → asistencia → membresia → proyeccion` en movil. La cola offline completa, Realtime, billing SaaS automatizado, dashboards avanzados, push y metricas tipadas no forman parte de la salida del MVP.

Una feature flag permitira activar offline avanzado, Realtime y pagos por tenant o entorno.

## Risks / Trade-offs

- [Riesgo] Alcance amplio puede retrasar el primer valor → Entregar verticalmente la Fase 1 y no iniciar dashboards avanzados antes de validar el flujo diario.
- [Riesgo] RLS incompleto expone datos → Migraciones con RLS obligatorio, pruebas negativas cross-tenant y revision de funciones, vistas y claves.
- [Riesgo] Salud sensible se filtra por logs o backoffice → Roles separados, auditoria, payloads minimos y redaccion de logs.
- [Riesgo] JSONB limita analitica → Validaciones, indices y proyeccion tipada para metricas de alto uso.
- [Riesgo] Vercel no es ideal para procesos largos → Jobs y notificaciones asincronas mediante servicios gestionados o colas cuando el volumen lo requiera.
- [Riesgo] Offline causa duplicados o conflictos → Operaciones idempotentes, versionado, auditoria y UI de conflicto.
- [Riesgo] Dependencia de proveedor de pagos → Adaptador de proveedor y eventos internos normalizados.
- [Riesgo] Politica legal de salud cambia por pais → Mantener consentimiento, retencion y derechos de datos configurables antes de produccion.

## Migration Plan

1. Inicializar Next.js, configuracion de entornos, Supabase y convenciones de modulos.
2. Crear migraciones base de identidad, tenants, roles, alumnos, agenda, membresias, pagos, salud, asistencia y auditoria.
3. Activar RLS y ejecutar pruebas de aislamiento antes de exponer pantallas.
4. Entregar el vertical de Fase 1 con despliegues de staging y migraciones reversibles o protegidas por flags.
5. Agregar backoffice, facturacion SaaS y eventos de cobro sin mezclar libros contables.
6. Incorporar offline y Realtime con telemetria, pruebas de reconexion y rollout gradual.
7. Agregar agregaciones, push y sincronizacion avanzada despues de medir uso real.

Cada migracion se aplicara en staging antes de produccion. Los cambios destructivos requeriran migracion expand/contract y retencion temporal de columnas antiguas. Un rollback de cliente debe seguir siendo compatible con el esquema persistido.

## Resolved Planning Decisions

- El primer despliegue sera agnostico de jurisdiccion, pero no pasara a produccion con salud sin consentimiento, retencion, exportacion, correccion y eliminacion definidos.
- El riesgo de abandono sera configurable por instructor con valores iniciales sugeridos de tres ausencias consecutivas o menos de 50 por ciento en treinta dias.
- Cada sesion tendra un instructor responsable unico; asistentes tendran solo los permisos otorgados.
