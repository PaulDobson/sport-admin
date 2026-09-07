## 1. Esquema de datos y RPC

- [x] 1.1 Crear migración que añada la columna `method` a `student_membership_payments` con valores `cash`, `transfer`, `card` y `other`, `not null default 'other'`, y verificar que la migración aplica sobre una base con pagos existentes sin errores de restricción
- [x] 1.2 Reemplazar `record_membership_payment` por una firma que acepte el método de cobro y elimine la firma anterior en la misma migración, y verificar con una prueba SQL que registra el método, mantiene la idempotencia por `operation_id` y que la firma antigua ya no existe
- [x] 1.3 Extender `record_membership_payment` para resolver, en la misma transacción, las notificaciones de cobranza abiertas de la membresía cuando el saldo resultante queda en cero, y verificar con una prueba SQL que el aviso pasa a `resolved` tras el pago que salda y permanece pendiente tras un pago parcial
- [x] 1.4 Crear la función de evaluación de pendientes y renovaciones que emite eventos de actividad con `operation_id` determinista por membresía, tipo y período, y verificar con una prueba SQL que la segunda ejecución dentro del mismo período no duplica avisos y que solo se crea entrega por canal interno
- [x] 1.5 Verificar con una prueba SQL de RLS que un usuario de otro tenant no puede leer ni resolver los avisos de cobranza ni los pagos con método de otro tenant

## 2. Dominio

- [x] 2.1 Añadir el método de cobro al modelo de pago y verificar que los tests de `src/domain/instructor-finance/payment.test.ts` cubren el nuevo atributo sin alterar el cálculo de saldo existente
- [x] 2.2 Incorporar beneficios y estado al modelo de plan de membresía y verificar con tests unitarios que un plan archivado no se considera asignable
- [x] 2.3 Añadir la derivación de pendientes de pago a partir de membresías vigentes con saldo positivo, incluyendo antigüedad respecto de los días de gracia, y verificar con tests unitarios los casos de saldo cero, saldo parcial, membresía pausada y membresía cancelada
- [x] 2.4 Verificar con tests unitarios que un pago parcial reduce el saldo sin cerrar el pendiente y que varios pagos acumulados que cubren el importe pactado lo dejan en cero

## 3. Puertos y casos de uso

- [x] 3.1 Ampliar `membership-repository-port` con listar todos los planes del tenant, buscar plan por identificador, actualizar, archivar y reactivar, y verificar que el repositorio falso de pruebas implementa el puerto sin errores de tipos
- [x] 3.2 Añadir a `manage-membership` los casos de uso de catálogo de planes con validación de entrada y verificar con tests que rechazan importes negativos, monedas inválidas y días de gracia fuera de rango
- [x] 3.3 Ampliar `payment-repository-port` y `manage-payment` con el método de cobro y verificar con tests que el registro exige un método válido y conserva la validación de moneda coincidente
- [x] 3.4 Añadir el caso de uso de listado de pendientes de pago con filtros por estado y rango de fechas, y verificar con tests que ordena por antigüedad y excluye membresías sin saldo
- [x] 3.5 Añadir el caso de uso de cobranza por período con filtro por método de cobro y verificar con tests que separa importe cobrado de importe pendiente sin sumar monedas distintas

## 4. Infraestructura

- [x] 4.1 Implementar en `supabase-membership-repository` el listado completo de planes con cantidad de membresías asociadas, la actualización, el archivado y la reactivación, y verificar contra la base local que un plan archivado deja de aparecer entre los asignables
- [x] 4.2 Registrar en `audit_log` mediante `AuditLogPort` la edición, el archivado y la reactivación de un plan, y verificar que la entrada queda con tenant, actor, acción y entidad correctos
- [x] 4.3 Propagar el método de cobro en `supabase-payment-repository` hacia la RPC y desde la lectura del historial, y verificar contra la base local que un pago registrado devuelve su método
- [x] 4.4 Implementar el acceso a pendientes de pago reutilizando el cálculo de saldo del dominio y verificar contra la base local que los importes coinciden con el historial de pagos y ajustes
- [x] 4.5 Regenerar los tipos de base de datos y verificar que `pnpm tsc --noEmit` no reporta errores

## 5. Superficie de planes

- [x] 5.1 Corregir las acciones de servidor de finanzas para usar el tenant operativo activo en lugar del primer tenant del usuario, y verificar con un test que un usuario con dos membresías operativas crea el plan en el tenant activo
- [x] 5.2 Implementar la sección de planes con el listado de planes activos, sus atributos y la cantidad de membresías asociadas, y verificar con un test de componente que un plan recién creado aparece en el listado
- [x] 5.3 Implementar la edición de plan con la advertencia explícita sobre las membresías vigentes antes de confirmar, y verificar con un test de componente que la advertencia se muestra cuando el plan tiene membresías asociadas
- [x] 5.4 Implementar el archivado y la reactivación de planes con acceso separado a los archivados, y verificar con un test de componente que el plan archivado desaparece de los activos y sigue consultable
- [x] 5.5 Mover la creación de plan detrás de una acción explícita dentro de la sección de planes y verificar que el formulario ya no se renderiza al inicio del contenido

## 6. Superficie de cobros

- [x] 6.1 Implementar la sección de cobros con la lista de pendientes derivados, sus filtros por estado y rango de fechas, y verificar con un test de componente que un pendiente saldado deja de listarse
- [x] 6.2 Implementar la acción de registro de cobro en hoja inferior con importe propuesto igual al saldo, fecha, método, referencia y ajustes opcionales, y verificar con un test de componente que el importe llega prellenado y es editable
- [x] 6.3 Conectar la acción de cobro con la generación de `operationId` en servidor y verificar con un test que un doble envío no duplica el pago
- [x] 6.4 Implementar la vista de detalle de membresía con importe pactado, ajustes, historial de pagos con método y saldo resultante, y verificar con un test de componente que los pagos parciales aparecen en orden y el saldo cuadra
- [x] 6.5 Implementar las acciones de pausar, renovar, expirar y cancelar con confirmación explícita para las destructivas, y verificar con un test de componente que una transición no válida no se ofrece
- [x] 6.6 Exponer el saldo y el acceso al cobro desde la ficha del alumno y verificar con un test de componente que el acceso aparece solo para roles autorizados

## 7. Resumen y navegación por secciones

- [x] 7.1 Reorganizar `/dashboard/finance` en secciones de resumen, cobros y planes con la sección activa, el período y los filtros reflejados en la URL, y verificar con un test que recargar conserva sección, período y filtros
- [x] 7.2 Rediseñar el resumen con una métrica principal de cobro del período e indicadores secundarios de mora y renovaciones próximas, y verificar con un test de componente la jerarquía de la métrica principal
- [x] 7.3 Hacer que los indicadores de mora y de renovaciones próximas naveguen a la sección de cobros con el filtro aplicado, y verificar con un test que el enlace incluye el filtro correspondiente
- [x] 7.4 Ajustar los estados vacíos por sección con una acción útil y verificar con un test de componente que la navegación y el cambio de período siguen disponibles sin datos
- [x] 7.5 Verificar en un viewport móvil que el contenido accionable aparece antes que cualquier formulario o bloque de filtros

## 8. Avisos internos

- [x] 8.1 Conectar la evaluación de pendientes y renovaciones a la ruta de proceso de notificaciones existente y verificar que una ejecución genera los avisos esperados y la siguiente no los duplica
- [x] 8.2 Verificar con una prueba SQL que el aviso de cobranza publica alumno, membresía, importe adeudado, moneda y fecha de referencia, de modo que la superficie que lo consuma pueda dirigir al registro del cobro. La pantalla del centro de actividad queda fuera de alcance
- [x] 8.3 Verificar que los nuevos tipos de evento no producen entregas por correo ni push al no existir preferencias habilitadas para ellos

## 9. Verificación integral

- [x] 9.1 Añadir un caso extremo a extremo que cubra crear plan, asignar membresía, registrar dos pagos parciales y comprobar que el pendiente desaparece y el aviso queda resuelto
- [x] 9.2 Añadir un caso extremo a extremo de accesibilidad en finanzas que recorra las secciones y las acciones de cobro con teclado y verificar que el foco es visible y las hojas se cierran sin perderlo
- [ ] 9.3 Ejecutar `pnpm lint`, `pnpm tsc --noEmit`, la suite de pruebas unitarias, las pruebas SQL y la suite extremo a extremo, y verificar que todas pasan
