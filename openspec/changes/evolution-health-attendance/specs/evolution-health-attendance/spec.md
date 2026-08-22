## Purpose

Permite a instructores independientes registrar asistencia, evolucion y condiciones de salud de sus alumnos de forma segura, rapida y confiable incluso con conectividad intermitente.

## ADDED Requirements

### Requirement: Configuracion de metricas deportivas

El sistema SHALL permitir que cada instructor defina metricas de evolucion por tenant, incluyendo nombre, identificador estable, tipo de dato, unidad, categoria y reglas de validacion. Los tipos soportados SHALL incluir al menos numero, porcentaje, duracion, booleano, seleccion y objeto estructurado.

#### Scenario: Crear una metrica personalizada

- **WHEN** un instructor autorizado crea una metrica con nombre, tipo, unidad y reglas validas
- **THEN** el sistema la guarda asociada exclusivamente a su tenant y la ofrece en los formularios de evolucion

#### Scenario: Rechazar un valor incompatible

- **WHEN** se registra un valor que no coincide con el tipo o rango definido para la metrica
- **THEN** el sistema rechaza la operacion y devuelve un error accionable sin crear una medicion parcial

### Requirement: Historial de evolucion por alumno

El sistema SHALL permitir registrar mediciones fechadas, observaciones y autor por alumno, conservar el historial sin sobrescribir registros anteriores y mostrar la evolucion solo a usuarios autorizados del tenant.

#### Scenario: Registrar una evaluacion

- **WHEN** un instructor registra valores validos para un alumno
- **THEN** el sistema crea una evaluacion con fecha, autor, valores y notas, y la incluye en el historial cronologico del alumno

#### Scenario: Consultar el historial

- **WHEN** un usuario autorizado abre la evolucion de un alumno
- **THEN** el sistema muestra mediciones anteriores y actuales junto con la definicion de cada metrica y su unidad

### Requirement: Registro de salud y lesiones

El sistema SHALL permitir registrar condiciones medicas declaradas, lesiones, dolor, restricciones de ejercicio, severidad, vigencia, fuente y estado. El sistema SHALL distinguir datos declarados por el alumno, observaciones del instructor y alertas operativas, y SHALL conservar auditoria de accesos y cambios.

#### Scenario: Registrar una restriccion activa

- **WHEN** un usuario autorizado registra una lesion vigente con restricciones de ejercicio
- **THEN** el sistema la guarda con estado activo y la considera para las alertas de las sesiones del alumno

#### Scenario: Resolver una lesion

- **WHEN** un usuario autorizado marca una lesion como resuelta
- **THEN** el sistema conserva el historial, deja de tratarla como restriccion vigente y registra quien y cuando realizo el cambio

### Requirement: Semaforo de salud antes de la clase

El sistema SHALL mostrar al instructor las alertas de salud vigentes y relevantes de los alumnos de una sesion antes de iniciar la actividad. Cada alerta SHALL incluir nivel textual, motivo y accion operativa, y no SHALL presentarse solo mediante color.

#### Scenario: Sesion con alerta roja

- **WHEN** una sesion contiene un alumno con una condicion que requiere revision previa
- **THEN** la pantalla de la sesion muestra una alerta roja textual con la accion de revisar antes de iniciar

#### Scenario: Sesion sin alertas vigentes

- **WHEN** una sesion no tiene condiciones o restricciones activas visibles para el instructor
- **THEN** el sistema muestra el estado sin alertas y no inventa recomendaciones medicas

### Requirement: Asistencia rapida por lote

El sistema SHALL permitir abrir la sesion actual, marcar asistencia mediante una lista de alumnos y guardar asistencia y novedades rapidas en un flujo de hasta tres acciones principales, sin exigir un formulario individual por alumno.

#### Scenario: Registrar cinco alumnos

- **WHEN** el instructor abre una sesion con cinco alumnos y marca las excepciones de asistencia y novedades
- **THEN** puede guardar los registros de la sesion en un unico envio por lote y cada alumno queda con su estado correspondiente

#### Scenario: Reintentar un guardado

- **WHEN** el mismo lote se envia mas de una vez por reintento de red
- **THEN** el sistema no duplica registros ni eventos de asistencia

### Requirement: Alertas de riesgo de abandono

El sistema SHALL identificar alumnos con patrones configurables de ausencias o baja asistencia y mostrar el motivo, el periodo analizado y la fecha de calculo al instructor autorizado.

#### Scenario: Ausencias consecutivas

- **WHEN** un alumno acumula el umbral configurado de ausencias consecutivas
- **THEN** el sistema crea o actualiza una alerta de riesgo de abandono sin crear duplicados

#### Scenario: Recuperacion de asistencia

- **WHEN** el alumno vuelve a cumplir el criterio de asistencia durante el periodo de observacion
- **THEN** el sistema resuelve o deja de mostrar la alerta segun la politica configurada y conserva su historial

### Requirement: Aislamiento de datos por tenant

El sistema SHALL impedir que un usuario consulte, cree, modifique o elimine alumnos, asistencias, evolucion, salud o alertas pertenecientes a otro tenant. Las decisiones de autorizacion SHALL considerar la identidad autenticada, la pertenencia activa al tenant y el rol requerido.

#### Scenario: Usuario de otro tenant consulta un alumno

- **WHEN** un usuario autenticado intenta leer un alumno que pertenece a otro tenant
- **THEN** el sistema no devuelve el registro y no revela su existencia

#### Scenario: Usuario sin rol modifica salud

- **WHEN** un miembro sin permiso intenta modificar datos de salud
- **THEN** el sistema rechaza la operacion y registra el intento segun la politica de auditoria

### Requirement: Actualizaciones en tiempo real

El sistema SHALL actualizar las pantallas autorizadas de una sesion cuando cambien la asistencia o una alerta de salud relevante, sin exponer datos fuera del tenant ni requerir una recarga manual.

#### Scenario: Cambio de asistencia desde otro dispositivo

- **WHEN** un instructor autorizado modifica la asistencia de un alumno en otro dispositivo conectado
- **THEN** la sesion abierta recibe el cambio y actualiza su estado visible

#### Scenario: Nueva alerta durante una sesion

- **WHEN** se registra o modifica una restriccion activa de un alumno inscrito
- **THEN** las pantallas autorizadas reciben una actualizacion de la alerta y muestran su nivel y accion vigente

### Requirement: Operacion offline y sincronizacion

El sistema SHALL permitir consultar una sesion previamente cargada y registrar asistencia y novedades rapidas sin conexion. Las operaciones pendientes SHALL conservarse localmente, mostrar su estado al instructor y sincronizarse de forma idempotente al recuperar conectividad.

#### Scenario: Registrar asistencia sin senal

- **WHEN** el instructor pierde conectividad con una sesion previamente cargada
- **THEN** puede registrar asistencia, la interfaz indica que el cambio esta pendiente y no lo presenta como sincronizado

#### Scenario: Recuperar conectividad

- **WHEN** el dispositivo vuelve a tener conexion
- **THEN** el sistema envia las operaciones pendientes, confirma las aceptadas por autorizacion y elimina solo las operaciones sincronizadas

#### Scenario: Alertas potencialmente desactualizadas

- **WHEN** el instructor abre una sesion sin conexion y la copia de alertas no tiene frescura suficiente
- **THEN** el sistema indica que las alertas pueden estar desactualizadas y exige verificacion manual antes de iniciar
