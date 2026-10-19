## Purpose

Entregar comprobantes referenciales verificables de pagos SaaS a los gimnasios, con descarga privada y envio transaccional sin confundirlos con documentos tributarios.

## ADDED Requirements

### Requirement: Comprobante referencial inmutable

Cada pago completo confirmado SHALL originar un comprobante con folio unico, emisor configurable, tenant receptor, contacto de facturacion, plan y servicios contratados, periodo, concepto, fecha, metodo, referencia, total CLP y desglose informativo de neto e IVA incluido del 19%. El documento SHALL indicar prominentemente "Comprobante referencial - sin validez tributaria" y SHALL NOT presentarse como boleta electronica autorizada por SII. Los datos emitidos SHALL ser snapshots inmutables.

#### Scenario: IVA incluido

- **WHEN** el pago total es CLP 11.900
- **THEN** el comprobante muestra neto 10.000, IVA informativo 1.900 y total 11.900 sin agregar nuevamente el impuesto

#### Scenario: Redondeo e historial

- **WHEN** el total no permite una division exacta por 1,19 o se modifica despues el emisor, tenant o plan
- **THEN** el neto se redondea al peso, IVA es total menos neto y el documento original conserva sus datos y suma exacta

#### Scenario: Configuracion incompleta

- **WHEN** faltan nombre o razon social, RUT, direccion o email del emisor
- **THEN** se informa antes de confirmar la operacion que no puede emitirse el comprobante y no se simula una emision exitosa

### Requirement: PDF privado y recuperable

El sistema SHALL generar un PDF real con texto legible, fuentes que soporten nombres en espanol, multiples paginas cuando corresponda y almacenamiento privado. SHALL permitir descarga al administrador SaaS y al dueno autorizado, auditando accesos y sin exponer enlaces publicos permanentes.

#### Scenario: Descarga autorizada

- **WHEN** un usuario autorizado solicita un comprobante generado
- **THEN** recibe bytes PDF validos, nombre de archivo y tipo application/pdf, coincidentes con el snapshot de emision

#### Scenario: Falla de generacion

- **WHEN** el renderizado o almacenamiento falla despues de confirmar un pago
- **THEN** el pago permanece confirmado, el documento aparece con error o pendiente y se puede regenerar sin duplicar pago ni folio

#### Scenario: Acceso ajeno

- **WHEN** otro tenant o una persona sin sesion solicita el identificador o archivo
- **THEN** se rechaza la descarga y no se revela el contenido

### Requirement: Envio transaccional explicito

El administrador SaaS SHALL poder enviar o reenviar el PDF desde la plataforma al email de facturacion confirmado. Si este falta, SHALL indicar explicitamente su ausencia y permitir confirmar el email del contacto principal antes de enviar, sin modificar silenciosamente los datos de facturacion. La entrega SHALL registrar destinatario, actor, estado, intentos y resultado del proveedor.

#### Scenario: Enviar comprobante

- **WHEN** el administrador confirma destinatario y envio de un PDF listo
- **THEN** se encola una unica entrega idempotente con el archivo y se muestra su estado real

#### Scenario: Falla de correo

- **WHEN** el proveedor rechaza el envio o falta la configuracion de correo
- **THEN** se informa el error, el pago y el PDF siguen disponibles y un reintento no duplica el pago ni el comprobante

#### Scenario: Aceptacion no implica entrega

- **WHEN** el proveedor acepta el mensaje sin confirmacion posterior de recepcion
- **THEN** la interfaz muestra enviado al proveedor y no afirma que fue entregado al destinatario
