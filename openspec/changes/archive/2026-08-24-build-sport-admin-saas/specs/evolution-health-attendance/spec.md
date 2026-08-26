## Purpose

Permite registrar evolucion deportiva, salud, asistencia y alertas de alumnos con captura rapida, aislamiento por tenant y tolerancia a conectividad intermitente.

## ADDED Requirements

### Requirement: Metricas deportivas configurables

El sistema SHALL permitir definir metricas por tenant con tipo, unidad, categoria, identificador estable y validaciones, y registrar valores sin sobrescribir el historial.

#### Scenario: Registrar metrica personalizada

- **WHEN** un instructor crea una metrica y registra un valor compatible
- **THEN** la metrica y medicion quedan disponibles solo para su tenant y alumno autorizado

#### Scenario: Valor invalido

- **WHEN** el valor no respeta tipo o rango
- **THEN** el sistema rechaza la medicion sin guardar un registro parcial

### Requirement: Salud y semaforo operativo

El sistema SHALL conservar condiciones, lesiones, dolor, restricciones, vigencia, fuente y estado, y mostrar alertas textuales rojas, amarillas o verdes antes de una sesion.

#### Scenario: Restriccion activa

- **WHEN** un alumno inscrito tiene una restriccion vigente
- **THEN** la sesion muestra nivel, motivo y accion operativa antes de iniciar

#### Scenario: Resolver lesion

- **WHEN** un usuario autorizado resuelve una lesion
- **THEN** deja de generar una alerta vigente y conserva el historial y auditoria

### Requirement: Gobernanza y derechos sobre datos de salud

El sistema SHALL mantener la capacidad de salud deshabilitada en produccion hasta registrar la aprobacion legal de una politica jurisdiccional, SHALL conservar consentimiento explicito y versionado declarado por un instructor autorizado en representacion del alumno o tutor, y SHALL soportar acceso, exportacion, correccion y solicitudes de eliminacion auditables.

#### Scenario: Salud sin aprobacion legal

- **WHEN** un tenant intenta crear o modificar datos de salud sin una politica jurisdiccional aprobada
- **THEN** el sistema rechaza la operacion sin exponer datos existentes

#### Scenario: Consentimiento representado

- **WHEN** un instructor autorizado declara consentimiento para un alumno bajo una version de politica aprobada
- **THEN** el sistema conserva tenant, alumno, actor, version, fecha y estado del consentimiento en historial inmutable

#### Scenario: Derechos del titular

- **WHEN** un usuario autorizado solicita exportar o corregir los datos de un alumno
- **THEN** el sistema limita el alcance al tenant, entrega datos estructurados o aplica la correccion y audita la operacion

#### Scenario: Solicitud de eliminacion

- **WHEN** se acepta una solicitud de eliminacion de un alumno
- **THEN** el sistema registra una espera de 30 dias y bloquea la purga mientras exista retencion legal o falte aprobacion de la politica aplicable

### Requirement: Asistencia y abandono

El sistema SHALL permitir asistencia y novedades por lote en hasta tres acciones principales y SHALL generar alertas de abandono con criterios configurables por instructor.

#### Scenario: Captura rapida

- **WHEN** el instructor abre una sesion y marca excepciones para cinco alumnos
- **THEN** puede guardar el lote sin abrir un formulario individual obligatorio por alumno

#### Scenario: Riesgo configurable

- **WHEN** se alcanza un umbral configurado de ausencias o baja asistencia
- **THEN** el sistema crea una alerta deduplicada con motivo, periodo y fecha de calculo

### Requirement: Operacion offline idempotente

El sistema SHALL permitir capturar asistencia de una sesion precargada sin conexion, conservar operaciones pendientes y sincronizarlas sin duplicados al reconectar.

#### Scenario: Cambio pendiente

- **WHEN** el instructor registra asistencia sin red
- **THEN** la interfaz muestra el cambio como pendiente y conserva la operacion localmente

#### Scenario: Alerta desactualizada

- **WHEN** se consulta salud offline con una copia fuera de la frescura permitida
- **THEN** el sistema advierte que puede estar desactualizada y exige verificacion manual

### Requirement: Actualizacion operativa en tiempo real

El sistema SHALL actualizar asistencia y alertas relevantes en pantallas autorizadas conectadas, y SHALL resincronizar cambios perdidos despues de una desconexion.

#### Scenario: Cambio concurrente

- **WHEN** otro dispositivo autorizado modifica la asistencia o una alerta de la sesion
- **THEN** la pantalla conectada refleja el estado nuevo sin recarga manual
