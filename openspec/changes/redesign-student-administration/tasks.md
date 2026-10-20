## 1. Contexto de consulta y navegacion

- [x] 1.1 Revisar diferencias previas de los archivos afectados y registrar el alcance de integracion en el trabajo; verificar que ningun cambio ajeno se revierta en el diff final.
- [x] 1.2 Extraer o reutilizar helpers de consulta y retorno con parametros permitidos; verificar pruebas de busqueda, estado, tamano, pagina, valores invalidos y rechazo de destinos externos.
- [x] 1.3 Normalizar paginas fuera de rango en listado y exportacion sin duplicar politicas; verificar pruebas de ultima pagina archivada, URL fuera de rango y correspondencia entre filas visibles y Excel.

## 2. Listado responsive

- [x] 2.1 Sustituir el hero por encabezado breve con Nuevo alumno y exportacion secundaria de pagina actual; verificar contexto de academia/rol en shell y ausencia de acciones administrativas para assistant.
- [x] 2.2 Crear tabla desktop y tarjetas mobile sobre la misma consulta, usando avatar, contactos, estado y acciones compartidas; verificar pruebas de datos equivalentes y solo una representacion accesible por viewport.
- [x] 2.3 Incorporar navegacion Activos / Archivados / Todos, busqueda por nombre, limpiar filtros y paginacion con rango real; verificar conservacion de consulta, reinicio de pagina al filtrar y estados vacios pertinentes.
- [x] 2.4 Etiquetar exportacion como Exportar pagina a Excel y conservar su contrato; verificar pruebas existentes de permisos, tenant, filtros, pagina, metadata y `.xlsx` vacio.

## 3. Alta y edicion

- [x] 3.1 Crear pagina `/dashboard/students/new` autorizada y actualizar todos los enlaces existentes al alta, acciones rapidas y reconocimiento de rutas; verificar navegacion sin anclas antiguas y rechazo de assistant.
- [x] 3.2 Organizar alta y edicion con grupos de campos reutilizados, identidad/contacto visibles y complementos desplegables; verificar todos los campos existentes y apertura/foco de una seccion con campo invalido.
- [x] 3.3 Retirar el formulario permanente del listado despues de conectar la nueva ruta; verificar acceso al alta desde listado y cancelacion con filtros/pagina conservados.
- [x] 3.4 Devolver identificador de alumno en alta exitosa y presentar confirmacion con acceso a ficha; impedir reenvio tras creacion total o parcial y verificar pruebas de exito, validacion fallida, consentimiento/politica y fallo posterior de salud sin duplicados.
- [x] 3.5 Incorporar Guardar / Cancelar, progreso con spinner y proteccion de cambios locales al abandonar formularios; verificar valores conservados ante error, envios bloqueados durante pending y navegacion explicita de salida.

## 4. Ficha por tareas

- [x] 4.1 Incorporar encabezado de identidad, estado y regreso visible tambien en movil; verificar pruebas de alumno activo/archivado, enlaces de edicion autorizados y preservacion del contexto del listado.
- [x] 4.2 Organizar Resumen, Membresia, Salud y Privacidad mediante navegacion enlazable y accesible; verificar URL/estado activo, datos de contacto y continuidad de todas las operaciones existentes.
- [x] 4.3 Mantener aislamiento de secciones sensibles, politica y consentimiento y evitar carga/serializacion de salud bloqueada; verificar pruebas para assistant, politica deshabilitada, consentimiento ausente y acceso autorizado.
- [x] 4.4 Preservar membresias, saldos, asignacion de plan, acceso a cobros, invitacion al portal y flujos de privacidad; verificar las pruebas actuales ampliadas sin modificar reglas financieras.

## 5. Archivado accesible

- [x] 5.1 Sustituir papelera y Eliminar por Archivar y confirmacion accesible con nombre y explicacion de historial; verificar foco, Escape/Cancelar, ausencia de mutacion al cancelar y retorno al disparador.
- [x] 5.2 Mostrar pending, exito y error visible del archivado y evitar envios duplicados; verificar reintento tras fallo, revalidacion de listado/ficha y ausencia de archivado para alumnos ya archivados.

## 6. Verificacion integrada y documentacion

- [x] 6.1 Ampliar pruebas de componentes, acciones y casos de uso del modulo y ejecutar una seleccion conjunta con `pnpm exec vitest run` sobre los archivos afectados; verificar CRUD, permisos, tenant, consentimiento, consulta y resultados parciales.
- [x] 6.2 Validar con navegador y pruebas Playwright focalizadas a 320, 375, 390, 768, 1280 y 1440 px; verificar ancho de documento no superior al viewport, objetivos tactiles de 44 px, nombres/contactos largos, teclado, dialogo y ausencia de superposicion con navegacion inferior.
- [x] 6.3 Ejecutar `pnpm typecheck`, ESLint sobre archivos afectados y `pnpm build`; verificar que los cambios no introduzcan errores de tipos, lint o compilacion y distinguir cualquier fallo preexistente.
- [x] 6.4 Actualizar documentacion directamente relacionada sobre alta independiente, ficha por secciones, permisos, archivado y alcance de Excel; verificar coherencia con especificaciones y revisar el diff final para excluir cambios ajenos.
