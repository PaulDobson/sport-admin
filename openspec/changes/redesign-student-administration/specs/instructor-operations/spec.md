## MODIFIED Requirements

### Requirement: Administracion tabular de alumnos

El sistema SHALL ofrecer una vista administrativa paginada de alumnos de la academia activa, con tabla en desktop y tarjetas equivalentes en movil. SHALL mostrar identidad, contacto principal cuando exista, estado operativo y acciones autorizadas, con alumnos activos por defecto y acceso independiente al registro.

#### Scenario: Ver tabla de alumnos

- **WHEN** el instructor abre la administracion de alumnos en desktop
- **THEN** ve una tabla con identidad, contacto principal, estado operativo y acciones, sin panel lateral redundante ni formulario de alta permanente

#### Scenario: Ver tarjetas en movil

- **WHEN** el usuario abre el listado en un viewport de 320, 375 o 390 px
- **THEN** puede leer nombre, contacto y estado y acceder a la ficha sin desplazamiento horizontal de la pagina ni necesidad de usar una tabla

#### Scenario: Paginar alumnos

- **WHEN** la academia tiene mas alumnos que el tamano de pagina configurado
- **THEN** el sistema permite navegar paginas conservando busqueda, estado y tamano de pagina sin mezclar tenants

#### Scenario: Filtrar alumnos

- **WHEN** el usuario busca por nombre o selecciona Activos, Archivados o Todos
- **THEN** la URL representa la consulta, la pagina vuelve a la primera y el conteo describe los resultados filtrados, no el total global de la academia

#### Scenario: Pagina fuera de rango

- **WHEN** la pagina solicitada deja de existir por un archivado o cambio de resultados
- **THEN** el sistema normaliza o redirige a una pagina valida y muestra filas y controles correspondientes a la misma pagina real

#### Scenario: Registrar alumno desde administracion

- **WHEN** un usuario autorizado selecciona Nuevo alumno
- **THEN** accede a una pagina independiente de alta con la misma academia activa y puede cancelar regresando al listado con su consulta previa

#### Scenario: Sin resultados

- **WHEN** no hay alumnos que coincidan con una busqueda o estado
- **THEN** el sistema ofrece limpiar filtros; si la academia no tiene alumnos, ofrece registrar uno solo a roles autorizados

### Requirement: Acciones administrativas de alumno

El sistema SHALL permitir visualizar, editar y archivar alumnos desde la administracion, tratando el archivado como baja operativa logica que conserva historial, membresias, asistencia, privacidad y auditoria. SHALL usar la etiqueta Archivar, distinguirla de la eliminacion de datos personales y conservar los permisos existentes tanto en interfaz como en servidor.

#### Scenario: Visualizar alumno desde la tabla

- **WHEN** el usuario selecciona la identidad o Ver ficha en una fila o tarjeta
- **THEN** el sistema abre la ficha del alumno de la academia activa y ofrece regreso al listado con la consulta previa

#### Scenario: Editar alumno desde la tabla

- **WHEN** un usuario autorizado selecciona Editar y guarda datos validos
- **THEN** el sistema actualiza los datos basicos autorizados, comunica exito y refleja los cambios en ficha y listado

#### Scenario: Eliminar alumno desde la tabla

- **WHEN** un usuario autorizado selecciona Archivar sobre un alumno activo
- **THEN** una confirmacion identifica al alumno, explica que se conservara su historial y permite cancelar o confirmar antes de ejecutar la operacion

#### Scenario: Confirmar archivado

- **WHEN** el usuario confirma y el archivado se completa
- **THEN** el alumno deja de aparecer en listados activos, permanece accesible en Archivados y no se ejecuta una eliminacion de datos personales

#### Scenario: Fallo de archivado

- **WHEN** la operacion de archivado falla
- **THEN** el sistema muestra un error visible y accesible, conserva el contexto y permite reintentar sin comunicar exito

#### Scenario: Alumno archivado

- **WHEN** se muestra un alumno archivado
- **THEN** el estado se comunica mediante texto y el sistema no ofrece archivar nuevamente ni restaurar o borrar definitivamente

#### Scenario: Asistente consulta alumnos

- **WHEN** un assistant accede al modulo o intenta ejecutar directamente una operacion administrativa
- **THEN** puede consultar las superficies actualmente autorizadas, no ve alta, edicion, archivado o exportacion y el servidor rechaza las operaciones no autorizadas

### Requirement: Exportacion Excel de alumnos

El sistema SHALL permitir a roles autorizados exportar la pagina actual filtrada de alumnos de la academia activa como un archivo `.xlsx` real, con columnas administrativas claras y sin exponer alumnos de otros tenants. SHALL comunicar explicitamente el alcance de pagina actual, conservando el comportamiento existente.

#### Scenario: Exportar alumnos a Excel

- **WHEN** un usuario autorizado solicita Exportar pagina a Excel
- **THEN** descarga un `.xlsx` con nombre de academia, fecha de exportacion, columnas administrativas y registros de la pagina actual

#### Scenario: Exportar respetando filtros visibles

- **WHEN** el listado tiene busqueda, estado y paginacion aplicados
- **THEN** la exportacion utiliza esa misma consulta y pagina normalizada y no incorpora paginas adicionales

#### Scenario: Exportacion sin alumnos

- **WHEN** no hay alumnos que coincidan con la vista exportada
- **THEN** el sistema entrega un `.xlsx` valido con encabezados y metadata de academia, sin filas de alumnos

## ADDED Requirements

### Requirement: Alta progresiva y edicion coherente de alumnos

El sistema SHALL presentar identidad y contacto al inicio del alta, con datos complementarios opcionales agrupados y desplegables. SHALL conservar todos los campos existentes, validaciones y restricciones de salud. La edicion SHALL usar agrupaciones coherentes para datos basicos y mantener salud y privacidad en sus propios flujos.

#### Scenario: Alta esencial

- **WHEN** el usuario ingresa los datos minimos actualmente requeridos y guarda sin completar secciones opcionales
- **THEN** se crea un solo alumno y el sistema comunica exito con acceso a su ficha sin exigir nuevos campos obligatorios

#### Scenario: Validacion en seccion colapsada

- **WHEN** un campo invalido pertenece a una seccion desplegable
- **THEN** la seccion se abre y el usuario puede localizar y corregir el campo sin perder los valores ingresados

#### Scenario: Registro de alergias

- **WHEN** el usuario registra alergias en el alta
- **THEN** se exige consentimiento explicito del alumno o tutor y politica de salud aprobada y activa antes de guardar esos datos

#### Scenario: Alta parcialmente completada

- **WHEN** se crea el alumno pero falla el registro posterior de datos de salud
- **THEN** el sistema explica el resultado parcial, ofrece abrir la ficha creada y evita reenviar el alta para no duplicar al alumno

#### Scenario: Guardado pendiente

- **WHEN** el alta o la edicion esta guardandose
- **THEN** el sistema comunica el progreso, impide envios duplicados y mantiene el formulario legible y sus valores ante errores

### Requirement: Ficha de alumno organizada por tarea

El sistema SHALL mostrar nombre, identidad y estado operativo al inicio de la ficha y organizar la informacion en Resumen, Membresia, Salud y Privacidad mediante navegacion accesible. SHALL conservar todas las operaciones existentes y mostrar solamente las secciones y datos autorizados para el usuario y la politica vigente.

#### Scenario: Consultar ficha

- **WHEN** un usuario abre una ficha
- **THEN** identifica al alumno y su estado antes de consultar sus datos, y puede cambiar de seccion sin perder la identidad ni el regreso al listado

#### Scenario: Consultar membresia

- **WHEN** un usuario autorizado abre Membresia
- **THEN** ve las membresias y saldos disponibles, puede acceder a registrar cobro cuando corresponda o asignar un plan cuando no existe membresia, sin duplicar logica financiera

#### Scenario: Datos de salud bloqueados

- **WHEN** la politica de salud o el consentimiento vigente no permite consultar salud
- **THEN** no se muestran datos sensibles ni formularios de restricciones y se comunica el motivo y el acceso autorizado a gestionar consentimiento

#### Scenario: Gestionar privacidad

- **WHEN** un usuario autorizado abre Privacidad
- **THEN** conserva las acciones existentes de consentimiento, correccion, exportacion personal y solicitud de eliminacion bajo las mismas condiciones actuales

### Requirement: Accesibilidad y jerarquia visual del modulo de alumnos

El modulo SHALL usar tokens y componentes visuales existentes, una accion primaria por tarea, etiquetas de estado textuales, foco visible y objetivos tactiles de al menos 44 por 44 px para acciones interactivas. SHALL ser operable mediante teclado y en viewports de 320 a 1440 px sin solapamiento de navegacion, acciones o contenido.

#### Scenario: Navegacion tactil y teclado

- **WHEN** el usuario opera filtros, formularios, navegacion de ficha o confirmacion de archivado
- **THEN** los controles tienen etiquetas accesibles, orden de foco coherente y no dependen exclusivamente de iconos o color

#### Scenario: Confirmacion accesible

- **WHEN** se abre la confirmacion de archivado
- **THEN** el foco queda dentro del dialogo, Escape o Cancelar lo cierran cuando no hay guardado pendiente y el foco vuelve al disparador al cancelar

#### Scenario: Composicion responsive

- **WHEN** el modulo se consulta en 320, 375, 390, 768, 1280 o 1440 px
- **THEN** textos largos, controles y acciones permanecen accesibles sin desbordamiento horizontal de la pagina ni superposicion con la navegacion inferior
