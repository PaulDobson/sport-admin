## ADDED Requirements

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
