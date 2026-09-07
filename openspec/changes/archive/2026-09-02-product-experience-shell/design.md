## Context

Las rutas autenticadas renderizan contenedores, guardas y navegación de retorno de forma independiente. El layout raíz solo registra el service worker, `OfflineSynchronization` comunica conflictos dentro de páginas concretas y el dashboard es el único lugar que compone la jornada y la sesión actual. La base de datos ya dispone de `profiles` con nombre y avatar, pero no existe un contrato de aplicación para consultar o actualizar ese perfil.

La solución debe conservar las URLs actuales, la separación por capas, el aislamiento por tenant, el comportamiento PWA y el modo oscuro por defecto. Véanse `proposal.md` y las specs delta para el comportamiento esperado.

## Goals / Non-Goals

**Goals:**

- Introducir shells compartidos sin acoplar presentación directamente a Supabase.
- Conservar contexto de tenant, locación, perfil y sesión entre rutas.
- Usar renderizado de servidor para identidad y autorización, limitando estado cliente a interacción y conectividad.
- Crear una composición desktop densa y una experiencia móvil de una mano desde los mismos destinos y contratos.
- Migrar las páginas existentes de forma incremental y verificable.

**Non-Goals:**

- Rediseñar reglas de dominio de agenda, asistencia, alumnos o finanzas.
- Crear un constructor de dashboards, temas personalizados por tenant o personalización libre del menú.
- Incorporar preferencias sin almacenamiento real ni un centro completo de notificaciones.
- Unificar los menús de backoffice y operación del instructor.

## Decisions

### 1. Layouts autenticados separados por contexto

Se incorporarán layouts compartidos en los segmentos `dashboard` y `backoffice`. El layout raíz seguirá siendo neutral para no envolver acceso, registro, recuperación u onboarding en navegación autenticada. Ambos shells compartirán primitivas visuales, pero recibirán configuraciones de menú y autorización distintas.

Se elige este enfoque frente a un único layout global con condicionales por pathname porque conserva límites de seguridad y evita que el contexto de backoffice se filtre a usuarios operativos. Las URLs públicas actuales no cambian.

### 2. Composición de contexto en servidor

Un caso de uso de aplicación compondrá un modelo de lectura del shell con perfil, memberships operativas, tenant activo, rol, locaciones aplicables y resumen de jornada. Los repositorios de perfil y tenant se mantendrán detrás de puertos de aplicación; las páginas no consultarán Supabase directamente.

El tenant activo se resolverá desde una cookie validada contra las memberships del usuario. Si no existe o dejó de ser válido, se usará la única membership disponible o se solicitará selección cuando haya varias. Esto sustituye el uso implícito de `memberships[0]` y evita operaciones bajo un contexto inesperado.

Se prefiere composición en servidor frente a un proveedor cliente global porque identidad y autorización están disponibles antes de renderizar, se reduce JavaScript enviado y no se expone contenido de otro tenant durante estados intermedios.

### 3. Shell por slots y regiones estables

El shell operativo tendrá cuatro regiones: navegación, topbar, contenido y contexto de sesión. En desktop desde 1024 px usará sidebar de ancho estable, topbar y un rail contextual de aproximadamente 320 px solo cuando exista información relevante. En móvil usará app bar, contenido con safe areas y barra inferior fija; el resumen de sesión se integrará en Inicio o como acceso compacto en flujos relacionados.

Las primitivas `AppShell`, `PrimaryNavigation`, `TopBar`, `AccountMenu`, `OperationalContext`, `CurrentSessionPanel` y `SyncStatus` aceptarán modelos de vista y slots, no dependencias de infraestructura. La navegación desktop podrá compactarse sin convertir su estado en requisito para renderizar páginas.

Se descarta mantener contenedores independientes por ruta porque duplica autorización, espaciado y contexto, y se descarta mostrar siempre el rail derecho porque reduciría innecesariamente el área de trabajo sin sesión activa.

### 4. Arquitectura de información única con presentación adaptativa

Los destinos canónicos serán Inicio, Agenda, Alumnos y Finanzas, más la acción rápida. Reportes será un destino directo en desktop y una navegación secundaria dentro de Finanzas en móvil. Configuración y Perfil se ubicarán en el área de cuenta, no entre las tareas diarias.

Agenda tendrá una superficie funcional basada en las sesiones y locaciones existentes; no se incluirán enlaces a rutas vacías. Cada destino declarará coincidencias de ruta, roles permitidos, etiqueta e icono desde una configuración tipada compartida entre sidebar y barra móvil.

### 5. Sesión actual derivada y actualizable

El panel reutilizará el modelo de jornada para elegir primero una sesión en curso y después la próxima dentro del horizonte operativo. El servidor entregará el estado inicial; una isla cliente actualizará el límite temporal al recuperar visibilidad, conectividad o alcanzar el inicio o fin conocido, solicitando refresco de datos sin mantener una segunda fuente de verdad.

Las acciones se derivarán del rol y estado de sesión. Alertas de salud se comunicarán mediante un contador y se resolverán en el flujo de asistencia, evitando cargar detalles sensibles en todas las rutas del shell.

### 6. Sincronización como estado global del shell

La lógica actual de sincronización se elevará a un controlador cliente único por shell. Su modelo visible distinguirá online estable, offline, sincronizando, pendientes y conflicto. Los avisos no bloquearán navegación; los conflictos tendrán una alerta persistente y acceso explícito a resolución.

Se elige una única instancia para evitar múltiples listeners y aperturas concurrentes de IndexedDB al navegar entre páginas.

### 7. Perfil con persistencia real y actualización del shell

Se añadirán puerto, caso de uso y adaptador para leer y actualizar los campos soportados por `profiles`. El menú de cuenta mostrará identidad, tenant, rol, acceso al perfil y cierre de sesión. La ruta de perfil separará datos personales, seguridad y preferencias, pero solo habilitará controles respaldados por persistencia o por capacidades existentes del proveedor de autenticación.

Después de actualizar nombre o avatar se invalidará el modelo de lectura del shell para evitar identidades divergentes entre menú y formulario.

### 8. Sistema visual de consola operativa

La dirección visual es grafito oscuro (`--background #15191b`) con superficies elevadas en tarjeta (`--card #252b2d`), bordes sutiles compartidos (`--border`/`--input`) y un verde de marca (`--primary #35d7a7`) reservado para acciones, foco y señales positivas. El proyecto usa Tailwind CSS 4.3.3 en modo CSS-first: los tokens se exponen mediante `@theme inline` en [globals.css](../../../src/presentation/styles/globals.css) (`background`, `foreground`, `card`, `card-foreground`, `muted`, `muted-foreground`, `primary`, `primary-foreground`, `border`, `input`, `ring`, `chart-muted`, `map`) y `postcss.config.mjs` solo carga `@tailwindcss/postcss`. El antiguo `tailwind.config.js` (formato v3, mapeo `hsl(var(--x))`) se retiró por no estar referenciado y quedar desalineado con los tokens actuales; `components.json` de `shadcn` apunta a `src/presentation/styles/globals.css` y a los alias reales (`@/presentation/components`, `@/presentation/components/ui`) en vez de las rutas por defecto `app/`/`components/`. El script `build:design-system` usa el CLI dedicado `@tailwindcss/cli` (v4 ya no lo incluye en el paquete `tailwindcss`) sin la bandera `--content`, porque v4 detecta el contenido automáticamente.

A diferencia de la dirección inicial, el bloque de construcción principal SHALL ser la tarjeta elevada, no el panel plano: radio grande (`rounded-[1.5rem]`/`rounded-2xl`), `border border-border`, `bg-card` y `shadow-2xl shadow-black/10`, con relleno `p-5 sm:p-6`. [sports-form.tsx](../../../src/presentation/components/sports-form.tsx) es la referencia canónica de este patrón y de los siguientes subpatrones que todo componente nuevo SHALL reutilizar:

- **Encabezado de tarjeta**: icono en chip `size-10 rounded-xl bg-primary/12 text-primary`, eyebrow en mayúsculas `text-[10px] tracking-[0.18em] text-primary`, título `text-xl font-medium tracking-tight` y descripción `text-sm text-muted-foreground`, separados del cuerpo por `border-b border-border/70`.
- **Campos**: etiqueta en mayúsculas `text-xs tracking-[0.14em] text-muted-foreground` sobre un control `h-11 rounded-xl border-border bg-background/50` con foco `focus:ring-2 focus:ring-primary/20`.
- **Acciones**: botón primario `rounded-xl bg-primary text-primary-foreground` con icono inline y texto de estado auxiliar (`text-xs text-muted-foreground`) a su izquierda.

Los tokens semánticos de estado (`success`, `warning`, `destructive`, `info`) usados por pantallas existentes no forman parte del archivo de tokens actual y quedan como trabajo pendiente: se reintroducirán en `globals.css` siguiendo la misma paleta antes de migrar esas superficies, en vez de restaurar el mapeo `hsl()` anterior.

La tipografía de interfaz será Manrope variable y las métricas usarán JetBrains Mono variable, empaquetadas localmente mediante dependencias `@fontsource-variable` para evitar solicitudes externas. Se incorporará `lucide-react` como única fuente de iconos de interfaz. Tokens de tamaño, foco, elevación, navegación y safe areas complementarán los tokens semánticos existentes.

### 9. Estrategia de pruebas

Las primitivas interactivas tendrán pruebas de navegación, foco, cierre con Escape, estado activo y acciones por rol. Los casos de uso del contexto tendrán pruebas de selección de tenant y sesión. Playwright verificará los flujos principales en viewports móvil y desktop, ausencia de overflow, persistencia de navegación, acceso a perfil, aislamiento de backoffice y estados offline.

Las verificaciones visuales usarán capturas deterministas de páginas representativas y controles geométricos para detectar solapamientos de topbar, rail y barra inferior.

## Risks / Trade-offs

- [El shell consulta más datos en cada navegación] → Componer una lectura acotada, ejecutar consultas independientes en paralelo y cachear únicamente datos compatibles con identidad y tenant.
- [Una cookie de tenant queda obsoleta] → Validarla siempre contra memberships operativas y eliminarla al perder autorización.
- [El rail de sesión reduce espacio en desktop intermedio] → Mostrarlo solo desde el breakpoint desktop y permitir composición sin rail cuando el contenido necesite mayor anchura.
- [La sincronización global cambia comportamiento probado por página] → Extraer primero el modelo de estado y conservar los mismos comandos y repositorios offline.
- [La migración simultánea de todas las pantallas genera regresiones] → Introducir el layout y las primitivas primero, migrar rutas por grupos y mantener URLs y contratos existentes.
- [Fuentes e iconos incrementan el bundle] → Importar archivos variables locales e iconos individuales, verificando tamaño de producción.

## Migration Plan

1. Incorporar tokens, fuentes, iconos y primitivas sin activar el nuevo shell.
2. Crear la composición de contexto, selección segura de tenant y contratos de perfil con pruebas.
3. Activar el shell de dashboard y migrar Inicio, Agenda, Alumnos, Finanzas, Reportes y asistencia por grupos.
4. Elevar sincronización y sesión actual al shell después de conservar sus pruebas existentes.
5. Activar el shell separado de backoffice y verificar autorización.
6. Ejecutar pruebas unitarias, integración, accesibilidad, responsive y producción antes de retirar navegación y contenedores duplicados.

El rollback conserva las páginas y URLs: se revierte la activación de los layouts compartidos mientras las nuevas primitivas y contratos pueden permanecer sin uso.
