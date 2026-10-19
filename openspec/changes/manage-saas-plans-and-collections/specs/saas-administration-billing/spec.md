## MODIFIED Requirements

### Requirement: Suscripciones SaaS

El sistema SHALL administrar planes SaaS, limites de alumnos y usuarios, periodo de prueba, precio, moneda, duracion, estado de cobro y eventos del proveedor de pagos. Las nuevas contrataciones SHALL usar CLP con precio final entero y una duracion positiva expresada en dias o meses. El administrador SHALL asignar una version del plan a un tenant con fecha de inicio, vencimiento de pago y vista previa de condiciones, conservando snapshots historicos. El sistema SHALL mantener una sola suscripcion vigente por tenant y renovar cada periodo una sola vez.

#### Scenario: Cambio de plan

- **WHEN** se confirma un cambio de plan
- **THEN** el sistema actualiza limites y facturacion desde el periodo definido y conserva el evento anterior

#### Scenario: Pago SaaS fallido

- **WHEN** el proveedor informa un cobro fallido
- **THEN** el tenant pasa al estado de cobro correspondiente, se registra el evento y se activa el flujo de notificacion

#### Scenario: Asignacion inicial

- **WHEN** el administrador confirma un plan activo para un tenant sin suscripcion vigente
- **THEN** el sistema conserva las condiciones contratadas, genera el periodo y su cobro pendiente de manera atomica y no declara realizado ningun pago

#### Scenario: Renovacion repetida

- **WHEN** se procesa dos veces una renovacion para la misma suscripcion y periodo
- **THEN** existe un solo cobro de renovacion y un solo periodo efectivo

#### Scenario: Compatibilidad historica

- **WHEN** se consulta una suscripcion historica con otra moneda o ciclo preexistente
- **THEN** conserva sus importes y documentos originales sin conversion implicita a CLP

### Requirement: Indicadores financieros SaaS

El sistema SHALL mostrar MRR, ARR, ARPA, churn, conversion de trial, cobrado, pendiente y tenants en mora con periodo, moneda y definicion de calculo visibles. Los indicadores SHALL reconciliar con cobros y pagos confirmados, separar devengado de efectivo recibido, excluir cobros anulados y no mezclar monedas ni finanzas de alumnos. El IVA incluido SHALL ser informativo y no reducir el saldo exigible.

#### Scenario: Consultar dashboard

- **WHEN** un administrador abre indicadores para un periodo
- **THEN** el sistema muestra valores agregados reproducibles y no mezcla cobros SaaS con cobros de alumnos

#### Scenario: Registrar pago pendiente

- **WHEN** se confirma un pago completo de un cobro pendiente
- **THEN** el saldo pendiente disminuye y el cobrado del periodo del pago aumenta exactamente por el importe recibido, sin modificar retroactivamente el MRR contratado

#### Scenario: Plan de duracion flexible

- **WHEN** un plan recurrente tiene duracion de N meses o N dias
- **THEN** su MRR se calcula como precio dividido por N para meses o precio multiplicado por 365 y dividido por 12 y N para dias, con formula visible y sin sumar monedas distintas

## ADDED Requirements

### Requirement: Catalogo comercial versionado

El administrador SaaS SHALL crear, consultar, editar mediante nuevas versiones y archivar planes con nombre, descripcion, servicios descriptivos, funciones soportadas, limites positivos, duracion, dias de prueba y precio final CLP. Los servicios descriptivos SHALL NOT habilitar funciones no implementadas. Archivar o editar SHALL NOT alterar contratos ni comprobantes previos.

#### Scenario: Crear y asignar una version

- **WHEN** se crea un plan de tres meses con precio final y servicios definidos
- **THEN** queda disponible para asignacion y el tenant contratado conserva esa version aunque se publique otro precio

#### Scenario: Archivar plan contratado

- **WHEN** el administrador archiva un plan con suscripciones vigentes
- **THEN** se impiden nuevas asignaciones y las suscripciones existentes conservan las condiciones contratadas para su renovacion

#### Scenario: Precio o duracion invalida

- **WHEN** se intenta guardar precio negativo o fraccionario en CLP, duracion no entera o no positiva, o una funcion desconocida
- **THEN** se rechaza con errores por campo y se conservan los valores ingresados

### Requirement: Cobranza manual de pagos completos

El administrador SaaS SHALL consultar y filtrar cobros por tenant, estado y vencimiento y registrar exclusivamente el saldo total de un cobro abierto en CLP mediante transferencia, efectivo o tarjeta externa, con fecha, referencia, actor e identificador idempotente. Las transferencias y tarjetas externas SHALL requerir referencia. El sistema SHALL rechazar pagos parciales nuevos, sobrepagos y pagos de cobros anulados, ya pagados o con operaciones externas en proceso.

#### Scenario: Pago completo

- **WHEN** el administrador confirma un pago por el saldo exigible y una fecha no futura
- **THEN** el cobro queda pagado y se registra una unica transaccion auditable y la solicitud de comprobante

#### Scenario: Doble confirmacion o webhook concurrente

- **WHEN** dos solicitudes intentan pagar el mismo saldo o se reintenta la misma operacion
- **THEN** no se duplica el dinero registrado ni el comprobante y cualquier conflicto se informa explicitamente

#### Scenario: Saldo historico parcialmente pagado

- **WHEN** un cobro historico conserva un pago parcial existente
- **THEN** solo se permite registrar su saldo restante completo, sin reescribir sus operaciones previas

#### Scenario: Anular cobro sin pagos

- **WHEN** un administrador anula con motivo un cobro sin pagos ni operaciones en curso
- **THEN** permanece visible en el historial, queda excluido del saldo y no se borra

### Requirement: Upgrade inmediato y downgrade diferido

El sistema SHALL previsualizar diferencias de precio, fechas, funciones, limites, uso y cobros antes de confirmar un cambio con motivo. Un upgrade SHALL activar inmediatamente las nuevas condiciones y emitir el cobro proporcional pendiente sin esperar el pago. Un downgrade SHALL conservar el periodo pagado y programar el plan nuevo para la siguiente renovacion, sin reembolso automatico. La clasificacion SHALL comparar precios normalizados para el intervalo restante; cambios equivalentes SHALL aplicarse a la siguiente renovacion.

#### Scenario: Upgrade con prorrateo

- **WHEN** se confirma un upgrade durante un periodo
- **THEN** el cobro extra corresponde a la diferencia positiva entre las tarifas diarias contratada y nueva multiplicada por los dias restantes, redondeada una sola vez al peso, y el vencimiento del periodo actual no cambia

#### Scenario: Upgrade repetido en el mismo dia

- **WHEN** se vuelve a subir de plan despues de un upgrade previo
- **THEN** se usa como base la tarifa vigente tras el cambio anterior y no se vuelve a cobrar la diferencia ya facturada

#### Scenario: Downgrade con exceso de uso

- **WHEN** el plan solicitado no admite los alumnos o usuarios activos actuales
- **THEN** el sistema rechaza programarlo e indica los excesos sin eliminar usuarios ni alumnos

#### Scenario: Uso cambia antes de la renovacion

- **WHEN** un downgrade programado llega a su fecha y el uso excede sus limites
- **THEN** se marca bloqueado, se notifica al administrador y al dueno y se renueva una sola vez bajo el plan vigente, informando el motivo

#### Scenario: Preview obsoleto

- **WHEN** cambian el contrato, uso, fecha efectiva o precio despues de la previsualizacion
- **THEN** la confirmacion se rechaza y exige revisar un nuevo calculo

### Requirement: Consulta financiera del dueno

El dueno activo SHALL consultar su plan, periodo, servicios, limites, cambio programado, cobros, pagos y comprobantes en una seccion independiente de las finanzas de alumnos. SHALL NOT crear planes, registrar pagos ni cambiar unilateralmente su suscripcion.

#### Scenario: Aislamiento del cliente

- **WHEN** un dueno abre su facturacion o intenta consultar otro tenant mediante URL o identificador
- **THEN** solo puede obtener informacion del gimnasio autorizado y el acceso ajeno se rechaza en servidor y base de datos

### Requirement: Gestion financiera mobile first

Las tareas de catalogo, asignacion, cobranza y consulta SHALL usar el sistema de diseno existente, tarjetas en movil y tablas en escritorio, controles tactiles de al menos 44 px, estados de carga, vacio, error y confirmacion y formularios que conserven el borrador ante fallos.

#### Scenario: Completar pago desde movil

- **WHEN** el administrador trabaja en un viewport de 320 px
- **THEN** puede revisar importe, confirmar el pago y acceder al comprobante sin desbordamiento horizontal ni botones ocultos por la navegacion
