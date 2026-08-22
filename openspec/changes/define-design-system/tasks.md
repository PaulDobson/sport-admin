## 1. Tokens de color y tema base

- [ ] 1.1 Definir las variables CSS HSL de shadcn/ui (superficie, primary, accent, success, warning, destructive, info) en la configuracion de tema y verificar que se apliquen como modo oscuro por defecto sin flash de tema claro
- [ ] 1.2 Configurar Tailwind para consumir los tokens via variables CSS y verificar con una pantalla de prueba que cada token renderiza el color esperado
- [ ] 1.3 Validar contraste WCAG AA de cada token semantico sobre el fondo oscuro y verificar que ninguno queda por debajo del umbral

## 2. Componente `StudentCard`

- [ ] 2.1 Componer `StudentCard` con `Card`, `Avatar`, `Badge` y `Separator` de shadcn/ui y verificar que renderiza foto, nombre y disciplina
- [ ] 2.2 Implementar el badge de estado de membresia con color semantico + texto y verificar los tres estados (al dia, por vencer, vencido)
- [ ] 2.3 Implementar el badge de semaforo de salud como indicador independiente del de membresia y verificar que ambos pueden mostrar estados distintos simultaneamente

## 3. Componente `DashboardIncomes`

- [ ] 3.1 Componer el numero principal de ingresos con tipografia de alto impacto (`tabular-nums`) y verificar legibilidad en tamano de pantalla movil chico
- [ ] 3.2 Agregar el indicador de variacion (delta) y la barra de progreso cobrado/proyectado usando `Progress` de shadcn/ui y verificar que refleja los valores de cobrado, pendiente y vencido

## 4. Navegacion inferior

- [ ] 4.1 Implementar la barra de navegacion inferior fija con las 5 secciones definidas (Inicio, Agenda, FAB central, Alumnos, Finanzas) y verificar que es alcanzable con una mano en un dispositivo movil de referencia
- [ ] 4.2 Implementar el FAB central con estado colapsado cuando el teclado esta activo y verificar el comportamiento en un formulario que abre el teclado

## 5. Verificacion de especificacion

- [ ] 5.1 Revisar cada requisito de `specs/design-system/spec.md` contra los componentes implementados y verificar que cada escenario tiene una contraparte visual observable
- [ ] 5.2 Ejecutar `openspec validate define-design-system --strict` y verificar que no reporta errores
