## Context

Ver proposal.md - Why. El proyecto Next.js App Router aun no tiene codigo de negocio: esta es la primera oportunidad de fijar limites de capas antes de que existan capacidades acopladas. El backend es Supabase (PostgreSQL + Auth + RLS), segun lo acordado en `build-sport-admin-saas/design.md`. El alcance de datos de esta migracion se limita al MVP Fase 1: identidad/tenants/roles, alumnos, locaciones, sesiones y membresias basicas (sin salud/lesiones ni finanzas avanzadas, que se modelan en changes posteriores dentro de sus propias capacidades).

## Goals / Non-Goals

**Goals:**

- Fijar una estructura de carpetas por capas que cualquier capacidad de negocio futura (alumnos, salud, finanzas) siga sin excepciones.
- Entregar un script SQL idempotente y versionado que un desarrollador nuevo pueda ejecutar contra un proyecto Supabase en blanco y obtener el esquema completo del MVP con RLS activo.
- Establecer el patron de autorizacion (funcion SQL reutilizable) que todas las tablas de negocio futuras deben adoptar, evitando que cada capacidad reinvente su propia logica de aislamiento.

**Non-Goals:**

- No se modela aqui el esquema de salud/lesiones ni el de finanzas avanzadas/billing SaaS; esas capacidades definen sus propias tablas en sus changes, reutilizando el patron de RLS establecido aqui.
- No se define aqui el pipeline de CI/CD para aplicar migraciones en produccion, solo el script y como ejecutarlo localmente/manualmente.
- No se define el look & feel ni componentes de UI; eso corresponde a `define-design-system`, que se aplica despues sobre esta base.

## Decisions

### Capas: domain, application, infrastructure, presentation

Se adopta una estructura de carpetas explicita:

```
src/
  domain/          <- entidades y reglas de negocio puras (sin IO, sin Supabase, sin Next.js)
  application/      <- casos de uso, orquestan domain, definen puertos (interfaces) hacia infra
  infrastructure/    <- adaptadores concretos: cliente Supabase, repositorios, mappers
  presentation/       <- rutas de Next.js App Router, Server Actions, componentes UI
```

Regla de dependencia: `domain` no importa nada de `application`, `infrastructure` ni `presentation`. `application` importa `domain` e interfaces (puertos), nunca implementaciones concretas de `infrastructure`. `infrastructure` implementa los puertos definidos por `application`. `presentation` orquesta `application` y no accede a `infrastructure` directamente.

Alternativa descartada: organizar por feature/carpeta plana sin capas (ej. `features/students/*.ts` mezclando query de Supabase, logica y componente). Se descarta porque en un dominio con reglas sensibles (salud, dinero, multi-tenant) la mezcla de infraestructura y reglas de negocio dificulta testear casos de uso sin una base de datos real y facilita fugas de aislamiento entre tenants.

### Modelo de datos MVP y patron de RLS

Tablas del alcance de esta migracion (nombres orientativos, todas con `tenant_id` excepto la tabla de tenants):

```
tenants
tenant_memberships   (user_id, tenant_id, role, status)
locations            (tenant_id, name, address)
students             (tenant_id, full_name, photo_url, birth_date, status)
sessions             (tenant_id, location_id, starts_at, ends_at)
session_attendance   (tenant_id, session_id, student_id, status)
membership_plans     (tenant_id, name, price, duration_days)
student_memberships  (tenant_id, student_id, plan_id, starts_at, expires_at, status)
```

Patron de autorizacion: una funcion SQL `current_tenant_ids()` (SECURITY DEFINER, `stable`) que resuelve los `tenant_id` activos del usuario autenticado a partir de `tenant_memberships`. Cada tabla de negocio habilita RLS y define politicas `USING (tenant_id = ANY (current_tenant_ids()))` para SELECT/UPDATE/DELETE, y `WITH CHECK` equivalente para INSERT. Este patron es el que toda capacidad futura (salud, finanzas) debe reutilizar en vez de duplicar logica de aislamiento por tabla.

Alternativa descartada: repetir el join contra `tenant_memberships` en cada politica de cada tabla. Se descarta porque duplica logica de autorizacion en decenas de politicas, dificultando auditarla y aumentando el riesgo de una politica mal escrita que exponga datos cross-tenant.

### Migracion como script SQL versionado, no cambios manuales en el dashboard

El esquema se define en un archivo de migracion (`supabase/migrations/0001_init.sql`) ejecutable via `supabase db push` o el SQL editor de Supabase, en vez de crear tablas manualmente desde el dashboard.

Alternativa descartada: crear tablas manualmente en el dashboard de Supabase. Se descarta porque no es reproducible entre entornos (local, staging, produccion) ni auditable en control de versiones.

## Risks / Trade-offs

- [Riesgo] Una capa de dominio demasiado estricta puede ralentizar el desarrollo inicial del MVP → Mantener el dominio simple (entidades y validaciones basicas) en esta primera migracion; no introducir patrones adicionales (eventos de dominio, agregados complejos) hasta que una capacidad los necesite.
- [Riesgo] `current_tenant_ids()` mal implementada (ej. sin `stable`/`security definer` correcto) puede degradar performance o filtrar datos → Cubrir con pruebas negativas cross-tenant antes de dar por cerrada la migracion, como ya exige `build-sport-admin-saas/design.md`.
- [Riesgo] Definir el esquema de MVP ahora puede quedar corto cuando se disenen salud y finanzas → Las tablas de este alcance son la base minima; capacidades futuras agregan sus propias tablas reutilizando `tenant_id` y el mismo patron de RLS, sin requerir rediseno de esta migracion.
- [Riesgo] Reordenar el roadmap retrasa la primera pantalla visible → Se acepta el trade-off deliberadamente: una base de arquitectura y datos estable reduce retrabajo cuando se construyan alumnos, sesiones, salud y finanzas en paralelo.

## Migration Plan

1. Crear la estructura de carpetas por capas (`domain/`, `application/`, `infrastructure/`, `presentation/`) sin mover codigo existente (el proyecto aun no tiene capacidades implementadas).
2. Escribir `supabase/migrations/0001_init.sql` con las tablas del alcance MVP, la funcion `current_tenant_ids()` y las politicas RLS por tabla.
3. Ejecutar la migracion contra un proyecto Supabase de desarrollo y validar manualmente aislamiento cross-tenant con al menos dos tenants de prueba.
4. Dejar la migracion versionada en el repositorio como fuente de verdad; cualquier cambio de esquema posterior se hace con una migracion nueva, nunca editando `0001_init.sql` una vez aplicada en un entorno compartido.

Rollback: al ser la migracion inicial sobre un proyecto sin datos de produccion, el rollback es reemplazar el proyecto Supabase de desarrollo o correr un script inverso que elimine las tablas creadas; no aplica estrategia de migracion de datos existentes en esta etapa.

## Open Questions

- ¿La tabla `sessions` en este alcance representa solo sesiones manuales puntuales, o ya incluye el concepto de horario recurrente? No cambia el patron de RLS ni la arquitectura por capas; puede resolverse al detallar tasks.md de `instructor-operations`.
