## Purpose

Define la landing page pública de Sport Admin: la primera superficie que ve una persona sin sesión, responsable de comunicar la propuesta de valor de la gestión deportiva y de dirigirla hacia el registro o el inicio de sesión.

## ADDED Requirements

### Requirement: Hero con propuesta de valor

El sistema SHALL presentar en la ruta pública `/` una sección hero con un titular, un subtítulo y llamados a la acción hacia registro e inicio de sesión, visibles sin necesidad de scroll en viewports de escritorio y móvil comunes.

#### Scenario: Visitante sin sesión abre la landing

- **WHEN** una persona sin sesión activa abre `/`
- **THEN** el sistema muestra un titular y subtítulo que comunican la propuesta de valor de Sport Admin y botones para "Crear cuenta" e "Iniciar sesión"

#### Scenario: Visitante en móvil

- **WHEN** una persona abre `/` desde un viewport móvil
- **THEN** el hero conserva el titular, subtítulo y llamados a la acción legibles y accesibles sin recortarse ni superponerse

### Requirement: Comunicación del valor de una buena gestión

El sistema SHALL presentar, además del hero, secciones que comuniquen explícitamente los beneficios de una buena gestión deportiva: control financiero, visibilidad sobre los alumnos y oportunidad de crecimiento del negocio.

#### Scenario: Visitante explora los beneficios

- **WHEN** una persona sin sesión recorre la landing más allá del hero
- **THEN** encuentra al menos una sección dedicada a control financiero, una a visibilidad de alumnos y una a oportunidad de crecimiento, cada una con un mensaje concreto y no genérico

### Requirement: Llamados a la acción hacia registro e inicio de sesión

El sistema SHALL ofrecer, en el hero y al finalizar el recorrido de la landing, un llamado a la acción hacia el registro y un acceso hacia el inicio de sesión.

#### Scenario: Conversión desde el hero

- **WHEN** una persona sin sesión activa el llamado a la acción principal del hero
- **THEN** el sistema la dirige a la ruta de registro

#### Scenario: Conversión al final del recorrido

- **WHEN** una persona sin sesión llega al final de la landing sin haber convertido antes
- **THEN** encuentra un llamado a la acción final hacia registro y un acceso hacia inicio de sesión

### Requirement: Identidad visual y accesibilidad de las animaciones

El sistema SHALL presentar ilustraciones abstractas coherentes con la paleta de marca y SHALL animar la entrada y el recorrido de las secciones sin comprometer la legibilidad ni la accesibilidad.

#### Scenario: Visitante con preferencia de movimiento reducido

- **WHEN** una persona con `prefers-reduced-motion` activado abre la landing
- **THEN** el sistema omite o reduce las animaciones de entrada y scroll sin ocultar contenido ni llamados a la acción

#### Scenario: Ilustraciones coherentes con la marca

- **WHEN** una persona recorre cualquier sección de la landing
- **THEN** las ilustraciones y colores usados corresponden a la paleta de marca ya definida en el sistema de diseño, sin introducir una paleta ajena

### Requirement: Redirección de visitantes con sesión activa

El sistema SHALL ofrecer a una persona con sesión activa un acceso directo a su panel operativo en lugar de un llamado a registrarse.

#### Scenario: Usuario con sesión activa visita la landing

- **WHEN** una persona con sesión activa abre `/`
- **THEN** el llamado a la acción principal la dirige a su panel operativo en lugar de al registro
