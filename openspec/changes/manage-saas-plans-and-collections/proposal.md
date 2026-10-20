## Why

La plataforma ya posee tablas SaaS de planes, suscripciones, cobros y metricas, pero no permite administrar su ciclo comercial completo desde la interfaz. Necesitamos gestionar a los gimnasios como clientes, registrar pagos y entregar comprobantes, sin confundir esta contabilidad con los cobros de alumnos.

## What Changes

- Catalogo de planes con versiones comerciales, servicios descriptivos, funciones soportadas, limites, duracion configurable en dias o meses y precio final en CLP.
- Asignacion de planes a tenants, renovaciones idempotentes e historial de condiciones contratadas.
- Gestion de cobros pendientes, vencidos y pagados; registro administrativo del pago completo por transferencia, efectivo o tarjeta externa.
- Upgrade inmediato con cobro proporcional pendiente y downgrade programado a la siguiente renovacion, con previsualizacion y motivo obligatorio.
- Boleta referencial PDF por pago confirmado: total en pesos, neto e IVA informativo incluido del 19%, emisor configurable y leyenda sin validez tributaria.
- Descarga autenticada y envio desde la plataforma mediante Resend, con estados y reintentos de entrega independientes del pago.
- Dashboard financiero conectado al mismo libro de cobros, pagos y cambios de plan.
- Acceso de solo consulta para el dueno a su plan, cobros, pagos y comprobantes.
- Interfaz mobile first coherente con los componentes existentes, sin reemplazar el trabajo reciente de backoffice o academia.

## Capabilities

### New Capabilities

- `saas-payment-receipts`: Emision y descarga de comprobantes PDF referenciales y envio transaccional auditable.

### Modified Capabilities

- `saas-administration-billing`: Catalogo flexible, asignacion y renovacion, cambios de plan, pagos completos manuales, indicadores y acceso financiero del dueno.

## Impact

- Extiende las tablas y RPC existentes de `saas_plans`, `saas_subscriptions`, `saas_limits`, `saas_invoices`, `saas_charges` y auditoria privilegiada mediante migraciones posteriores a 0040.
- Afecta dominio, casos de uso, adaptadores, composicion, backoffice de tenants y finanzas; agrega catalogo, cobranza, documentos y consulta del dueno.
- Revisa compatibilidad de webhooks e indicadores actuales y del cambio abierto `set-platform-currency-clp`; no elimina monedas historicas ni convierte sus importes.
- Agrega generacion PDF en servidor, almacenamiento privado y proveedor de correo Resend, con secretos solo en infraestructura y remitente verificado.
- Requiere pruebas de concurrencia, idempotencia, aislamiento, calculos exactos, PDF real, entrega y seis viewports.

## Non-goals

- Pasarela de pago online, captura de tarjetas, debito automatico, conciliacion bancaria o integracion tributaria SII.
- Abonos parciales nuevos, sobrepagos, credito a favor o devoluciones automaticas por downgrade.
- Modificar pagos de alumnos, historiales medicos o conceder al dueno permisos administrativos SaaS.
- Edicion retroactiva de comprobantes emitidos o sustitucion automatica del contacto de facturacion por el contacto principal.
