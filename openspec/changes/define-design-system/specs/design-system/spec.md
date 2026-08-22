## Purpose

Define la identidad visual, el modo oscuro por defecto y la composicion de componentes clave que toda pantalla movil de la plataforma debe seguir para comunicar estado (salud, membresia, finanzas) de forma rapida y consistente.

## ADDED Requirements

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
