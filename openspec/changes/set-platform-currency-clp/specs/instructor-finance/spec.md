## MODIFIED Requirements

### Requirement: Planes y membresias

El sistema SHALL permitir definir planes con precio, moneda, periodicidad, beneficios y reglas de vencimiento, y asociarlos a alumnos mediante membresias con estados trazables. Cuando no se indique una moneda para un nuevo plan o membresia, SHALL usar CLP como moneda predeterminada.

#### Scenario: Activar membresia

- **WHEN** el instructor asigna un plan valido a un alumno activo
- **THEN** se crea una membresia con inicio, vencimiento, precio, moneda y proxima fecha de cobro

#### Scenario: Crear plan sin moneda explicita

- **WHEN** el instructor crea un plan sin modificar la moneda predeterminada
- **THEN** el plan se guarda con moneda CLP

#### Scenario: Mantener moneda historica

- **WHEN** se consulta o actualiza un plan o membresia existente con moneda distinta de CLP
- **THEN** el sistema conserva su moneda e importe originales y no realiza conversion automatica

#### Scenario: Membresia vencida

- **WHEN** llega la fecha de vencimiento sin renovacion valida
- **THEN** la membresia cambia a vencida o mora segun la politica y deja de contar como activa

### Requirement: Registro de pagos del instructor

El sistema SHALL permitir registrar pagos, descuentos, creditos, impuestos y estados de cobro con fecha, moneda y referencia auditable. Los pagos SHALL conservar la moneda del evento y aceptar CLP sin mezclar importes de monedas diferentes.

#### Scenario: Pago recibido

- **WHEN** el instructor registra un pago valido
- **THEN** el sistema lo asocia a la membresia, actualiza el saldo y conserva el evento contable

#### Scenario: Pago CLP

- **WHEN** el instructor registra un pago denominado en CLP
- **THEN** el pago, sus ajustes y el evento financiero conservan CLP como moneda

### Requirement: Proyeccion mensual

El sistema SHALL calcular ingresos contratados, cobrables y cobrados por periodo, tenant y moneda, normalizando planes no mensuales y excluyendo membresias no vigentes. SHALL presentar los importes CLP con el formato local chileno, normalmente sin decimales, y SHALL mantener agregaciones separadas para otras monedas.

#### Scenario: Proyectar ingresos

- **WHEN** se consulta un mes con membresias activas y planes trimestrales o anuales
- **THEN** el sistema calcula el equivalente mensual y separa cobros previstos de pagos recibidos

#### Scenario: Proyectar importes en CLP

- **WHEN** existen membresias y pagos en CLP
- **THEN** la proyeccion muestra los importes con locale `es-CL` y precision apropiada para CLP

#### Scenario: No mezclar monedas

- **WHEN** un periodo contiene importes en CLP y en otra moneda
- **THEN** el sistema muestra una proyeccion independiente por moneda y no suma importes entre monedas

#### Scenario: Mora y pausas

- **WHEN** existen membresias pausadas, vencidas, canceladas o en mora
- **THEN** el sistema aplica la politica definida y muestra el impacto sin duplicar ingresos

### Requirement: Vencimientos y renovaciones

El sistema SHALL mostrar proximos vencimientos, mora y renovaciones esperadas al instructor, con filtros por fecha y estado.

#### Scenario: Renovacion proxima

- **WHEN** una membresia se aproxima a su vencimiento
- **THEN** aparece en la lista de seguimiento y puede generar una notificacion autorizada
