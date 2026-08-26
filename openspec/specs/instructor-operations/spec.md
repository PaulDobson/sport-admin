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
