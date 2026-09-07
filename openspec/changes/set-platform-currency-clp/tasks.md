## 1. Defaults Y Modelo Financiero

- [ ] 1.1 Añadir o ajustar los defaults de moneda para nuevos planes de membresías y nuevos planes SaaS a `CLP`, verificando mediante pruebas SQL que las filas existentes conservan moneda e importe.
- [x] 1.2 Revisar acciones, casos de uso y repositorios de creación para que CLP sea el default cuando la moneda no se envía, manteniendo la posibilidad de indicar USD/EUR explícitamente; verificar con pruebas unitarias de creación y validación.
- [x] 1.3 Confirmar que membresías, pagos, ajustes y eventos financieros conservan la moneda del registro relacionado y rechazan mezclas inválidas; verificar con las pruebas de finanzas existentes y un caso CLP.

## 2. Presentación Y Reportes

- [x] 2.1 Actualizar formularios de planes para mostrar CLP como valor inicial y mantener edición explícita de otras monedas; verificar el comportamiento con una prueba de componente o end-to-end.
- [x] 2.2 Centralizar o ajustar el formateo financiero para usar locale `es-CL` y mostrar CLP sin decimales, conservando la precisión apropiada de otras monedas; verificar con pruebas de formato para CLP, USD y EUR.
- [x] 2.3 Revisar dashboard de finanzas, reportes, backoffice y exportaciones para conservar el código de moneda y no sumar importes entre monedas; verificar filtros y resultados de reportes mixtos.

## 3. Pagos Y Webhooks

- [x] 3.1 Añadir casos CLP al adaptador de pagos y al procesamiento de eventos, verificando normalización, persistencia y asociación de moneda mediante pruebas unitarias y de integración.
- [x] 3.2 Confirmar el formato de transporte de importes CLP aceptado por el webhook sin relajar la validación de códigos ISO ni permitir importes inválidos; verificar casos entero, dos decimales y moneda minúscula según el contrato soportado.

## 4. Verificación Integrada

- [ ] 4.1 Actualizar fixtures y pruebas de integración para que los casos de default usen CLP y los casos multimoneda conserven USD/EUR; verificar la suite SQL, API y unitarias relacionada.
- [ ] 4.2 Ejecutar lint, typecheck, pruebas y validación OpenSpec del cambio, verificando creación de plan CLP, proyección mixta, exportación y webhook CLP sin conversión de históricos.
