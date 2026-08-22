## Context

La propuesta introduce una capacidad nueva sobre Next.js App Router, PWA, Supabase Auth, PostgreSQL y Supabase Realtime. El modulo debe servir a instructores independientes que trabajan en multiples locaciones y debe aislar estrictamente cada tenant. La asistencia requiere baja latencia de captura y tolerancia a conectividad intermitente; salud y lesiones requieren menor privilegio, auditoria y avisos de frescura.

## Goals / Non-Goals

**Goals:**

- Modelar evolucion flexible sin perder validacion, consultas frecuentes ni historial.
- Garantizar aislamiento por tenant desde PostgreSQL mediante RLS.
- Mostrar alertas de salud accionables antes de una sesion.
- Habilitar captura mobile-first en hasta tres acciones principales.
- Sincronizar operaciones offline sin duplicados y con conflictos visibles.
- Propagar cambios de asistencia y alertas relevantes con Realtime.
- Mantener una frontera clara entre datos operativos y datos medicos sensibles.

**Non-Goals:**

- Facturacion SaaS, pagos de alumnos o indicadores financieros globales.
- Diagnostico medico, recomendaciones de tratamiento o decisiones clinicas automaticas.
- Offline universal de toda la aplicacion.
- Edicion administrativa del historial medico por parte del administrador SaaS por defecto.

## Decisions

### Modelo de datos hibrido

Se usaran tablas relacionales con `tenant_id` en cada entidad de negocio: alumnos, sesiones, inscripciones, asistencias, definiciones de metricas, evaluaciones, condiciones de salud, lesiones, alertas y auditoria. `metric_definitions` describira tipo, unidad, categoria y reglas; `student_evolution_records` conservara evaluaciones fechadas con valores JSONB, notas y autor.

JSONB se elige para valores configurables y estructuras propias de cada disciplina. Los campos consultados en casi todos los reportes, como tenant, alumno, fecha y autor, permanecen relacionales. Se agregaran restricciones de formato en la capa de dominio y validacion de base de datos para tipos y rangos criticos. Se podran crear vistas o columnas derivadas para metricas de alto uso. Si el volumen analitico lo exige, se habilitara una tabla tipada de hechos por metrica sin cambiar el contrato de captura.

Alternativa descartada: EAV puro para todo el modulo, porque dificulta validacion, graficos y consultas; NoSQL puro, porque complica transacciones, RLS, auditoria y consistencia financiera futura.

### Aislamiento con Auth y RLS

`tenant_memberships` relacionara `auth.uid()` con tenant, rol y estado activo. Las politicas de cada tabla verificaran pertenencia y rol para lectura y escritura. El cliente usara la clave publica; la service role key quedara solo en procesos backend controlados. La autorizacion de salud tendra reglas mas restrictivas que la de asistencia.

Se centralizaran comprobaciones pequenas de pertenencia y rol para evitar duplicacion y recursividad de politicas. Las vistas, funciones SQL y endpoints tambien se revisaran porque RLS no sustituye el control de privilegios de una funcion o un proceso privilegiado.

Alternativa descartada: confiar en filtros de Next.js o en un `tenant_id` enviado por el navegador; ambos permiten errores de autorizacion si el backend no fuerza el aislamiento.

### Flujo de sesion y captura movil

La vista de sesion cargara alumnos, asistencia existente y alertas operativas vigentes. La captura sera por lote: la lista parte de un estado conocido, el instructor modifica excepciones y guarda asistencia y novedades en una operacion idempotente. Los datos detallados de evolucion podran completarse despues y no bloquearan la asistencia.

El servidor validara que la sesion, alumnos y tenant coincidan antes de aceptar el lote. Cada operacion tendra un identificador unico para que reintentos no creen duplicados.

### Realtime acotado

Las pantallas de sesion se suscribiran unicamente a cambios relevantes del tenant y de la sesion abierta. Los cambios de asistencia y alertas activas actualizaran la interfaz; reportes y proyecciones futuras usaran consultas normales. Tras reconectar se ejecutara una resincronizacion por marca de tiempo o version, porque Realtime no es un historial durable de eventos.

Los payloads de salud se minimizaran. Cuando sea posible, el cliente recibira un evento reducido y volvera a consultar el registro autorizado para obtener los detalles actuales.

### PWA y sincronizacion offline

El service worker cacheara el app shell y recursos estaticos. IndexedDB conservara la sesion previamente cargada, alumnos, definiciones necesarias, alertas operativas y una cola de comandos pendientes. Cada comando tendra `operation_id`, tenant, entidad, payload, fecha, estado y reintentos.

La UI sera optimista para asistencia, pero distinguira `pendiente`, `sincronizado` y `conflicto`. Al recuperar conexion se enviaran los comandos con idempotencia, se aplicaran RLS y se eliminara de la cola solo la confirmacion exitosa. Para asistencia, la politica inicial sera ultima escritura valida con auditoria; para salud, se conservaran transiciones y no se sobrescribiran cambios sensibles silenciosamente.

Las alertas medicas mostraran la hora de ultima actualizacion. Una copia offline antigua se marcara como potencialmente desactualizada y no se presentara como garantia de seguridad.

Alternativa descartada: usar solamente cache HTTP, porque no resuelve escrituras offline, reintentos, conflictos ni durabilidad local estructurada. `localStorage` se descarta para la cola por sus limites y API sincrona.

### Auditoria y privacidad

Los cambios y accesos a salud conservaran actor, tenant, alumno, accion, fecha y referencia del registro. El administrador SaaS administrara estado de cuenta y soporte, pero no tendra lectura medica por defecto. Se definiran consentimiento, retencion, exportacion, correccion y eliminacion segun jurisdiccion antes de produccion.

## Risks / Trade-offs

- [Riesgo] JSONB puede volverse dificil de consultar cuando crezcan los reportes → Mantener definiciones tipadas, indices por tenant/alumno/fecha y promover metricas de alto uso a vistas o hechos tipados.
- [Riesgo] Una politica RLS incompleta puede exponer datos entre tenants → Probar SELECT, INSERT, UPDATE y DELETE con usuarios de varios tenants y revisar funciones, vistas y claves privilegiadas.
- [Riesgo] Una alerta medica offline puede estar desactualizada → Mostrar frescura, estado de conexion y verificacion manual antes de iniciar cuando no haya confirmacion reciente.
- [Riesgo] Reintentos offline pueden duplicar asistencia → Usar `operation_id` unico y operaciones servidor idempotentes.
- [Riesgo] Dos dispositivos pueden modificar la misma asistencia → Aplicar politica explicita de ultima escritura, conservar auditoria y mostrar conflictos cuando el dato sea sensible.
- [Riesgo] Realtime puede perder eventos durante una desconexion → Resincronizar por `updated_at` o version al reconectar.
- [Riesgo] El service worker puede servir una version antigua del cliente → Versionar caches, activar actualizaciones controladas y evitar mezclar esquemas incompatibles.
- [Riesgo] Datos medicos pueden quedar en logs o payloads excesivos → Minimizar payloads, redaccion de logs y auditoria de acceso.

## Migration Plan

1. Crear migraciones de tablas, indices, restricciones, enums y auditoria, incluyendo `tenant_id` obligatorio.
2. Crear politicas RLS y funciones de autorizacion; probar aislamiento con usuarios y roles representativos.
3. Implementar repositorios o endpoints para captura por lote e idempotencia.
4. Implementar pantallas de sesion, alertas y evolucion con validacion de datos.
5. Agregar Realtime acotado y resincronizacion posterior a reconexion.
6. Agregar service worker, IndexedDB, cola offline y telemetria de sincronizacion.
7. Activar progresivamente offline y Realtime despues de validar migraciones, seguridad y rendimiento.

El rollback de una version de cliente debera conservar compatibilidad con los campos persistidos. Si una migracion no puede revertirse sin perdida, se desactivara la nueva funcionalidad mediante feature flag y se conservaran los datos para una migracion correctiva.

## Resolved Planning Decisions

- La primera version sera agnostica de jurisdiccion. Antes de produccion se deberan configurar consentimiento, retencion, exportacion, correccion y eliminacion conforme a la jurisdiccion de despliegue.
- El riesgo de abandono sera configurable por instructor, con valores iniciales sugeridos de tres ausencias consecutivas o menos de 50 por ciento de asistencia en treinta dias. La frescura maxima de alertas offline sera un parametro de seguridad que debe definirse antes de activar el flujo offline en produccion.
- Cada sesion tendra un instructor responsable unico. Otros miembros podran consultar o colaborar solo si su rol y permisos lo permiten; no tendran implicitamente permisos equivalentes para modificar salud o asistencia.
