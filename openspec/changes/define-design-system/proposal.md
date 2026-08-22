## Why

La aplicacion movil no tiene definida una identidad visual ni fundamentos de diseno. Antes de construir pantallas (alumnos, agenda, finanzas, salud), se necesita fijar tokens de color, modo oscuro por defecto, composicion de componentes criticos y patron de navegacion, para que instructores puedan leer estado (membresia, salud, ingresos) de un vistazo en condiciones reales de gimnasio o cancha.

## What Changes

- Definir tokens de color Tailwind/shadcn en modo oscuro por defecto: superficie base, primary deportivo, accent y semaforo semantico (success/warning/destructive/info) compartido entre salud, membresias y finanzas.
- Definir composicion visual de `StudentCard` (foto, estado de membresia, semaforo de salud) usando componentes shadcn/ui (`Card`, `Avatar`, `Badge`, `Separator`).
- Definir composicion visual de `DashboardIncomes` (ingresos del mes, delta, progreso cobrado/pendiente/vencido) con tipografia de alto impacto.
- Definir patron de bottom navigation de 5 secciones optimizado para uso a una mano (pulgar), con accion primaria elevada (FAB).

## Capabilities

### New Capabilities

- `design-system`: Identidad visual, tokens de color, modo oscuro por defecto y composicion de componentes clave (tarjetas, dashboard, navegacion) para la app movil.

### Modified Capabilities

<!-- No hay capacidades existentes con cambios de requisitos; esta propuesta introduce fundamentos visuales nuevos. -->

## Impact

- Configuracion de tokens Tailwind/shadcn (`globals.css` o `tailwind.config`) compartida por toda la app.
- Componentes de UI reutilizables: tarjeta de alumno, dashboard de ingresos, barra de navegacion inferior.
- Ninguna migracion de datos ni cambio de API; es una capa de presentacion que consumen `instructor-operations`, `instructor-finance` y `evolution-health-attendance`.
