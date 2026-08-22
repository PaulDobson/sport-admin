## 1. Estructura de arquitectura por capas

- [ ] 1.1 Crear la estructura de carpetas `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/` y verificar que el proyecto compila sin errores de import
- [ ] 1.2 Documentar en un README de arquitectura (breve) la regla de dependencia entre capas y verificar que un revisor pueda ubicar donde va cada tipo de codigo nuevo
- [ ] 1.3 Configurar linting (regla de import boundaries, ej. `eslint-plugin-boundaries` o equivalente) y verificar que un import invalido entre capas falla el lint

## 2. Modelo de datos y migracion Supabase

- [ ] 2.1 Escribir `supabase/migrations/0001_init.sql` con las tablas `tenants`, `tenant_memberships`, `locations`, `students`, `sessions`, `session_attendance`, `membership_plans`, `student_memberships` y verificar que el script corre sin errores contra un proyecto Supabase vacio
- [ ] 2.2 Implementar la funcion `current_tenant_ids()` (SECURITY DEFINER, stable) y verificar con una consulta manual que devuelve solo los tenants del usuario autenticado
- [ ] 2.3 Habilitar RLS y definir politicas SELECT/INSERT/UPDATE/DELETE por tabla de negocio usando `current_tenant_ids()` y verificar que `pg_policies` lista las politicas esperadas para cada tabla
- [ ] 2.4 Crear datos de prueba con al menos dos tenants distintos y verificar manualmente (o con un script de prueba) que ningun tenant puede leer o escribir recursos del otro

## 3. Cierre de la base tecnica

- [ ] 3.1 Ejecutar `openspec validate define-technical-foundation --strict` y verificar que la salida no reporta errores
- [ ] 3.2 Confirmar en el roadmap de `build-sport-admin-saas` que las capacidades de negocio del MVP quedan documentadas como dependientes de esta base (arquitectura + migracion) antes de iniciar su implementacion
