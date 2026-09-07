## 1. Setup

- [x] 1.1 Agregar `framer-motion` a `package.json` y verificar que `pnpm install` termina sin errores
- [x] 1.2 Crear la carpeta `src/presentation/components/marketing/` con un `index.ts` de barril y verificar que el proyecto sigue compilando (`pnpm exec tsc --noEmit`)

## 2. Contenido y copy

- [x] 2.1 Redactar el copy del hero (titular, subtítulo, texto de los dos CTAs) enfocado en instructores/dueños de box y guardarlo como constantes tipadas en `src/presentation/components/marketing/content.ts`
- [x] 2.2 Redactar el copy de las tres secciones de beneficio (control financiero, visibilidad de alumnos, oportunidad de crecimiento) en el mismo archivo de contenido, con un mensaje concreto por sección (no genérico)
- [x] 2.3 Redactar el copy del CTA final de cierre de la landing en el mismo archivo de contenido

## 3. Ilustraciones de marca

- [x] 3.1 Crear componentes SVG abstractos reutilizables en `src/presentation/components/marketing/illustrations/` (mínimo: uno para el hero, uno por sección de beneficio) usando los tokens de color de `globals.css` y verificar visualmente en el navegador con `pnpm run dev`
- [x] 3.2 Añadir pruebas de snapshot/render básicas para las ilustraciones y verificar que `pnpm test` pasa

## 4. Componentes de sección con animación

- [x] 4.1 Crear un hook/util compartido `useMotionPreferences` (o equivalente) que envuelva `useReducedMotion()` de Framer Motion y verificar con un test que retorna variantes reducidas cuando el sistema indica `prefers-reduced-motion`
- [x] 4.2 Implementar `Hero` (Client Component) con animación de entrada usando Framer Motion y los dos CTAs (registro e inicio de sesión), y verificar con un test que ambos enlaces apuntan a `/sign-up` y `/log-in`
- [x] 4.3 Implementar `BenefitsSection` (Client Component) con animación `whileInView` por tarjeta de beneficio, y verificar con un test que renderiza las tres secciones de beneficio del contenido de 2.2
- [x] 4.4 Implementar `FinalCta` (Client Component o server si no requiere animación) con el CTA de cierre, y verificar con un test que enlaza a `/sign-up` y muestra un acceso a `/log-in`
- [x] 4.5 Verificar con un test que, cuando `prefers-reduced-motion` está activo, las animaciones de entrada/scroll de `Hero` y `BenefitsSection` no ocultan contenido (se resuelve al estado final sin transición)

## 5. Detección de sesión activa

- [x] 5.1 Reutilizar `loadOperationalContext()` en `src/app/page.tsx` (Server Component) para resolver si hay sesión/membresía activa y pasar el destino del CTA principal (`/dashboard` vs `/sign-up`) como prop a `Hero`
- [x] 5.2 Verificar con un test de integración que un usuario con sesión activa ve el CTA principal apuntando a `/dashboard`, y uno sin sesión lo ve apuntando a `/sign-up`

## 6. Ensamblado de la página

- [x] 6.1 Reescribir `src/app/page.tsx` para componer `Hero`, `BenefitsSection` y `FinalCta` en lugar de `Navbar`/`FormsShowcase`/`Footer`, y verificar que `pnpm run build` termina sin errores
- [x] 6.2 Verificar manualmente en `pnpm run dev` que la landing es legible y sin recortes en un viewport móvil común (ej. 375px de ancho)

## 7. Verificación final

- [x] 7.1 Ejecutar `pnpm test` y `pnpm exec tsc --noEmit` y verificar que ambos pasan sin errores
- [x] 7.2 Ejecutar `pnpm exec eslint .` sobre los archivos nuevos/modificados y verificar que no reporta errores
