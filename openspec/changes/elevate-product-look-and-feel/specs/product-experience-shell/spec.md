## ADDED Requirements

### Requirement: Shell desktop de consola operativa

El sistema SHALL presentar la experiencia desktop autenticada como una consola operativa con navegación lateral persistente, topbar contextual, región principal de trabajo y panel contextual opcional para sesión, sincronización o información operacional relevante.

#### Scenario: Usuario operativo en desktop

- **WHEN** un usuario autenticado abre una ruta operativa en desktop
- **THEN** ve una navegación principal persistente, el contexto activo en la topbar, el contenido de trabajo y una región contextual cuando exista información operacional útil

#### Scenario: Navegación principal en desktop

- **WHEN** el usuario cambia entre Inicio, Agenda, Alumnos, Finanzas o Reportes desde desktop
- **THEN** la navegación mantiene identificada la sección activa y conserva acceso visible al resto de destinos permitidos para su rol

### Requirement: Experiencia móvil priorizada por tarea actual

El sistema SHALL mantener la experiencia móvil como baseline ergonómica, con app bar compacta, navegación inferior alcanzable con una mano, acción rápida contextual y prioridad visual para la sesión actual o próxima cuando exista.

#### Scenario: Inicio móvil con sesión actual

- **WHEN** existe una sesión en curso y el usuario abre Inicio en móvil
- **THEN** la sesión actual aparece como contenido prioritario con acciones válidas para su etapa y rol

#### Scenario: Rutas móviles con navegación inferior

- **WHEN** el usuario navega por rutas operativas en móvil
- **THEN** la navegación inferior conserva acceso a las secciones principales sin solapar contenido, formularios ni acciones críticas de la pantalla

### Requirement: Perfil y cuenta como superficie de mantenimiento

El sistema SHALL ofrecer un menú rápido de cuenta para identidad, tenant activo, rol, locación cuando aplique y cierre de sesión, y SHALL proporcionar una superficie completa para mantener perfil, seguridad, organización, notificaciones y preferencias disponibles sin simular controles no persistidos.

#### Scenario: Consulta rápida de cuenta

- **WHEN** el usuario abre el control de cuenta desde la topbar o app bar
- **THEN** ve su identidad, organización activa, rol operativo, cambio de tenant cuando corresponda y acciones principales de cuenta sin abandonar la tarea actual

#### Scenario: Mantenimiento completo de perfil

- **WHEN** el usuario abre la superficie de perfil
- **THEN** puede revisar y mantener las categorías disponibles de identidad, seguridad, organización, notificaciones y preferencias con estados claros para lo que aún no sea configurable

### Requirement: Panel de información de sesión y jornada

El sistema SHALL tratar la sesión actual o próxima como contexto operacional central, mostrando estado, horario, locación, cupos o asistencia, sincronización y acciones permitidas; en desktop SHALL poder vivir en un panel lateral persistente y en móvil SHALL reubicarse como contenido prioritario o acceso compacto.

#### Scenario: Sesión actual en panel desktop

- **WHEN** existe una sesión en curso en desktop
- **THEN** el panel contextual muestra información accionable de la sesión y permite abrir asistencia o finalizar tareas permitidas sin ocultar el contenido principal

#### Scenario: Sin sesión actual ni próxima

- **WHEN** no existe sesión actual ni próxima dentro del horizonte operativo
- **THEN** la interfaz omite el panel de sesión y aprovecha el espacio para contenido principal o contexto alternativo útil

### Requirement: Contexto de sesión, organización y sincronización siempre comprensible

El sistema SHALL comunicar de forma persistente pero no obstructiva el tenant activo, rol, locación cuando aplique, estado de sesión y estado de conexión o sincronización, con texto suficiente para que el usuario entienda dónde opera y qué requiere atención.

#### Scenario: Usuario cambia de tenant

- **WHEN** el usuario cambia el tenant activo desde una superficie de cuenta o selección de contexto
- **THEN** la interfaz actualiza el contexto visible y las rutas operativas posteriores consultan exclusivamente el tenant seleccionado

#### Scenario: Trabajo pendiente offline

- **WHEN** existen operaciones pendientes por sincronizar
- **THEN** el shell comunica el estado pendiente sin bloquear la tarea actual y ofrece acceso a resolución cuando se requiera intervención
