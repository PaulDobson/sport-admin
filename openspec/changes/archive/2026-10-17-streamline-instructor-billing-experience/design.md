## Context

Ver `proposal.md` - Why. Estado relevante de cada capa:

- **Base de datos**:
  - `student_memberships_one_current_idx` garantiza una sola membresía vigente (`active`, `paused`, `past_due`) por alumno y tenant.
  - `activate_student_membership(...)` recibe `target_operation_id`, pero **no es idempotente**: no consulta operaciones previas. Un reintento solo falla por el índice único.
  - `record_membership_payment(...)` **sí es idempotente** por `(tenant, operation_id)` con advisory lock y acepta el método de pago (migración 0029).
  - No hay tablas de nómina, gastos ni utilidad, y este cambio no las agrega.
- **Dominio y aplicación**:
  - `calculateMonthlyFinancialProjections`, `deriveCollectionItems`, `summarizeCollections` y `filterMembershipFollowUps` existen y tienen tests.
  - `FinancialProjectionRepositoryPort.loadMonth` entrega memberships, payments y adjustments del mes, pero `ProjectionMembership` no incluye el plan.
  - `PaymentRepositoryPort.listPaymentsByPeriod` existe y no se usa en la UI.
- **Presentación**:
  - `src/app/dashboard/finance/page.tsx` ya tiene secciones en la URL (`section`, `period`, `status`, `from`, `to`, `archived`) y bottom sheets para cobrar y cambiar el estado de la membresía.
  - La asignación vive en `students/[studentId]/page.tsx` y solo se muestra si `listCurrentMemberships` está vacío.
  - `dashboard-overview.tsx` define `KpiCard` y `Panel` locales con el mismo lenguaje visual que la referencia.
  - `--chart-1..5` en `globals.css` son grises.
- **Dependencia**: la tarea 9.3 de `improve-finance-plan-and-collections` sigue abierta.

## Goals / Non-Goals

**Goals:**

- Cero migraciones de esquema. Todo se construye sobre tablas y RPC existentes.
- Asignar y cobrar en una sola confirmación, a prueba de reintentos y dobles envíos.
- Que los cálculos de los indicadores sean funciones puras del dominio, testeables sin Supabase.
- Que los primitivos visuales se reutilicen entre finanzas, alumnos y el dashboard principal.

**Non-Goals:**

- Nómina, gastos, utilidad o cualquier entidad nueva.
- Gráficos históricos de varios meses. Solo se compara con el mes anterior.
- Conversión entre monedas.
- Cambiar de plan en una sola acción. Se sigue haciendo cancelar o vencer la membresía actual y luego asignar.

## Decisions

### D1. Asignación con cobro: orquestación en la aplicación, no una RPC nueva

Se crea el caso de uso `assignMembership` en `manage-membership.ts`, que encadena `memberships.create` y, si corresponde, `payments.record`.

**Alternativa descartada:** una RPC `activate_membership_with_payment` en una sola transacción. Es atómica, pero requiere migración, duplica lógica de las dos RPC actuales y amplía la superficie `security definer`. El spec acepta explícitamente que la membresía quede creada si el pago falla.

**Idempotencia sin migración:**

- Al abrir el flujo, el cliente genera un `assignmentToken` (UUID) y lo envía en cada confirmación.
- `operationId` de la activación = `assignmentToken`. `operationId` del pago = `collectionOperationId([tenantId, assignmentToken, "initial-payment"])`, con el helper determinista existente.
- Reintento: si la activación falla por violación de unicidad, el caso de uso busca la membresía vigente del alumno. Si coincide en `planId` y `startsOn` y existe un `membership_activated` con ese `operation_id` en `instructor_financial_events`, se trata como la misma asignación y se continúa con el pago, que es idempotente por diseño. Si no coincide, se devuelve el error "el alumno ya tiene una membresía vigente".
- Para esto se agrega al puerto `MembershipRepositoryPort.findByActivationOperation(tenantId, operationId)`, una lectura sobre `instructor_financial_events` que RLS ya expone al tenant.

**Fallo parcial:** si el pago lanza un error después de crear la membresía, el caso de uso devuelve `{ membership, payment: null, paymentError }`. La UI muestra el aviso de pago pendiente con un botón "Reintentar cobro", que reutiliza el mismo `assignmentToken` y por lo tanto el mismo `operationId` del pago.

### D2. Indicadores como funciones puras más un caso de uso agregador

Se agrega `src/domain/instructor-finance/dashboard.ts` con:

- `periodVariation(current, previous)`: devuelve `number | null`, y `null` cuando `previous` es 0.
- `collectionRate(collected, collectible)`: devuelve 0 si `collected` es 0 y `collectible` es mayor que 0.
- `monthlyEquivalent(price, cycle)`: reutiliza `cycleMonths`, que pasa a exportarse desde `projection.ts`.
- `summarizePlanPerformance(memberships)`: agrupa por plan y moneda, y calcula alumnos, equivalente mensual y participación.
- `countNewMemberships(memberships, period)`.

El caso de uso `getFinanceDashboard({ tenantId, period, onDate })` ejecuta en paralelo:

1. `financialProjections.loadMonth(period)`
2. `financialProjections.loadMonth(previousPeriod)`
3. `collections.listAccounts`
4. `payments.listRecentMovements`

Con esos datos compone los 4 indicadores por moneda, los movimientos y el rendimiento.

**Alternativa descartada:** vistas SQL o RPC de agregación. Son más rápidas a escala, pero requieren migración, y el volumen de un gimnasio (cientos de membresías) no lo justifica.

### D3. Extensiones de puertos (solo lectura, sin cambios de esquema)

- `ProjectionMembership` suma `planId`, `planName` y `createdAt`. Su adaptador Supabase hace un `select` con un join a `membership_plans(name)`.
- `PaymentRepositoryPort.listRecentMovements(tenantId, limit)` devuelve pagos `paid` con `studentName` y `planName`, mediante joins a `student_memberships`, `students` y `membership_plans`. Los pendientes salen de `deriveCollectionItems`, que ya trae alumno y plan. Ambos se combinan y se ordenan en la función pura `mergeRecentMovements`.
- `StudentRepositoryPort.listForAdministration` ya acepta `search`. La elegibilidad se resuelve con una lectura nueva, `MembershipRepositoryPort.findStudentIdsWithCurrentMembership(tenantId)`.
- Los fakes en `application/instructor-finance/testing/` se actualizan junto con los puertos.

### D4. Componente de asignación único con pasos condicionales

`AssignMembershipSheet` (cliente) recibe `initialStudent?`, `initialPlan?`, `plans` y `canManage`, y calcula sus pasos con `steps = [!initialStudent && "student", !initialPlan && "plan", "confirm"].filter(Boolean)`.

- La búsqueda de alumnos usa una server action `searchAssignableStudentsAction(query)` con debounce de 250 ms. Devuelve `{ id, name, hasCurrentMembership, currentMembershipHref }`.
- En móvil se presenta en el `BottomSheet` existente. En escritorio (`lg:`) se muestra como un panel lateral derecho del mismo componente. Así hay un solo árbol de estado.
- El próximo vencimiento que se muestra antes de confirmar se calcula en el cliente con una función pura `cycleEnd(startsOn, cycle)`, que debe replicar `membership_cycle_end`. Un test con casos de fin de mes asegura que coincidan.

**Alternativa descartada:** una ruta dedicada `/dashboard/finance/assign`. Rompe el contexto de origen, y la spec exige no abandonar la pantalla.

**Puntos de entrada:**

- `quick-action-menu.tsx`: nuevo ítem "Asignar plan". Como el menú está en el shell, la hoja se monta mediante un parámetro `?assign=1` que lee un componente montado en `dashboard/layout.tsx`.
- `plan-catalog.tsx`: botón "Asignar" en cada tarjeta activa.
- `students/[studentId]/page.tsx`: reemplaza `MembershipForm`.
- `student-list.tsx`: acción por fila.

### D5. Formulario de plan guiado

Se mantiene `createPlanAction` y `updatePlanAction` con el mismo `FormData`. Los controles nuevos escriben en `input[type=hidden]`, de modo que las acciones y sus tests no cambian:

- Precio: `MoneyInput` muestra el monto formateado y conserva el número crudo.
- Ciclo: `SegmentedControl`.
- Beneficios: `ChipInput` serializa los beneficios como líneas separadas por `\n`, el formato que ya espera `readBenefits`.

La moneda pasa a un `<select>` con `["CLP", "USD", "EUR"]`, con CLP por defecto según `set-platform-currency-clp`. Las plantillas son un arreglo constante en `plan-templates.ts`. La vista previa reutiliza el mismo `PlanCard` del catálogo, alimentado con el estado del formulario.

### D6. Primitivos del design system

En `primitives.tsx`:

- `StatCard`: el `KpiCard` actual, generalizado con `tone`, `badge`, `note` y `href`.
- `Panel`, movido desde `dashboard-overview.tsx`.
- `ToneBadge`.
- `ResponsiveTable`: recibe `columns` y `rows` más un `renderCard(row)`, y alterna con `hidden lg:table` / `lg:hidden`.
- `SegmentedControl`, `ChipInput` y `MoneyInput` van en `form-controls.tsx` (`"use client"`), porque tienen estado y `primitives.tsx` se importa desde componentes de servidor.

`dashboard-overview.tsx` pasa a importar `StatCard` y `Panel` sin cambiar su resultado visual. En `globals.css`, `--chart-1..5` quedan como `--primary`, `--info`, `--warning`, `#b38cff` y `#ff8fb1`. Se descartó `--success` para `--chart-5` porque es indistinguible de `--primary` en barras contiguas.

### D7. Composición del resumen

`finance/page.tsx` delega la sección Resumen en `finance/summary/finance-summary.tsx` (server), que consume `getFinanceDashboard`.

- **Layout:** `grid grid-cols-2 gap-3 lg:grid-cols-4` para los indicadores, y `grid gap-6 lg:grid-cols-12` con movimientos en `lg:col-span-7` y rendimiento en `lg:col-span-5`.
- **Moneda:** el parámetro `currency` de la URL elige la moneda. Por defecto se usa la de mayor cobrable.
- **Selector de período:** un `<input type="month">` dentro de un `form method="get"`.
- **Dashboard principal:** `dashboard/page.tsx` llama a `getFinanceDashboard` solo si el rol puede gestionar, y pasa un resumen compacto a `DashboardOverview` mediante una prop opcional `finance`.

## Risks / Trade-offs

- [La asignación y el pago no son atómicos] → El spec lo acepta. La UI muestra el saldo pendiente con "Reintentar cobro", y el pago es idempotente por `operationId`.
- [El reintento de activación depende de leer `instructor_financial_events`] → La lectura se filtra por tenant y `operation_id`, ambos indexados por las restricciones existentes. Si no se encuentra el evento, se trata como conflicto real, que es la opción segura.
- [Divergencia entre `cycleEnd` del cliente y `membership_cycle_end` en SQL] → Test unitario con fechas límite (31 de enero, 29 de febrero y fin de año). Tras confirmar, la UI muestra la fecha que devuelve el servidor.
- [Cuatro consultas en el resumen y el dashboard principal] → Se ejecutan en paralelo y con límites (`limit` en movimientos). Si la latencia preocupa, se puede cachear por request con `cache()` de React.
- [Mover `KpiCard`/`Panel` podría alterar el dashboard actual] → Los tests de `dashboard-overview.test.tsx` deben pasar sin cambios de snapshot ni de roles.

## Migration Plan

No hay migración de datos ni de esquema. Se despliega en orden: primitivos → dominio y puertos → caso de uso → UI. Cada fase es retrocompatible. Para revertir basta con volver al commit anterior, porque no hay estado persistente nuevo.

## Open Questions

- Si "Reintentar cobro" del fallo parcial debe quedar también en Cobros más allá de la sesión actual. Ya ocurre de forma natural, porque el saldo aparece en la lista de pendientes. No cambia el diseño.
