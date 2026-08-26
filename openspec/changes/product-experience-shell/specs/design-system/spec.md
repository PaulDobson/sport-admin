## MODIFIED Requirements

### Requirement: Modo oscuro por defecto con tokens semanticos

El sistema SHALL renderizar la aplicacion responsive en modo oscuro por defecto y SHALL exponer un conjunto de tokens semanticos de superficie, contenido, identidad, interacción y estado reutilizables por cualquier pantalla o componente en móvil y desktop.

#### Scenario: Primer acceso a la aplicacion

- **WHEN** un usuario abre la aplicacion sin haber configurado una preferencia de tema
- **THEN** la interfaz se muestra en modo oscuro usando los tokens de superficie definidos

#### Scenario: Reuso de tokens semanticos entre modulos

- **WHEN** un modulo (salud, membresias o finanzas) necesita representar un estado positivo, de advertencia o critico
- **THEN** usa los mismos tokens semanticos (`success`, `warning`, `destructive`, `info`) en vez de definir colores propios

#### Scenario: Consistencia entre viewports

- **WHEN** una misma superficie cambia entre composición móvil y desktop
- **THEN** conserva significado, contraste y jerarquía mediante los mismos tokens semánticos

### Requirement: Navegacion inferior de una mano

El sistema SHALL ofrecer en móvil una barra de navegación inferior con cinco posiciones alcanzables con una sola mano, incluida una acción primaria central, y SHALL transformar esa navegación en desktop en una estructura persistente que muestre etiquetas, sección activa y acceso equivalente a la acción primaria.

#### Scenario: Acceso a accion rapida desde cualquier pantalla

- **WHEN** un instructor esta en cualquiera de las secciones principales de la aplicacion móvil
- **THEN** puede acceder a la accion rapida central sin salir de la barra de navegacion inferior

#### Scenario: Navegación equivalente en desktop

- **WHEN** el instructor usa la aplicación en desktop
- **THEN** encuentra las mismas áreas principales y la acción rápida en la navegación persistente sin depender de una barra inferior

## ADDED Requirements

### Requirement: Composición responsive orientada a tareas

El sistema SHALL adaptar jerarquía, densidad y distribución al espacio disponible, SHALL evitar limitar desktop a una columna móvil ampliada y SHALL mantener cada tarea principal operable sin desplazamiento horizontal en viewports soportados.

#### Scenario: Superficie operativa en desktop

- **WHEN** una pantalla dispone de espacio desktop
- **THEN** organiza navegación, contenido y contexto en regiones simultáneas cuando esto reduce cambios de vista y conserva una densidad legible

#### Scenario: Reflujo hacia móvil

- **WHEN** el ancho disponible requiere composición móvil
- **THEN** las regiones secundarias se reordenan o colapsan sin ocultar información crítica ni superponer controles

### Requirement: Lenguaje visual de consola operativa

El sistema SHALL usar superficies grafito, elevación contenida, radios compactos, tipografía de interfaz legible y números tabulares para producir una experiencia de trabajo consistente; los colores de marca SHALL apoyar jerarquía y acción sin sustituir los estados semánticos.

#### Scenario: Panel operativo con métricas

- **WHEN** una pantalla presenta métricas, estados y acciones simultáneamente
- **THEN** los valores mantienen alineación estable, los estados son distinguibles y la acción primaria conserva mayor jerarquía que las decoraciones

#### Scenario: Agrupación de contenido

- **WHEN** una superficie contiene varias secciones
- **THEN** usa espacio, divisores o paneles simples para agruparlas sin anidar tarjetas decorativas ni convertir cada sección en una tarjeta flotante

### Requirement: Estados completos de componente

Los componentes interactivos y superficies de datos SHALL definir estados normal, activo, hover cuando aplique, foco, deshabilitado, carga, vacío, error y offline, sin provocar desplazamientos inesperados del layout.

#### Scenario: Acción durante carga

- **WHEN** una acción está procesándose
- **THEN** conserva dimensiones estables, comunica progreso y evita envíos duplicados

#### Scenario: Lista sin resultados

- **WHEN** una consulta válida no devuelve elementos
- **THEN** la superficie explica el estado vacío y ofrece una acción pertinente cuando el usuario puede resolverlo

### Requirement: Iconografía y controles reconocibles

El sistema SHALL usar iconos consistentes con etiquetas accesibles para herramientas y navegación, SHALL proporcionar tooltips a iconos no familiares en desktop y SHALL usar controles específicos para selección, alternancia y valores numéricos en lugar de botones de texto ambiguos.

#### Scenario: Control representado solo por icono

- **WHEN** una acción conocida se presenta mediante un icono sin texto visible
- **THEN** dispone de nombre accesible y tooltip en dispositivos que admiten hover

#### Scenario: Selección de contexto

- **WHEN** el usuario debe elegir tenant, locación u otra opción de un conjunto
- **THEN** la interfaz utiliza un control de selección identificable y comunica el valor activo
