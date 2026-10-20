## ADDED Requirements

### Requirement: Flujo unificado de asignacion de plan

La experiencia SHALL ofrecer un unico flujo de asignacion de plan en tres pasos (alumno, plan, inicio y cobro) accesible desde la accion rapida global, desde la tarjeta de cada plan activo, desde la ficha del alumno y desde la lista de alumnos. El flujo SHALL omitir los pasos cuyo dato ya es conocido por el punto de entrada. La seleccion de alumno SHALL ofrecer busqueda por nombre e identificar a los alumnos con membresia vigente como no elegibles con acceso a gestionar su membresia. La seleccion de plan SHALL presentar los planes activos como opciones con nombre, precio formateado, ciclo y beneficios principales. Antes de confirmar, el flujo SHALL mostrar el precio, la fecha de inicio y el proximo vencimiento calculado, y SHALL permitir activar el registro de un pago inicial con monto prellenado con el precio del plan. En movil el flujo SHALL presentarse como hoja inferior con acciones alcanzables con una mano; en escritorio SHALL presentarse como panel o dialogo sin abandonar la pantalla de origen. Usuarios sin permiso de gestion MUST NOT ver los puntos de entrada.

#### Scenario: Asignar desde la accion rapida

- **WHEN** el instructor abre la accion rapida y elige asignar plan
- **THEN** el flujo comienza en la seleccion de alumno y continua con plan e inicio y cobro

#### Scenario: Asignar desde la tarjeta del plan

- **WHEN** el instructor activa "Asignar" en la tarjeta de un plan
- **THEN** el flujo comienza en la seleccion de alumno con ese plan ya elegido

#### Scenario: Asignar desde la ficha del alumno

- **WHEN** el instructor asigna desde la ficha de un alumno sin membresia vigente
- **THEN** el flujo comienza en la seleccion de plan con el alumno ya elegido

#### Scenario: Alumno con membresia vigente

- **WHEN** el instructor busca un alumno que ya tiene una membresia vigente
- **THEN** el alumno aparece marcado como no elegible y el flujo ofrece ir a su membresia actual en lugar de continuar

#### Scenario: Sin planes activos

- **WHEN** el instructor inicia la asignacion y el tenant no tiene planes activos
- **THEN** el flujo informa la situacion y ofrece crear un plan sin perder el alumno seleccionado

#### Scenario: Confirmacion con cobro

- **WHEN** el instructor confirma una asignacion con pago inicial
- **THEN** ve la confirmacion de la membresia creada y del pago registrado con el saldo resultante, y los indicadores y listas afectados se actualizan

#### Scenario: Rol asistente

- **WHEN** un usuario con rol asistente navega finanzas, alumnos o la accion rapida
- **THEN** no ve puntos de entrada a la asignacion de planes

### Requirement: Creacion guiada de planes

La creacion y edicion de planes SHALL ofrecer plantillas de partida para ciclos mensual, trimestral, semestral y anual que prellenan el formulario sin bloquear su edicion. El formulario SHALL presentar el precio con formato de la moneda seleccionada, la moneda como opcion de una lista cerrada de codigos validos, el ciclo como control segmentado acompanado de su equivalente mensual, los dias de tolerancia con una explicacion de su efecto sobre la mora y valores sugeridos, y los beneficios como etiquetas que se agregan y quitan individualmente. Mientras se edita, el sistema SHALL mostrar una vista previa de la tarjeta del plan tal como aparecera en el catalogo. La tarjeta del plan en el catalogo SHALL mostrar precio y ciclo, alumnos vigentes, ingreso mensual equivalente y una accion "Asignar" para planes activos.

#### Scenario: Usar una plantilla

- **WHEN** el instructor elige la plantilla trimestral al crear un plan
- **THEN** el formulario queda con ciclo trimestral y valores sugeridos editables, y la vista previa los refleja

#### Scenario: Equivalente mensual

- **WHEN** el instructor ingresa un precio con ciclo anual
- **THEN** el formulario muestra el equivalente mensual del precio en la moneda elegida

#### Scenario: Beneficios como etiquetas

- **WHEN** el instructor agrega y luego quita un beneficio
- **THEN** la lista de etiquetas y la vista previa reflejan el cambio y solo se guardan los beneficios presentes

#### Scenario: Validacion

- **WHEN** el instructor intenta guardar sin nombre o con precio negativo
- **THEN** el formulario indica el campo con error junto a el y no envia el plan

### Requirement: Tablero financiero responsive

La seccion de resumen de finanzas SHALL presentar cuatro tarjetas de indicador (cobrado del mes, por cobrar, membresias vigentes y proyectado del mes), cada una con titulo, monto o cantidad principal, nota de contexto y una etiqueta de tono semantico (variacion, atencion, vigentes, tasa de cobro), y cada tarjeta SHALL abrir la vista filtrada correspondiente. Debajo SHALL presentar el panel de movimientos recientes y el panel de rendimiento por plan. En movil los indicadores SHALL disponerse en una grilla de dos columnas seguida de los pendientes que requieren accion hoy y de los paneles apilados, con los movimientos como tarjetas. En escritorio los indicadores SHALL disponerse en una fila y los paneles en dos columnas, con los movimientos como tabla de columnas fecha, alumno, plan, monto y estado. El resumen SHALL ofrecer un selector de periodo reflejado en la URL. Cuando existan varias monedas, el resumen SHALL permitir elegir la moneda mostrada sin mezclar montos. El dashboard principal SHALL incluir un bloque compacto de finanzas del mes con cobrado y por cobrar y un acceso al resumen, visible solo para roles con permiso de gestion financiera.

#### Scenario: Resumen en movil

- **WHEN** el instructor abre el resumen de finanzas en un viewport movil
- **THEN** ve los cuatro indicadores en dos columnas, luego los pendientes que requieren accion y despues los paneles de movimientos y rendimiento por plan

#### Scenario: Resumen en escritorio

- **WHEN** el instructor abre el resumen en un viewport de escritorio
- **THEN** ve los cuatro indicadores en una fila y los paneles de movimientos y rendimiento por plan lado a lado

#### Scenario: Indicador por cobrar

- **WHEN** el instructor activa la tarjeta por cobrar
- **THEN** se abre la seccion de cobros filtrada por membresias en mora

#### Scenario: Cambio de periodo

- **WHEN** el instructor elige otro mes en el selector de periodo
- **THEN** los indicadores, movimientos y rendimiento se recalculan para ese mes y la URL conserva el periodo

#### Scenario: Bloque en el dashboard principal

- **WHEN** un instructor con permiso de gestion abre el dashboard principal
- **THEN** ve el bloque de finanzas del mes con cobrado y por cobrar y puede abrir el resumen de finanzas

#### Scenario: Periodo sin datos

- **WHEN** el periodo elegido no tiene membresias ni pagos
- **THEN** los indicadores muestran cero, los paneles muestran un estado vacio con la accion de crear o asignar un plan y el selector de periodo sigue disponible

### Requirement: Cobros con filtros compactos y efecto previsible

La seccion de cobros SHALL presentar los estados como chips con contador de pendientes por estado, y en movil SHALL ubicar los filtros de fecha en una hoja inferior en lugar de anteponerlos a la lista. Las acciones de ciclo de vida SHALL describir su efecto antes de confirmar, incluyendo la nueva fecha de vencimiento al renovar y la fecha efectiva al pausar, vencer o cancelar.

#### Scenario: Chip de estado

- **WHEN** el instructor selecciona el chip de mora
- **THEN** la lista muestra solo pendientes en mora, el chip queda marcado como activo y la URL conserva el filtro

#### Scenario: Previsualizar renovacion

- **WHEN** el instructor elige renovar una membresia
- **THEN** ve la nueva fecha de vencimiento calculada antes de confirmar
