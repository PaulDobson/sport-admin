## Context

Ver `proposal.md` para la motivacion. Actualmente los importes guardan una moneda ISO de tres letras por entidad, las proyecciones ya separan resultados por moneda y las vistas formatean con un locale español genérico. Los defaults de persistencia y del formulario de planes usan USD.

## Goals / Non-Goals

**Goals:**

- Centralizar `CLP` como default de nuevos registros financieros y SaaS.
- Presentar importes con locale `es-CL` y precisión coherente con el peso chileno.
- Mantener la moneda asociada a cada registro y evitar agregaciones entre monedas.
- Mantener compatibilidad con webhooks y pagos CLP sin relajar las validaciones ISO existentes.

**Non-Goals:**

- Convertir importes históricos o recalcular precios existentes.
- Eliminar USD, EUR u otras monedas válidas.
- Crear conversión de divisas o una tasa de cambio.
- Rediseñar el proveedor de pagos o cambiar el contrato de autenticación de webhooks.

## Decisions

### Default de moneda en el dominio de persistencia

Usar CLP como default de base de datos donde actualmente un default explícito sea necesario, y usar CLP como valor inicial en formularios y flujos de creación. La acción de servidor y las validaciones conservarán la moneda enviada cuando sea válida, permitiendo multimoneda explícita.

Alternativa descartada: imponer CLP en cada registro. Rompería planes históricos y el requisito existente de indicadores separados por moneda.

### Formato de presentación

Usar `es-CL` para importes de finanzas, reportes y backoffice. CLP se formateará sin decimales, mientras que otras monedas conservarán la precisión que determine `Intl.NumberFormat` para su código.

Alternativa descartada: fijar dos decimales para todas las monedas. Produce una representación ajena al uso habitual de CLP y no aprovecha la información de precisión del código ISO.

### Migración de datos

Agregar una migración aditiva para defaults futuros y no actualizar filas existentes. Los fixtures que prueban multimoneda conservarán USD/EUR; los nuevos casos de default usarán CLP.

Alternativa descartada: convertir USD a CLP durante la migración. No existe una fecha de corte ni una tasa histórica definida, y cambiaría importes auditables.

### Pagos y webhooks

Mantener la validación de moneda como código ISO en mayúsculas y añadir casos CLP en pruebas de normalización y procesamiento. Verificar la representación de importes que exige el proveedor, porque el contrato actual acepta cantidades con dos decimales aunque CLP se presente sin decimales.

Alternativa descartada: aceptar cantidades con formato libre. Aumentaría la ambigüedad y debilitaría la frontera de validación de pagos.

## Risks / Trade-offs

- **[Riesgo]** CLP puede llegar desde un proveedor como entero o como cadena con dos decimales. **Mitigación:** fijar el formato de transporte soportado mediante pruebas del adaptador, sin confundirlo con el formato visual.
- **[Riesgo]** Cambiar solo el formulario dejaría defaults USD en migraciones o datos iniciales. **Mitigación:** cubrir defaults de persistencia, creación y presentación en pruebas separadas.
- **[Riesgo]** La precisión de CLP puede perderse si se redondean proyecciones con dos decimales antes de presentar. **Mitigación:** mantener precisión financiera interna y aplicar la precisión de display únicamente al formatear.
- **[Riesgo]** Los datos históricos pueden parecer inconsistentes visualmente con los nuevos planes. **Mitigación:** mostrar siempre el código de moneda del registro y documentar que no se convierten históricos.

## Migration Plan

1. Publicar cambios de default y presentación junto con pruebas de CLP.
2. Ejecutar migraciones sin actualización de filas históricas.
3. Verificar creación de un plan nuevo, proyecciones mixtas, exportación y webhook CLP.
4. Si se requiere rollback, revertir el default de nuevos registros y el locale de presentación; no modificar ni revertir datos financieros ya creados.
