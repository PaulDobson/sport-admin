## ADDED Requirements

### Requirement: Agenda agrupada por fecha operacional

El sistema SHALL agrupar cronologicamente las sesiones abiertas por fecha usando la misma zona horaria operacional para titulos y horarios. SHALL mostrar fecha, ubicacion, horario y estado textual de cada sesion, diferenciando las sesiones en curso de las futuras. Los indicadores SHALL describir exclusivamente las sesiones incluidas en la vista y comunicar el limite de consulta de hasta 20 sesiones.

#### Scenario: Sesiones de distintos dias

- **WHEN** la consulta incluye sesiones de hoy y de fechas posteriores
- **THEN** cada sesion aparece bajo la fecha correspondiente sin presentar las sesiones futuras como parte de hoy

#### Scenario: Instante cercano a medianoche

- **WHEN** la fecha UTC de una sesion difiere de su fecha en la zona horaria operacional
- **THEN** la agrupacion y el horario utilizan la fecha operacional consistentemente

#### Scenario: Varias sesiones en curso

- **WHEN** dos sesiones abiertas incluyen el instante actual
- **THEN** ambas muestran estado En curso sin limitar esa indicacion a la primera

### Requirement: Capacidad visible y filtros accionables

El sistema SHALL mostrar confirmados, capacidad, cupos disponibles y lista de espera con representacion visual accesible que no dependa solo del color. SHALL separar el filtro de ubicacion de las acciones de programacion y permitir restablecerlo sin alterar los permisos ni mezclar tenants.

#### Scenario: Sesion con cupos

- **WHEN** una sesion tiene menos confirmados que su capacidad
- **THEN** muestra los confirmados, la capacidad y los cupos restantes junto al acceso a asistencia

#### Scenario: Sesion completa

- **WHEN** una sesion alcanza o supera su capacidad
- **THEN** muestra Cupo completo, cero cupos disponibles y la cantidad en espera sin desbordar su indicador visual

#### Scenario: Vista filtrada vacia

- **WHEN** no hay sesiones abiertas para la ubicacion seleccionada
- **THEN** el estado vacio ofrece restablecer el filtro y, solo para roles autorizados, acceso a programacion

#### Scenario: Vista adaptable

- **WHEN** el usuario consulta Agenda en un viewport movil de 375 px o desktop de 1280 px
- **THEN** puede leer fechas y campos y utilizar filtros, navegacion y acciones sin scroll horizontal de la pagina
