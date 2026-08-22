## Purpose

Permite al instructor controlar membresias, vencimientos y cobros registrados, y estimar ingresos mensuales sin confundir dinero contratado con dinero efectivamente recibido.

## ADDED Requirements

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
