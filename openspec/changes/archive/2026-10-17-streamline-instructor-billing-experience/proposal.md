## Why

El módulo de finanzas ya cubre planes, membresías, pagos parciales y cobranza, pero el recorrido del instructor sigue fragmentado: asignar un plan solo es posible desde la pestaña de membresía del alumno, cobrar la inscripción exige navegar a otra pantalla y buscar de nuevo al alumno, el formulario de planes es un conjunto de campos técnicos sin guía, y ni el resumen de finanzas ni el dashboard principal responden de un vistazo cuánto se cobró, cuánto se adeuda y qué planes rinden. Este cambio ordena la experiencia en torno al flujo real del gimnasio (crear plan → asignar → cobrar) y entrega un tablero financiero con el lenguaje visual de consola de la referencia aprobada, sin modificar el modelo de datos.

## What Changes

**Creación guiada de planes**

- Plantillas de partida (mensual, trimestral, semestral, anual) que prellenan el formulario y siguen siendo editables.
- Formulario guiado: precio con formato de moneda, moneda elegida de una lista cerrada, ciclo como control segmentado con su equivalente mensual visible, días de tolerancia explicados con valores sugeridos y beneficios como etiquetas.
- Vista previa en vivo de la tarjeta del plan mientras se edita.
- Tarjeta de plan enriquecida con alumnos vigentes, ingreso mensual equivalente y acción directa "Asignar".

**Asignación unificada de plan con cobro opcional**

- Un único flujo de asignación (alumno → plan → inicio y cobro) disponible desde la acción rápida global, la tarjeta del plan, la ficha del alumno y la lista de alumnos, que omite los pasos ya conocidos según el punto de entrada.
- Selección de plan mediante tarjetas con precio formateado, ciclo y próximo vencimiento calculado antes de confirmar.
- Opción "Registrar pago ahora" que, en la misma confirmación, registra el pago inicial (monto prellenado con el precio, método y referencia) sobre la membresía recién creada, de forma idempotente ante reintentos.
- Los alumnos con una membresía vigente se identifican en el flujo y no pueden recibir una segunda asignación; se ofrece ir a gestionar la membresía existente.

**Tablero financiero con lenguaje de consola**

- Resumen de finanzas con cuatro indicadores: cobrado del mes (con variación frente al mes anterior), por cobrar (con alumnos en mora), membresías vigentes (con altas del mes) y proyectado del mes (con tasa de cobro). Cada indicador lleva una etiqueta de tono semántico y abre la vista filtrada correspondiente.
- Panel "Movimientos recientes" con fecha, alumno, plan, monto y estado (pagado, pendiente, en mora), en tabla en escritorio y tarjetas en móvil.
- Panel "Rendimiento por plan" con alumnos vigentes, ingreso mensual equivalente y participación de cada plan.
- Selector de período visible en el resumen y totales correctos cuando el tenant opera con más de una moneda.
- Bloque compacto "Finanzas del mes" en el dashboard principal con cobrado y por cobrar y acceso a finanzas.

**Cobros más claros**

- Filtros de estado como chips con contador; los filtros de fecha pasan a una hoja inferior en móvil.
- Las acciones de ciclo de vida muestran su efecto antes de confirmar (por ejemplo, la nueva fecha de vencimiento al renovar).

**Fuera de alcance (decisión explícita)**

- No se incorporan nómina de instructores, gastos ni utilidad operativa: requieren entidades que el modelo no tiene.
- No se agrega integración con canales externos de mensajería.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `instructor-finance`: se añaden requisitos de asignación de plan con pago inicial opcional e idempotente, de indicadores financieros del período (cobrado y variación, por cobrar y mora, vigentes y altas, proyectado y tasa de cobro), de movimientos recientes con alumno y plan, y de rendimiento por plan.
- `product-experience-shell`: se añaden requisitos del flujo unificado de asignación accesible desde varios puntos de entrada, de la creación guiada de planes y del tablero financiero responsive (resumen de finanzas y bloque en el dashboard principal).
- `design-system`: se añaden requisitos de tarjetas de indicador con etiqueta de tono, tabla responsive que degrada a tarjetas en móvil y paleta de gráficos alineada con la marca.

## Impact

**Base de datos**

- Sin cambios de esquema. Se reutilizan `membership_plans`, `student_memberships`, `student_membership_payments`, `student_membership_adjustments` y las RPC existentes de activación y registro de pago. Los movimientos recientes y el rendimiento por plan se obtienen mediante consultas de lectura sobre las tablas actuales.

**Dominio y aplicación**

- `src/domain/instructor-finance/`: funciones puras para variación entre períodos, tasa de cobro, equivalente mensual de un plan y agregación por plan.
- `src/application/instructor-finance/`: nuevo caso de uso de tablero financiero y caso de uso de asignación con pago inicial opcional; nuevo método de lectura de movimientos recientes en el puerto correspondiente.

**Presentación**

- `src/app/dashboard/finance/*`: resumen, catálogo y formulario de planes, cobros y nueva hoja de asignación.
- `src/app/dashboard/students/*`: puntos de entrada a la asignación en ficha y lista.
- `src/app/dashboard/dashboard-overview.tsx` y `page.tsx`: bloque "Finanzas del mes".
- `src/presentation/components/primitives.tsx`, `quick-action-menu.tsx` y `src/presentation/styles/globals.css`: nuevos primitivos (indicador, etiqueta de tono, tabla responsive, control segmentado, entrada de etiquetas, entrada monetaria) y paleta de gráficos.

**Dependencias**

- Requiere que `improve-finance-plan-and-collections` quede cerrado (verificación final pendiente) antes de implementar.
