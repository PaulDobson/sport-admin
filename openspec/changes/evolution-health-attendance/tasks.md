## 1. Modelo de datos y migraciones

- [ ] 1.1 Crear la migracion PostgreSQL para tablas de definiciones de metricas, evaluaciones de evolucion, condiciones de salud, lesiones, asistencias, alertas y auditoria, todas con `tenant_id` y marcas temporales; verificar que la migracion aplique en una base Supabase limpia.
- [ ] 1.2 Crear restricciones, enums, indices por tenant/alumno/fecha y validaciones para tipos y rangos de metricas; verificar inserciones validas y rechazo de valores incompatibles.
- [ ] 1.3 Crear el modelo de sesiones, alumnos inscritos, instructor responsable y operaciones idempotentes de asistencia; verificar unicidad por sesion/alumno/operation_id.
- [ ] 1.4 Documentar y configurar consentimiento, retencion, exportacion, correccion y eliminacion de salud para la jurisdiccion de despliegue antes de activar produccion; verificar que la configuracion quede trazable.

## 2. Auth, multi-tenancy y privacidad

- [ ] 2.1 Crear la relacion de membresias de tenant con roles, estado activo e instructor responsable; verificar que los cambios de rol invaliden permisos conforme al estado actual.
- [ ] 2.2 Activar y probar RLS para SELECT, INSERT, UPDATE y DELETE en alumnos, sesiones, asistencias, evolucion, salud y alertas; verificar con usuarios de dos tenants que no haya lecturas, escrituras ni filtraciones cruzadas.
- [ ] 2.3 Implementar comprobaciones reutilizables de pertenencia y rol sin recursividad de politicas; verificar acceso autorizado, denegado y ausencia de revelacion de existencia.
- [ ] 2.4 Separar permisos de administrador SaaS, instructor responsable y asistentes, especialmente para salud; verificar que la service role key no se incluya en el cliente y que el administrador no lea salud por defecto.
- [ ] 2.5 Registrar auditoria de accesos y cambios de datos de salud; verificar actor, tenant, alumno, accion y fecha en operaciones autorizadas y denegadas.

## 3. Evolucion, salud y alertas

- [ ] 3.1 Implementar la gestion de definiciones de metricas y formularios de valores JSONB con tipos, unidades, slugs estables y validaciones; verificar metricas numericas, duracion, seleccion y objeto estructurado.
- [ ] 3.2 Implementar el historial cronologico de evaluaciones sin sobrescritura y con autor; verificar consulta por alumno, definicion y unidad.
- [ ] 3.3 Implementar altas, actualizaciones y resolucion historica de condiciones, lesiones, dolor y restricciones; verificar que una lesion resuelta deje de generar alertas sin borrar historial.
- [ ] 3.4 Implementar el calculo de semaforo previo a la sesion con nivel textual, motivo y accion operativa; verificar casos rojo, amarillo, verde y ausencia de alertas sin recomendaciones diagnosticas.
- [ ] 3.5 Implementar criterios de abandono configurables por instructor, con valores iniciales de tres ausencias consecutivas o menos de 50 por ciento en treinta dias; verificar creacion, deduplicacion, resolucion e historial de alertas.

## 4. Sesion y experiencia mobile-first

- [ ] 4.1 Implementar la pantalla de sesion actual con alumnos, asistencia existente y alertas de salud relevantes; verificar que una sesion muestre solo alumnos y alertas autorizados.
- [ ] 4.2 Implementar captura de asistencia y novedades por lote en hasta tres acciones principales, sin formularios individuales obligatorios; verificar el flujo con cinco alumnos en dispositivo movil.
- [ ] 4.3 Implementar el endpoint o Server Action de guardado atomico e idempotente; verificar que reintentos no dupliquen asistencia ni novedades y que sesiones de otro tenant sean rechazadas.
- [ ] 4.4 Implementar estados de interfaz pendiente, sincronizado, error y conflicto; verificar que el instructor pueda distinguir un registro local de uno confirmado en servidor.

## 5. Realtime y sincronizacion

- [ ] 5.1 Configurar canales Realtime limitados a la sesion y tenant autorizados para asistencia y alertas activas; verificar actualizacion entre dos dispositivos del mismo tenant.
- [ ] 5.2 Implementar invalidacion o reconsulta autorizada ante cambios de salud y minimizar payloads medicos; verificar que un usuario no autorizado no reciba detalles de salud.
- [ ] 5.3 Implementar resincronizacion por `updated_at` o version al reconectar; verificar recuperacion de cambios ocurridos durante una desconexion y consistencia de la copia local.

## 6. PWA y modo offline

- [ ] 6.1 Configurar service worker versionado para app shell y recursos estaticos del flujo de sesion; verificar instalacion y actualizacion controlada de la PWA en navegadores objetivo.
- [ ] 6.2 Implementar almacenamiento IndexedDB para sesion precargada, alumnos, alertas, definiciones y cola de comandos; verificar apertura de una sesion previamente cargada sin red.
- [ ] 6.3 Implementar cola offline con `operation_id`, payload, estado, reintentos y tenant; verificar captura de asistencia sin senal y persistencia tras cerrar y reabrir la PWA.
- [ ] 6.4 Implementar sincronizacion al recuperar conectividad con autorizacion RLS e idempotencia; verificar que solo operaciones confirmadas se retiren de la cola.
- [ ] 6.5 Mostrar hora de ultima actualizacion y advertencia cuando las alertas de salud esten potencialmente desactualizadas; verificar que una sesion offline antigua exija verificacion manual antes de iniciar.

## 7. Validacion integral y observabilidad

- [ ] 7.1 Ejecutar pruebas de aislamiento, salud, asistencia por lote, idempotencia, Realtime y offline en una matriz de roles y tenants; verificar criterios de aceptacion de la especificacion.
- [ ] 7.2 Medir el tiempo del flujo post-clase con cinco alumnos en viewport movil y verificar que el camino principal complete asistencia y novedades en tres acciones principales.
- [ ] 7.3 Agregar telemetria sin datos medicos para errores de sincronizacion, conflictos, latencia Realtime y fallos de RLS; verificar redaccion de identificadores sensibles en logs.
- [ ] 7.4 Ejecutar validacion de migraciones y rollback/feature flag en un entorno de staging; verificar compatibilidad entre versiones del cliente y del esquema.

## 8. Plan de archivos

- [ ] 8.1 Crear migraciones Supabase en `supabase/migrations/` para esquema, indices, restricciones, RLS, funciones de autorizacion, auditoria y Realtime; verificar aplicacion limpia y repetible.
- [ ] 8.2 Crear modulos de dominio y validacion en `src/` para metricas, salud, asistencia, alertas y sincronizacion; verificar pruebas unitarias y de contrato.
- [ ] 8.3 Crear rutas, Server Actions o handlers de Next.js para lectura autorizada, captura por lote y sincronizacion; verificar respuestas de error y ausencia de acceso cross-tenant.
- [ ] 8.4 Crear pantallas y componentes mobile-first de sesion, asistencia, alertas y evolucion; verificar flujo de tres acciones y estados de conectividad.
- [ ] 8.5 Crear infraestructura PWA en `public/` y configuracion del service worker, manifest y cache versionado; verificar instalacion y actualizacion en navegadores objetivo.
- [ ] 8.6 Crear adaptadores IndexedDB, cola offline y pruebas de reconexion; verificar idempotencia, persistencia local y manejo de conflictos.
- [ ] 8.7 Actualizar documentacion de privacidad, variables de entorno, procedimientos de migracion y estrategia de pruebas; verificar que ningun secreto privilegiado se documente o exponga al cliente.
