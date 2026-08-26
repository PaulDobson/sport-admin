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
