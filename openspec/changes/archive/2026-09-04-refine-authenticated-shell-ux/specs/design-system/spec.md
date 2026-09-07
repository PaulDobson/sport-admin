## MODIFIED Requirements

### Requirement: Composición responsive orientada a tareas

El sistema SHALL adaptar jerarquía, densidad y distribución al espacio disponible, SHALL evitar limitar desktop a una columna móvil ampliada y SHALL mantener cada tarea principal operable sin desplazamiento horizontal en viewports soportados. La composición desktop SHALL favorecer el ancho de trabajo para superficies de datos y formularios, usando regiones simultáneas solo cuando aporten contexto accionable.

#### Scenario: Superficie operativa en desktop

- **WHEN** una pantalla dispone de espacio desktop
- **THEN** organiza navegación, contenido y contexto en regiones simultáneas cuando esto reduce cambios de vista y conserva una densidad legible

#### Scenario: Superficie de datos en desktop

- **WHEN** una pantalla desktop presenta tablas, filtros o formularios amplios
- **THEN** el contenido principal conserva ancho suficiente y las métricas redundantes se integran en encabezados, chips o bloques dentro del flujo de trabajo

#### Scenario: Reflujo hacia móvil

- **WHEN** el ancho disponible requiere composición móvil
- **THEN** las regiones secundarias se reordenan o colapsan sin ocultar información crítica ni superponer controles

### Requirement: Lenguaje visual de consola operativa

El sistema SHALL usar tarjetas elevadas, tipografía legible y números tabulares como bloques principales de las superficies operativas, con colores de marca reservados para jerarquía y acción y estados comunicados mediante tokens semánticos. La navegación lateral, topbar, app bar y encabezados de tarea SHALL compartir una dirección visual coherente que haga el producto más atractivo sin reducir la scanabilidad de operaciones repetidas.

#### Scenario: Panel operativo con métricas

- **WHEN** una pantalla presenta métricas, estados y acciones simultáneamente
- **THEN** los valores mantienen alineación estable, los estados son distinguibles y la acción primaria conserva mayor jerarquía que las decoraciones

#### Scenario: Topbar con contexto global

- **WHEN** una pantalla muestra página actual, academia activa, rol, resultados y cuenta
- **THEN** la jerarquía visual permite distinguir el título de tarea, el contexto organizacional y las acciones sin competir por el mismo espacio

#### Scenario: Sidebar desktop activa

- **WHEN** el usuario navega en desktop
- **THEN** la sidebar comunica producto, grupos de navegación y destino activo con iconografía, texto y estado visual consistente

### Requirement: Iconografía y controles reconocibles

El sistema SHALL usar iconos consistentes con etiquetas accesibles para herramientas y navegación, SHALL proporcionar nombres accesibles a iconos no familiares y SHALL usar controles específicos para selección, alternancia y valores numéricos en lugar de botones ambiguos. Los destinos de navegación y acciones de cuenta SHALL mantener áreas táctiles suficientes, foco visible y estados activo, hover y deshabilitado claros.

#### Scenario: Control representado solo por icono

- **WHEN** una acción conocida se presenta mediante un icono sin texto visible
- **THEN** dispone de nombre accesible y una descripción contextual cuando corresponde

#### Scenario: Selección de contexto

- **WHEN** el usuario debe elegir tenant, locación u otra opción de un conjunto
- **THEN** la interfaz utiliza un control de selección identificable y comunica el valor activo

#### Scenario: Navegación con iconos

- **WHEN** un destino de navegación está activo o disponible
- **THEN** el usuario puede reconocerlo por etiqueta textual, icono coherente y estado visual sin depender únicamente del color
