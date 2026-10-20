## ADDED Requirements

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
