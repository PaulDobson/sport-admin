# notifications-reporting Specification

## Purpose

Convierte eventos operativos y financieros en avisos accionables y reportes que ayuden al instructor y al administrador a decidir sin exponer informacion fuera de su alcance.

## Requirements

### Requirement: Notificaciones configurables

El sistema SHALL generar notificaciones para vencimientos, mora, ausencias, riesgo de abandono, cambios de salud autorizados y eventos SaaS, respetando preferencias, rol y tenant.

#### Scenario: Notificar vencimiento

- **WHEN** una membresia alcanza la ventana configurada de proximo vencimiento
- **THEN** el instructor recibe una notificacion con alumno, fecha y accion permitida

#### Scenario: Preferencia desactivada

- **WHEN** un usuario desactiva un canal no obligatorio
- **THEN** el sistema no envia ese canal y conserva el evento en el centro interno si corresponde

### Requirement: Centro de actividad

El sistema SHALL mostrar notificaciones leidas y no leidas con severidad, fecha, origen, entidad relacionada y estado de resolucion.

#### Scenario: Resolver alerta

- **WHEN** el instructor marca una alerta operativa como resuelta
- **THEN** deja de aparecer como pendiente y conserva su historial

### Requirement: Reportes operativos

El sistema SHALL ofrecer reportes filtrables de alumnos activos, asistencia, evolucion, vencimientos y alertas, limitados al tenant y rol autorizado.

#### Scenario: Exportar reporte

- **WHEN** un usuario autorizado solicita un reporte con filtros validos
- **THEN** recibe datos del alcance permitido, con periodo y filtros identificables

### Requirement: Reportes financieros

El sistema SHALL ofrecer al instructor reportes de ingresos contratados, cobrables, cobrados y mora, y al administrador SaaS indicadores agregados de la plataforma en una vista separada.

#### Scenario: Separacion contable

- **WHEN** se consulta un reporte financiero
- **THEN** el sistema identifica si corresponde al negocio del instructor o a la suscripcion SaaS y no mezcla sus totales

### Requirement: Entrega confiable

El sistema SHALL registrar estado de entrega, reintentos y errores de notificaciones push o de otros canales, sin incluir datos medicos innecesarios en el contenido.

#### Scenario: Reintento de entrega

- **WHEN** un canal falla temporalmente
- **THEN** el sistema reintenta segun politica, evita duplicados y muestra el estado final al usuario autorizado

### Requirement: Avisos internos de cobranza

El sistema SHALL publicar en el centro de actividad interno un aviso accionable por cada pendiente de pago que supere los dias de gracia de su plan y por cada membresia vigente que se aproxime a su fecha de renovacion dentro de la ventana configurada. El aviso SHALL identificar al alumno, la membresia, el importe adeudado, la moneda y la fecha de referencia, de modo que quien lo consuma pueda dirigir al instructor al registro del cobro. Estos avisos SHALL entregarse unicamente por el canal interno y SHALL NOT emitirse por canales externos. El sistema SHALL evitar avisos duplicados para un mismo pendiente y SHALL resolverlos automaticamente cuando el saldo llegue a cero o la membresia deje de estar vigente.

#### Scenario: Aviso por pendiente vencido

- **WHEN** un pendiente de pago supera los dias de gracia definidos en el plan de su membresia
- **THEN** el centro de actividad recibe un aviso pendiente con el alumno, el importe adeudado, la fecha de referencia y la membresia sobre la que se registra el cobro

#### Scenario: Aviso por renovacion proxima

- **WHEN** una membresia vigente entra en la ventana configurada de proxima renovacion
- **THEN** el centro de actividad recibe un aviso pendiente con el alumno, la fecha de renovacion y el importe previsto

#### Scenario: Aviso resuelto por cobro

- **WHEN** los pagos registrados dejan en cero el saldo asociado a un aviso de cobranza
- **THEN** el aviso deja de figurar como pendiente y conserva su historial

#### Scenario: Sin duplicacion de avisos

- **WHEN** un mismo pendiente de pago permanece impago durante varios ciclos de evaluacion
- **THEN** el sistema mantiene un unico aviso vigente actualizado en lugar de acumular avisos repetidos

#### Scenario: Canal externo no habilitado

- **WHEN** se genera un aviso de cobranza
- **THEN** el sistema lo entrega solo por el centro de actividad interno y no lo envia por correo, mensajeria ni ningun otro canal externo

### Requirement: Reporte de cobranza del instructor

El sistema SHALL permitir al instructor consultar los pagos recibidos de un periodo filtrados por metodo de cobro y estado, y el total adeudado vigente, distinguiendo importe cobrado de importe pendiente sin mezclar monedas distintas.

#### Scenario: Pagos por metodo de cobro

- **WHEN** el instructor filtra los pagos de un periodo por metodo de cobro
- **THEN** el sistema muestra los pagos que coinciden con ese metodo y su total por moneda

#### Scenario: Total adeudado

- **WHEN** el instructor consulta el estado de cobranza de un periodo
- **THEN** el sistema informa el importe cobrado y el importe pendiente vigente por separado y por moneda
