## MODIFIED Requirements

### Requirement: Shell autenticado adaptativo

El sistema SHALL presentar las rutas operativas autenticadas dentro de un shell persistente que use sidebar y topbar en desktop, y app bar superior con navegación inferior en móvil, sin perder la posición ni el contexto de la sección activa al navegar. La topbar SHALL separar visualmente el título de la página, la academia activa, el rol operativo, indicadores compactos de estado o resultados y el acceso a cuenta para evitar que el contexto global se perciba amontonado.

#### Scenario: Navegación desde desktop

- **WHEN** un usuario autenticado abre una ruta operativa en un viewport desktop
- **THEN** ve una sidebar con las secciones principales, una topbar con el contexto global y la sección actual identificada visualmente sin comprimir el nombre de la academia ni las acciones de cuenta

#### Scenario: Navegación desde móvil

- **WHEN** un usuario autenticado abre una ruta operativa en un viewport móvil
- **THEN** ve una app bar compacta y una navegación inferior alcanzable con una mano sin solapar el contenido ni las acciones de la pantalla

#### Scenario: Acceso sin autenticación

- **WHEN** una persona sin sesión autenticada intenta abrir una ruta incluida en el shell
- **THEN** el sistema la dirige al acceso sin renderizar previamente información del tenant

### Requirement: Contexto organizacional visible

El sistema SHALL mostrar el tenant activo y, cuando corresponda, la locación y el rol operativo; si el usuario pertenece a más de un tenant SHALL permitir cambiar de contexto antes de ejecutar operaciones dependientes del tenant. En pantallas operativas, este contexto SHALL estar integrado en la topbar, app bar o encabezado de tarea sin requerir un panel lateral redundante para entender dónde opera el usuario.

#### Scenario: Usuario con una membresía operativa

- **WHEN** el usuario dispone de una única membresía operativa
- **THEN** el shell muestra su organización y rol sin exigir una selección adicional

#### Scenario: Usuario con múltiples membresías operativas

- **WHEN** el usuario dispone de más de un tenant operativo
- **THEN** puede elegir el tenant activo y las páginas posteriores consultan y modifican exclusivamente ese contexto

#### Scenario: Cambio de locación

- **WHEN** el instructor cambia la locación activa desde una superficie que admite ese filtro
- **THEN** el contexto visible y los datos operativos se actualizan de forma consistente

### Requirement: Panel contextual de sesión actual

El sistema SHALL priorizar la sesión actual o próxima mediante un panel contextual que muestre estado, horario, locación, asistencia, sincronización y acciones válidas para su etapa. En desktop, el shell SHALL reservar un panel lateral persistente solo cuando exista contexto accionable de sesión, sincronización, alerta operacional o información específica de la página que reduzca cambios de vista; cuando el panel solo repita métricas o contexto ya visible, SHALL omitirse para conservar ancho útil del contenido principal.

#### Scenario: Sesión en curso en desktop

- **WHEN** existe una sesión en curso y el instructor usa desktop
- **THEN** el shell muestra un panel lateral con sus datos operativos y acceso directo a asistencia y finalización

#### Scenario: Sesión en curso en móvil

- **WHEN** existe una sesión en curso y el instructor usa móvil
- **THEN** Inicio la presenta como contenido prioritario y las rutas operativas relacionadas pueden mostrar un acceso compacto que no compite con la navegación inferior

#### Scenario: Sin sesión actual

- **WHEN** no existe una sesión en curso ni próxima dentro del horizonte operativo
- **THEN** el shell omite el panel contextual y conserva el espacio para el contenido principal

#### Scenario: Contexto lateral redundante

- **WHEN** una ruta desktop ya muestra academia, rol, filtros y métricas necesarias en la topbar o contenido principal
- **THEN** el shell no reserva rail derecho solo para repetir esa información

#### Scenario: Acción no permitida

- **WHEN** el rol o el estado de la sesión no permiten una acción
- **THEN** el panel no la ofrece y conserva disponibles las acciones de consulta autorizadas

### Requirement: Academia visible en administracion de alumnos

El sistema SHALL mostrar la academia activa como contexto principal en la administracion de alumnos, incluyendo nombre de academia y rol operativo antes de presentar acciones que creen, editen, archiven o exporten datos de alumnos. La pantalla SHALL priorizar el ancho de trabajo de la tabla y los formularios, y SHALL NOT usar un panel lateral derecho para mostrar únicamente el nombre de la academia o conteos redundantes.

#### Scenario: Profesor administra alumnos de una academia

- **WHEN** un usuario autorizado abre la administracion de alumnos
- **THEN** ve el nombre de la academia activa y su rol operativo en una posicion visible sin abrir menus secundarios

#### Scenario: Profesor con varias academias

- **WHEN** un usuario con multiples academias operativas abre la administracion de alumnos
- **THEN** el sistema permite cambiar la academia activa desde el contexto visible o una accion claramente asociada antes de ejecutar operaciones sobre alumnos

#### Scenario: Operacion dependiente de academia

- **WHEN** el usuario crea, edita, archiva o exporta alumnos desde la administracion
- **THEN** la operacion se ejecuta exclusivamente contra la academia activa mostrada en la interfaz

#### Scenario: Tabla de alumnos en desktop

- **WHEN** un usuario abre la administracion de alumnos en desktop
- **THEN** la tabla, los filtros y las acciones principales usan el ancho disponible del contenido sin quedar reducidos por un panel lateral redundante
