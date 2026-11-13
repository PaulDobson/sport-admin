# Requirements Document

## Introduction

El módulo "Entrenamientos EFC" extiende la aplicación sport-admin con una suite de herramientas para planificación periódica según el método EFC (Estructura – Función – Cognición), aplicado al taekwondo de combate deportivo. Se integra como nueva sección dentro del menú `/dashboard/trainings` y amplía el perfil del alumno en `/dashboard/students` con datos biométricos y tests físicos específicos. Los porcentajes de distribución del método EFC son orientativos y no constituyen prescripción científica validada.

## Glossary

- **EFC_Module**: El módulo completo "Entrenamientos EFC" implementado en esta spec.
- **EFC_Dashboard**: Pantalla principal del módulo EFC que muestra el resumen del macrociclo activo.
- **EFC_Library**: Sección de biblioteca con la documentación conceptual del método EFC.
- **EFC_Profile**: Sección del perfil de un alumno con datos biométricos y tests físicos EFC.
- **Macrocycle_Planner**: Formulario y visualización para crear y administrar macrociclos EFC.
- **Microcycle_Builder**: Constructor de microciclos semanales con distribución de cargas por actividad.
- **OneRM_Calculator**: Calculadora de 1 Repetición Máxima con interconexión al período EFC del deportista.
- **Load_Visualizer**: Módulo de gráficos de ondulación de carga y distribución EFC.
- **Athlete**: Deportista registrado en el sistema (alumno existente).
- **Macrocycle**: Ciclo de entrenamiento de largo plazo comprendido entre una fecha de inicio y una competencia principal.
- **Microcycle**: Semana de entrenamiento con distribución de cargas diarias dentro de un macrociclo.
- **EFC_Period**: Etapa del macrociclo asignada al deportista: Estructura (E), Función (F) o Cognición (C).
- **Session_Load**: Distribución de minutos por categoría de actividad para un día de entrenamiento.
- **Microcycle_Type**: Tipo de microciclo semanal: AJ (Ajuste), C (Carga), I (Impacto), AC (Activación), CO (Competitivo), R (Recuperación).
- **Intensity_Scale**: Escala numérica de intensidad del 0 al 9 (0=Reposo, 1=Muy muy suave, 2=Muy suave, 3=Suave, 4=Algo duro, 5=Duro, 6=Más duro, 7=Muy duro, 8=Muy muy duro, 9=Máximo).
- **FCMax**: Frecuencia cardíaca máxima calculada con la fórmula Whaley y cols. (1992).
- **FC_Rest**: Frecuencia cardíaca en reposo del deportista.
- **TMB**: Tasa Metabólica Basal calculada con la fórmula Harris-Benedict.
- **IMC**: Índice de Masa Corporal (peso en kg / altura en m²).
- **OneRM**: 1 Repetición Máxima estimada a partir de peso levantado y repeticiones realizadas.
- **RIR**: Repeticiones en Reserva (repeticiones que quedan antes del fallo).
- **RPE**: Percepción subjetiva del esfuerzo en escala del 6 al 10.
- **Supabase**: Backend de base de datos PostgreSQL y autenticación utilizado en el proyecto.
- **System**: La aplicación sport-admin como conjunto.
- **ACWR**: Ratio Agudo:Crónico (Acute:Chronic Workload Ratio). Cociente entre la carga aguda (media de 7 días) y la carga crónica (media de 28 días) calculadas a partir del sRPE diario.
- **CA**: Carga Aguda. Media móvil de la carga de sesión (sRPE × duración) de los últimos 7 días.
- **CC**: Carga Crónica. Media móvil de la carga de sesión (sRPE × duración) de los últimos 28 días.
- **sRPE**: Session Rate of Perceived Exertion. Carga interna de la sesión calculada como RPE (escala 1–10) × Duración real (minutos).
- **Monotonia_Foster**: Índice de Monotonía de Foster. Cociente entre la media de carga diaria semanal y su desviación estándar.
- **Strain**: Tensión o estrés semanal. Producto de la carga semanal total (sRPE_semana) por el Monotonia_Foster.
- **FCR**: Frecuencia Cardíaca de Reserva (Karvonen). Diferencia entre FCMax y FC_Rest.
- **VO2max**: Consumo máximo de oxígeno estimado mediante el Test de Cooper (12 minutos).
- **Weight_Cut_Tracker**: Módulo de control de peso previo a competencia para seguimiento de descenso de peso en taekwondo.
- **Tanaka**: Fórmula de estimación de FCMax: 208 − (0.7 × edad), de Tanaka et al.

---

## Mathematical Formulas Reference

Esta sección consolida todas las fórmulas matemáticas y fisiológicas utilizadas en el módulo EFC. Cada fórmula incluye su nombre, variables, expresión algebraica, dominio de validez y el módulo donde se aplica. Esta referencia es la fuente canónica para el equipo de desarrollo.

> **Nota:** Todas las fórmulas deben renderizarse con KaTeX en la interfaz de usuario donde corresponda. Las expresiones algebraicas aquí escritas son la fuente de verdad para la implementación.

---

### F-01: Volumen Total del Macrociclo

**Módulo:** Planificador de Macrociclo (Req 5)
**Propósito:** Calcular el tiempo total de entrenamiento disponible en el macrociclo.

```
Días_Totales = Fecha_Competencia − Fecha_Inicio   [días]

Semanas_Totales = floor(Días_Totales / 7)          [semanas enteras]

Volumen_Total_min = Semanas_Totales × Sesiones_por_Semana × Minutos_por_Sesión   [min]

Volumen_Total_hr  = Volumen_Total_min / 60          [hr]
```

**Variables:**

- `Fecha_Competencia`, `Fecha_Inicio`: fechas calendáricas (DATE)
- `Sesiones_por_Semana`: entero 1–7 × sesiones_por_día (1–5)
- `Minutos_por_Sesión`: horas_por_sesión × 60 (rango: 30–480 min)

**Restricción:** Semanas_Totales ≥ 10

---

### F-02: Distribución EFC del Macrociclo

**Módulo:** Planificador de Macrociclo (Req 5)
**Propósito:** Distribuir el volumen total en las tres etapas EFC.

```
T_Estructura  = Volumen_Total_min × %E   (default: 0.50)
T_Función     = Volumen_Total_min × %F   (default: 0.30)
T_Cognición   = Volumen_Total_min × %C   (default: 0.20)
```

**Restricción matemática:**

```
%E + %F + %C = 1.00  (exactamente 100%)
```

**Distribución de semanas por etapa:**

```
Semanas_E = Semanas_Totales × %E
Semanas_F = Semanas_Totales × %F
Semanas_C = Semanas_Totales × %C
```

> Los porcentajes 50/30/20 son orientativos. Si se modifican, se requiere justificación metodológica (mínimo 20 caracteres).

---

### F-03: Distribución de Tipos de Microciclo

**Módulo:** Planificador de Macrociclo (Req 5)
**Propósito:** Distribuir las semanas del macrociclo por tipo de carga.

```
Semanas_Ajuste       = Semanas_Totales × 0.10
Semanas_Carga        = Semanas_Totales × 0.40
Semanas_Impacto      = Semanas_Totales × 0.20
Semanas_Activación   = Semanas_Totales × 0.08
Semanas_Competencia  = Semanas_Totales × 0.12
Semanas_Recuperación = Semanas_Totales × 0.10
```

**Verificación:** 0.10 + 0.40 + 0.20 + 0.08 + 0.12 + 0.10 = 1.00 ✓

---

### F-04: Subdistribuciones Internas por Etapa — Etapa E (Estructura)

**Módulo:** Planificador de Macrociclo / Constructor de Microciclos (Req 5, Req 6)
**Propósito:** Distribuir el volumen de la Etapa E en sus bloques de contenido.

```
// Distribución de bloques en Etapa E
T_AdaptAnat_E    = T_Estructura × 0.10   // Adaptación Anatómica
T_Condicional_E  = T_Estructura × 0.20   // Capacidades Condicionales
T_Coordinativo_E = T_Estructura × 0.20   // Capacidades Coordinativas
T_Tecnico_E      = T_Estructura × 0.30   // Técnica
T_TacSimple_E    = T_Estructura × 0.20   // Táctica Simple

// Adaptación Anatómica en E
T_EstableAA_E    = T_AdaptAnat_E × 0.50   // Estable
T_InestableAA_E  = T_AdaptAnat_E × 0.50   // Inestable

// Capacidades Condicionales en E
T_Fuerza_E       = T_Condicional_E × 0.40
T_Velocidad_E    = T_Condicional_E × 0.30
T_Resistencia_E  = T_Condicional_E × 0.20
T_Flexibilidad_E = T_Condicional_E × 0.10

// Capacidades Coordinativas en E
T_Diferenciacion_E  = T_Coordinativo_E × 0.10
T_Acoplamiento_E    = T_Coordinativo_E × 0.10
T_Orientacion_E     = T_Coordinativo_E × 0.20
T_Equilibrio_E      = T_Coordinativo_E × 0.20
T_CambioE           = T_Coordinativo_E × 0.10
T_Ritmica_E         = T_Coordinativo_E × 0.10
T_Relajacion_E      = T_Coordinativo_E × 0.20

// Técnica en E
T_Patadas_E         = T_Tecnico_E × 0.50
T_Punos_E           = T_Tecnico_E × 0.10
T_Bloqueos_E        = T_Tecnico_E × 0.20
T_Desplazamiento_E  = T_Tecnico_E × 0.20

// Táctica Simple en E
T_TacAprendizaje_E    = T_TacSimple_E × 0.50
T_TacMecanizacion_E   = T_TacSimple_E × 0.40
T_TacAutomatizacion_E = T_TacSimple_E × 0.10
```

---

### F-05: Subdistribuciones Internas por Etapa — Etapa F (Función)

**Módulo:** Planificador de Macrociclo / Constructor de Microciclos (Req 5, Req 6)

```
// Distribución de bloques en Etapa F
T_Condicional_F  = T_Función × 0.30
T_Coordinativo_F = T_Función × 0.15
T_Tecnico_F      = T_Función × 0.10
T_TacSimple_F    = T_Función × 0.30
T_TacComplejo_F  = T_Función × 0.15

// Capacidades Condicionales en F
T_Fuerza_F       = T_Condicional_F × 0.30
T_Resistencia_F  = T_Condicional_F × 0.30
T_Velocidad_F    = T_Condicional_F × 0.30
T_Flexibilidad_F = T_Condicional_F × 0.10

// Capacidades Coordinativas en F
T_Diferenciacion_F  = T_Coordinativo_F × 0.10
T_Acoplamiento_F    = T_Coordinativo_F × 0.10
T_Orientacion_F     = T_Coordinativo_F × 0.20
T_Equilibrio_F      = T_Coordinativo_F × 0.20
T_CambioF           = T_Coordinativo_F × 0.10
T_Ritmica_F         = T_Coordinativo_F × 0.10
T_Relajacion_F      = T_Coordinativo_F × 0.20

// Técnica en F
T_Patadas_F         = T_Tecnico_F × 0.50
T_Punos_F           = T_Tecnico_F × 0.10
T_Bloqueos_F        = T_Tecnico_F × 0.20
T_Desplazamiento_F  = T_Tecnico_F × 0.20

// Táctica Simple en F
T_TacAprendizaje_F    = T_TacSimple_F × 0.10
T_TacMecanizacion_F   = T_TacSimple_F × 0.50
T_TacAutomatizacion_F = T_TacSimple_F × 0.40

// Táctica Compleja en F
T_TacDecision3_F = T_TacComplejo_F × 0.60
T_TacDecision5_F = T_TacComplejo_F × 0.40
```

---

### F-06: Subdistribuciones Internas por Etapa — Etapa C (Cognición)

**Módulo:** Planificador de Macrociclo / Constructor de Microciclos (Req 5, Req 6)

```
// Distribución de bloques en Etapa C
T_Condicional_C  = T_Cognición × 0.28
T_Coordinativo_C = T_Cognición × 0.18
T_TacComplejo_C  = T_Cognición × 0.54

// Capacidades Condicionales en C
T_Fuerza_C       = T_Condicional_C × 0.40
T_Resistencia_C  = T_Condicional_C × 0.20
T_Velocidad_C    = T_Condicional_C × 0.30
T_Flexibilidad_C = T_Condicional_C × 0.10

// Capacidades Coordinativas en C
T_Diferenciacion_C  = T_Coordinativo_C × 0.10
T_Acoplamiento_C    = T_Coordinativo_C × 0.10
T_Orientacion_C     = T_Coordinativo_C × 0.30
T_Equilibrio_C      = T_Coordinativo_C × 0.20
T_CambioC           = T_Coordinativo_C × 0.05
T_Ritmica_C         = T_Coordinativo_C × 0.05
T_Relajacion_C      = T_Coordinativo_C × 0.20

// Táctica Compleja en C
T_TacDecision3_C = T_TacComplejo_C × 0.30
T_TacDecision5_C = T_TacComplejo_C × 0.70
```

---

### F-07: Índice de Masa Corporal (IMC)

**Módulo:** Perfil EFC del Deportista (Req 4)
**Referencia:** Fórmula estándar OMS

```
IMC = Peso_kg / (Talla_m)²

donde: Talla_m = Talla_cm / 100
```

**Clasificación:**

```
IMC < 18.5           → Bajo peso
18.5 ≤ IMC ≤ 24.9   → Normal
25.0 ≤ IMC ≤ 29.9   → Sobrepeso
30.0 ≤ IMC ≤ 34.9   → Obesidad Grado I
35.0 ≤ IMC ≤ 39.9   → Obesidad Grado II
IMC ≥ 40.0           → Obesidad Grado III
```

---

### F-08: Frecuencia Cardíaca Máxima (Tanaka et al.)

**Módulo:** Perfil EFC del Deportista (Req 4)
**Referencia:** Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. J Am Coll Cardiol. 2001.

```
FCMax = 208 − (0.7 × Edad_años)
```

**Variables:**

- `Edad_años`: edad del deportista en años completos (calculada desde fecha de nacimiento)
- Resultado en latidos por minuto (bpm)

**Dominio:** Edad entre 10 y 80 años

---

### F-09: Tasa Metabólica Basal (TMB — Mifflin-St Jeor)

**Módulo:** Perfil EFC del Deportista (Req 4)
**Referencia:** Mifflin MD et al. A new predictive equation for resting energy expenditure. Am J Clin Nutr. 1990.

```
// Hombres
TMB_H = (10 × Peso_kg) + (6.25 × Talla_cm) − (5 × Edad_años) + 5

// Mujeres
TMB_M = (10 × Peso_kg) + (6.25 × Talla_cm) − (5 × Edad_años) − 161
```

**Variables:**

- `Peso_kg`: peso en kilogramos (decimal)
- `Talla_cm`: estatura en centímetros
- `Edad_años`: edad en años completos
- Resultado en kcal/día

---

### F-10: Frecuencia Cardíaca de Reserva (Karvonen)

**Módulo:** Perfil EFC del Deportista (Req 4)
**Referencia:** Método de Karvonen para zonas de entrenamiento

```
FCR = FCMax − FC_Rest

// Zona de entrenamiento objetivo (% de FCR)
FC_objetivo = FC_Rest + (FCR × %_intensidad)
```

**Variables:**

- `FCMax`: FC máxima calculada con F-08
- `FC_Rest`: FC en reposo (latidos/min, ingresada por el entrenador)
- `FCR`: FC de reserva (resultado en bpm)

---

### F-11: VO₂máx Estimado (Test de Cooper)

**Módulo:** Perfil EFC del Deportista — Test de Resistencia (Req 4)
**Referencia:** Cooper KH. A means of assessing maximal oxygen uptake. JAMA. 1968.

```
VO2max = (Distancia_metros − 504.9) / 44.73
```

**Variables:**

- `Distancia_metros`: metros recorridos en 12 minutos (rango: 100–10000 m)
- Resultado en mL·kg⁻¹·min⁻¹

---

### F-12: Porcentaje de Cambio entre Evaluaciones (Δ%)

**Módulo:** Perfil EFC — Gráficos de Evolución (Req 4), Control de Peso (Req 12)

```
Δ% = ((Valor_Actual − Valor_Basal) / |Valor_Basal|) × 100
```

**Variables:**

- `Valor_Basal`: primer registro del período o registro de referencia
- `Valor_Actual`: registro más reciente
- Resultado en porcentaje (puede ser negativo si hay descenso)

**Nota:** Se usa `|Valor_Basal|` (valor absoluto) para evitar inversión de signo cuando el basal es negativo (ej. Seat and Reach).

---

### F-13: sRPE — Carga Interna de Sesión (Foster)

**Módulo:** Constructor de Microciclos — Registro Post-Sesión (Req 6)
**Referencia:** Foster C et al. A new approach to monitoring exercise training. J Strength Cond Res. 2001.

```
sRPE_día = RPE_sesión × Duración_real_min
```

**Variables:**

- `RPE_sesión`: escala 1–10 (entero)
- `Duración_real_min`: duración real de la sesión en minutos (1–480)
- Resultado en Unidades Arbitrarias (UA)

---

### F-14: Carga Semanal Total y Monotonía de Foster

**Módulo:** Constructor de Microciclos (Req 6)
**Referencia:** Foster C. Monitoring training in athletes with reference to overtraining syndrome. Med Sci Sports Exerc. 1998.

```
// Carga Semanal Total
sRPE_semana = Σ(sRPE_día)   para d = 1..7

// Media de carga diaria
Media_diaria = sRPE_semana / 7

// Desviación Estándar de carga diaria (población)
SD_diaria = sqrt( Σ((sRPE_día − Media_diaria)²) / 7 )

// Índice de Monotonía de Foster
Monotonía = Media_diaria / SD_diaria

// Strain (Tensión semanal)
Strain = sRPE_semana × Monotonía
```

**Alertas:**

```
Monotonía > 2.0  → "Alta Monotonía: Riesgo de estancamiento o fatiga"
```

**Nota:** Si SD_diaria = 0 (todos los días igual carga), Monotonía es indefinida. El sistema debe mostrar "N/A" y una advertencia de variabilidad nula.

---

### F-15: ACWR — Ratio Agudo:Crónico (Acute:Chronic Workload Ratio)

**Módulo:** Dashboard EFC (Req 2)
**Referencia:** Gabbett TJ. The training-injury prevention paradox. Br J Sports Med. 2016.

```
// Carga Aguda (CA) — media móvil 7 días
CA = Σ(sRPE_día[i])  para i = (hoy − 6)..(hoy)  / 7

// Carga Crónica (CC) — media móvil 28 días
CC = Σ(sRPE_día[i])  para i = (hoy − 27)..(hoy)  / 28

// ACWR
ACWR = CA / CC
```

**Semáforo de riesgo:**

```
ACWR < 0.8          → 🔵 Azul   — Subentrenamiento / Riesgo de desadaptación
0.8 ≤ ACWR ≤ 1.3   → 🟢 Verde  — Zona dulce de adaptación (rango seguro)
1.3 < ACWR ≤ 1.5   → 🟡 Amarillo — Precaución / Incremento moderado de riesgo
ACWR > 1.5          → 🔴 Rojo   — Zona de peligro / Alto riesgo de lesión
```

**Notas de implementación:**

- Si existen menos de 7 días de datos: calcular CA con los días disponibles (no forzar a 7).
- Si existen menos de 28 días de datos: mostrar ACWR con advertencia "datos insuficientes para carga crónica estable (< 28 días)".
- Si CC = 0: ACWR es indefinido; mostrar "N/A" sin división.

---

### F-16: Fórmulas de 1RM (Epley y Brzycki)

**Módulo:** Calculadora 1RM (Req 7)

```
// Repeticiones Totales estimadas
Reps_est = Reps_realizadas + RIR

// Conversión RPE → RIR (cuando se usa RPE en lugar de RIR)
RIR = round(10 − RPE)

// Fórmula de Epley (1985)
1RM_Epley = Peso_kg × (1 + Reps_est / 30)

// Fórmula de Brzycki (1993)
1RM_Brzycki = Peso_kg × (36 / (37 − Reps_est))

// Promedio (valor principal mostrado)
1RM_promedio = (1RM_Epley + 1RM_Brzycki) / 2

// % del 1RM para un peso de trabajo
%1RM_trabajo = (Peso_trabajo_kg / 1RM_promedio) × 100

// Tabla de zonas: peso para cada % del 1RM
Peso_zona = 1RM_promedio × (%zona / 100)   // redondeado a 0.5 kg

// Reps aproximadas al fallo para cada zona (Epley invertida)
Reps_fallo = round((1RM_promedio / Peso_zona − 1) / 0.0333)
```

**Restricción:** Si Reps_est > 30, mostrar advertencia de baja confiabilidad.
**Restricción:** Si (37 − Reps_est) ≤ 0, Brzycki no es aplicable; mostrar solo Epley.

---

### F-17: Prescripciones de Fuerza por Período EFC

**Módulo:** Calculadora 1RM — Recomendaciones EFC (Req 7)
**Propósito:** Traducir el 1RM calculado a rangos de trabajo específicos según la etapa.

```
// Etapa E — Adaptación Anatómica / Hipertrofia General
Peso_min_E = 1RM_promedio × 0.50
Peso_max_E = 1RM_promedio × 0.70
Series_E   = "3–4 series"
Reps_E     = "8–15 reps"
RIR_E      = "RIR 2–4"

// Etapa F — Potencia / Fuerza Rápida
Peso_min_F = 1RM_promedio × 0.70
Peso_max_F = 1RM_promedio × 0.85
Series_F   = "4–6 series"
Reps_F     = "3–5 reps"
RIR_F      = "RIR 2–3"

// Etapa C — Mantenimiento / Transferencia al Combate (balísticos/pliometría)
Peso_min_C = 1RM_promedio × 0.40
Peso_max_C = 1RM_promedio × 0.60
Series_C   = "3–5 series"
Reps_C     = "2–4 reps"
RIR_C      = "RIR > 3"
```

> Todos los pesos se redondean a 0.5 kg. Estos rangos son orientativos; deben ajustarse al historial, técnica y respuesta individual del deportista.

---

### F-18: Control de Peso para Competencia

**Módulo:** Weight_Cut_Tracker (Req 12)

```
// Pérdida de peso respecto al basal
Δ%_peso = ((Peso_actual_kg − Peso_basal_kg) / Peso_basal_kg) × 100

// Diferencia respecto al límite de categoría
Diferencia_kg = Peso_actual_kg − Límite_categoría_kg
```

**Variables:**

- `Peso_basal_kg`: primer registro del período de control
- `Peso_actual_kg`: último registro
- `Límite_categoría_kg`: límite oficial World Taekwondo de la categoría registrada

**Alertas:**

```
Δ%_peso < −5% en período < 7 días  → 🔴 Rojo — Riesgo alto de deshidratación severa
Diferencia_kg ≤ 0                   → ✅ Verde — Dentro de categoría
Diferencia_kg > 0                   → 🟡 Amarillo — Por encima del límite (kg a reducir)
```

---

## Requirements

### Requirement 1: Integración de Navegación EFC

**User Story:** Como entrenador, quiero acceder al módulo EFC desde el menú de Entrenamientos, para poder utilizar las herramientas EFC sin abandonar el flujo de trabajo habitual.

#### Acceptance Criteria

1. WHEN el entrenador navega a `/dashboard/trainings/efc`, THE System SHALL renderizar el componente EFC_Dashboard sin errores.
2. WHEN el entrenador navega a `/dashboard/trainings`, THE System SHALL mostrar una card de navegación hacia el módulo EFC a continuación de las secciones existentes (Cognitivo, Temporizadores, Combinaciones), sin modificar dichas secciones.
3. THE EFC_Module SHALL utilizar los componentes de design system existentes (`PageHeader`, `FieldControl`, y clases Tailwind del proyecto).
4. IF el entrenador accede a `/dashboard/trainings/efc` sin un deportista seleccionado, THEN THE EFC_Dashboard SHALL mostrar únicamente un selector de deportista, ocultando el resumen del macrociclo.
5. WHEN el entrenador selecciona un deportista en el selector de deportista, THE EFC_Dashboard SHALL ocultar el selector y renderizar el resumen del macrociclo correspondiente al deportista seleccionado.

---

### Requirement 2: Dashboard EFC

**User Story:** Como entrenador, quiero ver un resumen del macrociclo activo de un deportista, para monitorear su progreso y tomar decisiones de ajuste de entrenamiento.

#### Acceptance Criteria

1. WHEN el entrenador selecciona un deportista con macrociclo activo, THE EFC_Dashboard SHALL mostrar el nombre del deportista, el período EFC activo (E / F / C) identificado mediante un indicador visual diferenciado del resto de los períodos (por ejemplo, resaltado o seleccionado visualmente de forma exclusiva), y las fechas de inicio y competencia del macrociclo.
2. WHEN el entrenador selecciona un deportista con macrociclo activo, THE EFC_Dashboard SHALL mostrar las horas totales planificadas del macrociclo y la distribución en horas y minutos para cada período (E, F, C) en barras de progreso o gráfico tipo donut.
3. WHEN el entrenador selecciona un deportista con macrociclo activo, THE EFC_Dashboard SHALL mostrar el número entero de semanas completas restantes hasta la fecha de competencia principal; si la fecha de competencia es igual o anterior a la fecha actual, THE EFC_Dashboard SHALL mostrar "0 semanas restantes" junto a una indicación de que la competencia ha sido alcanzada.
4. THE EFC_Dashboard SHALL calcular y mostrar el ACWR del deportista seleccionado usando las siguientes fórmulas: CA = suma de cargas diarias de los últimos 7 días / 7; CC = suma de cargas diarias de los últimos 28 días / 28; ACWR = CA / CC; donde cada carga diaria = sRPE × duración real de la sesión en minutos.
5. WHEN ningún microciclo ha sido registrado en los últimos 14 días para el macrociclo activo, THE EFC_Dashboard SHALL mostrar una alerta de período sin actividad registrada.
6. WHEN el entrenador selecciona un deportista con macrociclo activo, THE EFC_Dashboard SHALL mostrar un acceso directo (botón o enlace) a la OneRM_Calculator en el contexto del deportista seleccionado.
7. IF el deportista seleccionado no tiene macrociclo activo, THEN THE EFC_Dashboard SHALL mostrar un mensaje descriptivo y un botón de acceso directo al Macrocycle_Planner.
8. THE EFC_Dashboard SHALL considerar un macrociclo como activo únicamente si su fecha de inicio es igual o anterior a la fecha actual y su fecha de competencia es posterior a la fecha actual, y si no existe más de un macrociclo que cumpla esta condición para el mismo deportista al mismo tiempo.
9. IF las horas totales planificadas del macrociclo son iguales a cero o no han sido definidas, THEN THE EFC_Dashboard SHALL mostrar un mensaje indicando que no hay distribución de horas planificadas, en lugar de barras de progreso o gráfico.
10. THE EFC_Dashboard SHALL mostrar el valor ACWR con un indicador de color según los siguientes umbrales: azul si ACWR < 0.8 (Subentrenamiento); verde si 0.8 ≤ ACWR ≤ 1.3 (Zona de adaptación óptima); amarillo si 1.3 < ACWR ≤ 1.5 (Precaución); rojo si ACWR > 1.5 (Alto riesgo de lesión); y SHALL mostrar junto al indicador un texto descriptivo del nivel correspondiente.

---

### Requirement 3: Biblioteca del Método EFC

**User Story:** Como entrenador, quiero consultar la documentación conceptual del método EFC dentro de la aplicación, para fundamentar mis decisiones de planificación.

#### Acceptance Criteria

1. THE EFC_Library SHALL incluir las siguientes secciones navegables: Fundamentos del EFC, Pirámide EFC, Capacidades Coordinativas, Capacidades Condicionales, Progresión de Cargas, Ondulación de Microciclos, y Advertencias de Seguridad; donde cada sección es accesible desde el menú de navegación de la EFC_Library en no más de 1 interacción del usuario.
2. THE EFC_Library SHALL mostrar en cada sección que mencione porcentajes EFC una advertencia explícita indicando que dichos porcentajes son orientativos y no han sido validados científicamente; donde dicha advertencia es visible sin necesidad de interacción adicional (no colapsada ni oculta por defecto).
3. THE EFC_Library SHALL incluir una sección "Acerca del Método EFC" con un descargo de responsabilidad que indique que el método es aplicable al taekwondo de combate deportivo y que no constituye prescripción médica ni científica; donde dicho descargo es visible sin necesidad de interacción adicional.
4. WHEN el entrenador navega entre secciones de la EFC_Library, THE EFC_Library SHALL resaltar visualmente la sección activa en el menú de navegación, distinguiéndola del resto de secciones mediante un cambio de estilo observable.
5. WHEN el entrenador navega entre secciones de la EFC_Library y regresa a una sección previamente visitada, THE EFC_Library SHALL restaurar la posición de scroll de dicha sección al valor exacto en píxeles que tenía al momento de abandonarla.
6. IF el contenido de una sección de la EFC_Library no puede cargarse, THEN THE EFC_Library SHALL mostrar un mensaje indicando que el contenido no está disponible y el menú de navegación SHALL permanecer funcional para acceder a otras secciones.

---

### Requirement 4: Perfil EFC del Deportista

**User Story:** Como entrenador, quiero registrar y consultar los datos biométricos EFC y los tests físicos de cada deportista, para personalizar la planificación del macrociclo.

#### Acceptance Criteria

1. THE EFC_Profile SHALL ser accesible como una nueva tab o sección dentro de la pantalla de detalle del alumno en `/dashboard/students/[studentId]`, sin modificar las secciones existentes del alumno.
2. THE EFC_Profile SHALL permitir ingresar y persistir los siguientes campos: FC_Rest (numérico, latidos/min, rango válido: 30–220), código fumador (booleano), y EFC_Period actual (selector con opciones: Estructura, Función, Cognición); IF FC_Rest ingresado está fuera del rango 30–220, THEN THE EFC_Profile SHALL rechazar el valor y mostrar un mensaje indicando el rango válido aceptado.
3. WHEN los campos requeridos de un cálculo están disponibles en el perfil del deportista, THE EFC_Profile SHALL calcular y mostrar ese cálculo automáticamente de forma independiente: IMC requiere peso y estatura; FCMax (Tanaka et al.) requiere fecha de nacimiento (FCMax = 208 − 0.7 × edad); TMB requiere peso, estatura, fecha de nacimiento y género (Hombres: TMB = 10 × peso + 6.25 × talla − 5 × edad + 5; Mujeres: TMB = 10 × peso + 6.25 × talla − 5 × edad − 161); FCR (Karvonen) requiere FCMax y FC_Rest (FCR = FCMax − FC_Rest); gasto calórico estimado diario requiere TMB y FC_Rest; y VO2max requiere el valor del test de Cooper registrado en tests físicos (VO2max = (distancia_metros − 504.9) / 44.73).
4. THE EFC_Profile SHALL mostrar junto a cada cálculo automático la fórmula matemática utilizada renderizada mediante KaTeX o notación HTML equivalente, de forma que cada variable y operador sean visualmente distinguibles.
5. THE EFC_Profile SHALL permitir registrar los siguientes tests físicos con su fecha de evaluación: Abdominales 1 min (repeticiones enteras, 0–300), Seat and Reach (cm con un decimal, −30 a 50), Dominadas (repeticiones enteras, 0–100), Flexo-extensión de brazos 1 min (repeticiones enteras, 0–300), 10×5 metros (segundos con un decimal, 10.0–120.0), Perímetro cintura (cm con un decimal, 40–200), y Resistencia (distancia en metros, entero, 100–10000).
6. THE EFC_Profile SHALL mostrar el historial de evaluaciones de tests físicos ordenado cronológicamente de más reciente a más antiguo, mostrando un máximo de 50 registros por página.
7. IF existen 2 o más registros para un test físico, THEN THE EFC_Profile SHALL mostrar un gráfico de evolución para ese test con los últimos 10 registros disponibles; para el test de Resistencia (Cooper), el gráfico SHALL incluir un eje Y secundario mostrando el peso corporal del deportista en cada fecha de evaluación.
8. WHEN el entrenador guarda datos del EFC_Profile, THE System SHALL persistir los datos en la tabla `efc_athlete_profile` de Supabase y mostrar al entrenador un mensaje de confirmación de éxito dentro de los 3 segundos siguientes a la acción de guardado.
9. IF la operación de persistencia en Supabase falla, THEN THE System SHALL mostrar un mensaje de error indicando que los datos no fueron guardados y conservar los datos ingresados en el formulario sin descartarlos.
10. IF el género del deportista no está registrado en el perfil base, THEN THE EFC_Profile SHALL mostrar un aviso indicando que FCMax y TMB requieren el género para calcularse correctamente.

---

### Requirement 5: Planificador de Macrociclo

**User Story:** Como entrenador, quiero crear y visualizar un macrociclo EFC completo para un deportista, para distribuir el volumen de entrenamiento de forma periodizada hasta la competencia principal.

#### Acceptance Criteria

1. WHEN el entrenador inicia la creación de un macrociclo, THE Macrocycle_Planner SHALL presentar un formulario que requiere: deportista (selector), fecha de inicio, fecha de competencia principal, horas por sesión (decimal entre 0.5 y 8.0 inclusive), días de entrenamiento por semana (entero entre 1 y 7 inclusive), y número de sesiones por día (entero entre 1 y 5 inclusive, con valor por defecto 1).
2. WHEN el entrenador modifica cualquier campo del formulario de macrociclo, THE Macrocycle_Planner SHALL recalcular y mostrar, en un plazo máximo de 500ms desde el último cambio: total de semanas, total de horas del macrociclo, y distribución de horas para Estructura (50%), Función (30%) y Cognición (20%).
3. WHEN el entrenador modifica cualquier campo del formulario de macrociclo, THE Macrocycle_Planner SHALL calcular y mostrar la distribución de microciclos por etapa: Ajuste 10%, Carga 40%, Impacto 20%, Activación 8%, Competencia 12%, Recuperación 10%.
4. WHEN el entrenador modifica cualquier campo del formulario de macrociclo, THE Macrocycle_Planner SHALL mostrar, en un plazo máximo de 500ms desde el último cambio, las subdistribuciones por etapa (capacidades condicionales, coordinativas, técnicas y tácticas) con sus respectivos porcentajes y valores expresados en formato HH:MM (horas y minutos).
5. THE Macrocycle_Planner SHALL mostrar junto a cada distribución porcentual una advertencia indicando que los porcentajes son orientativos.
6. WHERE el entrenador activa la opción de ajuste manual de porcentajes E/F/C, THE Macrocycle_Planner SHALL deshabilitar el botón de guardar mientras la suma de los tres porcentajes sea distinta de 100%; WHEN la suma es exactamente 100% y al menos un porcentaje difiere del valor estándar (E≠50%, F≠30%, o C≠20%), THE Macrocycle_Planner SHALL requerir un campo de texto de justificación metodológica (mínimo 20 caracteres) antes de habilitar el guardado; WHEN la suma es 100% y todos los porcentajes coinciden con los valores estándar, THE Macrocycle_Planner SHALL habilitar el guardado sin requerir justificación.
7. IF la fecha de inicio es posterior o igual a la fecha de competencia, o IF el total de semanas calculado es menor a 10, THEN THE Macrocycle_Planner SHALL mostrar un mensaje de error de validación indicando la causa e impedir el guardado del macrociclo.
8. WHEN el total de semanas del macrociclo es calculado, THE Macrocycle_Planner SHALL mostrar un timeline visual con una celda por semana coloreada por período (Estructura=azul, Función=verde, Cognición=naranja), con indicación del tipo de microciclo (AJ, C, I, AC, CO, R) en cada celda, abarcando exactamente el número de semanas calculado.
9. WHEN el entrenador guarda el macrociclo exitosamente, THE System SHALL persistir los datos en la tabla `efc_macrocycles` de Supabase y SHALL mostrar una confirmación visible al entrenador indicando que el macrociclo fue guardado.
10. IF un deportista ya tiene un macrociclo activo, THEN THE Macrocycle_Planner SHALL mostrar una advertencia antes de crear uno nuevo, sin impedir la creación si el entrenador confirma.
11. IF el intento de persistencia del macrociclo en Supabase falla, THEN THE Macrocycle_Planner SHALL mostrar un mensaje de error indicando que el guardado no pudo completarse y SHALL preservar los datos ingresados en el formulario sin descartarlos.

---

### Requirement 6: Constructor de Microciclos y Sesiones

**User Story:** Como entrenador, quiero planificar la distribución de cargas de cada semana de entrenamiento dentro del macrociclo, para controlar el volumen e intensidad diaria con precisión.

#### Acceptance Criteria

1. WHEN el entrenador inicia la creación o edición de un microciclo, THE Microcycle_Builder SHALL permitir especificar: el número de semana dentro del macrociclo (entero ≥ 1), tipo de microciclo (AJ/C/I/AC/CO/R), intensidad objetivo del período (Intensity_Scale 0–9), y objetivo del microciclo (texto libre de hasta 500 caracteres).
2. WHEN el entrenador asigna minutos a una actividad de un día, THE Microcycle_Builder SHALL aceptar únicamente valores enteros entre 0 y 480 minutos para cada combinación de actividad, subcategoría y día de la semana en las siguientes categorías: Cardiovascular (Cap. Aeróbica, Cap. Anaeróbica, Pot. Aeróbica, Pot. Anaeróbica, Aláctico, Regenerativo), Condicionales (Flexibilidad FNP, Flexibilidad Balística, Flexibilidad Pasiva, Fuerza Máxima, Fuerza Resistencia, Fuerza Rápida, Rest. Fuerza Veloz, Veloc. Desplaz., Rest. a la Velocidad, Veloc. Frecuencial, Veloc. Reacc. Mov.), Coordinativas (Cap. Acopl. Mov., Cap. Diferenciación, Cap. Equilibrio, Cap. Orientación, Cap. Ritmo, Cap. Reacción, Cap. Adap. Variac.), Técnico – Patadas (TRASERA, DELANTERA, PUESTO, C/SALTO, C/APOYO, GIRO, COMBINADAS), Táctico (Step Fuerza, Step Elástico, Step Reflejo, Man. Ataq., Man. Def., Man. Anticipa., MAN. Combinadas, COMBATE).
3. WHEN el entrenador ingresa una nota para una actividad de un día, THE Microcycle_Builder SHALL aceptar texto libre de hasta 500 caracteres por actividad por día.
4. WHEN el entrenador modifica cualquier valor de minutos, THE Microcycle_Builder SHALL actualizar el resumen de minutos totales por categoría y el total semanal dentro de los 300 milisegundos siguientes al cambio.
5. WHEN el microciclo es cargado o modificado, THE Microcycle_Builder SHALL mostrar un gráfico de barras donde cada barra representa un día de la semana y su altura corresponde a la suma total de minutos ingresados para ese día.
6. WHEN el entrenador guarda el microciclo, THE System SHALL persistir los datos en las tablas `efc_microcycles` y `efc_session_loads` de Supabase.
7. IF los minutos totales ingresados en un día superan el valor de (horas_por_sesión_del_macrociclo × 60 × 1.20), THEN THE Microcycle_Builder SHALL mostrar una advertencia visual no bloqueante en la columna de ese día, sin impedir el guardado.
8. IF el guardado en Supabase falla, THEN THE System SHALL indicar el error al entrenador mediante un mensaje no bloqueante y conservar todos los valores ingresados en el formulario sin modificaciones.
9. IF el entrenador intenta crear un microciclo para una semana que ya tiene un microciclo registrado en el mismo macrociclo, THEN THE Microcycle_Builder SHALL indicar el conflicto mediante un mensaje e impedir la creación duplicada, ofreciendo la opción de editar el microciclo existente.
10. THE Microcycle_Builder SHALL incluir una sección de registro post-sesión donde, para cada día del microciclo, el entrenador pueda ingresar: RPE de la sesión (entero entre 1 y 10 inclusive) y duración real de la sesión (entero entre 1 y 480 minutos inclusive); THE Microcycle_Builder SHALL calcular automáticamente el sRPE del día como RPE × duración_real_minutos.
11. WHEN todos los días del microciclo tienen registrado su sRPE, THE Microcycle_Builder SHALL calcular y mostrar: la carga semanal total (suma de sRPE de todos los días), la media de carga diaria, el Monotonia_Foster (media / desviación_estándar de las cargas diarias), y el Strain (carga_semanal_total × Monotonia_Foster); IF Monotonia_Foster > 2.0, THEN THE Microcycle_Builder SHALL mostrar una advertencia indicando "Alta Monotonía: Riesgo de estancamiento o fatiga".

---

### Requirement 7: Calculadora 1RM

**User Story:** Como entrenador, quiero calcular el 1RM estimado de un deportista a partir de un peso levantado y las repeticiones realizadas, para prescribir cargas de fuerza acordes al período EFC activo.

#### Acceptance Criteria

1. THE OneRM_Calculator SHALL operar en dos modos: modo standalone (sin deportista asociado, sin mostrar recomendaciones EFC) y modo integrado (con deportista seleccionado que tenga EFC_Period asignado, habilitando el bloque de recomendaciones EFC y el guardado de registros).
2. THE OneRM_Calculator SHALL aceptar los siguientes inputs: peso levantado (kg, número decimal positivo, máximo 999.9 kg), repeticiones realizadas (entero entre 1 y 30 inclusive), RIR (entero entre 0 y 5 inclusive), RPE (decimal entre 6.0 y 10.0 inclusive, opcional), ejercicio (sentadilla, press banca, peso muerto, o libre/otro), y peso de trabajo (kg, decimal positivo, máximo 999.9 kg, opcional).
3. IF el entrenador ingresa un valor de RPE, THEN THE OneRM_Calculator SHALL calcular RIR como 10 − RPE (redondeado al entero más cercano) y usar ese valor en lugar del RIR ingresado manualmente en el campo RIR, deshabilitando la edición manual del campo RIR mientras RPE tenga valor.
4. THE OneRM_Calculator SHALL calcular el 1RM usando las fórmulas de Epley y Brzycki con repeticiones totales = repeticiones realizadas + RIR, y mostrar el promedio de ambos resultados como el valor de 1RM principal, acompañado de los valores individuales de cada fórmula.
5. THE OneRM_Calculator SHALL mostrar las fórmulas matemáticas de Epley y Brzycki en notación matemática renderizada (KaTeX o equivalente), visible en la misma pantalla que los inputs y resultados.
6. WHEN el peso de trabajo opcional es ingresado, THE OneRM_Calculator SHALL calcular y mostrar el porcentaje del 1RM que representa dicho peso, expresado con una decimal de precisión (e.g., 72.5%).
7. THE OneRM_Calculator SHALL mostrar una tabla de porcentajes del 50% al 100% en incrementos de 5%, donde cada fila contiene: el porcentaje, el peso equivalente en kg (1RM × porcentaje, redondeado a 0.5 kg), y las repeticiones aproximadas al fallo derivadas de la fórmula de Epley invertida (reps = (1RM / peso_fila − 1) / 0.0333, redondeadas al entero más cercano).
8. WHEN el modo integrado está activo y el EFC_Period del deportista es Estructura, THE OneRM_Calculator SHALL mostrar una sección visualmente diferenciada (con borde o fondo de color distinto y encabezado "Recomendaciones para Estructura") que incluya: rango %1RM recomendado (50–70%), rango de series y repeticiones típicas (3–4 series × 8–15 reps, RIR 2–4), enfoque en adaptación anatómica e hipertrofia general, los pesos calculados para ese rango de %1RM, y un texto de advertencia indicando que los valores son orientativos y deben adaptarse al deportista.
9. WHEN el modo integrado está activo y el EFC_Period del deportista es Función, THE OneRM_Calculator SHALL mostrar una sección visualmente diferenciada (con borde o fondo de color distinto y encabezado "Recomendaciones para Función") que incluya: rango %1RM recomendado (70–85%), rango de series y repeticiones típicas (4–6 series × 3–5 reps, RIR 2–3), enfoque en potencia y fuerza rápida a máxima velocidad intencional, los pesos calculados para ese rango de %1RM, y un texto de advertencia indicando que los valores son orientativos y deben adaptarse al deportista.
10. WHEN el modo integrado está activo y el EFC_Period del deportista es Cognición, THE OneRM_Calculator SHALL mostrar una sección visualmente diferenciada (con borde o fondo de color distinto y encabezado "Recomendaciones para Cognición") que incluya: rango %1RM recomendado (40–60%) con orientación a ejercicios balísticos y pliométricos, rango de series y repeticiones típicas (3–5 series × 2–4 reps, RIR > 3), enfoque en mantenimiento y transferencia al combate, los pesos calculados para ese rango de %1RM, y un texto de advertencia indicando que los valores son orientativos y deben adaptarse al deportista.
11. WHEN el entrenador confirma guardar el 1RM estimado en modo integrado, THE System SHALL persistir el registro en la tabla `efc_1rm_records` de Supabase con los campos: identificador del deportista, ejercicio, fecha de registro (en UTC), peso levantado (kg), repeticiones realizadas, RIR utilizado, y valor de 1RM calculado (promedio Epley–Brzycki).
12. IF la operación de persistencia en Supabase falla, THEN THE System SHALL mostrar un mensaje de error indicando que el registro no pudo guardarse, y SHALL preservar todos los valores de los inputs en el formulario sin resetearlos.
13. IF repeticiones realizadas + RIR es mayor a 30, THEN THE OneRM_Calculator SHALL mostrar un aviso indicando que la estimación del 1RM puede ser poco confiable por encima de 30 repeticiones totales, y SHALL continuar mostrando el resultado calculado.
14. THE OneRM_Calculator SHALL mostrar el resultado recalculado en un plazo máximo de 300 ms tras cualquier modificación de un input, sin requerir acción adicional del entrenador.

---

### Requirement 8: Visualizaciones de Ondulación de Carga

**User Story:** Como entrenador, quiero ver gráficos de la distribución y evolución de la carga de entrenamiento, para analizar el cumplimiento del plan EFC y ajustar la periodización.

#### Acceptance Criteria

1. THE Load_Visualizer SHALL mostrar un gráfico de volumen de carga semanal expresado en minutos totales por semana, abarcando todas las semanas del macrociclo activo, con una serie de datos diferenciada visualmente por cada tipo de microciclo (AJ, C, I, AC, CO, R) mediante leyenda identificable.
2. THE Load_Visualizer SHALL mostrar un gráfico de comparación entre la distribución real acumulada de minutos por período (E, F, C) y la distribución propuesta en el macrociclo, donde la distribución real corresponde a los minutos registrados en microciclos hasta la semana actual y la distribución propuesta corresponde a los porcentajes objetivo definidos en el macrociclo activo, representado con barras apiladas o gráfico donut.
3. THE Load_Visualizer SHALL mostrar un gráfico de línea con la intensidad diaria registrada en los microciclos del macrociclo activo, donde el eje X representa los días del macrociclo en orden cronológico, el eje Y representa el valor de intensidad en la escala 1–10, y cada punto corresponde a una sesión registrada.
4. THE Load_Visualizer SHALL mostrar un gráfico de distribución por etapa (E, F, C) con los porcentajes reales acumulados hasta la semana actual expresados como proporción del total de minutos registrados, comparados visualmente contra los porcentajes objetivo definidos en el macrociclo activo.
5. WHEN no existen microciclos registrados para el macrociclo activo, THE Load_Visualizer SHALL mostrar un estado vacío descriptivo en el área de cada gráfico indicando que los gráficos se generarán al registrar el primer microciclo.
6. IF un macrociclo activo no tiene distribución por etapa (E/F/C) definida en su plan, THEN THE Load_Visualizer SHALL mostrar los gráficos de volumen e intensidad (criterios 1 y 3) y ocultar los gráficos de comparación EFC (criterios 2 y 4), indicando que la distribución por etapas no está configurada.
7. IF el valor de intensidad de una sesión registrada está fuera del rango 1–10, THEN THE Load_Visualizer SHALL excluir ese punto del gráfico de intensidad diaria y mostrar un indicador de advertencia informando que existen registros con intensidad inválida.

---

### Requirement 9: Exportación e Importación de Datos

**User Story:** Como entrenador, quiero exportar el plan EFC a PDF y Excel e importar datos de deportistas desde Excel, para facilitar el intercambio de información con otros entrenadores y con la planilla original.

#### Acceptance Criteria

1. WHEN el entrenador solicita exportar un macrociclo, THE System SHALL generar y descargar automáticamente un archivo PDF que incluya como mínimo: nombre del macrociclo, fechas de inicio y fin, lista de deportistas asociados y resumen de cada microciclo registrado (nombre, fecha, tipo de sesión), en un plazo máximo de 10 segundos desde la solicitud.
2. WHEN el entrenador solicita exportar los datos de un deportista, THE System SHALL generar y descargar automáticamente un archivo Excel (.xlsx) que incluya como mínimo: datos del perfil EFC (nombre, fecha de nacimiento, deporte, categoría, datos biométricos), resultados de tests físicos con fecha y valores registrados, y registros de 1RM por ejercicio con fecha, en un plazo máximo de 10 segundos desde la solicitud.
3. WHEN el entrenador sube un archivo Excel con la estructura de la planilla original cuyo tamaño no supere 5 MB, THE System SHALL analizar el archivo, mostrar un resumen con la cantidad de registros válidos encontrados y los campos detectados (datos biométricos y tests físicos), y esperar la confirmación explícita del entrenador antes de persistir los datos importados.
4. WHEN el entrenador confirma la importación, THE System SHALL guardar únicamente los registros con todos los campos obligatorios presentes y con formato correcto, descartando los registros inválidos.
5. IF el archivo Excel importado contiene registros con campos faltantes o con formato incorrecto, THEN THE System SHALL mostrar un mensaje indicando el número de registros importados correctamente, el número de registros descartados, y la lista de campos que presentaron errores por cada registro descartado.
6. IF el archivo Excel supera 5 MB o no tiene el formato de la planilla original, THEN THE System SHALL rechazar el archivo mostrando un mensaje que indique el motivo del rechazo, sin iniciar el proceso de importación.

---

### Requirement 10: Persistencia y Esquema de Base de Datos

**User Story:** Como desarrollador, quiero que todos los datos EFC se persistan correctamente en Supabase con las migraciones SQL correspondientes, para garantizar integridad, trazabilidad y escalabilidad del módulo.

#### Acceptance Criteria

1. THE System SHALL crear la tabla `efc_macrocycles` con los campos: id, athlete_id (FK a la tabla de atletas del sistema), tenant_id, start_date, competition_date, hours_per_session (decimal, entre 0.5 y 8.0), training_days_per_week (entero entre 1 y 7), sessions_per_day (entero entre 1 y 3), e_percentage (entero entre 0 y 100), f_percentage (entero entre 0 y 100), c_percentage (entero entre 0 y 100), justification (texto, máximo 1000 caracteres, nullable), created_at, updated_at.
2. THE System SHALL crear la tabla `efc_microcycles` con los campos: id, macrocycle_id (FK a efc_macrocycles), week_number (entero entre 1 y 52), microcycle_type (enum: AJ, C, I, AC, CO, R), intensity_target (entero entre 0 y 9), objective (texto, máximo 500 caracteres), created_at, updated_at.
3. THE System SHALL crear la tabla `efc_session_loads` con los campos: id, microcycle_id (FK a efc_microcycles), day_of_week (entero entre 1 y 7), category (texto, máximo 100 caracteres), subcategory (texto, máximo 100 caracteres), minutes (entero entre 0 y 480), notes (texto, máximo 500 caracteres, nullable), created_at.
4. THE System SHALL crear la tabla `efc_athlete_profile` con los campos: id, athlete_id (FK, único por deportista), tenant_id, fc_rest (entero entre 20 y 220, en pulsaciones por minuto), is_smoker (booleano), efc_period (enum: E, F, C), created_at, updated_at.
5. THE System SHALL crear la tabla `efc_athlete_tests` con los campos: id, athlete_id (FK), tenant_id, evaluation_date, abs_1min (entero entre 0 y 300, nullable), seat_and_reach_cm (decimal entre -30.0 y 50.0, nullable), pull_ups (entero entre 0 y 100, nullable), push_ups_1min (entero entre 0 y 300, nullable), sprint_10x5_sec (decimal entre 0.1 y 120.0, nullable), waist_cm (decimal entre 40.0 y 200.0, nullable), endurance_value (decimal entre 0.0 y 100.0, nullable), created_at.
6. THE System SHALL crear la tabla `efc_1rm_records` con los campos: id, athlete_id (FK), tenant_id, exercise (texto, máximo 150 caracteres), evaluation_date, weight_kg (decimal entre 0.5 y 500.0), reps_performed (entero entre 1 y 30), rir (entero entre 0 y 5), one_rm_epley (decimal entre 0.5 y 1000.0), one_rm_brzycki (decimal entre 0.5 y 1000.0), one_rm_average (decimal entre 0.5 y 1000.0), created_at.
7. THE System SHALL proveer migraciones SQL para la creación de todas las tablas EFC, con restricciones de clave foránea, restricciones CHECK para los rangos de dominio de cada campo, y políticas de Row Level Security (RLS) por tenant_id que restrinjan tanto las operaciones de lectura (SELECT) como de escritura (INSERT, UPDATE, DELETE) a registros cuyo tenant_id coincida con el tenant autenticado.
8. THE System SHALL aplicar una restricción CHECK en la tabla `efc_macrocycles` que garantice que la suma de e_percentage + f_percentage + c_percentage sea igual a 100.
9. IF un usuario autenticado intenta una operación de escritura (INSERT, UPDATE o DELETE) sobre cualquier tabla EFC con un tenant_id distinto al tenant del usuario autenticado, THEN THE System SHALL rechazar la operación y retornar un error indicando acceso no autorizado, sin modificar ningún registro existente.
10. THE System SHALL crear la tabla `efc_weight_control` con los campos: id, athlete_id (FK a la tabla de atletas del sistema), tenant_id, record_date (DATE), weight_kg (decimal entre 30.0 y 200.0), category_name (texto, máximo 50 caracteres), category_limit_kg (decimal entre 20.0 y 150.0), created_at; con políticas RLS por tenant_id que restrinjan lectura y escritura al tenant autenticado.
11. THE System SHALL crear la tabla `efc_session_srpe` con los campos: id, microcycle_id (FK a efc_microcycles), athlete_id (FK), tenant_id, day_of_week (entero entre 1 y 7), rpe (entero entre 1 y 10), duration_minutes (entero entre 1 y 480), srpe (entero calculado como rpe × duration_minutes), created_at; con políticas RLS por tenant_id que restrinjan lectura y escritura al tenant autenticado.

---

### Requirement 11: Responsividad y Accesibilidad

**User Story:** Como entrenador, quiero usar el módulo EFC desde mi teléfono móvil con la misma comodidad que desde el escritorio, para registrar cargas y consultar datos durante el entrenamiento.

#### Acceptance Criteria

1. THE EFC_Module SHALL renderizar correctamente en viewports de 375px de ancho o más, usando un diseño mobile-first con columnas apiladas en pantallas menores a 768px y layout horizontal en pantallas de 768px o más, garantizando que ningún contenido quede oculto, cortado o requiera scroll horizontal.
2. THE EFC_Module SHALL ser operable mediante teclado en todos sus formularios e interacciones, incluyendo navegación secuencial por tabulación entre campos, activación de botones y controles con Enter o Espacio, y un indicador de foco visible (outline de al menos 2px) en el elemento enfocado.
3. THE EFC_Module SHALL asegurar un contraste mínimo de 4.5:1 entre texto y fondo en todos los componentes de texto de tamaño normal, y un contraste mínimo de 3:1 para texto de tamaño grande (18pt o 14pt en negrita), según el criterio WCAG 2.1 AA 1.4.3.
4. THE EFC_Module SHALL incluir atributos `aria-label` o texto visible descriptivo en todos los botones de acción que no contengan texto visible (íconos standalone), donde el texto alternativo describa la acción que realiza el botón y no el ícono en sí.
5. WHEN un usuario interactúa con formularios de registro de cargas desde un viewport menor a 768px, THE EFC_Module SHALL presentar campos de entrada con altura mínima de 44px y área táctil mínima de 44x44px, sin superposición entre elementos interactivos.
6. IF el EFC_Module contiene tablas o grillas de datos, THEN THE EFC_Module SHALL incluir atributos `role`, `scope` o encabezados de columna/fila asociados mediante `headers` o `aria-label` para que lectores de pantalla puedan identificar la relación entre celdas y encabezados.

---

### Requirement 12: Control de Peso para Competencia

**User Story:** Como entrenador de taekwondo, quiero registrar y monitorear el peso diario del deportista en el período previo a la competencia, para prevenir descensos drásticos que comprometan el rendimiento o la salud.

#### Acceptance Criteria

1. THE Weight_Cut_Tracker SHALL ser accesible desde el EFC_Dashboard del deportista cuando exista un macrociclo activo con fecha de competencia dentro de los próximos 30 días.
2. THE Weight_Cut_Tracker SHALL permitir registrar el peso diario del deportista (kg, decimal con una cifra, entre 30.0 y 200.0) junto con la fecha del registro.
3. THE Weight_Cut_Tracker SHALL permitir registrar la categoría de peso oficial del deportista según World Taekwondo (selector con las categorías oficiales masculinas y femeninas vigentes) y el límite de peso de dicha categoría (kg).
4. WHEN existe al menos un registro de peso diario, THE Weight_Cut_Tracker SHALL calcular y mostrar el porcentaje de pérdida de peso respecto al peso basal usando la fórmula: Δ% = ((peso_actual − peso_basal) / peso_basal) × 100; donde peso_basal es el primer registro del período de control.
5. WHEN existe al menos un registro de peso diario, THE Weight_Cut_Tracker SHALL calcular y mostrar la diferencia en kg entre el peso actual y el límite de la categoría registrada.
6. THE Weight_Cut_Tracker SHALL mostrar un gráfico de línea con la curva de descenso de peso diario desde el inicio del período de control hasta la fecha del pesaje oficial.
7. IF Δ% de pérdida de peso supera el 5% en un período menor a 7 días, THEN THE Weight_Cut_Tracker SHALL mostrar una alerta roja indicando "Riesgo alto: descenso rápido de peso. Posible deshidratación severa y pérdida de potencia".
8. THE Weight_Cut_Tracker SHALL persistir los registros de peso diario en la tabla `efc_weight_control` con los campos: id, athlete_id (FK), tenant_id, record_date, weight_kg, category_name, category_limit_kg, created_at.
9. IF el guardado en Supabase falla, THEN THE System SHALL indicar el error al entrenador y conservar el valor ingresado sin descartarlo.
