# instructor-operations Specification

## Purpose

Centraliza la operacion diaria del instructor independiente, incluyendo alumnos, locaciones, agenda, sesiones e inscripciones sin tratar las locaciones como sedes propias del SaaS.

## Requirements

### Requirement: Gestion de alumnos y locaciones

El sistema SHALL permitir al instructor administrar alumnos y locaciones de tipo gimnasio externo, parque, domicilio u online, con datos de contacto y estado operativo.

#### Scenario: Crear alumno y locacion

- **WHEN** el instructor registra datos validos de un alumno y una locacion
- **THEN** ambos quedan asociados a su tenant y disponibles para programacion

#### Scenario: Archivar alumno

- **WHEN** el instructor archiva un alumno
- **THEN** el sistema conserva su historial y evita incluirlo en nuevos listados activos por defecto

### Requirement: Programacion de clases y sesiones

El sistema SHALL permitir definir clases recurrentes, horarios, zona horaria, locacion, cupo e instructor responsable, y generar sesiones concretas.

#### Scenario: Generar sesion

- **WHEN** existe una clase activa con horario y locacion validos
- **THEN** el sistema genera o muestra la sesion con fecha, participantes esperados e instructor responsable

#### Scenario: Evitar conflicto de agenda

- **WHEN** un instructor intenta guardar dos actividades incompatibles en el mismo intervalo
- **THEN** el sistema advierte el conflicto y no confirma la programacion sin una resolucion explicita

### Requirement: Inscripciones y participantes

El sistema SHALL permitir inscribir alumnos a clases o sesiones, controlar cupos y mostrar la relacion entre alumno, plan y sesion.

#### Scenario: Inscripcion dentro del cupo

- **WHEN** un alumno activo se inscribe en una clase con cupo disponible
- **THEN** la inscripcion queda confirmada y aparece en la lista de la sesion

#### Scenario: Cupo completo

- **WHEN** una inscripcion supera el cupo configurado
- **THEN** el sistema rechaza la confirmacion o la coloca en lista de espera segun la configuracion

### Requirement: Vista operativa del instructor

El sistema SHALL mostrar al instructor sus sesiones proximas, alumnos activos, tareas pendientes y alertas operativas priorizadas por fecha y locacion.

#### Scenario: Abrir jornada

- **WHEN** el instructor abre la aplicacion durante su jornada
- **THEN** ve primero la sesion proxima o actual y sus acciones operativas principales

### Requirement: Administracion tabular de alumnos

El sistema SHALL ofrecer una vista administrativa de alumnos activos en formato de tabla paginada, manteniendo disponible el registro de nuevos alumnos y mostrando datos suficientes para operar la academia sin abrir cada ficha individual.

#### Scenario: Ver tabla de alumnos

- **WHEN** el instructor abre la administracion de alumnos de una academia con alumnos activos
- **THEN** ve una tabla con filas de alumnos, datos identificatorios, contacto principal cuando exista, estado operativo y una columna de acciones

#### Scenario: Paginar alumnos

- **WHEN** la academia tiene mas alumnos activos que el tamano de pagina configurado
- **THEN** el sistema muestra controles de paginacion y permite navegar paginas sin mezclar alumnos de otros tenants

#### Scenario: Registrar alumno desde administracion

- **WHEN** el instructor necesita agregar un alumno desde la vista administrativa
- **THEN** puede acceder al registro de alumno sin perder el contexto de la academia activa

### Requirement: Acciones administrativas de alumno

El sistema SHALL permitir visualizar, editar y eliminar alumnos desde la tabla administrativa, tratando la eliminacion operativa como archivado logico para preservar historial, membresias, asistencia, privacidad y auditoria.

#### Scenario: Visualizar alumno desde la tabla

- **WHEN** el instructor selecciona la accion de visualizar en una fila de alumno
- **THEN** el sistema abre la ficha del alumno correspondiente dentro de la academia activa

#### Scenario: Editar alumno desde la tabla

- **WHEN** el instructor selecciona la accion de editar y guarda datos validos del alumno
- **THEN** el sistema actualiza los datos basicos autorizados y refleja el cambio en la tabla administrativa

#### Scenario: Eliminar alumno desde la tabla

- **WHEN** el instructor confirma la accion de eliminar sobre un alumno activo
- **THEN** el sistema archiva el alumno, conserva su historial y deja de incluirlo en listados activos por defecto

### Requirement: Exportacion Excel de alumnos

El sistema SHALL permitir exportar alumnos de la academia activa como un archivo `.xlsx` real, con columnas administrativas claras y sin exponer alumnos de otros tenants.

#### Scenario: Exportar alumnos a Excel

- **WHEN** el instructor solicita exportar alumnos desde la administracion
- **THEN** el sistema descarga un archivo `.xlsx` que contiene nombre de academia, fecha de exportacion, columnas de alumnos y los registros autorizados de la academia activa

#### Scenario: Exportar respetando filtros visibles

- **WHEN** la tabla tiene filtros o busqueda aplicados y el instructor exporta la vista actual
- **THEN** el archivo `.xlsx` contiene los mismos alumnos que corresponden a esa vista filtrada

#### Scenario: Exportacion sin alumnos

- **WHEN** la academia no tiene alumnos que coincidan con la vista exportada
- **THEN** el sistema entrega un `.xlsx` valido con encabezados y metadata de academia, sin filas de alumnos

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
