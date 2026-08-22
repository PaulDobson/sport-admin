## Context

Ver proposal.md - Why. Stack visual acordado: Tailwind CSS + shadcn/ui, con las variables CSS de shadcn (`--background`, `--primary`, etc. en HSL) como mecanismo de theming. Referencia de estilo explorada: layout tipo AquaFi (dark, glass, glow neon puntual) adaptado a un dominio deportivo/gimnasio en vez de fintech/cripto. Consumidores directos de estos fundamentos: `instructor-operations` (listado de alumnos), `instructor-finance` (dashboard de ingresos) y `evolution-health-attendance` (semaforo de salud).

## Goals / Non-Goals

**Goals:**

- Fijar tokens de color en HSL para modo oscuro por defecto, con alta legibilidad en exteriores (canchas) e interiores de gimnasio con iluminacion variable.
- Definir un semaforo semantico (success/warning/destructive/info) compartido entre salud, membresias y finanzas, para que el mismo lenguaje visual signifique lo mismo en cualquier modulo.
- Especificar la composicion de `StudentCard` y `DashboardIncomes` con componentes base de shadcn/ui, sin depender de estilos custom por pantalla.
- Definir el patron de bottom navigation (5 secciones + accion primaria elevada) optimizado para uso a una mano.

**Non-Goals:**

- Modo claro (light mode) no se define en esta iteracion; el sistema arranca dark-only.
- No se definen aqui micro-interacciones/animaciones ni un sistema de iconografia completo.
- No se define theming por tenant (marca blanca); los tokens son globales a la plataforma.

## Decisions

### Tokens en 3 capas: superficie, identidad, semaforo

Se separan los tokens en superficie (dark base), identidad de marca (primary/accent deportivos) y semaforo semantico (success/warning/destructive/info), en vez de un set plano de colores.

```
Superficie:  --background 220 20% 6%   --card 220 18% 10%   --border 220 15% 18%   --muted-foreground 220 10% 65%
Identidad:   --primary 155 85% 45% (verde-lima energia)     --accent 265 80% 62% (violeta, datos/analitica)
Semaforo:    --success 142 70% 45%   --warning 38 92% 55%   --destructive 0 84% 60%   --info 199 89% 55%
```

`--primary` (verde-lima, ~155°) se mantiene deliberadamente separado de `--success` (verde puro, ~142°) en tono y saturacion: `--primary` es la identidad de marca/CTA, `--success` es semantica de estado. Si compartieran el mismo verde, un boton primario se leeria como "todo esta bien" incluso cuando es solo una accion neutra.

`--accent` (violeta) se reserva para datos y analitica (dashboard financiero, graficos), separando visualmente "accion operativa" (verde) de "informacion/dinero" (violeta).

Alternativa descartada: un solo verde para primary y success. Se descarta porque colisiona la semantica de marca con la semantica de estado y genera ambiguedad en pantallas donde conviven botones y badges de estado.

### Semaforo de salud y membresia con color + texto, nunca solo color

Los indicadores de estado (salud, membresia, cobrado/pendiente/vencido) se representan siempre con un dot/badge de color **mas** una etiqueta de texto corta (ej. "Seguimiento", "Vencido"), no color solo.

Alternativa descartada: solo color. Se descarta por accesibilidad (deficiencias de percepcion de color) y porque el color se lava con luz solar directa en cancha, un escenario de uso real y frecuente de esta app.

### `StudentCard`: dos badges independientes, no uno combinado

Membresia y salud son dominios de datos distintos (financiero/administrativo vs. salud/lesion) y se muestran como dos `Badge` separados dentro de un `Card` con `Avatar`, en vez de fusionarlos en un unico indicador.

Alternativa descartada: un solo badge combinado (ej. rojo unico para "hay un problema"). Se descarta porque obliga al instructor a abrir la ficha para saber si el problema es de pago o de salud, perdiendo el valor de escaneo rapido que es el objetivo del componente.

### `DashboardIncomes`: numero principal + barra de progreso, no solo el total

El monto total del mes se muestra en tipografia grande (`text-4xl`, `tabular-nums`) acompanado de un delta (`+12%`) y una barra de progreso cobrado/proyectado, en vez de solo el numero total.

Alternativa descartada: mostrar unicamente el total acumulado. Se descarta porque no comunica si el mes va bien encaminado respecto a lo proyectado, que es la pregunta real que el instructor necesita responder de un vistazo.

### Bottom navigation: 5 secciones con FAB central elevado

Se definen 5 secciones fijas (Inicio, Agenda, accion rapida central como FAB, Alumnos, Finanzas), con el FAB central reservado para la accion mas frecuente en el momento (registrar asistencia/pago/evaluacion), replicando el patron de "accion primaria destacada" de la referencia visual pero adaptado a mobile.

Alternativa descartada: bottom nav de 4 items sin FAB, con la accion rapida dentro de cada pantalla. Se descarta porque fragmenta la accion mas repetida (registrar algo) en multiples ubicaciones, en vez de darle un unico punto de acceso consistente accesible con el pulgar desde cualquier pantalla.

Notificaciones no forma parte de las 5 secciones de bottom nav; vive en el header, para no competir por espacio en la zona de alcance del pulgar.

## Risks / Trade-offs

- [Riesgo] Verde-lima (primary) y verde (success) pueden confundirse en pantallas pequenas o con daltonismo → Diferenciarlos ademas por contexto de uso (primary solo en botones/CTAs, success solo en badges/estado) y validar con pruebas de contraste y una revision de accesibilidad antes de implementar.
- [Riesgo] Dark-mode-only puede ser insuficiente en exteriores con sol directo extremo → Definir un nivel minimo de contraste (WCAG AA) para todos los tokens semanticos como criterio de aceptacion al implementar.
- [Riesgo] FAB central puede ocultar contenido en pantallas chicas o superponerse con teclados/otros overlays → Definir en la implementacion un estado colapsado del FAB cuando haya teclado activo.
- [Riesgo] Reutilizar el mismo semaforo para salud y finanzas puede mezclar sensibilidad medica con datos financieros en la mente del usuario → Mantener etiquetas de texto explicitas por dominio (nunca solo el color) para que el contexto sea siempre claro.

## Open Questions

- ¿El monto principal de `DashboardIncomes` usa `--primary` (verde, tono "energia positiva") o `--accent` (violeta, tono "dato serio/fintech")? No cambia la especificacion de comportamiento, se puede decidir al implementar con una prueba visual rapida.
- ¿La `StudentCard` es tappable a perfil completo, o tiene acciones rapidas inline (pago, asistencia) embebidas? Puede resolverse en la etapa de especificacion de `instructor-operations` sin afectar los tokens ni la composicion aqui definida.
