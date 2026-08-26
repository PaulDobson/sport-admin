# saas-administration-billing Specification

## Purpose

Proporciona al administrador de la plataforma control de tenants, suscripciones SaaS, limites, cobros e indicadores sin conceder acceso medico innecesario.

## Requirements

### Requirement: Administracion de tenants

El sistema SHALL permitir al administrador SaaS revisar registros, verificar instructores, activar, suspender, reactivar y cancelar tenants, conservando historial de estados y motivos.

#### Scenario: Activar tenant

- **WHEN** un administrador valida un registro pendiente
- **THEN** el tenant pasa a estado activo o trial y el instructor recibe acceso conforme al plan

#### Scenario: Suspender por mora

- **WHEN** un tenant excede la politica de mora SaaS
- **THEN** el sistema restringe funciones segun el plan, conserva sus datos y registra el motivo

### Requirement: Suscripciones SaaS

El sistema SHALL administrar planes SaaS, limites de alumnos y usuarios, periodo de prueba, precio, moneda, ciclo, estado de cobro y eventos del proveedor de pagos.

#### Scenario: Cambio de plan

- **WHEN** se confirma un cambio de plan
- **THEN** el sistema actualiza limites y facturacion desde el periodo definido y conserva el evento anterior

#### Scenario: Pago SaaS fallido

- **WHEN** el proveedor informa un cobro fallido
- **THEN** el tenant pasa al estado de cobro correspondiente, se registra el evento y se activa el flujo de notificacion

### Requirement: Indicadores financieros SaaS

El sistema SHALL mostrar MRR, ARR, ARPA, churn, conversion de trial, cobrado, pendiente y tenants en mora con periodo, moneda y definicion de calculo visibles.

#### Scenario: Consultar dashboard

- **WHEN** un administrador abre indicadores para un periodo
- **THEN** el sistema muestra valores agregados reproducibles y no mezcla cobros SaaS con cobros de alumnos

### Requirement: Privacidad administrativa

El sistema SHALL separar administracion tecnica y financiera de lectura de datos de salud, y SHALL auditar accesos privilegiados.

#### Scenario: Administrador consulta tenant

- **WHEN** un administrador SaaS revisa estado, limites o finanzas de un tenant
- **THEN** puede ver esos datos sin obtener historiales medicos por defecto

### Requirement: Operaciones administrativas auditables

El sistema SHALL registrar actor, tenant, accion, motivo, fecha y resultado para activaciones, suspensiones, cambios de plan, reembolsos y accesos privilegiados.

#### Scenario: Revertir suspension

- **WHEN** un administrador reactiva un tenant suspendido
- **THEN** el historial muestra la transicion, actor y motivo sin eliminar el evento de suspension
