## ADDED Requirements

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
