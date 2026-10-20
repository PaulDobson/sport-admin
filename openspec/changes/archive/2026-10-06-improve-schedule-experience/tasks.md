## 1. Navegacion de Agenda

- [x] 1.1 Definir subsecciones compartidas Sesiones/Programacion con permisos y correspondencia de rutas; verificar pruebas de Agenda, programacion, asistencia y rutas ajenas para instructor y asistente.
- [x] 1.2 Integrar subitems desktop y navegacion secundaria en las paginas de sesiones/programacion sin ampliar la barra inferior; verificar seleccion activa, nombres accesibles y ausencia de Programacion para asistentes.
- [x] 1.3 Ajustar encabezados y retorno desde asistencia hacia Sesiones, visible tambien en movil; verificar pruebas de navegacion y conservacion de las rutas existentes.

## 2. Vista operativa de sesiones

- [x] 2.1 Capturar un unico instante actual y agrupar sesiones por fecha en America/Santiago con clasificacion independiente de estado; verificar pruebas de cambio de dia UTC/local, orden cronologico y dos sesiones simultaneas.
- [x] 2.2 Redisenar cabecera, indicadores del conjunto visible y filtro de ubicacion con aviso del limite de 20 sesiones; verificar filtro GET, restablecimiento, permisos y cifras coherentes con los datos filtrados.
- [x] 2.3 Crear tarjetas con fecha, horario, ubicacion, cupos, confirmados, lista de espera e indicador accesible; verificar capacidad parcial, completa, sobrecapacidad y valores limites sin ancho visual mayor a 100%.
- [x] 2.4 Incorporar estados vacios accionables y prioridad visual para sesiones en curso; verificar variantes con/sin filtro y con/sin permiso de programacion.

## 3. Coherencia de programacion

- [x] 3.1 Integrar la navegacion compartida y distinguir sesion unica de horario recurrente como alternativas; verificar que siguen disponibles todas las acciones existentes y los paneles amplios de clases/ubicaciones.
- [x] 3.2 Conservar autorizacion y consultas en servidor y las mutaciones mediante Server Actions; verificar pruebas existentes de programacion y que asistentes mantienen la restriccion de acceso directo.

## 4. Validacion integrada

- [x] 4.1 Ejecutar pruebas focalizadas de navegacion, agenda, programacion y encabezados; verificar que todas pasan sin modificar funcionalidades ajenas al cambio.
- [x] 4.2 Ejecutar ESLint sobre archivos modificados y typecheck del proyecto; verificar ausencia de errores nuevos.
- [x] 4.3 Validar en navegador sesiones, programacion y asistencia a 375 px y 1280 px; verificar ausencia de scroll horizontal, campos legibles, foco visible y acciones accesibles sin solapamiento con navegacion movil.

## 5. Desbloqueo de validacion autorizado

- [x] 5.1 Corregir el cliente Supabase para leer estaticamente solo las variables publicas sin importar el helper server-only; verificar pruebas de configuracion publica, ausencia de variables y documentacion de rebuild.
- [x] 5.2 Revalidar Asistencia en navegador tras el ajuste y ejecutar pruebas focalizadas, ESLint y typecheck incluyendo el cliente Supabase; verificar que no reaparece el error de variable publica ausente.

El tenant disponible no tiene sesiones abiertas; no se crearan datos para
la validacion. Las tarjetas con datos se cubren con pruebas focalizadas.
Asistencia se verifico en su estado sin participantes, con retorno a Sesiones,
Agenda activa, foco de teclado visible y objetivo tactil de 44 px.
Las tres superficies no desbordan a 375 px y 1280 px; la accion inferior de
Agenda no queda tapada por la navegacion movil.
Resultado final: 42 pruebas focalizadas aprobadas, ESLint y typecheck correctos.
Los escenarios E2E persistentes se descubren correctamente y requieren credenciales
y una sesion existente para comprobar el flujo de asistencia con participantes.
