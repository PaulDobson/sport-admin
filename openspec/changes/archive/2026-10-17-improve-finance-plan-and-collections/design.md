## Context

Ver `proposal.md` - Why. Lo relevante para el diseño es el estado real de cada capa:

- **Dominio y aplicación**: `calculateMembershipBalance`, `manage-payment` (registrar, saldo, historial), `manage-membership` (activar, pausar, renovar, expirar, cancelar) y `filterMembershipFollowUps` existen y tienen tests. Ninguno de ellos, salvo crear plan y activar membresía, tiene una acción de servidor que los invoque.
- **Base de datos**: `record_membership_payment` y `transition_student_membership` son RPC `security definer`, idempotentes por `operation_id` con `pg_advisory_xact_lock`, y ya escriben en `instructor_financial_events`. `student_membership_payments` tiene `due_on` sin uso y no tiene columna de método de cobro. `membership_plans` ya tiene `status` con valores `active` y `archived`, `benefits` jsonb y políticas RLS de update.
- **Notificaciones**: `create_routed_activity_event` enruta eventos a `activity_notifications` con deduplicación por `unique (tenant_id, operation_id)` y un identificador determinista vía `activity_operation_id(text)`. El trigger `notify_student_membership_status` ya emite `membership.past_due` y `membership.expired` al cambiar el estado de la membresía. El canal `internal` siempre se inserta; email y push dependen de `notification_preferences`.
- **Presentación**: `src/app/dashboard/finance/page.tsx` es una única página server-rendered con un `form method="get"` de filtros, el formulario de creación de plan, tarjetas de proyección y la lista de seguimiento.
- **Auditoría**: `audit_log` es append-only y `SupabaseAuditLog` ya lo escribe desde la aplicación.

Restricción operativa: hay un cambio en curso, `set-platform-currency-clp`, que modifica los mismos requisitos de moneda de `instructor-finance`. Este diseño no altera el manejo de moneda y sus deltas de spec son aditivos para no colisionar.

## Goals / Non-Goals

**Goals:**

- Exponer en la UI la lógica financiera ya implementada y probada, sin reescribirla.
- Cerrar el CRUD de planes conservando la inmutabilidad de las condiciones pactadas en membresías vigentes.
- Derivar pendientes y saldos de datos existentes, sin introducir un modelo de cuotas.
- Reutilizar el enrutamiento de eventos de actividad existente para los avisos de cobranza, en lugar de crear un mecanismo paralelo.
- Reorganizar finanzas en secciones navegables con el estado en la URL, sin abandonar el renderizado en servidor.

**Non-Goals:**

- Cambiar el cálculo de proyección mensual o el manejo de monedas.
- Introducir estado de cliente global o una capa de datos en el navegador para finanzas.
- Modificar el shell autenticado, la navegación principal o el sistema de diseño.
- Habilitar la operación de cobranza en modo offline.

## Decisions

### El saldo se sigue derivando, no se persiste

El saldo pendiente se calcula con `calculateMembershipBalance` a partir del precio pactado, los ajustes y los pagos en estado `paid`. No se agrega una columna de saldo ni una tabla de cuotas.

Los pagos parciales ya funcionan con este modelo: varios pagos sobre la misma membresía suman contra el mismo importe pactado. El único cambio necesario es de presentación e interpretación: la UI deja de asumir "un pago cierra la membresía" y el pendiente se define como saldo mayor que cero.

_Alternativa descartada_: materializar cuotas con `due_on` y un estado de cobro por cuota. Da un modelo de cobranza más rico, pero exige generación periódica, conciliación y migración de datos históricos. Es exactamente el alcance que el usuario decidió separar en un cambio posterior; `due_on` queda como está, sin uso, para no comprometer ese diseño futuro.

_Consecuencia a vigilar_: `SupabaseMembershipFollowUpRepository.listByTenant` trae todos los pagos y ajustes del tenant y los cruza en memoria. Es aceptable hoy y sirve igual para los pendientes, pero el cálculo de saldo se moverá a una vista SQL si el volumen lo exige. La decisión ahora es no optimizar prematuramente y mantener el cálculo en el dominio, donde está probado.

### El método de cobro es una columna nueva con valor por defecto

Se agrega `method` a `student_membership_payments` con valores `cash`, `transfer`, `card` y `other`, `not null default 'other'`, de modo que las filas existentes queden válidas sin backfill interpretativo.

`record_membership_payment` recibe un parámetro nuevo. Como los `grant` y `revoke` de Postgres son por firma, se crea la función con la firma ampliada y se elimina explícitamente la firma anterior en la misma migración, para no dejar dos versiones ejecutables.

_Alternativa descartada_: guardar el método dentro de `reference` o de `metadata`. Impide filtrar y totalizar por método, que es el uso principal que motivó el atributo.

### La edición de planes es un update directo bajo RLS, no una RPC

`membership_plans` ya tiene política de update para roles autorizados y no participa en ninguna invariante transaccional entre tablas: cambiar el precio de un plan no toca ninguna membresía, precisamente porque `student_memberships` desnormaliza `agreed_price`, `currency` y `billing_cycle`. Un update directo desde el repositorio es suficiente y evita una RPC `security definer` innecesaria.

Archivar y reactivar son el mismo update sobre `status`. No se implementa borrado: la clave foránea de `student_memberships` es `on delete restrict` y el histórico debe conservarse.

La trazabilidad se registra en `audit_log` mediante `AuditLogPort`, no en `instructor_financial_events`: el `check` de esa tabla solo admite `entity_type` en `membership`, `payment` y `adjustment`, y un cambio de catálogo no es un evento contable.

_Alternativa descartada_: versionar los planes creando una fila nueva por cada edición. Es más fiel para análisis histórico, pero el precio histórico ya está preservado en la membresía, así que la versión duplicaría información sin agregar capacidad.

### Los avisos de cobranza se emiten por evaluación, no por trigger de fila

El aviso de pendiente vencido depende del saldo, que es derivado, y del paso del tiempo respecto de los días de gracia del plan. Ninguna de las dos condiciones corresponde a un cambio de fila, así que un trigger no puede detectarlas.

Se añade una función de evaluación invocada desde la ruta de proceso existente, análoga a `/api/notifications/process`, que recorre las membresías vigentes con saldo positivo fuera de gracia y las renovaciones dentro de la ventana configurada, y llama a `create_routed_activity_event` con un `operation_id` determinista construido con `activity_operation_id`. La deduplicación la garantiza el índice único `(tenant_id, operation_id)` existente, sin lógica adicional.

La clave determinista incluye membresía, tipo de evento y el período de referencia. Esto produce un aviso vigente por membresía y período, y permite que un impago prolongado vuelva a avisar en el período siguiente sin acumular avisos dentro del mismo período.

La resolución se hace en `record_membership_payment`: tras registrar el pago, si el saldo resultante queda en cero, marca como `resolved` las notificaciones de cobranza abiertas de esa membresía. Es la misma transacción del cobro, así que no hay ventana en la que el saldo esté saldado y el aviso siga pendiente.

El canal externo no requiere trabajo: `create_routed_activity_event` inserta `internal` siempre y solo agrega email o push si existe una preferencia habilitada para ese `event_type`. Como no se crea ninguna preferencia para los nuevos tipos de evento, la entrega queda restringida al centro de actividad sin código defensivo.

_Alternativa descartada_: un trigger sobre `student_membership_payments` que evalúe el saldo. Detecta el pago que resuelve, pero nunca el pendiente que nace del paso del tiempo, así que haría falta igualmente la evaluación periódica.

### Las secciones de finanzas son parámetros de búsqueda, no rutas anidadas

La sección activa, el período y los filtros viajan en la query string de `/dashboard/finance`. La página sigue siendo un Server Component que lee `searchParams` y consulta solo lo que la sección activa necesita.

Se prefiere esto a rutas anidadas con layout compartido porque la sección determina qué datos consultar, y con rutas separadas el resumen y los cobros repetirían la carga de membresías, pagos y ajustes en dos árboles distintos. Con un solo parámetro, la consulta se decide una vez y los indicadores del resumen pueden enlazar a la sección de cobros con filtro simplemente construyendo un enlace, sin estado de cliente.

_Alternativa descartada_: tabs controladas en el cliente. Rompe compartir y recargar la URL, y obligaría a traer todos los datos de las tres secciones por adelantado.

### Las acciones de fila usan hojas inferiores con formularios de servidor

El registro de cobro y las transiciones de ciclo de vida se ejecutan con Server Actions dentro de una hoja inferior, siguiendo el patrón de `useActionState` ya usado en `plan-form.tsx` y en los formularios de alumnos. El `operationId` se genera en el servidor por envío, apoyándose en la idempotencia que ya ofrecen las RPC.

Las acciones destructivas, cancelar y expirar, exigen confirmación explícita en la misma hoja antes de habilitar el envío.

### La acción de servidor usa el tenant operativo activo

Las acciones de `src/app/dashboard/finance/actions.ts` pasan a resolver el tenant con `requireOperationalMembership()`, igual que la página, en lugar de `actors[0].tenantId`. Además de corregir el síntoma reportado, es requisito de spec que la operación se ejecute contra el tenant activo mostrado en la interfaz.

## Risks / Trade-offs

- **El cálculo de saldo cruza en memoria todos los pagos y ajustes del tenant** → Se mantiene por ahora porque el código está probado y el volumen por instructor es bajo; se acota consultando solo membresías no canceladas y se deja documentada la vía de escape hacia una vista SQL agregada si el tiempo de respuesta se degrada.
- **Reemplazar la firma de `record_membership_payment` puede dejar clientes apuntando a la firma antigua** → La migración crea la nueva firma y elimina la anterior en la misma transacción, y el repositorio es el único llamador dentro del proyecto.
- **La evaluación periódica podría no ejecutarse y dejar sin avisos** → Los avisos son un complemento; la sección de cobros deriva los pendientes en cada carga y no depende de la evaluación, así que una ejecución perdida no oculta deuda al instructor.
- **La clave determinista por período puede reabrir un aviso ya resuelto manualmente** → Se acepta: un pendiente impago que cruza al período siguiente debe volver a avisar. La resolución automática por saldo cero evita el caso molesto.
- **Editar el precio de un plan puede interpretarse como que sube el precio a todos** → Se mitiga en la interfaz con la advertencia explícita sobre las membresías vigentes, exigida por el spec, no solo con una nota en la documentación.
- **La reorganización en secciones cambia URLs que los usuarios pudieran tener guardadas** → La ausencia del parámetro de sección resuelve a resumen, así que `/dashboard/finance` sigue siendo válida.

## Migration Plan

1. Migración de esquema: columna `method` en `student_membership_payments` con valor por defecto, firma ampliada de `record_membership_payment` con la resolución de avisos incluida, y eliminación de la firma anterior. Sin backfill: las filas existentes quedan como `other`.
2. Migración de notificaciones: función de evaluación de pendientes y renovaciones, y registro de los nuevos tipos de evento. Es aditiva y no altera los triggers existentes de estado de membresía.
3. Dominio, puertos y repositorios: los cambios son ampliaciones de interfaz; los tipos existentes se conservan y el método de cobro se incorpora como atributo requerido en el registro y opcional en la lectura de datos históricos.
4. Presentación: la reorganización de `/dashboard/finance` se despliega completa en un solo paso; conviven la ruta actual y la nueva estructura de secciones porque comparten la misma URL base.

Reversión: las migraciones son aditivas salvo el reemplazo de firma de la RPC, que se revierte restaurando la firma anterior; la columna `method` puede permanecer sin uso sin afectar el comportamiento previo.
