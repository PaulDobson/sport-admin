# design-system Specification

## Purpose

Define la identidad visual, el modo oscuro por defecto y la composicion de componentes clave que toda pantalla movil de la plataforma debe seguir para comunicar estado (salud, membresia, finanzas) de forma rapida y consistente.

## Requirements

### Requirement: Modo oscuro por defecto con tokens semanticos

El sistema SHALL renderizar la aplicacion movil en modo oscuro por defecto y SHALL exponer un conjunto de tokens de color semanticos (superficie, identidad de marca, y estado success/warning/destructive/info) reutilizables por cualquier pantalla o componente.

#### Scenario: Primer acceso a la aplicacion

- **WHEN** un usuario abre la aplicacion sin haber configurado una preferencia de tema
- **THEN** la interfaz se muestra en modo oscuro usando los tokens de superficie definidos

#### Scenario: Reuso de tokens semanticos entre modulos

- **WHEN** un modulo (salud, membresias o finanzas) necesita representar un estado positivo, de advertencia o critico
- **THEN** usa los mismos tokens semanticos (`success`, `warning`, `destructive`, `info`) en vez de definir colores propios

### Requirement: Indicadores de estado con color y texto

El sistema SHALL representar todo indicador de estado (salud, membresia, cobrado/pendiente/vencido) con un color semantico acompanado de una etiqueta de texto, y SHALL NOT depender unicamente del color para transmitir el estado.

#### Scenario: Indicador de salud en la tarjeta de alumno

- **WHEN** se muestra el estado de salud de un alumno en su tarjeta
- **THEN** el indicador incluye un color semantico y una etiqueta de texto legible (ej. "Seguimiento", "Sin riesgo")

#### Scenario: Indicador de membresia sin color perceptible

- **WHEN** el color de un indicador no es distinguible por condiciones de luz o percepcion del usuario
- **THEN** la etiqueta de texto sigue comunicando el estado sin ambiguedad

### Requirement: Tarjeta de alumno con estados independientes

El sistema SHALL mostrar en la tarjeta de alumno la identidad del alumno, el estado de membresia y el estado de salud como indicadores visualmente independientes entre si.

#### Scenario: Alumno con membresia vencida y salud sin riesgo

- **WHEN** un alumno tiene la membresia vencida pero no tiene alertas de salud activas
- **THEN** la tarjeta muestra el estado de membresia como vencido y el estado de salud como sin riesgo, sin combinarlos en un unico indicador

### Requirement: Tablero de ingresos con contexto de progreso

El sistema SHALL mostrar en el tablero de ingresos mensual el monto total del periodo junto con una referencia de progreso respecto al monto proyectado, no solo el monto acumulado.

#### Scenario: Consulta del mes en curso

- **WHEN** un instructor abre el tablero de ingresos durante el mes en curso
- **THEN** ve el monto acumulado, la variacion respecto al periodo anterior y el progreso frente a lo proyectado

### Requirement: Navegacion inferior de una mano

El sistema SHALL ofrecer una barra de navegacion inferior con cinco secciones alcanzables con una sola mano, incluyendo una accion primaria central destacada para el registro rapido de datos operativos.

#### Scenario: Acceso a accion rapida desde cualquier pantalla

- **WHEN** un instructor esta en cualquiera de las secciones principales de la aplicacion
- **THEN** puede acceder a la accion rapida central sin salir de la barra de navegacion inferior

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
