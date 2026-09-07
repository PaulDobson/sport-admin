## Purpose

Define una experiencia autenticada coherente y adaptativa que conserve navegación, identidad y contexto operativo entre las distintas áreas del producto.

## ADDED Requirements

### Requirement: Shell autenticado adaptativo

El sistema SHALL presentar las rutas operativas autenticadas dentro de un shell persistente que use sidebar y topbar en desktop, y app bar superior con navegación inferior en móvil, sin perder la posición ni el contexto de la sección activa al navegar.

#### Scenario: Navegación desde desktop

- **WHEN** un usuario autenticado abre una ruta operativa en un viewport desktop
- **THEN** ve una sidebar con las secciones principales, una topbar con el contexto global y la sección actual identificada visualmente

#### Scenario: Navegación desde móvil

- **WHEN** un usuario autenticado abre una ruta operativa en un viewport móvil
- **THEN** ve una app bar compacta y una navegación inferior alcanzable con una mano sin solapar el contenido ni las acciones de la pantalla

#### Scenario: Acceso sin autenticación

- **WHEN** una persona sin sesión autenticada intenta abrir una ruta incluida en el shell
- **THEN** el sistema la dirige al acceso sin renderizar previamente información del tenant

### Requirement: Arquitectura de información operativa

El sistema SHALL ofrecer acceso estable a Inicio, Agenda, Alumnos y Finanzas, SHALL destacar una acción operativa rápida y SHALL permitir acceder a Reportes sin presentar destinos sin contenido utilizable.

#### Scenario: Cambio de sección principal

- **WHEN** el instructor selecciona una sección principal
- **THEN** el sistema abre su superficie funcional y mantiene identificada la sección activa

#### Scenario: Acción rápida contextual

- **WHEN** el instructor activa la acción rápida desde la navegación principal
- **THEN** el sistema ofrece únicamente operaciones permitidas para su rol y aplicables al contexto actual

#### Scenario: Acceso a reportes en móvil

- **WHEN** el instructor necesita consultar reportes desde un viewport móvil
- **THEN** puede acceder a ellos desde Finanzas o su navegación secundaria sin añadir una sexta posición a la barra inferior

### Requirement: Contexto organizacional visible

El sistema SHALL mostrar el tenant activo y, cuando corresponda, la locación y el rol operativo; si el usuario pertenece a más de un tenant SHALL permitir cambiar de contexto antes de ejecutar operaciones dependientes del tenant.

#### Scenario: Usuario con una membresía operativa

- **WHEN** el usuario dispone de una única membresía operativa
- **THEN** el shell muestra su organización y rol sin exigir una selección adicional

#### Scenario: Usuario con múltiples membresías operativas

- **WHEN** el usuario dispone de más de una membresía operativa
- **THEN** puede elegir el tenant activo y las páginas posteriores consultan y modifican exclusivamente ese contexto

#### Scenario: Cambio de locación

- **WHEN** el instructor cambia la locación activa desde una superficie que admite ese filtro
- **THEN** el contexto visible y los datos operativos se actualizan de forma consistente

### Requirement: Panel contextual de sesión actual

El sistema SHALL priorizar la sesión actual o próxima mediante un panel contextual que muestre estado, horario, locación, asistencia, sincronización y acciones válidas para su etapa.

#### Scenario: Sesión en curso en desktop

- **WHEN** existe una sesión en curso y el instructor usa desktop
- **THEN** el shell muestra un panel lateral con sus datos operativos y acceso directo a asistencia y finalización

#### Scenario: Sesión en curso en móvil

- **WHEN** existe una sesión en curso y el instructor usa móvil
- **THEN** Inicio la presenta como contenido prioritario y las rutas operativas relacionadas pueden mostrar un acceso compacto que no compite con la navegación inferior

#### Scenario: Sin sesión actual

- **WHEN** no existe una sesión en curso ni próxima dentro del horizonte operativo
- **THEN** el shell omite el panel contextual y conserva el espacio para el contenido principal

#### Scenario: Acción no permitida

- **WHEN** el rol o el estado de la sesión no permiten una acción
- **THEN** el panel no la ofrece y conserva disponibles las acciones de consulta autorizadas

### Requirement: Estado de conexión y sincronización

El sistema SHALL comunicar de manera persistente pero no obstructiva si está online, offline, sincronizando, con operaciones pendientes o con conflictos que requieren intervención.

#### Scenario: Operación pendiente offline

- **WHEN** el instructor registra una operación sin conexión
- **THEN** el shell indica que existe trabajo pendiente y permite continuar sobre las capacidades offline disponibles

#### Scenario: Conflicto de sincronización

- **WHEN** una operación pendiente entra en conflicto al reconectar
- **THEN** el shell muestra una advertencia textual y un acceso a la resolución sin depender únicamente del color

#### Scenario: Sincronización completada

- **WHEN** termina la sincronización sin errores ni pendientes
- **THEN** el indicador vuelve a un estado estable sin interrumpir la tarea actual

### Requirement: Perfil y preferencias del usuario

El sistema SHALL ofrecer desde la topbar o app bar un acceso rápido a identidad, organización, rol y cierre de sesión, y SHALL proporcionar una superficie completa para mantener datos personales, seguridad, notificaciones y preferencias disponibles.

#### Scenario: Consulta rápida del perfil

- **WHEN** el usuario abre el control de perfil
- **THEN** ve su identidad, tenant activo, rol y acciones de cuenta sin abandonar la tarea actual

#### Scenario: Actualización de datos personales

- **WHEN** el usuario guarda un nombre o avatar válido desde la superficie de perfil
- **THEN** el sistema persiste el cambio y actualiza la identidad visible en el shell

#### Scenario: Preferencia aún no disponible

- **WHEN** una categoría de preferencia no cuenta con soporte persistente
- **THEN** la superficie no presenta un control que simule guardar cambios

### Requirement: Separación de la experiencia backoffice

El sistema SHALL presentar la administración de plataforma en un shell diferenciado, visible solo para roles autorizados, que comparta tokens y componentes base sin mezclar navegación de plataforma con la operación del instructor.

#### Scenario: Administrador de plataforma

- **WHEN** un administrador autorizado abre backoffice
- **THEN** ve navegación orientada a tenants y finanzas de plataforma con una señal visual clara del contexto administrativo

#### Scenario: Usuario operativo sin autorización

- **WHEN** un usuario sin rol de plataforma intenta acceder a backoffice
- **THEN** el sistema deniega el acceso y no incorpora destinos de backoffice a su navegación

### Requirement: Navegación accesible y resiliente

El shell SHALL mantener foco visible, nombres accesibles, orden de tabulación coherente y áreas táctiles suficientes, y SHALL conservar navegación y acciones esenciales en estados de carga, vacío, error u offline.

#### Scenario: Navegación por teclado

- **WHEN** una persona recorre el shell usando teclado
- **THEN** puede identificar el foco, activar cada destino disponible y cerrar menús o paneles superpuestos

#### Scenario: Contenido en carga o error

- **WHEN** una sección está cargando o falla al obtener sus datos
- **THEN** el shell permanece utilizable y el contenido comunica el estado con una acción de recuperación cuando corresponda
