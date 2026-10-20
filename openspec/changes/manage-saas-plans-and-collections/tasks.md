## 1. Compatibilidad y modelo financiero

- [x] 1.1 Inventariar lectores de ciclos, planes, limites, invoices, charges y webhooks, y reconciliar `set-platform-currency-clp` sin modificar ese cambio; verificar un mapa de consumidores y fixtures legacy que pasan antes de la migracion.
- [x] 1.2 Implementar tipos y reglas puras de dinero CLP, IVA incluido, periodos anclados y prorrateo racional; verificar tests de 11.900 = 10.000 + 1.900, redondeo al peso, meses bisiestos, fin de mes, DST y dias restantes.
- [ ] 1.3 Agregar migracion de versiones de planes y snapshots de contrato/periodo conservando campos legacy; verificar backfill de 1/3/6/12 meses y que no cambien precios, monedas ni fechas existentes.
- [ ] 1.4 Agregar cambios programados, emisor versionado, comprobantes y outbox con claves unicas, RLS y constraints; verificar migracion completa en PostgreSQL desechable y rechazo de escritura/lectura de roles no autorizados.

## 2. Catalogo y asignacion

- [ ] 2.1 Implementar RPC, puertos, adaptadores y casos de uso de catalogo, versionado y archivo de planes; verificar funciones desconocidas, limites, precio entero y que editar/archivar no cambie contratos existentes.
- [ ] 2.2 Implementar preview y confirmacion atomica de asignacion con trial opcional, fechas, version, limites y cobro inicial; verificar una suscripcion corriente por tenant, duplicados y retry con payload diferente.
- [x] 2.3 Definir contratos RPC validados en runtime y actualizar tipos de Supabase/composicion; verificar errores visibles ante esquema viejo y ausencia de casts que oculten respuestas incompletas.

## 3. Cambios y renovaciones

- [ ] 3.1 Implementar preview y confirmacion de upgrade inmediato con motivo, huella y cobro proporcional pendiente; verificar el ejemplo 30.000 -> 60.000 con 10/30 dias = 10.000 y que la renovacion no cambie de fecha.
- [ ] 3.2 Implementar cambios entre duraciones y upgrades sucesivos con tarifa vigente, importe cero y rechazo de preview obsoleto; verificar que no se facture dos veces la misma diferencia ni se creen pagos ficticios.
- [ ] 3.3 Implementar programacion/cancelacion de downgrade, revalidacion de uso y renovacion del plan previo si queda bloqueado; verificar notificacion, limites por fecha y ausencia de eliminacion de recursos.
- [ ] 3.4 Implementar renovacion transaccional y procesamiento acotado de periodos atrasados, incluyendo fin de trial y version archivada ya contratada; verificar unicidad de invoice/periodo y concurrencia de dos workers.
- [ ] 3.5 Adaptar el flujo legacy de cambios de limites para impedir bypass del cambio contractual; verificar que antiguos formularios/RPC no puedan cambiar el plan sin la previsualizacion financiera y auditar la reconciliacion de programaciones existentes.

## 4. Cobros y pagos manuales

- [ ] 4.1 Implementar consulta paginada de cobros con filtros de tenant, estado y vencimiento y detalle de saldo/eventos; verificar resultados y conteos con invoices abiertas, anuladas, pagadas y historicas parciales.
- [ ] 4.2 Implementar pago total manual con metodo, fecha, referencias y operation_id, compartiendo invariantes con webhooks; verificar pagos parciales/sobrepagos rechazados, liquidacion de remanentes y carreras manual/webhook sin doble registro.
- [ ] 4.3 Implementar anulacion auditada de cobros sin pagos ni cargos en curso; verificar rechazo de anulacion incompatible y conservacion de historial.
- [ ] 4.4 Confirmar pago, snapshot de comprobante y trabajo PDF en una sola transaccion, validando emisor antes de confirmar; verificar rollback ante fallo transaccional y pago persistido ante fallo externo posterior.

## 5. Comprobante PDF y correo

- [ ] 5.1 Implementar configuracion y versionado de emisor con validacion administrativa, sin secretos en tabla ni cliente; verificar RUT/datos requeridos, autorizacion y snapshots independientes de posteriores ediciones.
- [x] 5.2 Agregar generacion PDF server-only y fuente Unicode con licencia verificada, actualizar manifests e instalar dependencias; verificar PDF real con texto extraible, acentos, servicios largos, multiples paginas y leyenda no tributaria.
- [ ] 5.3 Implementar bucket privado, upload idempotente, hash y descarga autenticada por documento; verificar contenido application/pdf, coincidencia con snapshot, tenant ajeno rechazado y ausencia de URL publica permanente.
- [ ] 5.4 Implementar worker/outbox PDF con lease, estado, error y reintento manual; verificar caida y recuperacion sin duplicar folio ni pago.
- [ ] 5.5 Implementar puerto/adaptador Resend y envios explicitos con preview de destinatario, idempotencia y adjunto; verificar email de facturacion prioritario, confirmacion para contacto principal y credenciales faltantes sin falso exito.
- [ ] 5.6 Implementar estado de entregas, retries acotados y tratamiento de timeout ambiguo; verificar que aceptacion del proveedor no aparezca como entrega confirmada y que reenvio no duplique comprobante.

## 6. UX administrativa mobile first

- [x] 6.1 Agregar navegacion de Planes/Cobranza y pantallas de catalogo/creacion/versionado con componentes compartidos; verificar teclado, errores por campo, borrador retenido, archivo y tarjetas/table segun viewport.
- [x] 6.2 Integrar resumen de suscripcion y tareas de asignacion/upgrade/downgrade en tenants; verificar preview monetario, uso/limites, confirmacion con motivo y conflicto obsoleto sin perder datos.
- [x] 6.3 Implementar cartera de cobranza, detalle, registro de pago y anulacion, con estados pending y prevencion de doble submit; verificar recorrido completo y enlaces preservando filtros/paginacion.
- [x] 6.4 Implementar detalle de comprobante, descargar, generar/reintentar y enviar/reenviar con estados independientes; verificar pago confirmado + PDF fallido + retry y correo fallido con descarga disponible.
- [x] 6.5 Agregar configuracion del emisor y readiness de correo/procesadores; verificar mensajes accionables sin exponer credenciales y sin duplicar configuracion del tenant.

## 7. Consulta del dueno y metricas

- [ ] 7.1 Implementar acceso de solo lectura a Mi suscripcion con guard minimo para dueno de tenant suspendido y sin habilitar operacion; verificar owner activo, membresia revocada, admin/instructor/assistant y acceso entre tenants en UI/RPC/storage.
- [x] 7.2 Implementar plan, servicios, limites, deuda, pagos, cambio programado y descarga propia, con acceso desktop/menu movil; verificar que no existan acciones administrativas ni mezcla con finanzas de alumnos.
- [ ] 7.3 Adaptar indicadores y exportaciones a duraciones flexibles, versiones historicas, cobros proporcionales y pagos confirmados; verificar reconciliacion exacta de ledger/dashboard/export y no duplicacion por joins o mezcla de monedas.
- [x] 7.4 Enlazar metricas a listados filtrados y mostrar definiciones de MRR/IVA/cobrado/pendiente/mora; verificar que el drill-down reproduzca las cifras del periodo elegido.

## 8. Despliegue y verificacion end-to-end

- [ ] 8.1 Desplegar endpoint protegido y scheduler de renovacion/PDF/email con readiness, ultima ejecucion y registros; verificar solicitud no autorizada rechazada, ejecucion real y recuperacion de lotes fallidos en staging.
- [ ] 8.2 Ejecutar regresiones PostgreSQL sobre migraciones completas con concurrencia, RLS, idempotencia, auditoria y compatibilidad webhook/limites; verificar que no dependan solo de mocks ni datos productivos.
- [x] 8.3 Ejecutar Playwright con paginas reales y datos sinteticos en 320, 375, 390, 768, 1280 y 1440 px; verificar controles >=44 px, iconos alineados, ausencia de overflow, focus y CTA no tapados.
- [ ] 8.4 Ejecutar smoke autenticado en staging crear plan -> asignar -> pagar -> PDF -> correo -> upgrade -> downgrade -> renovacion y comparar dashboard; verificar PDF descargable real y resultado de envio con proveedor configurado.
- [x] 8.5 Actualizar documentacion, variables de ejemplo y runbook de migracion, emisor, bucket, Resend, scheduler y recuperacion; verificar lint, typecheck, build, pruebas focalizadas y ausencia de secretos en bundle antes de habilitar escrituras.

## Estado de preparacion (no sustituye verificaciones pendientes)

- Incremento de catalogo/versionado 2.1: consulta de historial inmutable agregada
  con RPC auditada 0054, paginacion SQL, puerto/caso de uso, adaptador y pagina
  administrativa. Acceso desde tarjetas/tabla para planes activos y archivados;
  muestra todas las condiciones originales y distingue catalogo vigente por
  current_version_id, no por max(version_number), conservando versiones legacy
  negociadas sin conversion ni impuestos inferidos. No asigna versiones viejas
  ni altera contratos. Esquema/mapeo de version reutilizado; verifica identidades
  de plan/version y pagina. Publicar/archivar revalida el historial.
  Etiquetas de funciones en espanol completadas en catalogo y preview de cambio.
  Fixtures de navegacion/versiones actualizados sin ejecutar sus pruebas.
  Migracion 0054 preparada, no ejecutada; falta de RPC produce error explicito.
  TypeScript y lint focalizado pasan. SQL, browser y suites siguen diferidos
  por el usuario; 2.1 conserva su checkbox pendiente y progreso formal 13/36.

- Incremento de implementacion posterior al smoke: bandeja operativa PDF/correo
  conectada a RPC auditada nueva 0053, contrato runtime, puerto/caso de uso,
  adaptador y consola responsive. Filtros academia/tipo/estado, paginacion y
  conteos en un snapshot; atencion incluye fallidos/inciertos/leases vencidos.
  Enlaces a reintento PDF y conciliacion existentes, fechas Chile, intentos
  y codigo de error. Consulta no procesa trabajos ni envia mensajes. Acceso
  directo desde Finanzas y revalidacion tras acciones del comprobante.
  Sin tokens de lease, rutas privadas ni snapshots expuestos por la RPC.
  Migracion 0053 preparada, no ejecutada; ausencia muestra error explicito sin
  ocultar la consola existente. Fixtures actualizados para mantener compatibilidad.
  Por solicitud del usuario no se ejecutan pruebas SQL/unitarias/browser ni
  workers; solo chequeos estaticos TypeScript/lint. Las verificaciones de este
  incremento quedan pendientes y el progreso formal se mantiene en 13/36.

- Smoke observado 2026-10-18 en localhost, con sesion administrativa iniciada
  por el operador y Academia 1 autorizada: plan diario ficticio, emisor ficticio,
  asignacion desde hoy y pago simulado CLP 11.900 persistidos. Cobro y suscripcion
  pagados, saldo cero; PDF real generado por worker, guardado en bucket privado
  y descargado con sesion, hash y texto extraido verificados. Descarga anonima
  401 y ruta publica del objeto rechazada. Ambos endpoints rechazan sin secreto
  con 401 y responden 200 autorizados; heartbeat real visible, sin pendientes ni
  fallos. Dashboard, cuatro desgloses y CSV coinciden para octubre 2026 CLP.
  Esto completa 7.4; no completa por si solo las tareas de aislamiento/recuperacion.
  El administrador sin membresia owner no accede a Mi suscripcion.
  Workers habilitados solo en configuracion local ignorada por Git, sin revelar
  secretos ni cambiar el cron remoto. Resend sigue sin configurar y no se
  solicito ni envio correo por decision del operador. La renovacion del contrato
  diario vence el 2026-10-19: el operador aprobo esperar, sin alterar fechas.
  El operador inicio luego sesion como owner real de Academia 1: contrato, pago,
  saldo cero y descarga con hash identico verificados; consulta de Academia 2
  rechazada y detalle administrativo redirigido al dashboard. Sin acciones
  financieras mutables para el dueno. Pantalla real sin overflow en seis anchos,
  controles visibles de 44 px. Se corrigio reports -> Reportes con formateador
  compartido en catalogo/asignacion/dueno: 21 tests focalizados, tsc y ESLint pasan.
  Pendientes dueno suspendido/documento ajeno, concurrencia, recuperacion real,
  upgrade/downgrade, renovacion vencida y proveedor. Evidencia y precauciones
  persistidas en el runbook; no acredita despliegue productivo.

- Actualizacion 2026-10-18: el operador confirmo ejecucion exitosa en staging
  de migraciones 0048–0052, regresiones 0043–0048, regresion integrada 0049 y
  plantilla SQL del scheduler. Este reporte sustituye el estado previo de SQL
  diferido/no ejecutado que figura en el registro de implementacion siguiente.
  No fue observado independientemente por el asistente. No acredita concurrencia
  con dos conexiones, respuestas HTTP/heartbeat reales, almacenamiento privado
  real, envio Resend ni smoke autenticado completo. No confirma produccion.
  Las tareas compuestas que exigen esas comprobaciones permanecen abiertas.

- Implementacion local actual: catalogo, asignacion, upgrades/downgrades,
  renovaciones, cartera, pagos completos/anulacion, emisor, comprobante PDF real,
  descarga privada, envio Resend explicito, recuperacion/conciliacion, consulta
  del dueno y detalle historico de metricas estan conectados en codigo.
- 0049 agrega liquidacion atomica y reglas compartidas con proveedor; pago,
  snapshot y outbox confirman o revierten juntos. Las invoices comerciales CLP
  del proveedor usan el mismo helper de comprobante; su metodo es proveedor
  externo, sin inventar que el evento corresponde a tarjeta. Documentos/precios
  de eventos legacy mantienen su comportamiento anterior.
- 0050 agrega autorizacion por documento, prioridad del contacto de facturacion,
  fallback confirmado, leases, backoff PDF, estados independientes e incertidumbre
  de correo sin reenvio automatico. La configuracion incompleta de Resend no
  impide generar PDFs. Se audita acceso y conciliacion.
- 0051 consulta contratos/deuda/pagos/comprobantes de duenos activos, incluso
  en academias suspendidas, fuera del guard operativo. Incluye academias por
  nombre, deuda total por moneda y paginacion, sin mutaciones administrativas.
- 0052 enlaza cada indicador al ledger del mismo mes UTC/moneda, con total de
  todas las paginas, reembolsos negativos y MRR de la version/duracion historica.
  La regresion integrada de reconciliacion fue reportada exitosa en staging;
  el smoke localhost posterior reconcilio los cuatro indicadores, desgloses y
  CSV con el pago simulado persistido; otros escenarios historicos y concurrencia
  conservan sus verificaciones pendientes.
- PDF usa Noto Sans estatico WOFF (SIL OFL 1.1), no WOFF2/variable. Pruebas con
  PDF.js verifican texto extraible, tildes, importes, ultima pagina/servicio,
  leyenda por pagina y hash determinista. El build traza el archivo de fuente.
- Validacion actual: 576 tests en 60 archivos, tsc independiente y de rutas
  generadas, build aislado y 18 escenarios Playwright en los seis anchos pasan.
  El lint normal se ejecuta sin incluir artefactos del build aislado.
  Los 53 bundles cliente no contienen identificadores ni valores configurados
  de service-role, secretos de renovacion/documentos ni clave Resend.
- Regresion integrada 0049 preparada para migraciones hasta 0052: atomicidad,
  fallo de outbox, emisor/IVA, deuda restante, idempotencia, leases/unknown,
  prioridad de destinatario, duenos suspendidos/revocados/ajenos y metricas.
  Ejecucion exitosa reportada por el operador en staging. Procedimientos de dos
  conexiones siguen pendientes.
- Plantilla opt-in de scheduler con Vault/pg_cron/pg_net y runbook de despliegue/
  recuperacion preparados; el operador reporto ejecutar la plantilla en staging.
  El asistente no activo cron, envio correos ni aplico SQL remoto. Ambos workers
  siguen desactivados por defecto en codigo; su configuracion efectiva y actividad
  en staging no han sido verificadas. No hay smoke real completo confirmado.
- El usuario pidio avanzar con todo el codigo y dejar SQL para despues. Las
  tareas abiertas contienen verificaciones SQL, almacenamiento/proveedor real,
  concurrencia o despliegue: no se marcan completas por compilacion o mocks.

### Registro de incrementos anteriores (estado historico, no estado actual)

- El 2026-10-18 el usuario confirmo ejecucion exitosa de los scripts previos
  hasta 0047, tras corregir la colision de nombres de constraints de 0042.
  Esto no acredita por si solo las regresiones PostgreSQL ni concurrencia.
- 4.1/6.1/6.3: cartera y detalle de cobranza preparados con RPC auditadas 0048,
  paginacion/filtros en servidor, saldos exactos, moneda historica, importaciones
  liquidadas sin pagos inventados, intentos en curso y reembolsos separados.
  Navegacion Cobranza, enlaces de tenant/finanzas y retorno conservando filtros.
  Detalle usa una sola instantanea SQL y muestra limites/conteos de eventos.
  Registro de pagos y anulacion siguen pendientes; no se ofrecen botones falsos.
- 5.1/6.5: emisor versionado preparado en 0048 y capas/UI, con RUT normalizado
  y checksum, datos requeridos, razon, idempotencia y control de version obsoleta.
  El formulario conserva borrador/reintento y no confunde configuracion de emisor
  con disponibilidad de PDF, correo ni autorizacion SII.
  Regresion SQL 0048 preparada; no ejecutada por el asistente.
- Validacion del incremento de cobranza/emisor: 413 tests en 42 archivos,
  typecheck independiente y de rutas generadas, lint focalizado y build aislado
  pasan. La suite de navegador ahora incluye 14 escenarios; se verifica el CTA
  del emisor fuera de la navegacion movil mediante margen de scroll.
  Se revisaron 51 bundles cliente del build final sin identificadores ni valores
  de clave privilegiada/secreto de renovaciones. Las tareas con verificacion SQL
  siguen abiertas. Progreso formal: 3/36 tareas completas.
- 6.1 completada: navegacion Planes/Cobranza y catalogo/creacion/versionado/
  archivo verificados con teclado, errores, borrador y tarjetas/table en los seis
  anchos. Las pruebas sinteticas no acreditan persistencia SQL ni staging.
- El usuario autorizo continuar preparando codigo y migraciones sin ejecutar SQL
  hasta disponer de PostgreSQL desechable. No se aplicaron cambios remotos.
- 1.3/1.4: migraciones 0041 y 0042 preparadas; backfill, constraints, RLS y
  concurrencia no verificados en PostgreSQL.
- 2.1/2.3: catalogo preparado con RPC auditadas e idempotentes (0043),
  puerto/adaptador/composicion y contratos runtime; falta verificar persistencia
  SQL e integrar los contratos de asignacion/cobranza restantes.
- 2.2: asignacion inicial preparada de extremo a extremo en codigo: dominio,
  puerto/casos de uso, adaptador con contrato runtime, acciones, UI y RPC
  transaccional 0044. Incluye prueba opcional, vencimiento, limites/uso,
  auditoria e idempotencia. Script SQL 0044 preparado, no ejecutado.
- 3.1/3.2: preview y confirmacion de upgrades preparados en 0046 y capas/UI,
  con tarifa racional vigente, huella, motivo, deuda proporcional y renovacion
  conservada. Tests puros/adaptador/acciones/UI y navegador cubren 30.000 a
  60.000 con 10/30 dias = 10.000, upgrades sucesivos, cero redondeado y conflicto.
  Verificacion transaccional/concurrente PostgreSQL sigue pendiente.
- 3.3/3.4: reglas puras de renovacion y RPC 0047 preparadas para un periodo
  atomico, fin de trial, siguiente periodo completo tras upgrade, version
  contratada archivada y catch-up acotado. Revalida uso bajo bloqueos; downgrade
  excedido queda blocked, renueva el contrato anterior una vez y prepara aviso
  interno al dueno y aviso durable para el administrador en la consola.
  Conserva errores/reintentos y resultados idempotentes. Script SQL 0047 y
  procedimiento de dos conexiones preparados; no ejecutados.
- 3.5: programacion/cancelacion y rechazo del bypass legacy preparados. La
  renovacion rechaza anclas/monedas y programaciones de limites ambiguas en vez
  de convertirlas o sobrescribirlas. Conciliacion y prueba SQL siguen pendientes.
- 8.1: endpoint POST protegido de renovaciones y revision manual preparados,
  ambos desactivados por defecto mediante SAAS_RENEWALS_ENABLED. Lote maximo de
  10 periodos, cooldown de 5 minutos y tope de 3 fallos por periodo; agotamiento
  requiere conciliacion/reintento explicito. No hay scheduler desplegado ni
  ejecucion real en staging; los procesadores PDF/correo permanecen pendientes.
- 6.2: resumen contractual y tareas mobile-first de asignacion/cambio/cancelacion
  implementados con preview, confirmacion y borrador retenido. El historial de
  moneda/precio no se reemplaza por valores actuales del catalogo.
- Consola de renovaciones agregada en Finanzas con contador de pendientes,
  fallos, cambios bloqueados y heartbeat real del worker separado de solicitudes
  manuales. Configuracion no se presenta como despliegue exitoso; alerta tras
  30 minutos sin actividad. Ninguna consulta GET ejecuta renovaciones.
- 7.3: consulta financiera 0045 preparada para MRR por duracion y saldo por
  invoice sin multiplicar cargos; preserva importaciones legacy pagadas sin
  ledger. Regresion SQL 0045 preparada, no ejecutada; reconciliacion/export y
  drill-down completos permanecen pendientes.
- 6.1: navegacion Planes y catalogo/creacion/versionado/archivo implementados,
  con tarjetas moviles y tabla desktop. Pruebas de navegador en los seis anchos
  y casos de borrador/reintento/archivo pasan con almacenamiento sintetico.
  Navegacion y pantallas de Cobranza agregadas en el incremento 0048 descrito arriba.
- Catalogo y tareas contractuales compilan en build de produccion aislado. Los tests sinteticos de UI
  no certifican autorizacion, transacciones ni entrega externa en produccion.
- Validacion local previa al incremento 0048: 321 tests en 34 archivos, 11 escenarios
  Playwright, typecheck independiente, lint focalizado y build pasan. Se revisaron
  50 bundles cliente del build aislado sin encontrar la clave privilegiada ni su
  valor; tambien se reviso ausencia del secreto del worker de renovaciones.
  Las tareas SQL e integracion financiera permanecen abiertas. No se
  marcan como completas por pasar pruebas con datos sinteticos.
