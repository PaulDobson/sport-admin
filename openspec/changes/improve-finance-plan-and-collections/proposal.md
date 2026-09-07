## Why

El módulo de finanzas tiene dominio, casos de uso, RPC transaccionales y tests para todo el ciclo de cobranza, pero casi nada de eso tiene superficie en la UI. El instructor puede crear un plan y no lo ve en ninguna parte, no puede editarlo ni archivarlo; puede activar una membresía pero no registrar el pago, ver el saldo, ni pausar/renovar/cancelar. La lógica ya existe y está probada: falta exponerla, cerrar los huecos de CRUD y reorganizar la pantalla para uso mobile-first.

## What Changes

**CRUD de planes (hoy solo Create)**

- Listado de planes del tenant con precio, ciclo, días de gracia y número de membresías asociadas.
- Edición de plan (nombre, precio, moneda, ciclo, gracia, beneficios). Los cambios afectan solo altas futuras: las membresías vigentes conservan su `agreedPrice`, y la UI lo comunica explícitamente antes de guardar.
- Archivar y reactivar plan en lugar de eliminar, respetando la integridad referencial existente.
- Los beneficios del plan pasan a formar parte del modelo de dominio y de la UI (la columna ya existe en base de datos pero el dominio la ignora).

**Cobranza reactiva con pagos parciales**

- Registro de pago desde la UI sobre la RPC existente, con monto prellenado con el saldo pendiente, fecha, referencia y ajustes opcionales de descuento, crédito o impuesto.
- Pagos parciales: una membresía admite varios pagos y el saldo se recalcula tras cada uno; el estado de cobro se deriva del saldo, no de un pago único.
- Nuevo atributo de método de pago (efectivo, transferencia, tarjeta, otro) en el pago, disponible como dato de registro y como filtro del historial.
- Vista de detalle de membresía con saldo, historial de pagos y ajustes, y acciones de ciclo de vida (pausar, renovar, expirar, cancelar) con confirmación.

**Pendientes de pago visibles y avisados**

- El sistema deriva los pendientes de pago desde las membresías vigentes y su saldo, sin generar cuotas ni documentos de cobro por adelantado.
- Los pendientes vencidos y las renovaciones próximas se publican en el centro de actividad interno como notificaciones accionables. No se agrega ningún canal externo ni se construye la superficie visual del centro de actividad, que aún no existe en la aplicación.

**Rediseño mobile-first de la pantalla de finanzas**

- La pantalla se organiza en secciones navegables (Resumen, Cobros, Planes) con el estado reflejado en la URL, en lugar de una única página con filtros y formularios apilados.
- El resumen prioriza una métrica protagonista (cobrado sobre cobrable del período) y expone mora y próximos vencimientos como accesos que navegan a la lista ya filtrada.
- Las acciones de cobro y de ciclo de vida ocurren desde la fila, en hojas inferiores, sin obligar a navegar al detalle.
- El formulario de creación de plan deja de ocupar el inicio del feed y pasa a una acción explícita dentro de la sección de planes.

**Corrección de alcance de tenant**

- Las acciones de servidor de finanzas usan el tenant operativo activo en lugar del primer tenant del usuario, alineándose con el resto de la aplicación. Es una causa directa de que un plan creado no aparezca donde el instructor lo busca.

## Capabilities

### New Capabilities

Ninguna. El comportamiento pertenece a capacidades ya existentes.

### Modified Capabilities

- `instructor-finance`: se añaden requisitos de administración del catálogo de planes (listar, editar, archivar y reactivar, con precio pactado inmutable para membresías vigentes), de pagos parciales con saldo derivado y método de pago, y de derivación de pendientes de pago a partir del saldo de membresías vigentes.
- `notifications-reporting`: se precisa que los pendientes de pago vencidos y las renovaciones próximas generan avisos accionables en el centro de actividad interno, resolubles al saldarse el pendiente.
- `product-experience-shell`: se añaden requisitos de la experiencia mobile-first de finanzas: secciones navegables con estado en la URL, indicadores que actúan como filtros y acciones de cobro accesibles desde la fila.

## Impact

**Base de datos**

- Nueva columna de método de pago en `student_membership_payments` y actualización de la RPC `record_membership_payment` para aceptarla.
- Nueva función o política para actualizar y archivar `membership_plans` respetando RLS y el registro en `instructor_financial_events`.

**Dominio y aplicación**

- `src/domain/instructor-finance/membership.ts`: beneficios y estado del plan.
- `src/domain/instructor-finance/payment.ts`: método de pago y saldo con pagos parciales.
- `src/application/instructor-finance/ports/membership-repository-port.ts`: listar todos los planes del tenant, buscar plan por identificador, actualizar, archivar y reactivar, y listar membresías por tenant.
- `src/application/instructor-finance/ports/payment-repository-port.ts`: método de pago.
- `src/application/instructor-finance/use-cases/manage-membership.ts` y `manage-payment.ts`: nuevos casos de uso de catálogo y de pendientes derivados.

**Infraestructura**

- `src/infrastructure/instructor-finance/supabase-membership-repository.ts` y `supabase-payment-repository.ts`.
- Integración con el emisor de notificaciones existente para los avisos internos.

**Presentación**

- `src/app/dashboard/finance/`: reorganización en secciones, listado y edición de planes, hoja de registro de pago, detalle de membresía y acciones de ciclo de vida.
- `src/app/dashboard/students/[studentId]/`: acceso al saldo y al cobro desde la ficha del alumno.

**Fuera de alcance**

- Generación anticipada de cuotas, documentos de cobro o calendarios de facturación.
- La superficie visual del centro de actividad. Este cambio publica y enruta los avisos con los datos necesarios para actuar sobre ellos; la pantalla que los presenta se aborda por separado.
- Canales externos de recordatorio como correo, WhatsApp o SMS.
- Pasarelas de pago y conciliación automática.
- Todo lo anterior queda para un cambio posterior de ciclos de facturación y recordatorios.
