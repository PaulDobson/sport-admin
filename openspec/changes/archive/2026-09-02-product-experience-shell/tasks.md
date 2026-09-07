## 1. Fundamentos visuales

- [x] 1.1 Instalar `lucide-react`, Manrope variable y JetBrains Mono variable desde paquetes locales, configurar su carga global y verificar `pnpm build` sin solicitudes de fuentes externas.
- [x] 1.2 Ampliar los tokens de color, superficie, elevación, radio, foco, navegación y safe areas; eliminar decoraciones radiales dominantes y verificar contraste y apariencia en el preview del sistema de diseño.
- [x] 1.3 Crear primitivas reutilizables para icon button, tooltip, avatar, badge de estado, empty state, skeleton y alert; verificar con pruebas de renderizado sus estados normal, foco, deshabilitado, carga y error.
- [x] 1.4 Migrar a Tailwind CSS 4.3.3 CSS-first: retirar `tailwind.config.js` (formato v3) sin referencias activas, instalar `@tailwindcss/cli` para `build:design-system` y alinear `components.json` de `shadcn` con las rutas reales de `globals.css` y los alias de `src/presentation`; verificar `pnpm run build:design-system`.

## 2. Contexto autenticado

- [x] 2.1 Crear puertos y adaptadores de lectura para perfil y tenant usando las tablas existentes, y verificar con pruebas de repositorio que solo devuelven datos autorizados para el usuario.
- [x] 2.2 Implementar la resolución del tenant activo mediante cookie validada contra memberships operativas, y verificar selección única, selección múltiple, cookie obsoleta y usuario sin memberships.
- [x] 2.3 Implementar el modelo de lectura del shell con perfil, tenant, rol, locaciones y resumen de jornada, y verificar con pruebas unitarias composición, paralelismo e imposibilidad de usar un tenant no autorizado.
- [x] 2.4 Sustituir el uso operativo implícito de `memberships[0]` por el contexto resuelto en las rutas afectadas, y verificar que las consultas y mutaciones reciben el tenant seleccionado.

## 3. Shell y navegación

- [x] 3.1 Crear `AppShell`, sidebar, topbar, app bar móvil y barra inferior mediante slots y dimensiones responsive estables, y verificar con pruebas de componente que no solapan contenido en móvil ni desktop.
- [x] 3.2 Definir una configuración tipada de destinos, coincidencias de ruta, roles e iconos para Inicio, Agenda, Alumnos, Finanzas, Reportes y acción rápida; verificar estado activo y filtrado por rol.
- [x] 3.3 Implementar menú de cuenta, selector de tenant y selector de locación con foco administrado, cierre por Escape y nombres accesibles; verificar interacción por teclado y actualización del contexto.
- [x] 3.4 Crear el layout autenticado de dashboard con guarda y contexto compuestos en servidor, y verificar redirección sin filtración de datos para usuarios anónimos o sin tenant operativo.
- [x] 3.5 Implementar la superficie funcional de Agenda a partir de sesiones y locaciones existentes, y verificar filtros, estados vacío/error y navegación hacia asistencia.
- [x] 3.6 Implementar la acción rápida contextual para mostrar solo operaciones disponibles por rol y sesión, y verificar que no ofrece destinos vacíos ni acciones no autorizadas.

## 4. Sesión y sincronización

- [x] 4.1 Extraer la sincronización offline a un controlador único del shell que exponga online, offline, sincronizando, pendientes y conflicto; verificar listeners, cierre de IndexedDB y transiciones con pruebas de componente.
- [x] 4.2 Implementar el panel de sesión actual/próxima con horario, locación, capacidad, asistencia y acciones por estado y rol; verificar sus variantes activa, próxima, ausente y no autorizada.
- [x] 4.3 Añadir refresco al recuperar visibilidad, conectividad y alcanzar límites de inicio o fin, y verificar con temporizadores simulados que el panel no conserva una sesión obsoleta.
- [x] 4.4 Integrar el panel como rail contextual en desktop y contenido prioritario o acceso compacto en móvil, y verificar que la barra inferior y las acciones de asistencia permanecen visibles y sin solapamientos.

## 5. Perfil y cuenta

- [x] 5.1 Implementar casos de uso para consultar y actualizar nombre y avatar del perfil con validación, y verificar éxito, datos inválidos y aislamiento al usuario autenticado.
- [x] 5.2 Crear la superficie de perfil con datos personales y accesos reales de seguridad, notificaciones y preferencias, ocultando controles sin persistencia; verificar guardado e invalidación de la identidad del shell.
- [x] 5.3 Integrar identidad, organización, rol, acceso al perfil y cierre de sesión en el menú de cuenta, y verificar que los cambios de perfil se reflejan sin cerrar sesión.

## 6. Migración de superficies operativas

- [x] 6.1 Migrar Inicio al layout compartido, retirar navegación local duplicada y adaptar métricas y sesión actual a la nueva jerarquía; verificar la jornada y filtros existentes en móvil y desktop.
- [x] 6.2 Migrar Alumnos y detalle de alumno al shell y nuevas primitivas, y verificar estados independientes de membresía y salud, formularios y navegación de retorno.
- [x] 6.3 Migrar Finanzas y Reportes al shell, ubicar Reportes como navegación secundaria móvil y verificar proyección, renovaciones y consultas existentes.
- [x] 6.4 Migrar asistencia al shell sin degradar precarga offline, alertas de salud ni actualización realtime, y verificar el flujo completo con pruebas existentes y viewport móvil.
- [x] 6.5 Añadir boundaries de carga y error por sección que mantengan el shell operativo, y verificar recuperación, estados vacíos y ausencia de cambios de layout inesperados.

## 7. Backoffice

- [x] 7.1 Crear configuración y layout de backoffice separados con señal de contexto administrativo y autorización de plataforma, y verificar que usuarios operativos no ven ni abren sus destinos.
- [x] 7.2 Migrar tenants y finanzas de plataforma al shell de backoffice usando las primitivas compartidas, y verificar que sus operaciones y tablas funcionan en móvil y desktop.

## 8. Validación integral

- [x] 8.1 Añadir pruebas Playwright de navegación persistente, tenant activo, perfil, acción rápida, sesión actual y aislamiento de backoffice en viewports móvil y desktop; verificar ejecución completa de la suite.
- [x] 8.2 Añadir verificaciones Playwright de teclado, foco, áreas táctiles, overflow y solapamientos de topbar, rail y barra inferior; verificar capturas deterministas de las superficies representativas.
- [x] 8.3 Verificar los estados offline, pendientes, sincronización y conflicto mediante pruebas end-to-end con conectividad simulada y confirmar que la navegación permanece operativa.
- [x] 8.4 Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` y `pnpm verify:bundle-secrets`, corrigiendo únicamente regresiones introducidas por este cambio.
