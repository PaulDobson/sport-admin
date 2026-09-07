## ADDED Requirements

### Requirement: Dirección visual de producto operativo

El sistema SHALL definir una dirección visual coherente para Sport Admin como producto operativo deportivo, usando jerarquía, espaciado, elevación, tipografía, iconografía y color de forma consistente entre módulos, y SHALL evitar que las superficies principales se perciban como pantallas MVP inconexas.

#### Scenario: Superficie principal autenticada

- **WHEN** un usuario autenticado abre una pantalla operativa principal
- **THEN** la pantalla usa patrones visuales compartidos para encabezados, navegación, métricas, estados, acciones y superficies de contenido

#### Scenario: Uso de color de marca

- **WHEN** una pantalla necesita destacar navegación activa, acción primaria o información crítica
- **THEN** usa el color de marca con intención jerárquica y conserva los tokens semánticos para estados de negocio o sistema

### Requirement: Densidad responsive diferenciada por viewport

El sistema SHALL definir composiciones y densidad visual específicas para móvil, tablet y desktop, y SHALL NOT tratar desktop como una versión ampliada de la interfaz móvil cuando el espacio permita regiones simultáneas.

#### Scenario: Vista desktop de una tarea operativa

- **WHEN** el viewport permite una experiencia desktop
- **THEN** la interfaz presenta navegación, contenido principal y contexto operativo en regiones simultáneas cuando eso reduce cambios de pantalla

#### Scenario: Vista móvil de la misma tarea

- **WHEN** el viewport requiere una experiencia móvil
- **THEN** la interfaz prioriza una columna táctil, acciones alcanzables con una mano y reordenamiento de contexto sin ocultar información crítica

### Requirement: Sistema de estados de producto

El sistema SHALL definir tratamientos visuales y textuales reutilizables para estados normal, activo, hover cuando aplique, foco, carga, vacío, error, offline, sincronizando, pendiente y conflicto, manteniendo dimensiones estables y acciones claras.

#### Scenario: Contenido sin datos

- **WHEN** una superficie operativa no tiene datos para mostrar
- **THEN** comunica el estado vacío con texto específico de la tarea y ofrece una acción pertinente cuando el usuario puede resolverlo

#### Scenario: Operación con conflicto de sincronización

- **WHEN** una operación entra en conflicto después de reconectar
- **THEN** el estado se distingue mediante texto, iconografía y token semántico sin depender únicamente del color

### Requirement: Fundamentos visuales estables

El sistema SHALL aplicar tokens y reglas compartidas para radios, sombras, bordes, tipografía, números tabulares, iconos, áreas táctiles y movimiento, de modo que las pantallas mantengan estabilidad visual y legibilidad profesional.

#### Scenario: Métricas en paneles operativos

- **WHEN** una pantalla muestra montos, conteos, cupos o indicadores de progreso
- **THEN** los valores usan alineación estable, jerarquía legible y etiquetas que explican su significado

#### Scenario: Control táctil o interactivo

- **WHEN** un usuario interactúa con navegación, botones, menús, filtros o formularios
- **THEN** el control mantiene área suficiente, foco visible, estado deshabilitado claro y dimensiones consistentes durante carga o cambio de estado
