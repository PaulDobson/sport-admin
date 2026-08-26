# platform-foundation Specification

## Purpose

TBD - created by archiving change define-technical-foundation. Update Purpose after archive.

## Requirements

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

### Requirement: Registro y onboarding de tenants

El sistema SHALL permitir registrar un instructor, crear su tenant, verificar su identidad y mantener la cuenta en un estado de onboarding hasta completar los datos requeridos.

#### Scenario: Crear cuenta de instructor

- **WHEN** un instructor completa un registro valido
- **THEN** el sistema crea su identidad, tenant y membresia de propietario en estado pendiente o trial segun la politica vigente

#### Scenario: Cuenta no habilitada

- **WHEN** un usuario intenta acceder a funciones operativas con una cuenta pendiente, suspendida o cancelada
- **THEN** el sistema bloquea la operacion y muestra el estado accionable de la cuenta

### Requirement: Roles y permisos por tenant

El sistema SHALL soportar al menos los roles propietario, instructor, asistente y administrador SaaS, con permisos diferenciados y membresias activas por tenant.

#### Scenario: Permiso de miembro activo

- **WHEN** un miembro activo accede a un recurso autorizado de su tenant
- **THEN** el sistema permite la operacion segun su rol

#### Scenario: Miembro revocado

- **WHEN** se revoca o suspende una membresia
- **THEN** el sistema deniega nuevas operaciones aunque el usuario conserve una sesion autenticada

### Requirement: Aislamiento de datos

El sistema SHALL impedir lectura o escritura de recursos de otro tenant en todas las operaciones, vistas, funciones y canales de actualizacion.

#### Scenario: Acceso cross-tenant

- **WHEN** un usuario intenta consultar, crear, actualizar o borrar un recurso usando otro tenant
- **THEN** el sistema rechaza la operacion o devuelve ausencia de recurso sin revelar datos

### Requirement: Experiencia PWA base

El sistema SHALL ofrecer una experiencia mobile-first instalable, con rutas protegidas, estados de carga y error, y app shell disponible para el flujo operativo principal.

#### Scenario: Instalacion movil

- **WHEN** un usuario visita la aplicacion desde un navegador compatible
- **THEN** puede instalar la PWA y abrir el flujo protegido despues de autenticarse
