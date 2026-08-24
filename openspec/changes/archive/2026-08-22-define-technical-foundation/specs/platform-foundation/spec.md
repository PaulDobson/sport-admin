## ADDED Requirements

### Requirement: Arquitectura en capas (clean architecture)

El sistema SHALL organizar el codigo del proyecto en capas de dominio, aplicacion, infraestructura y presentacion, con una regla de dependencia donde las capas internas (dominio, aplicacion) no SHALL depender de detalles de infraestructura o del framework de presentacion.

#### Scenario: Regla de dependencia respetada

- **WHEN** se agrega una nueva capacidad de negocio (ej. alumnos, sesiones, membresias)
- **THEN** su logica de dominio y casos de uso se implementa sin importar clientes de base de datos, SDKs externos o componentes de UI

#### Scenario: Cambio de infraestructura sin romper dominio

- **WHEN** cambia un detalle de infraestructura (ej. proveedor de base de datos o cliente HTTP)
- **THEN** las reglas de negocio en dominio y aplicacion permanecen sin cambios de comportamiento observable

### Requirement: Modelo de datos multi-tenant ejecutable

El sistema SHALL contar con un script de migracion versionado que cree en Supabase el esquema relacional del alcance de MVP Fase 1 (identidad, tenants, roles, alumnos, locaciones, sesiones y membresias basicas), con Row Level Security habilitado en cada tabla de negocio y politicas que impidan el acceso cross-tenant.

#### Scenario: Ejecucion de la migracion inicial

- **WHEN** se ejecuta el script de migracion sobre un proyecto Supabase nuevo
- **THEN** el esquema, las relaciones y las politicas de RLS del alcance de MVP Fase 1 quedan creados sin pasos manuales adicionales

#### Scenario: Aislamiento verificado en el esquema

- **WHEN** dos tenants distintos consultan o modifican datos de alumnos, locaciones, sesiones o membresias usando el esquema creado por la migracion
- **THEN** ninguno puede leer, crear, actualizar o borrar recursos del otro tenant

### Requirement: Precondicion tecnica antes de capacidades de negocio

El sistema SHALL contar con la arquitectura en capas y el modelo de datos migrado antes de habilitar la construccion de pantallas o flujos funcionales de las capacidades de negocio del MVP (alumnos, sesiones, membresias, salud, finanzas).

#### Scenario: Orden de ejecucion respetado

- **WHEN** se planifica el trabajo de una capacidad de negocio del MVP
- **THEN** dicha capacidad solo se implementa despues de que la arquitectura en capas y la migracion de datos esten disponibles y ejecutadas
