## Context

Ver [proposal.md](./proposal.md) para la motivacion. Ya existen planes, suscripciones, limites por fecha, invoices, charges, refunds, webhooks idempotentes, dashboard y auditoria privilegiada. La asignacion actual de limites no completa por si sola la facturacion. Los nuevos datos de academia y contactos viven en `tenant_details`; el contacto de facturacion sigue siendo independiente.

La arquitectura usa Next.js, React, TypeScript, Supabase/PostgreSQL y cuatro capas. La presentacion solo accede a infraestructura por composicion. Hay cambios de backoffice y academia sin commit que se deben conservar. `set-platform-currency-clp` sigue abierto: integrar su contrato sin archivar ni reescribir ese cambio.

### Inventario de compatibilidad verificado

| Consumidor actual | Contrato a conservar o adaptar |
| --- | --- |
| `src/app/backoffice/tenants/actions.ts`, `manage-tenants.ts` y `SupabaseTenantBackoffice` | `list_active_saas_plans`, `get_saas_tenant_entitlements` y `schedule_saas_plan_limits`; el ultimo solo modifica snapshots de limites, no factura ni actualiza el contrato comercial |
| `SupabaseSaasEntitlements` y migraciones 0017/0026 | `current_saas_limits` y `can_use_saas_feature`; conservar catalogo real reports/offline/realtime/push y proteccion de limites al activar alumnos/usuarios |
| `process_saas_payment_event` (0016) y `SupabaseSaasPaymentEventProcessor` | Orden de bloqueo suscripcion -> invoice/charge, identidad del evento/proveedor y validacion de moneda; antes de registrar pagos manuales hay que reconciliar su calculo agregado de saldos |
| `get_saas_financial_dashboard` (0018/0019), `SupabaseSaasFinancialDashboard` y exportacion `/api/reports/export` | Historial `saas_subscription_events` con ciclos fijos y snapshots de precio; extender duracion sin releer precios actuales ni mezclar monedas |
| `record_saas_subscription_status` (0018) | Dispara con status/price/currency/billing_cycle; agregar cambios de version/duracion a su registro cuando se habiliten contratos flexibles |
| `notify_saas_charge_status` y `notify_saas_subscription_status` (0024) | El primero corre despues de UPDATE, no de INSERT; un pago manual insertado como succeeded necesita enrutar su notificacion sin duplicarla |
| `can_read_saas_billing` (0014) | Actualmente permite owner y admin de tenant, incluso suspendido; nuevos endpoints de consulta propia y recibos deben comprobar owner y no heredar esa autorizacion mas amplia |
| `0028_default_currency_clp.sql`, `formatMoney` y `set-platform-currency-clp` | El default CLP ya existe; no convertir historicos ni modificar el cambio abierto. CLP sin decimales y USD/EUR existentes siguen siendo validos en los flujos legacy |
| Repositorios y proyecciones de `instructor-finance` | Son ledger de alumnos y no consumidores del SaaS; no reutilizar sus tablas ni cambiar sus ciclos para implementar planes de gimnasios |

Baseline local verificado al comenzar: 22 tests existentes de administracion de tenants,
dashboard, webhook, proveedor HMAC, adaptador de tenants y formato de monedas pasan.
La base de calculo SaaS nueva usa racionales BigInt internos, no cambia el transporte
legacy de importes ni los contratos RPC antes de desplegar sus migraciones.

## Goals / Non-Goals

**Goals:**

- Extender el libro SaaS existente, con invariantes economicas aplicadas atomicamente en PostgreSQL.
- Separar confirmacion de pago, emision PDF y entrega de correo en estados recuperables.
- Mantener historial verificable aun cuando cambien planes, contactos o emisor.
- Hacer visibles el efecto monetario y los limites antes de cada cambio contractual.

**Non-Goals:**

- Un motor tributario, plataforma bancaria, pasarela nueva o reemplazo de webhooks.
- Una segunda contabilidad paralela o una administracion CRUD generica de tablas.
- Suspender o reactivar automaticamente tenants por un pago: los estados administrativos existentes y sus motivos se conservan.

## Decisions

### 1. Reutilizar tablas existentes con versiones y snapshots

Agregar versiones inmutables de condiciones comerciales vinculadas a `saas_plans`: precio final CLP, `duration_unit` days/months, `duration_count`, servicios descriptivos, funciones catalogadas, limites y trial. La identidad del plan conserva slug y estado; editar publica una nueva version, no cambia contratos vigentes. Archivar impide nuevas asignaciones pero no renovaciones de versiones ya contratadas.

Las suscripciones referencian una version y sus snapshots; invoices agregan concepto, lineas, tipo renovacion/upgrade y version. Conservar campos legacy para lectores existentes hasta adaptar todas las RPC. Migrar ciclos monthly/quarterly/semiannual/annual a 1/3/6/12 meses sin cambiar fechas, importes ni monedas. No exigir CLP a filas historicas; nuevas operaciones de este modulo son CLP. Servicios libres son texto comercial, no permisos; funciones solo reports/offline/realtime/push segun soporte real.

Alternativa descartada: actualizar precio de la fila del plan y leerlo retrospectivamente; alteraria el contrato y el MRR historico.

### 2. Dinero exacto, fechas y prorrateo deterministas

Trabajar con pesos enteros en las nuevas operaciones y aritmetica decimal/racional exacta en SQL; no calcular el saldo definitivo con floats de JavaScript. Fechas de servicio en America/Santiago, timestamps en UTC. Usar intervalos de dominio `[inicio, fin_exclusivo)` y traducir explicitamente a columnas legacy inclusivas si corresponde. Meses se suman desde el dia ancla original, ajustando a fin de mes sin perder el ancla en febrero; dias son dias calendario.

Para un upgrade en la fecha D:

- R = dias entre D y el fin exclusivo del periodo actual; no hay prorrateo negativo ni fuera del periodo.
- Tarifa anterior = tarifa racional vigente, inicialmente precio contratado / dias reales del periodo correspondiente.
- Tarifa nueva = precio nuevo / dias reales de su duracion desde D (N dias o N meses calendario).
- Importe extra = round_half_up(max(0, tarifa_nueva - tarifa_anterior) * R).
- Se conserva la fecha de renovacion actual y se guarda la nueva tarifa racional aplicada, para sucesivos upgrades del mismo periodo.
- Ejemplo: precios 30.000 y 60.000 por 30 dias, con 10 dias restantes: cargo 10.000.
- Si el redondeo produce cero, no crear pago ni comprobante ficticio; dejar evento contractual y ajuste cero.
- Desde la siguiente renovacion se cobra la nueva version por su duracion completa.

Comparar las mismas tarifas diarias para clasificar upgrade/downgrade aun con duraciones distintas. Cambios equivalentes se programan a renovacion. Previsualizacion incluye fechas, denominadores, total, uso, tipo y huella del contrato/version/dia de calculo. Confirmar vuelve a calcular bajo bloqueo; preview obsoleto se rechaza.

IVA informativo: neto = round_half_up(total * 100 / 119); IVA = total - neto. El total no aumenta. Mostrar explicitamente el 19% incluido y conservar tasa y calculo en el documento.

Alternativa descartada: precio mensual aproximado para prorratear meses; produce diferencias con los dias de servicio reales.

### 3. Transacciones idempotentes para asignacion, pagos y cambios

RPC autenticadas verifican `is_platform_admin()`, bloquean suscripcion/invoice y auditan en la misma transaccion. Unicidad por tenant/operation_id y payload: reintento identico devuelve el resultado, payload distinto con la misma clave se rechaza. Mantener orden de bloqueos consistente con webhooks para evitar carreras.

Asignacion crea contrato, limites y cobro inicial en una transaccion. Trial explicito dura los dias contratados; no se inventa un pago durante el trial y el primer periodo pagable comienza al terminarlo. Una suscripcion corriente por tenant. Vencimiento de cada cobro se previsualiza y confirma, por defecto al inicio del periodo; el job no inventa plazos distintos.

El pago manual solo liquida saldo completo y requiere metodo, fecha real no futura, referencia para transferencia/tarjeta y emisor valido. No almacenar PAN ni datos de tarjeta. Revalidar saldo y rechazar operaciones externas pending/processing; conservar los pagos parciales historicos y permitir liquidar todo su remanente. Generar charge succeeded y actualizar invoice/subscription usando las mismas reglas de agregacion que el webhook; un pago de una invoice no oculta otra deuda del tenant.

Un pago de una deuda emitida en CLP por este modulo crea snapshot de comprobante y trabajo de generacion en la misma transaccion. Si el renderizado falla despues, no revertir el pago. Para historicos no CLP, mantener flujos y documentos existentes, sin conversion automatica.

Anular solo invoices impagas sin pagos ni cargos en curso, con motivo; no borrar registros ni ofrecer reembolsos nuevos. Preservar APIs de reembolso/webhook existentes y no sobreescribir su historia.

### 4. Renovacion durable y limites coherentes

Tabla de cambios programados por suscripcion con estado scheduled/applied/cancelled/blocked, snapshot nuevo y actor/motivo. Upgrade confirmado modifica version y limites ahora y crea invoice de diferencia pendiente; no espera pago. Downgrade valida uso ahora y en renovacion; si excede al ejecutar, marcar blocked, notificar y renovar una vez el contrato anterior, sin borrar recursos.

Un job autenticado reutiliza el patron de procesamiento del repositorio: funcion transaccional de renovacion y endpoint protegido por secreto de scheduler, con registro de ejecuciones y reintentos. Procesa periodos vencidos y atrasados en lotes acotados; no depende de visitar una pagina para facturar. Unicidad subscription/period_start/type evita duplicados. La revision manual y el job invocan la misma operacion. Pruebas obligatorias de caida, recuperacion y dos workers.

Reemplazar o redirigir el formulario/RPC legacy de solo limites para que no permita bypass financiero de un cambio de plan. Mantener snapshots por fecha y prohibir superposiciones. Reconciliar cualquier cambio de limites ya programado antes de migrarlo; nunca convertirlo silenciosamente en un cobro.

### 5. Comprobante privado, emisor y correo transaccional

Agregar configuracion versionada del emisor: nombre/razon social, RUT, direccion, email, nombre comercial opcional y tasa 19%. Restringir edicion al administrador SaaS; secretos de correo permanecen en entorno, no en esa tabla. No implementar validacion fiscal SII ni afirmar autorizacion tributaria.

Agregar receipts con folio unico de secuencia, charge/invoice/tenant, snapshot JSON tipado, estado pending/generating/ready/failed, version de plantilla y ruta/hash PDF. Folio unico por pago, sin reutilizacion; huecos son admisibles al no ser folio fiscal. Snapshot incluye receptor, emisor, metodo, referencia, servicios, periodo y calculos; no obtenerlos de filas mutables al regenerar.

Generacion server-only mediante `pdf-lib` y fuente Unicode local con licencia compatible para nombres en espanol; la dependencia y la fuente se agregan en implementacion tras validar licencia y bundling. Diseno multipagina, texto escapado y sin HTML remoto. Almacenar en bucket privado de Supabase con nombre determinista; no usar URLs publicas. Endpoint de descarga verifica sesion y autorizacion por documento; o firma de vida corta despues de autorizacion. Ningun service role llega al navegador. Auditar acceso.

Outbox de PDFs y entregas con leases recuperables, retries acotados, siguiente intento, error seguro y accion manual. La cola se crea en transaccion con el evento correspondiente. Resend via adaptador de infraestructura y puerto de correo; API key y remitente verificado configurables. Cada envio explicito tiene operation_id y clave idempotente de proveedor estable; reenvio intencional es una nueva entrega. No garantizar exactly-once fuera de la ventana de idempotencia del proveedor: reconciliar antes de reintentar un timeout ambiguo y mostrar resultado incierto cuando corresponda.

Preferir email de facturacion, previsualizar siempre destinatario; contacto principal solo con confirmacion explicita. Si no hay email, permitir descarga y mostrar falta de destinatario. Falta de credenciales no impide cobrar o descargar, pero impide enviar y se muestra como configuracion incompleta. Resend aceptado se muestra como enviado al proveedor, no entregado. No hay envio automatico no solicitado en esta version.

Alternativa descartada: generar y mandar email dentro de la transaccion SQL o bloquear el pago por error del proveedor.

### 6. Superficies y navegacion

- Backoffice: **Planes** para catalogo/versiones; **Cobranza** para deuda, pagos y comprobantes; **Finanzas** conserva metricas y enlaza a filas verificables.
- Tenants: resumen de suscripcion y acciones **Asignar plan / Cambiar plan / Ver cobros**, sin un segundo editor de limites independiente.
- Dueno: **Mi suscripcion**, desde Gestion en desktop y menu de cuenta en movil, con plan y documentos propios. No mezclar con Finanzas de alumnos ni con Mi gimnasio.
- Emisor dentro de configuracion financiera del backoffice; estado de correo verificable y sin exponer secretos.
- Reutilizar Panel/Surface, FieldControl, Button, estados y patrones responsive actuales; formularios de tarea con preview antes de confirmar cambios de dinero.
- Movil: tarjetas, detalle como pantalla/panel de tarea, CTA de 44 px o mas fuera del area tapada por bottom navigation, teclado numerico y CLP sin decimales.
- Desktop: tablas con filtros/paginacion y detalle; no comprimir todo el ciclo financiero en el aside actual de tenants.
- Errores preservan borradores; loading, vacio, conflicto de concurrencia y exito parcial del documento son estados diferenciados.

### 7. Dashboard e historicos

Extender la consulta existente y sus exportaciones sobre el mismo libro. Cobrado por fecha de pago menos reembolsos existentes, pendiente por saldo y due_on, mora por fecha financiera explicita; evitar doble conteo al unir invoices/charges/refunds. Cobro proporcional no aumenta MRR como ingreso recurrente duplicado. MRR usa precio de version vigente: precio/N meses o precio*365/(12*N dias). Redondear solo para presentacion de metricas; no mezclar monedas historicas.

Contratos previos deben producir los mismos indicadores tras migracion. Separar normalizacion recurrente de efectivo y permitir drill-down con filtros equivalentes. Historial de versiones y eventos por fecha permite reproducir meses anteriores sin leer el precio actual.

### 8. Autorizacion y validacion de contratos

RLS y RPC de mutacion limitadas al administrador SaaS; lectura propia solo owner activo. La lectura de facturacion del dueno puede usar membresia activa aun si el tenant esta suspendido por administracion, mediante una ruta de acceso minimo independiente del guard operativo; no habilita agenda o datos de alumnos. No permitir lectura a assistant/instructor/admin del tenant por defecto.

Consultas privilegiadas auditadas sin cargar salud. Lectura propia verifica actor/tenant en DB, no solo cookie. Validar en runtime los nuevos contratos RPC, sin convertir respuestas desactualizadas en saldos cero; mostrar error de migracion explicito como en tenants.

## Risks / Trade-offs

- [Complejidad de fechas, meses y prorrateos] -> racionales exactos, semantica de intervalos unica y pruebas de fin de mes, bisiestos y cambios de horario.
- [Downgrade bloqueado por crecimiento de uso] -> preview y revalidacion; renovacion transparente del plan previo y notificaciones, sin eliminar datos.
- [Pago confirmado sin PDF inmediato] -> snapshot/outbox atomicamente persistidos, estado visible y recuperacion idempotente.
- [Proveedor de correo no configurado o entrega ambigua] -> descarga independiente, estado explicito, reintento con idempotencia y sin afirmar entrega.
- [Lectores legacy de ciclos fijos o cambios de limites] -> inventario de llamadas, backfill compatible, adapters y regresiones antes de activar escrituras.
- [Job no desplegado] -> readiness visible, alertas de ultima ejecucion y runbook; no declarar renovacion automatica lista sin verificar scheduler.
- [Pruebas con mocks ocultan SQL ausente] -> tests PostgreSQL sobre migraciones completas, contrato RPC real y smoke test autenticado con datos sinteticos.
- [Posible confusion tributaria] -> leyenda destacada, IVA solo informativo y sin numeracion SII.

## Migration Plan

1. Inventariar datos y llamadas existentes, respaldar y comprobar migraciones 0039/0040 en el entorno. No usar produccion como fixture.
2. Agregar versiones, snapshots, campos compatibles y tablas de cambios/receipts/outbox/emisor con constraints y RLS.
3. Backfill de ciclos y contratos legacy, conservar monedas e importes. Reportar ambiguedades de cambios de limites ya programados.
4. Desplegar RPC transaccionales y contratos de tipos, adaptar webhook y metricas, probar aislamiento/concurrencia contra PostgreSQL.
5. Desplegar UI y lectura del dueno, bucket privado, emisor y PDF; configurar Resend/remitente y scheduler en staging.
6. Ejecutar recorrido real crear plan -> asignar -> renovar -> pagar -> descargar -> enviar -> upgrade -> downgrade; comprobar dashboard.
7. Activar en produccion solo con readiness completo. Ante problemas deshabilitar nuevas escrituras/jobs conservando lectura e historial; no rollback destructivo de pagos ni comprobantes emitidos.
