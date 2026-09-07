## ADDED Requirements

### Requirement: Academia visible en administracion de alumnos

El sistema SHALL mostrar la academia activa como contexto principal en la administracion de alumnos, incluyendo nombre de academia y rol operativo antes de presentar acciones que creen, editen, archiven o exporten datos de alumnos.

#### Scenario: Profesor administra alumnos de una academia

- **WHEN** un usuario autorizado abre la administracion de alumnos
- **THEN** ve el nombre de la academia activa y su rol operativo en una posicion visible sin abrir menus secundarios

#### Scenario: Profesor con varias academias

- **WHEN** un usuario con multiples academias operativas abre la administracion de alumnos
- **THEN** el sistema permite cambiar la academia activa desde el contexto visible o una accion claramente asociada antes de ejecutar operaciones sobre alumnos

#### Scenario: Operacion dependiente de academia

- **WHEN** el usuario crea, edita, archiva o exporta alumnos desde la administracion
- **THEN** la operacion se ejecuta exclusivamente contra la academia activa mostrada en la interfaz
