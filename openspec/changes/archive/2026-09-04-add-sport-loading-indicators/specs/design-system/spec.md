## MODIFIED Requirements

### Requirement: Estados completos de componente

Los componentes interactivos y superficies de datos SHALL definir estados normal, activo, hover cuando aplique, foco, deshabilitado, carga, vacío, error y offline, sin provocar desplazamientos inesperados del layout. El estado de carga SHALL usar un lenguaje visual deportivo consistente: una barra de progreso de navegación con motivo de carril de pista para transiciones entre pantallas, y un spinner con motivo de cronómetro para acciones de servidor en botones y formularios.

#### Scenario: Acción durante carga

- **WHEN** una acción de servidor está procesándose
- **THEN** el control conserva sus dimensiones, muestra el spinner de cronómetro junto a su etiqueta de texto y evita envíos duplicados

#### Scenario: Navegación entre pantallas

- **WHEN** el usuario activa un enlace hacia otra pantalla de la aplicación
- **THEN** aparece de inmediato una barra de progreso con motivo de carril de pista en la parte superior, y se completa al terminar la transición

#### Scenario: Preferencia de movimiento reducido

- **WHEN** el usuario tiene activada la preferencia de movimiento reducido del sistema
- **THEN** la barra de progreso y el spinner comunican el mismo estado sin animaciones continuas

#### Scenario: Lista sin resultados

- **WHEN** una consulta válida no devuelve elementos
- **THEN** la superficie explica el estado vacío y ofrece una acción pertinente cuando el usuario puede resolverlo
