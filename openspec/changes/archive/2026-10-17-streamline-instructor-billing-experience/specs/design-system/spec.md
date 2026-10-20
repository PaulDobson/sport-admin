## ADDED Requirements

### Requirement: Tarjeta de indicador con etiqueta de tono

El sistema de diseno SHALL proveer una tarjeta de indicador reutilizable compuesta por titulo, etiqueta de tono opcional alineada a la derecha, valor principal en tipografia numerica tabular y nota de contexto secundaria. La etiqueta de tono SHALL usar exclusivamente los tonos semanticos exito, advertencia, informacion, peligro y neutro, con fondo atenuado y texto del mismo tono, y SHALL incluir siempre texto ademas del color. Cuando la tarjeta es interactiva SHALL comportarse como enlace con nombre accesible, estado de foco visible y area tactil minima de 44 px.

#### Scenario: Etiqueta de variacion positiva

- **WHEN** una tarjeta muestra una variacion positiva
- **THEN** la etiqueta usa el tono de exito y muestra el porcentaje con signo

#### Scenario: Tarjeta interactiva con teclado

- **WHEN** una persona enfoca una tarjeta interactiva con teclado
- **THEN** la tarjeta muestra el anillo de foco y anuncia su titulo y valor

### Requirement: Tabla responsive con degradacion a tarjetas

El sistema de diseno SHALL proveer un patron de listado tabular que en escritorio se presenta como tabla con encabezados en mayusculas pequenas, filas separadas por bordes finos y montos alineados en tipografia numerica, y que en movil se presenta como lista de tarjetas con el dato principal y el monto destacados y el estado como etiqueta de tono. Ambas presentaciones SHALL exponer la misma informacion y las mismas acciones.

#### Scenario: Cambio de viewport

- **WHEN** el mismo listado se muestra en movil y en escritorio
- **THEN** en movil se ve como tarjetas y en escritorio como tabla, con los mismos datos y acciones disponibles

### Requirement: Paleta de graficos alineada con la marca

Los tokens de graficos SHALL definir al menos cinco colores derivados de la marca y de los tonos semanticos, distinguibles entre si sobre el fondo oscuro, en lugar de una escala de grises. Las visualizaciones de participacion o progreso SHALL acompanar el color con etiquetas o valores textuales.

#### Scenario: Participacion por plan

- **WHEN** se muestra la participacion de varios planes en el ingreso mensual
- **THEN** cada plan usa un color distinto de la paleta y su porcentaje se muestra como texto
