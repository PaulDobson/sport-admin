## 1. Prerrequisitos

- [x] 1.1 Cerrar la tarea 9.3 de `improve-finance-plan-and-collections` (lint, typecheck, unitarias, SQL y e2e en verde). Verificar que `openspec status --change improve-finance-plan-and-collections` reporta todas las tareas completas.
  - Cierre forzado por decisión del usuario: no hay Docker para las pruebas SQL ni se autorizó ejecutar e2e. Lint y typecheck en verde; unitarias 671/672 (la única falla es la preexistente de `schedule/page.test.tsx`). El cambio `improve-finance-plan-and-collections` sigue con su tarea 9.3 abierta.

## 2. Primitivos del design system

- [x] 2.1 Reemplazar `--chart-1..5` en `src/presentation/styles/globals.css` por la paleta de marca (primary, info, warning, `#b38cff`, `#ff8fb1`). Verificar en `design-system-preview.html` que los cinco colores son distinguibles sobre el fondo.
- [x] 2.2 Agregar `ToneBadge` y `StatCard` (titulo, badge, valor `metric-number`, nota y `href` opcional con foco visible y `min-h-11`) en `primitives.tsx`. Verificar con tests en `primitives.test.tsx` de tonos, texto accesible y modo enlace.
- [x] 2.3 Mover `Panel` desde `dashboard-overview.tsx` a `primitives.tsx` y reemplazar `KpiCard` por `StatCard`. Verificar que `dashboard-overview.test.tsx` pasa sin cambios.
- [x] 2.4 Agregar `ResponsiveTable` (tabla en `lg:` y tarjetas en móvil con los mismos datos). Verificar con un test que ambas presentaciones renderizan las mismas filas y acciones.
- [x] 2.5 Agregar en `src/presentation/components/form-controls.tsx` (componente cliente) `SegmentedControl`, `ChipInput` (serializa los valores separados por `\n` en un input oculto) y `MoneyInput` (muestra el monto formateado y guarda el número crudo en un input oculto). Verificar con tests de teclado, de agregar y quitar etiquetas, y del valor enviado en el `FormData`.

## 3. Dominio de indicadores

- [x] 3.1 Exportar `cycleMonths` desde `projection.ts` y crear `src/domain/instructor-finance/dashboard.ts` con `periodVariation`, `collectionRate`, `monthlyEquivalent` y `countNewMemberships`. Verificar con tests unitarios que cubren el periodo anterior en 0 (resultado `null`) y cobrable sin cobros (resultado 0 %).
- [x] 3.2 Implementar `summarizePlanPerformance` agrupando por plan y moneda con el precio pactado, el equivalente mensual y la participación. Verificar con tests de un plan con precio editado y de un plan trimestral.
- [x] 3.3 Implementar `mergeRecentMovements` (pagos `paid` y pendientes, con estado pagado, pendiente o en mora, ordenados y limitados). Verificar con tests que excluyen pagos anulados o reembolsados.
- [x] 3.4 Implementar `cycleEnd(startsOn, cycle)` equivalente a `membership_cycle_end`. Verificar con tests de fechas límite (31 de enero, 29 de febrero y 31 de diciembre) contrastados con el resultado de la función SQL.

## 4. Puertos y adaptadores de lectura

- [x] 4.1 Agregar `planId` y `planName` a `ProjectionMembership` (las altas se cuentan por `startsOn` dentro del periodo, por eso no hace falta `createdAt`) y a `SupabaseFinancialProjectionRepository.loadMonth` (join a `membership_plans`). Actualizar el fake y verificar que los tests de proyección existentes siguen pasando.
- [x] 4.2 Agregar `PaymentRepositoryPort.listRecentMovements(tenantId, limit)` con su adaptador Supabase (joins a membresía, alumno y plan) y su fake. Verificar con un test del adaptador o con una prueba SQL que se respeta el aislamiento por tenant.
- [x] 4.3 Agregar `MembershipRepositoryPort.findStudentIdsWithCurrentMembership` y `findByActivationOperation` con sus adaptadores y fakes. Verificar con tests que solo consideran los estados `active`, `paused` y `past_due` y el `operation_id` del tenant.

## 5. Casos de uso

- [x] 5.1 Crear `getFinanceDashboard({ tenantId, period, onDate })` con las cargas en paralelo del periodo actual, el anterior, las cuentas y los movimientos. Verificar con tests usando fakes: los cuatro indicadores por moneda, la separación entre monedas, los movimientos y el rendimiento.
- [x] 5.2 Crear `assignMembership` (activación más pago opcional con `assignmentToken` e `operationId` deterministas, recuperación ante violación de unicidad y resultado de fallo parcial). Verificar con tests de asignación sin pago, con pago total, con pago parcial, de reintento idempotente, de alumno con membresía vigente, de plan archivado y de fallo del pago.

## 6. Creación guiada de planes

- [x] 6.1 Crear `plan-templates.ts` y extraer `PlanCard` (precio y ciclo, alumnos vigentes, equivalente mensual, beneficios y acción "Asignar" opcional). Verificar que `plan-catalog.test.tsx` pasa con la nueva tarjeta.
- [x] 6.2 Rediseñar `plan-form.tsx` con plantillas, `MoneyInput`, selector de moneda, `SegmentedControl` de ciclo con equivalente mensual, tolerancia con presets y explicación, `ChipInput` de beneficios y vista previa en vivo con `PlanCard`, manteniendo el mismo `FormData`. Verificar con tests de plantilla, equivalente anual, etiquetas y validación inline, y confirmar que `actions.ts` no cambia.
- [x] 6.3 Convertir Activos/Archivados en pestañas accesibles (`aria-current`) en la sección de planes. Verificar con un test en `page.test.tsx`.

## 7. Asignación unificada

- [x] 7.1 Crear `assignMembershipAction` y `searchAssignableStudentsAction` en `finance/actions.ts`, usando el tenant operativo y bloqueando el rol asistente. Verificar con tests de las acciones: permisos, mensaje de fallo parcial y revalidación de finanzas y alumnos.
- [x] 7.2 Crear `finance/assign-membership-sheet.tsx` con pasos condicionales (alumno, plan y confirmación), búsqueda con debounce, alumnos no elegibles con enlace a su membresía, tarjetas de plan, resumen con próximo vencimiento, conmutador de pago inicial y "Reintentar cobro". Verificar con tests de cada punto de partida, de la ausencia de planes y del fallo parcial.
- [x] 7.3 Integrar la hoja en la tarjeta del plan (`plan-catalog.tsx`), en la ficha del alumno (reemplazando `MembershipForm` en `students/[studentId]/page.tsx`) y en las filas de `student-list.tsx`. Verificar con los tests existentes de alumnos actualizados y con un test que confirma que el rol asistente no ve los accesos.
- [x] 7.4 Agregar "Asignar plan" a `quick-action-menu.tsx` y montar la hoja controlada por `?assign=1` en `dashboard/layout.tsx`. Verificar con `quick-action-menu.test.tsx` y con un test de apertura y cierre que limpia el parámetro.

## 8. Resumen financiero y dashboard

- [x] 8.1 Crear `finance/summary/finance-summary.tsx` con cuatro `StatCard` (cobrado y variación, por cobrar y mora, vigentes y altas, proyectado y tasa de cobro), cada uno enlazando a su vista filtrada, más el bloque "Requiere acción hoy". Verificar con un test de valores, tonos y destinos de los enlaces.
- [x] 8.2 Agregar el panel "Movimientos recientes" (`ResponsiveTable`) y el panel "Rendimiento por plan" (lista con barra de participación y porcentaje textual) en la grilla `lg:grid-cols-12` (7/5). Verificar con un test de estados vacíos con acción de crear o asignar.
- [x] 8.3 Agregar el selector de periodo (`type="month"`) y el selector de moneda cuando hay varias, ambos reflejados en la URL, y conectar `page.tsx` a `getFinanceDashboard`. Verificar con `page.test.tsx` que el cambio de periodo recalcula y conserva los parámetros.
- [x] 8.4 Agregar el bloque "Finanzas del mes" en `DashboardOverview` mediante la prop opcional `finance`, cargada en `dashboard/page.tsx` solo para roles con gestión. Verificar con `dashboard-overview.test.tsx` que se muestra para el instructor y se oculta para el asistente.

## 9. Cobros

- [x] 9.1 Reemplazar el formulario de filtros por chips de estado con contador y mover las fechas a una hoja inferior en móvil, manteniendo la URL. Verificar con un test de chip activo y conservación de filtros.
- [x] 9.2 Mostrar en `LifecycleForm` el efecto previo de cada acción (nueva fecha de vencimiento al renovar con `cycleEnd`, fecha efectiva en las demás). Verificar con un test en `collection-list.test.tsx`.

## 10. Verificación integral

- [x] 10.1 Agregar un e2e de Playwright del flujo crear plan con plantilla → asignar con pago parcial desde la acción rápida → ver el saldo en Cobros y los indicadores actualizados en Resumen y en el dashboard, en viewports de 375 px y 1280 px.
- [x] 10.2 Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm test:e2e`, y `openspec validate streamline-instructor-billing-experience --strict`. Verificar que todo pasa.
  - Cierre forzado por decisión del usuario: lint, typecheck y `openspec validate --strict` en verde; unitarias 671/672 (falla previa ajena en `schedule/page.test.tsx`); `pnpm test:e2e` no ejecutado (sin entorno de prueba).
