## Why

El plan de entrega de `build-sport-admin-saas` prioriza el flujo vertical de negocio (auth, alumnos, sesiones) pero no fija aun la arquitectura de codigo ni el modelo de datos ejecutable en Supabase antes de construir pantallas. Sin una base de clean architecture y un script de esquema/RLS versionado, cada capacidad (alumnos, salud, finanzas) arriesga acoplarse a detalles de infraestructura y duplicar reglas de aislamiento multi-tenant. Se necesita fijar primero arquitectura y modelo de datos, y posponer el refinamiento visual (`define-design-system`) a una segunda etapa, para que el look & feel se aplique sobre una base tecnica estable.

## What Changes

- Definir la arquitectura de clean architecture (capas dominio, aplicacion, infraestructura, presentacion) para el proyecto Next.js, con reglas de dependencia entre capas.
- Disenar el modelo de datos relacional multi-tenant (tablas, relaciones, JSONB selectivo) cubriendo el alcance de MVP Fase 1: identidad/tenants/roles, alumnos, locaciones, sesiones y membresias basicas.
- Producir un script SQL ejecutable en Supabase (migracion inicial) que cree ese esquema con RLS habilitado por tabla y politicas de aislamiento por tenant.
- Reordenar la secuencia de ejecucion del sistema: arquitectura + modelo de datos primero, luego implementacion funcional del MVP, y refinamiento de design system/look & feel (`define-design-system`) como etapa posterior antes de construir pantallas finales.

## Capabilities

### New Capabilities

<!-- No se introduce una capacidad de negocio nueva; esta propuesta es una base tecnica transversal. -->

### Modified Capabilities

- `platform-foundation`: Se agregan requisitos de arquitectura por capas y de modelo de datos/migracion ejecutable como precondicion tecnica para el resto de capacidades del MVP.

## Impact

- Estructura de carpetas y modulos del proyecto Next.js (dominio/aplicacion/infraestructura/presentacion).
- Script(s) SQL de migracion inicial en Supabase (tablas, RLS, politicas) para el alcance de MVP Fase 1.
- Orden de ejecucion del roadmap: `build-sport-admin-saas` continua vigente, pero su Fase 1 pasa a depender de que esta base de arquitectura y datos este lista antes de construir capacidades de negocio; `define-design-system` se aplica despues, sobre la base ya construida.
- Sin cambios en APIs externas ni en capacidades de negocio (alumnos, salud, finanzas); es una precondicion tecnica.
