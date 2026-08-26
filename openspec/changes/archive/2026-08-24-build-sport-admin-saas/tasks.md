## 1. Foundation del proyecto

- [x] 1.1 Inicializar Next.js App Router con TypeScript, linting, testing, variables de entorno y cliente Supabase SSR; verificar build, lint y arranque local.
- [ ] 1.2 Configurar Vercel, entornos local/staging/produccion y secretos sin exponer service role; verificar que el bundle del navegador no contenga claves privilegiadas.
- [ ] 1.3 Configurar manifest, iconos, service worker versionado y app shell PWA; verificar instalacion y actualizacion en navegadores movil objetivo.
- [x] 1.4 Definir estructura modular de dominio, convenciones de errores, auditoria y validacion compartida; verificar importaciones y una prueba de contrato por modulo.
- [ ] 1.5 Verificar la puerta de salida de foundation con build, lint, pruebas base, arranque local y despliegue de staging; verificar que el entorno pueda recibir el modulo de identidad.

## 2. Identidad y multi-tenancy

- [x] 2.1 Crear migraciones de perfiles, tenants, membresias, roles, estados de cuenta y auditoria; verificar aplicacion limpia y restricciones de integridad.
- [x] 2.2 Implementar registro, login, recuperacion, verificacion y onboarding de instructor; verificar transiciones pendiente, trial y activo.
- [x] 2.3 Implementar funciones de pertenencia y rol sin recursividad de RLS; verificar casos activo, suspendido, revocado y administrador SaaS.
- [x] 2.4 Activar RLS en todas las tablas de negocio y probar SELECT, INSERT, UPDATE y DELETE entre dos tenants; verificar ausencia de lecturas y escrituras cross-tenant.
- [x] 2.5 Implementar rutas protegidas y autorizacion server-side en Next.js; verificar que ocultar una pantalla no sea la unica barrera de acceso.
- [x] 2.6 Verificar la puerta de salida de identidad ejecutando la matriz cross-tenant antes de crear datos operativos; verificar que ningun usuario pueda leer o modificar otro tenant.

## 3. Operacion del instructor

- [x] 3.1 Crear migraciones y repositorios para alumnos, contactos, estados y locaciones externas; verificar gimnasio, parque, domicilio y online.
- [x] 3.2 Crear gestion de disciplinas, plantillas de clase, horarios, zona horaria, cupos e instructor responsable; verificar validacion de conflictos de agenda.
- [x] 3.3 Implementar generacion y edicion de sesiones e inscripciones; verificar cupo, lista de espera, cancelacion y participantes esperados.
- [x] 3.4 Implementar dashboard mobile-first de jornada con proximas sesiones, pendientes y filtros por locacion; verificar prioridad de la sesion actual en viewport movil.
- [x] 3.5 Ejecutar pruebas de permisos de propietario, instructor responsable y asistente sobre alumnos, agenda e inscripciones; verificar que cada rol solo vea y modifique su alcance.

## 4. Evolucion, salud y asistencia

- [x] 4.1 Crear migraciones de definiciones de metricas, evaluaciones JSONB, condiciones, lesiones, restricciones, asistencias, alertas y auditoria sensible; verificar indices por tenant, alumno y fecha.
- [x] 4.2 Implementar definiciones y validacion de metricas numericas, porcentaje, duracion, seleccion y objeto; verificar rechazo de tipo o rango incompatible.
- [x] 4.3 Implementar historial de evolucion con autor, fecha, notas y consulta cronologica; verificar que una nueva evaluacion no sobrescriba anteriores.
- [x] 4.4 Implementar altas, actualizaciones y resolucion historica de salud y lesiones; verificar restricciones vigentes, resueltas y auditoria de acceso/cambio.
- [x] 4.5 Implementar semaforo textual previo a sesion con nivel, motivo y accion operativa; verificar casos rojo, amarillo, verde y ausencia de diagnostico.
- [x] 4.6 Implementar asistencia y novedades por lote en tres acciones principales; verificar el registro de cinco alumnos sin formulario individual obligatorio.
- [x] 4.7 Implementar criterios de abandono configurables por instructor y alertas deduplicadas; verificar tres ausencias consecutivas, porcentaje mensual, resolucion e historial.
- [x] 4.8 Verificar aislamiento de salud respecto al administrador SaaS y asistentes; ejecutar pruebas negativas de lectura, modificacion y payloads reducidos.

## 5. Membresias y finanzas del instructor

- [x] 5.1 Crear migraciones para planes, membresias, pagos, descuentos, creditos, mora y eventos contables; verificar moneda, periodicidad y estados trazables.
- [x] 5.2 Implementar altas, pausas, renovaciones, vencimientos y cancelaciones de membresias; verificar que solo estados vigentes participen segun politica.
- [x] 5.3 Implementar registro de pagos e importes ajustados con referencia auditable; verificar saldo, duplicados y eventos historicos inmutables.
- [x] 5.4 Implementar proyecciones contratado, cobrable y cobrado con normalizacion mensual de ciclos trimestrales, semestrales y anuales; verificar no duplicacion y separacion por moneda.
- [x] 5.5 Implementar vistas de vencimientos, mora y renovaciones; verificar filtros por fecha/estado y calculos contra fixtures contables conocidos.
- [x] 5.6 Verificar el hito vertical del MVP en movil: login, alumno, sesion, asistencia, alerta de salud, membresia y proyeccion; verificar que el flujo principal sea util antes de agregar capacidades avanzadas.

## 6. Backoffice SaaS y billing

- [x] 6.1 Crear migraciones para planes SaaS, suscripciones, facturas, cobros, reembolsos, limites y estados de tenant; verificar separacion de libro SaaS e instructor.
- [x] 6.2 Implementar backoffice de registro, verificacion, activacion, trial, suspension, reactivacion y cancelacion; verificar historial de estado y motivos.
- [x] 6.3 Implementar adaptador de proveedor de pagos y webhooks normalizados con idempotencia; verificar cobro exitoso, fallido, reembolso y evento repetido.
- [x] 6.4 Implementar limites por plan para alumnos, usuarios y funciones; verificar bloqueo accionable al exceder limite y comportamiento en cambio de plan.
- [x] 6.5 Implementar dashboard SaaS de MRR, ARR, ARPA, churn, conversion trial, cobrado, pendiente y mora; verificar periodo, moneda, definicion y reproduccion de agregados.
- [x] 6.6 Probar que administrador SaaS pueda gestionar estado y finanzas sin leer salud; verificar auditoria de operaciones privilegiadas.

## 7. Offline, Realtime y sincronizacion

- [x] 7.1 Implementar cache del app shell y precarga de la sesion actual; verificar apertura de la sesion previamente cargada con red desconectada.
- [x] 7.2 Implementar adaptador IndexedDB para sesiones, alumnos, alertas, metricas y cola; verificar persistencia tras cerrar y reabrir la PWA.
- [x] 7.3 Implementar comandos offline con operation_id, estados, reintentos, tenant y payload; verificar captura de asistencia sin red y estado pendiente visible.
- [x] 7.4 Implementar sincronizacion idempotente al reconectar con validacion Auth/RLS; verificar que solo confirmaciones exitosas retiren operaciones de la cola.
- [x] 7.5 Implementar versionado, auditoria y UI de conflictos; verificar ultima escritura para asistencia y preservacion de transiciones sensibles de salud.
- [x] 7.6 Configurar Realtime acotado a tenant/sesion para asistencia y alertas; verificar actualizacion entre dos dispositivos autorizados y ausencia de payloads cross-tenant.
- [x] 7.7 Implementar resincronizacion por updated_at o version despues de desconexion; verificar recuperacion de eventos perdidos sin depender solo de Realtime.
- [x] 7.8 Mostrar frescura de alertas y verificacion manual cuando la copia medica este antigua; verificar que no se presente cache obsoleta como garantia de seguridad.

## 8. Notificaciones y reportes

- [x] 8.1 Crear migraciones de preferencias, centro de actividad, entregas, reintentos y deduplicacion; verificar estados pendiente, entregado, fallido y resuelto.
- [x] 8.2 Implementar eventos de vencimiento, mora, ausencia, abandono, salud autorizada y billing SaaS; verificar destinatario, rol, tenant y canal correcto.
- [x] 8.3 Implementar proveedor abstracto para email, push y notificacion interna; verificar reintentos sin duplicados y redaccion de datos medicos innecesarios.
- [x] 8.4 Implementar reportes operativos y financieros con filtros y exportacion; verificar alcance RLS, periodo, moneda y separacion de libros.
- [x] 8.5 Implementar push como capacidad de Fase 3 con feature flag; verificar fallback al centro interno cuando el permiso o canal no exista.

## 9. Calidad, seguridad y despliegue

- [x] 9.1 Crear fixtures y pruebas de aislamiento para una matriz de tenants y roles; verificar que todas las tablas expuestas rechacen acceso cruzado.
- [x] 9.2 Crear pruebas de flujo movil de sesion, asistencia en lote, salud y finanzas; verificar completitud en tres acciones principales con cinco alumnos.
- [x] 9.3 Crear pruebas de offline, reconexion, Realtime, idempotencia y conflictos; verificar perdida de red durante captura y cambios concurrentes.
- [ ] 9.4 Ejecutar pruebas de migracion, rollback o feature flag y compatibilidad entre versiones de cliente; verificar staging antes de produccion.
- [x] 9.5 Configurar observabilidad sin datos medicos: errores, latencia, sincronizacion, RLS y webhooks; verificar redaccion de identificadores sensibles.
- [ ] 9.6 Implementar bloqueo de salud hasta aprobacion legal, consentimiento explicito versionado declarado por instructor, exportacion y correccion auditadas, y solicitudes de eliminacion con espera de 30 dias; verificar aislamiento, retenciones y aprobacion jurisdiccional antes de activar salud en produccion.
- [ ] 9.7 Verificar las puertas de salida por fase: foundation desplegable, RLS probado, flujo operativo completo, finanzas reconciliables, sincronizacion tolerante a fallos y privacidad aprobada; documentar el resultado de cada gate.

## 10. Plan de archivos

- [x] 10.1 Crear configuracion base en `package.json`, `next.config.*`, `tsconfig.json`, `public/manifest.*`, service worker y archivos de entorno de ejemplo; verificar build y PWA.
- [x] 10.2 Crear migraciones Supabase en `supabase/migrations/` para identidad, tenancy, operacion, evolucion, salud, asistencia, finanzas, billing, notificaciones, indices, RLS, funciones y auditoria; verificar aplicacion limpia.
- [x] 10.3 Crear modulos de dominio en `src/` para auth, tenants, alumnos, agenda, membresias, evolucion, salud, asistencia, finanzas, administracion, notificaciones y sincronizacion; verificar tests por modulo.
- [x] 10.4 Crear rutas App Router, layouts protegidos, Server Actions o handlers y clientes Supabase SSR/browser; verificar autorizacion server-side y errores accionables.
- [x] 10.5 Crear componentes mobile-first para onboarding, dashboard, sesiones, alumnos, evolucion, salud, finanzas, backoffice y reportes; verificar estados de carga, error, offline y conflicto.
- [x] 10.6 Crear adaptadores de IndexedDB, cola, Realtime y proveedores de notificacion/pagos; verificar contratos, idempotencia y reconexion.
- [x] 10.7 Crear pruebas en `tests/` o estructura equivalente para RLS, dominio, integracion, PWA y E2E movil; verificar ejecucion en CI.
- [x] 10.8 Crear documentacion de arquitectura, variables, migraciones, privacidad, soporte y runbooks de billing; verificar que no contenga secretos ni datos medicos reales.
