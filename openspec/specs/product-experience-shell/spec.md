# product-experience-shell Specification

## Purpose

Define una experiencia autenticada coherente y adaptativa que conserve navegación, identidad y contexto operativo entre las distintas áreas del producto.

## Requirements

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

El sistema SHALL presentar la administración de plataforma en un shell diferenciado, visible solo para roles autorizados, que comparta tokens y componentes base sin mezclar navegación ni permisos con la operación del instructor.

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

### Requirement: Navegacion secundaria de Agenda

El sistema SHALL mantener Agenda como seccion principal y ofrecer Sesiones y Programacion como subitems desktop y enlaces secundarios equivalentes en movil. SHALL identificar la subseccion activa sin agregar destinos a la barra inferior. Programacion SHALL estar disponible solo para roles autorizados.

#### Scenario: Consultar sesiones en desktop

- **WHEN** el usuario abre Agenda
- **THEN** ve Sesiones seleccionada y acceso a Programacion cuando su rol lo permite

#### Scenario: Programar desde movil

- **WHEN** un usuario autorizado abre Programacion en movil
- **THEN** Agenda permanece activa en la barra inferior y Programacion queda identificada en la navegacion secundaria

#### Scenario: Navegacion del asistente

- **WHEN** un asistente abre Agenda
- **THEN** puede consultar Sesiones pero no ve enlaces a Programacion y el acceso directo a esa ruta sigue restringido

#### Scenario: Asistencia pertenece a Agenda

- **WHEN** el usuario abre asistencia desde una sesion
- **THEN** Agenda permanece activa y existe un enlace visible de retorno a Sesiones tambien en movil

### Requirement: Flujo unificado de asignacion de plan

La experiencia SHALL ofrecer un unico flujo de asignacion de plan en tres pasos (alumno, plan, inicio y cobro) accesible desde la accion rapida global, desde la tarjeta de cada plan activo, desde la ficha del alumno y desde la lista de alumnos. El flujo SHALL omitir los pasos cuyo dato ya es conocido por el punto de entrada. La seleccion de alumno SHALL ofrecer busqueda por nombre e identificar a los alumnos con membresia vigente como no elegibles con acceso a gestionar su membresia. La seleccion de plan SHALL presentar los planes activos como opciones con nombre, precio formateado, ciclo y beneficios principales. Antes de confirmar, el flujo SHALL mostrar el precio, la fecha de inicio y el proximo vencimiento calculado, y SHALL permitir activar el registro de un pago inicial con monto prellenado con el precio del plan. En movil el flujo SHALL presentarse como hoja inferior con acciones alcanzables con una mano; en escritorio SHALL presentarse como panel o dialogo sin abandonar la pantalla de origen. Usuarios sin permiso de gestion MUST NOT ver los puntos de entrada.

#### Scenario: Asignar desde la accion rapida

- **WHEN** el instructor abre la accion rapida y elige asignar plan
- **THEN** el flujo comienza en la seleccion de alumno y continua con plan e inicio y cobro

#### Scenario: Asignar desde la tarjeta del plan

- **WHEN** el instructor activa "Asignar" en la tarjeta de un plan
- **THEN** el flujo comienza en la seleccion de alumno con ese plan ya elegido

#### Scenario: Asignar desde la ficha del alumno

- **WHEN** el instructor asigna desde la ficha de un alumno sin membresia vigente
- **THEN** el flujo comienza en la seleccion de plan con el alumno ya elegido

#### Scenario: Alumno con membresia vigente

- **WHEN** el instructor busca un alumno que ya tiene una membresia vigente
- **THEN** el alumno aparece marcado como no elegible y el flujo ofrece ir a su membresia actual en lugar de continuar

#### Scenario: Sin planes activos

- **WHEN** el instructor inicia la asignacion y el tenant no tiene planes activos
- **THEN** el flujo informa la situacion y ofrece crear un plan sin perder el alumno seleccionado

#### Scenario: Confirmacion con cobro

- **WHEN** el instructor confirma una asignacion con pago inicial
- **THEN** ve la confirmacion de la membresia creada y del pago registrado con el saldo resultante, y los indicadores y listas afectados se actualizan

#### Scenario: Rol asistente

- **WHEN** un usuario con rol asistente navega finanzas, alumnos o la accion rapida
- **THEN** no ve puntos de entrada a la asignacion de planes

### Requirement: Creacion guiada de planes

La creacion y edicion de planes SHALL ofrecer plantillas de partida para ciclos mensual, trimestral, semestral y anual que prellenan el formulario sin bloquear su edicion. El formulario SHALL presentar el precio con formato de la moneda seleccionada, la moneda como opcion de una lista cerrada de codigos validos, el ciclo como control segmentado acompanado de su equivalente mensual, los dias de tolerancia con una explicacion de su efecto sobre la mora y valores sugeridos, y los beneficios como etiquetas que se agregan y quitan individualmente. Mientras se edita, el sistema SHALL mostrar una vista previa de la tarjeta del plan tal como aparecera en el catalogo. La tarjeta del plan en el catalogo SHALL mostrar precio y ciclo, alumnos vigentes, ingreso mensual equivalente y una accion "Asignar" para planes activos.

#### Scenario: Usar una plantilla

- **WHEN** el instructor elige la plantilla trimestral al crear un plan
- **THEN** el formulario queda con ciclo trimestral y valores sugeridos editables, y la vista previa los refleja

#### Scenario: Equivalente mensual

- **WHEN** el instructor ingresa un precio con ciclo anual
- **THEN** el formulario muestra el equivalente mensual del precio en la moneda elegida

#### Scenario: Beneficios como etiquetas

- **WHEN** el instructor agrega y luego quita un beneficio
- **THEN** la lista de etiquetas y la vista previa reflejan el cambio y solo se guardan los beneficios presentes

#### Scenario: Validacion

- **WHEN** el instructor intenta guardar sin nombre o con precio negativo
- **THEN** el formulario indica el campo con error junto a el y no envia el plan

### Requirement: Tablero financiero responsive

La seccion de resumen de finanzas SHALL presentar cuatro tarjetas de indicador (cobrado del mes, por cobrar, membresias vigentes y proyectado del mes), cada una con titulo, monto o cantidad principal, nota de contexto y una etiqueta de tono semantico (variacion, atencion, vigentes, tasa de cobro), y cada tarjeta SHALL abrir la vista filtrada correspondiente. Debajo SHALL presentar el panel de movimientos recientes y el panel de rendimiento por plan. En movil los indicadores SHALL disponerse en una grilla de dos columnas seguida de los pendientes que requieren accion hoy y de los paneles apilados, con los movimientos como tarjetas. En escritorio los indicadores SHALL disponerse en una fila y los paneles en dos columnas, con los movimientos como tabla de columnas fecha, alumno, plan, monto y estado. El resumen SHALL ofrecer un selector de periodo reflejado en la URL. Cuando existan varias monedas, el resumen SHALL permitir elegir la moneda mostrada sin mezclar montos. El dashboard principal SHALL incluir un bloque compacto de finanzas del mes con cobrado y por cobrar y un acceso al resumen, visible solo para roles con permiso de gestion financiera.

#### Scenario: Resumen en movil

- **WHEN** el instructor abre el resumen de finanzas en un viewport movil
- **THEN** ve los cuatro indicadores en dos columnas, luego los pendientes que requieren accion y despues los paneles de movimientos y rendimiento por plan

#### Scenario: Resumen en escritorio

- **WHEN** el instructor abre el resumen en un viewport de escritorio
- **THEN** ve los cuatro indicadores en una fila y los paneles de movimientos y rendimiento por plan lado a lado

#### Scenario: Indicador por cobrar

- **WHEN** el instructor activa la tarjeta por cobrar
- **THEN** se abre la seccion de cobros filtrada por membresias en mora

#### Scenario: Cambio de periodo

- **WHEN** el instructor elige otro mes en el selector de periodo
- **THEN** los indicadores, movimientos y rendimiento se recalculan para ese mes y la URL conserva el periodo

#### Scenario: Bloque en el dashboard principal

- **WHEN** un instructor con permiso de gestion abre el dashboard principal
- **THEN** ve el bloque de finanzas del mes con cobrado y por cobrar y puede abrir el resumen de finanzas

#### Scenario: Periodo sin datos

- **WHEN** el periodo elegido no tiene membresias ni pagos
- **THEN** los indicadores muestran cero, los paneles muestran un estado vacio con la accion de crear o asignar un plan y el selector de periodo sigue disponible

### Requirement: Cobros con filtros compactos y efecto previsible

La seccion de cobros SHALL presentar los estados como chips con contador de pendientes por estado, y en movil SHALL ubicar los filtros de fecha en una hoja inferior en lugar de anteponerlos a la lista. Las acciones de ciclo de vida SHALL describir su efecto antes de confirmar, incluyendo la nueva fecha de vencimiento al renovar y la fecha efectiva al pausar, vencer o cancelar.

#### Scenario: Chip de estado

- **WHEN** el instructor selecciona el chip de mora
- **THEN** la lista muestra solo pendientes en mora, el chip queda marcado como activo y la URL conserva el filtro

#### Scenario: Previsualizar renovacion

- **WHEN** el instructor elige renovar una membresia
- **THEN** ve la nueva fecha de vencimiento calculada antes de confirmar

### Requirement: Superficie de finanzas orientada a la accion en movil

La superficie de finanzas SHALL organizarse en secciones navegables de resumen, cobros y planes, cuyo estado activo, periodo y filtros SHALL quedar reflejados en la URL para poder compartirse, recargarse y volver atras sin perder el contexto. En viewport movil, el sistema SHALL presentar primero el contenido accionable y SHALL NOT anteponer formularios de creacion ni un bloque de filtros al contenido principal; la creacion de un plan SHALL ubicarse tras una accion explicita dentro de la seccion de planes. El resumen SHALL destacar una metrica principal de cobro del periodo por sobre las metricas de apoyo, y los indicadores de mora y de renovaciones proximas SHALL funcionar como accesos que abren la lista de cobros ya filtrada. Las acciones de registro de cobro y de ciclo de vida SHALL estar disponibles desde la propia fila del pendiente o de la membresia, con areas tactiles suficientes y alcanzables con una mano, sin obligar a navegar a una pantalla de detalle.

#### Scenario: Apertura en movil

- **WHEN** el instructor abre finanzas en un viewport movil
- **THEN** ve primero la metrica principal de cobro del periodo y el contenido accionable, sin un formulario de creacion ni un bloque de filtros por delante

#### Scenario: Cambio de seccion

- **WHEN** el instructor cambia entre resumen, cobros y planes
- **THEN** el sistema actualiza la URL con la seccion activa y al recargar o volver atras conserva la misma seccion, periodo y filtros

#### Scenario: Indicador como filtro

- **WHEN** el instructor activa el indicador de mora o el de renovaciones proximas desde el resumen
- **THEN** el sistema abre la seccion de cobros con el filtro correspondiente ya aplicado y visible

#### Scenario: Cobro desde la fila

- **WHEN** el instructor activa la accion de cobro sobre un pendiente listado
- **THEN** el sistema abre una superficie de registro sobre la misma pantalla con el importe adeudado propuesto, sin perder la posicion en la lista

#### Scenario: Creacion de plan

- **WHEN** el instructor necesita crear un plan
- **THEN** accede a la creacion mediante una accion explicita dentro de la seccion de planes y el formulario no ocupa el inicio del contenido

#### Scenario: Uso por teclado y lectores de pantalla

- **WHEN** una persona recorre finanzas con teclado o lector de pantalla
- **THEN** puede identificar la seccion activa, alcanzar cada accion de cobro o de ciclo de vida con nombre accesible y cerrar las superficies superpuestas sin perder el foco

#### Scenario: Sin datos en el periodo

- **WHEN** el periodo seleccionado no tiene cobros, pendientes ni planes segun la seccion activa
- **THEN** la seccion comunica el estado vacio con una accion util y conserva la navegacion y el cambio de periodo disponibles
