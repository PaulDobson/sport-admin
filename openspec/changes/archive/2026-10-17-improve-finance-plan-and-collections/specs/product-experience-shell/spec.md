## ADDED Requirements

### Requirement: Superficie de finanzas orientada a la accion en movil

La superficie de finanzas SHALL organizarse en secciones navegables de resumen, cobros y planes, cuyo estado activo, periodo y filtros SHALL quedar reflejados en la URL para poder compartirse, recargarse y volver atras sin perder el contexto. En viewport movil, el sistema SHALL presentar primero el contenido accionable y SHALL NOT anteponer formularios de creacion ni un bloque de filtros al contenido principal; la creacion de un plan SHALL ubicarse tras una accion explicita dentro de la seccion de planes. El resumen SHALL destacar una metrica principal de cobro del periodo por sobre las metricas de apoyo, y los indicadores de mora y de renovaciones proximas SHALL funcionar como accesos que abren la lista de cobros ya filtrada. Las acciones de registro de cobro y de ciclo de vida SHALL estar disponibles desde la propia fila del pendiente o de la membresia, con areas tactiles suficientes y alcanzables con una mano, sin obligar a navegar a una pantalla de detalle.

#### Scenario: Apertura en movil

- **WHEN** el instructor abre finanzas en un viewport movil
- **THEN** ve primero la metrica principal de cobro del periodo y el contenido accionable, sin un formulario de creacion ni un bloque de filtros por delante

#### Scenario: Cambio de seccion

- **WHEN** el instructor cambia entre resumen, cobros y planes
- **THEN** el sistema actualiza la URL con la seccion activa y al recargar o volver atras conserva la misma seccion, periodo y filtros

#### Scenario: Indicador como filtro

- **WHEN** el instructor activa el indicador de mora o el de renovaciones proximas desde el resumen
- **THEN** el sistema abre la seccion de cobros con el filtro correspondiente ya aplicado y visible

#### Scenario: Cobro desde la fila

- **WHEN** el instructor activa la accion de cobro sobre un pendiente listado
- **THEN** el sistema abre una superficie de registro sobre la misma pantalla con el importe adeudado propuesto, sin perder la posicion en la lista

#### Scenario: Creacion de plan

- **WHEN** el instructor necesita crear un plan
- **THEN** accede a la creacion mediante una accion explicita dentro de la seccion de planes y el formulario no ocupa el inicio del contenido

#### Scenario: Uso por teclado y lectores de pantalla

- **WHEN** una persona recorre finanzas con teclado o lector de pantalla
- **THEN** puede identificar la seccion activa, alcanzar cada accion de cobro o de ciclo de vida con nombre accesible y cerrar las superficies superpuestas sin perder el foco

#### Scenario: Sin datos en el periodo

- **WHEN** el periodo seleccionado no tiene cobros, pendientes ni planes segun la seccion activa
- **THEN** la seccion comunica el estado vacio con una accion util y conserva la navegacion y el cambio de periodo disponibles
