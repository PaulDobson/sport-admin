## Why

La plataforma se utilizará en Chile, pero actualmente presenta USD como valor predeterminado y utiliza un locale español genérico para importes. Esto puede producir planes nuevos con una moneda incorrecta y formatos poco naturales para usuarios chilenos.

## What Changes

- Definir CLP como moneda local predeterminada para nuevos planes, membresías y suscripciones SaaS.
- Usar `es-CL` para presentar importes y respetar el formato chileno del peso, normalmente sin decimales.
- Mantener el soporte multimoneda existente y separar los indicadores por moneda sin mezclar importes.
- Conservar sin cambios la moneda y el importe de registros históricos existentes; no realizar conversiones automáticas.
- Revisar validaciones, formularios, reportes, exportaciones, integraciones de pago y pruebas para que CLP sea un caso soportado de primera clase.
- Mantener fixtures USD/EUR cuando prueben explícitamente el comportamiento multimoneda.

## Capabilities

### New Capabilities

<!-- No se introduce una capacidad independiente; se modifica el comportamiento de finanzas existente. -->

### Modified Capabilities

- `instructor-finance`: los nuevos planes y registros financieros deben usar CLP como moneda predeterminada y mostrar importes con formato chileno, conservando moneda por registro e históricos.
- `saas-administration-billing`: los nuevos planes y suscripciones SaaS deben usar CLP como moneda predeterminada, mantener agregación separada por moneda y representar correctamente importes CLP.

## Impact

- Formularios y acciones de finanzas del dashboard, incluyendo el valor predeterminado de moneda.
- Presentación de importes en finanzas, reportes y backoffice, con locale `es-CL` y precisión apropiada para CLP.
- Migraciones y datos iniciales de Supabase para defaults de nuevos registros; no se alterarán importes históricos.
- Validación y normalización de eventos de pagos y webhooks para aceptar CLP sin debilitar la validación existente.
- Pruebas unitarias, de integración SQL, API y end-to-end relacionadas con finanzas y facturación.
