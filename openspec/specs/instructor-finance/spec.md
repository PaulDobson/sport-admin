# instructor-finance Specification

## Purpose

Permite al instructor controlar membresias, vencimientos y cobros registrados, y estimar ingresos mensuales sin confundir dinero contratado con dinero efectivamente recibido.

## Requirements

### Requirement: Planes y membresias

El sistema SHALL permitir definir planes con precio, moneda, periodicidad, beneficios y reglas de vencimiento, y asociarlos a alumnos mediante membresias con estados trazables.

#### Scenario: Activar membresia

- **WHEN** el instructor asigna un plan valido a un alumno activo
- **THEN** se crea una membresia con inicio, vencimiento, precio, moneda y proxima fecha de cobro

#### Scenario: Membresia vencida

- **WHEN** llega la fecha de vencimiento sin renovacion valida
- **THEN** la membresia cambia a vencida o mora segun la politica y deja de contar como activa

### Requirement: Registro de pagos del instructor

El sistema SHALL permitir registrar pagos, descuentos, creditos, impuestos y estados de cobro con fecha, moneda y referencia auditable.

#### Scenario: Pago recibido

- **WHEN** el instructor registra un pago valido
- **THEN** el sistema lo asocia a la membresia, actualiza el saldo y conserva el evento contable

### Requirement: Proyeccion mensual

El sistema SHALL calcular ingresos contratados, cobrables y cobrados por periodo, tenant y moneda, normalizando planes no mensuales y excluyendo membresias no vigentes.

#### Scenario: Proyectar ingresos

- **WHEN** se consulta un mes con membresias activas y planes trimestrales o anuales
- **THEN** el sistema calcula el equivalente mensual y separa cobros previstos de pagos recibidos

#### Scenario: Mora y pausas

- **WHEN** existen membresias pausadas, vencidas, canceladas o en mora
- **THEN** el sistema aplica la politica definida y muestra el impacto sin duplicar ingresos

### Requirement: Vencimientos y renovaciones

El sistema SHALL mostrar proximos vencimientos, mora y renovaciones esperadas al instructor, con filtros por fecha y estado.

#### Scenario: Renovacion proxima

- **WHEN** una membresia se aproxima a su vencimiento
- **THEN** aparece en la lista de seguimiento y puede generar una notificacion autorizada

### Requirement: Asignacion de plan con pago inicial opcional

El sistema SHALL permitir asignar un plan activo a un alumno activo indicando la fecha de inicio y, opcionalmente, registrar en la misma confirmacion un pago inicial con monto, metodo y referencia sobre la membresia recien creada. El pago inicial SHALL respetar las mismas reglas que cualquier pago (monto positivo, moneda de la membresia, pagos parciales permitidos) y SHALL ser idempotente: reintentar la misma confirmacion MUST NOT crear una segunda membresia ni un segundo pago. El sistema MUST NOT permitir asignar un plan a un alumno que ya tiene una membresia vigente (activa, pausada o en mora) ni asignar un plan archivado. Si la membresia se crea pero el pago inicial falla, la membresia SHALL conservarse y el sistema SHALL informar que el pago quedo pendiente de registro.

#### Scenario: Asignar sin pago

- **WHEN** el instructor asigna un plan activo a un alumno sin membresia vigente y no marca el pago inicial
- **THEN** se crea la membresia con el precio, moneda y ciclo del plan y su saldo queda igual al precio pactado

#### Scenario: Asignar con pago total

- **WHEN** el instructor asigna un plan y registra un pago inicial por el precio completo
- **THEN** se crea la membresia, se registra el pago con el metodo indicado y el saldo de la membresia queda en cero

#### Scenario: Asignar con pago parcial

- **WHEN** el pago inicial es menor que el precio pactado
- **THEN** la membresia se crea y su saldo refleja la diferencia pendiente, que aparece en cobros

#### Scenario: Reintento de la misma asignacion

- **WHEN** la misma confirmacion de asignacion con pago se envia dos veces
- **THEN** existe una sola membresia y un solo pago asociados a esa operacion

#### Scenario: Alumno con membresia vigente

- **WHEN** se intenta asignar un plan a un alumno con una membresia activa, pausada o en mora
- **THEN** el sistema rechaza la asignacion sin crear registros e indica que el alumno ya tiene una membresia vigente

#### Scenario: Falla del pago inicial

- **WHEN** la membresia se crea correctamente pero el registro del pago inicial es rechazado
- **THEN** la membresia permanece creada, el sistema informa que el pago no se registro y el saldo queda pendiente en cobros

### Requirement: Indicadores financieros del periodo

El sistema SHALL calcular, por tenant, periodo mensual y moneda, los siguientes indicadores: monto cobrado en el periodo y su variacion porcentual frente al periodo anterior; monto por cobrar de membresias vigentes junto con el monto y la cantidad de alumnos en mora; cantidad de membresias vigentes y cantidad de altas del periodo; y monto proyectado del periodo con la tasa de cobro (cobrado sobre cobrable). Los indicadores SHALL reutilizar las reglas existentes de proyeccion mensual y de pendientes derivados, y MUST NOT sumar montos de monedas distintas.

#### Scenario: Variacion frente al periodo anterior

- **WHEN** el periodo anterior tiene cobros mayores que cero
- **THEN** la variacion se informa como el porcentaje de cambio del cobrado actual respecto del anterior

#### Scenario: Periodo anterior sin cobros

- **WHEN** el periodo anterior no tiene cobros
- **THEN** la variacion se informa como no disponible en lugar de un porcentaje infinito o cero

#### Scenario: Tasa de cobro sin cobros

- **WHEN** existe monto cobrable en el periodo pero aun no hay pagos
- **THEN** la tasa de cobro es 0 % y el cobrable total sigue informado

#### Scenario: Multiples monedas

- **WHEN** el tenant tiene membresias o pagos en mas de una moneda
- **THEN** cada indicador se entrega separado por moneda sin conversiones

### Requirement: Movimientos recientes de cobranza

El sistema SHALL listar los movimientos recientes del tenant combinando pagos registrados y pendientes de membresias vigentes, cada uno con fecha, nombre del alumno, nombre del plan, monto, moneda y estado (pagado, pendiente o en mora), ordenados del mas reciente al mas antiguo y limitados a una cantidad acotada. Los pagos anulados o reembolsados MUST NOT figurar como pagados.

#### Scenario: Pago registrado

- **WHEN** se registra un pago sobre una membresia
- **THEN** aparece en movimientos recientes con la fecha del pago, el alumno, el plan, el monto y el estado pagado

#### Scenario: Pendiente en mora

- **WHEN** una membresia vigente tiene saldo y supero sus dias de tolerancia
- **THEN** aparece en movimientos recientes con su fecha de cobro, el saldo y el estado en mora

### Requirement: Rendimiento por plan

El sistema SHALL informar, para cada plan del tenant con membresias vigentes en el periodo, la cantidad de alumnos vigentes, el ingreso mensual equivalente segun su ciclo de cobro y su participacion porcentual sobre el ingreso mensual equivalente total de su moneda, ordenando los planes de mayor a menor ingreso. El ingreso SHALL calcularse con el precio pactado de cada membresia y no con el precio actual del plan.

#### Scenario: Plan con precio editado

- **WHEN** un plan cambio de precio despues de que algunas membresias fueron asignadas
- **THEN** el rendimiento del plan suma el precio pactado de cada membresia vigente

#### Scenario: Plan trimestral

- **WHEN** un plan trimestral tiene membresias vigentes
- **THEN** su ingreso mensual equivalente es la suma de los precios pactados dividida por tres

### Requirement: Administracion del catalogo de planes

El sistema SHALL permitir al instructor consultar el catalogo completo de planes de su tenant, editar sus atributos comerciales, archivarlos y reactivarlos. El listado SHALL mostrar nombre, precio, moneda, periodicidad, dias de gracia, beneficios y la cantidad de membresias asociadas. La edicion de un plan SHALL afectar unicamente a las membresias creadas despues del cambio: las membresias vigentes SHALL conservar el precio, la moneda y la periodicidad pactados al momento de su activacion. El sistema SHALL informar ese efecto antes de confirmar la edicion. Los planes SHALL archivarse en lugar de eliminarse para preservar la trazabilidad de las membresias historicas.

#### Scenario: Consultar catalogo

- **WHEN** el instructor abre la administracion de planes de su tenant
- **THEN** ve todos los planes activos con su precio, moneda, periodicidad, dias de gracia, beneficios y cantidad de membresias asociadas, y puede consultar por separado los planes archivados

#### Scenario: Plan recien creado visible

- **WHEN** el instructor crea un plan desde el tenant operativo activo
- **THEN** el plan aparece de inmediato en el catalogo de ese mismo tenant y queda disponible para asignar a alumnos

#### Scenario: Editar plan con membresias vigentes

- **WHEN** el instructor modifica el precio, la moneda, la periodicidad, los dias de gracia o los beneficios de un plan que tiene membresias vigentes
- **THEN** el sistema advierte que las membresias vigentes conservan sus condiciones pactadas, guarda el cambio solo para altas futuras y deja el evento auditable

#### Scenario: Archivar plan

- **WHEN** el instructor archiva un plan
- **THEN** el plan deja de ofrecerse para nuevas membresias, las membresias existentes que lo referencian permanecen intactas y el plan queda consultable como archivado

#### Scenario: Reactivar plan archivado

- **WHEN** el instructor reactiva un plan archivado
- **THEN** el plan vuelve a estar disponible para nuevas membresias sin alterar ninguna membresia existente

#### Scenario: Operacion sobre tenant no activo

- **WHEN** un usuario con varias membresias operativas crea, edita, archiva o reactiva un plan
- **THEN** la operacion se ejecuta exclusivamente contra el tenant operativo activo mostrado en la interfaz

### Requirement: Pagos parciales y saldo de membresia

El sistema SHALL admitir multiples pagos sobre una misma membresia y SHALL derivar el saldo pendiente a partir del importe pactado, los ajustes aplicados y los pagos efectivamente recibidos. Cada pago SHALL registrar su metodo de cobro entre efectivo, transferencia, tarjeta u otro, ademas de fecha, importe, moneda y referencia opcional. El estado de cobro de una membresia SHALL derivarse del saldo resultante y no de la existencia de un unico pago. El sistema SHALL rechazar pagos cuya moneda no coincida con la de la membresia y SHALL conservar el historial completo de pagos y ajustes de forma auditable.

#### Scenario: Pago parcial

- **WHEN** el instructor registra un pago por un importe menor al saldo pendiente de la membresia
- **THEN** el sistema conserva el pago, reduce el saldo por ese importe y la membresia continua figurando con saldo pendiente

#### Scenario: Saldo cubierto en varios pagos

- **WHEN** la suma de los pagos recibidos y los ajustes aplicados cubre el importe pactado de la membresia
- **THEN** el saldo pendiente queda en cero y la membresia deja de figurar entre los pendientes de pago

#### Scenario: Metodo de cobro registrado

- **WHEN** el instructor registra un pago indicando su metodo de cobro
- **THEN** el metodo queda asociado al pago, es visible en el historial y puede usarse para filtrar los pagos de un periodo

#### Scenario: Historial de una membresia

- **WHEN** el instructor consulta una membresia
- **THEN** ve el importe pactado, los ajustes aplicados, cada pago recibido con su fecha, importe, metodo y referencia, y el saldo pendiente resultante

#### Scenario: Pago con moneda distinta

- **WHEN** se intenta registrar un pago en una moneda distinta de la de la membresia
- **THEN** el sistema rechaza la operacion y no modifica el saldo

#### Scenario: Reintento de un mismo cobro

- **WHEN** una misma operacion de cobro se envia mas de una vez
- **THEN** el sistema conserva un unico pago y el saldo no se reduce dos veces

### Requirement: Pendientes de pago derivados

El sistema SHALL determinar los pendientes de pago a partir de las membresias vigentes con saldo mayor que cero, sin generar cuotas ni documentos de cobro por anticipado. Cada pendiente SHALL identificar al alumno, la membresia, el importe adeudado, la moneda, la fecha de referencia del cobro y su antiguedad respecto de los dias de gracia del plan. El sistema SHALL permitir filtrar los pendientes por estado de la membresia y por rango de fechas, y SHALL ofrecer el registro del cobro directamente desde el pendiente.

#### Scenario: Pendiente visible

- **WHEN** una membresia vigente tiene saldo mayor que cero
- **THEN** aparece entre los pendientes de pago con el importe adeudado, el alumno, la fecha de referencia y su antiguedad

#### Scenario: Pendiente resuelto

- **WHEN** los pagos registrados dejan el saldo de una membresia en cero
- **THEN** el pendiente desaparece de la lista sin perder su historial de pagos

#### Scenario: Membresia no vigente

- **WHEN** una membresia esta cancelada o pausada segun la politica definida
- **THEN** el sistema no la cuenta como pendiente de pago activo y evita duplicar importes en la proyeccion

#### Scenario: Cobro desde el pendiente

- **WHEN** el instructor inicia el registro de un cobro desde un pendiente de pago
- **THEN** el sistema propone el saldo adeudado como importe y permite ajustarlo antes de confirmar

### Requirement: Acciones de ciclo de vida de la membresia

El sistema SHALL permitir al instructor pausar, renovar, expirar y cancelar una membresia desde la interfaz, respetando las transiciones validas para el estado actual y solicitando confirmacion antes de ejecutar la accion. Cada transicion SHALL quedar registrada de forma auditable con su fecha efectiva y el actor que la ejecuto.

#### Scenario: Transicion permitida

- **WHEN** el instructor ejecuta una transicion valida para el estado actual de la membresia
- **THEN** el sistema aplica el cambio de estado, actualiza la vigencia y conserva el evento auditable

#### Scenario: Transicion no permitida

- **WHEN** una transicion no es valida para el estado actual de la membresia
- **THEN** el sistema no la ofrece o la rechaza con un mensaje comprensible y sin modificar la membresia

#### Scenario: Confirmacion previa

- **WHEN** el instructor selecciona cancelar o expirar una membresia
- **THEN** el sistema solicita una confirmacion explicita indicando el efecto sobre el cobro antes de aplicar el cambio
