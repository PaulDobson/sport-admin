## ADDED Requirements

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
