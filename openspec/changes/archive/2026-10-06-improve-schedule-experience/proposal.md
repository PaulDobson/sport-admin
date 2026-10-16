## Why

Agenda mezcla la consulta de sesiones con el acceso a programacion y presenta fechas, capacidad y acciones con poca jerarquia. Las sesiones de distintos dias parecen pertenecer a hoy, y asistencia pierde la seleccion de Agenda en el menu.

## What Changes

- Mantener Agenda como destino principal con Sesiones y Programacion como subitems desktop y navegacion secundaria equivalente en movil.
- Conservar las rutas existentes y los permisos: asistentes consultan sesiones y asistencia, sin acceso a programacion.
- Reorganizar sesiones por fecha y zona horaria operacional, destacar las que estan en curso y mostrar cupos, confirmados y lista de espera.
- Separar cabecera, indicadores de la vista, filtros de ubicacion y tarjetas de sesiones en una superficie responsive.
- Mantener Agenda activa en asistencia y ofrecer retorno a sesiones.
- Integrar programacion con la misma navegacion y conservar sus formularios, Server Actions y bloques de preparacion espaciosos.
- Incorporar estados vacios accionables y accesibilidad sin indicadores ni controles ficticios.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `product-experience-shell`: navegacion secundaria de Agenda consistente en desktop, movil y asistencia.
- `instructor-operations`: consulta de sesiones agrupada por fecha con estado, capacidad y filtros explicitos.

## Impact

- Navegacion operacional, sidebar, encabezados y enlaces de retorno.
- Paginas de agenda y programacion, componentes de presentacion y pruebas relacionadas.
- Mantener consultas y autorizacion en Server Components; mutaciones existentes mediante Server Actions.
- Ampliacion autorizada durante la validacion: corregir la lectura de variables publicas en el cliente Supabase, que importaba el helper server-only y bloqueaba Asistencia en navegador; incluir pruebas y documentacion de configuracion.
- Sin migraciones, nuevas dependencias, cambios de rutas ni ampliacion a calendario historico, edicion o cancelacion de sesiones.
- La consulta existente devuelve hasta 20 sesiones abiertas; los indicadores representaran exclusivamente ese conjunto, no totales de toda la academia.
