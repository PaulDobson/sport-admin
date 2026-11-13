# Design Document — EFC Training Module

## Overview

El módulo EFC extiende sport-admin con herramientas de periodización según el método Estructura–Función–Cognición aplicado al taekwondo de combate deportivo. Se integra como una nueva sección dentro de `/dashboard/trainings/efc/` y agrega una tab "EFC" en la ficha del alumno existente en `/dashboard/students/[studentId]`.

El módulo abarca diez subsistemas: navegación, dashboard, biblioteca conceptual, perfil biométrico, planificador de macrociclos, constructor de microciclos, calculadora 1RM, visualizaciones de carga, exportación/importación y control de peso para competencia.

**Stack:** Next.js 15 App Router · Supabase (PostgreSQL + Auth) · TypeScript · Tailwind CSS  
**Bounded Context nuevo:** `efc-training`  
**Patrón de arquitectura:** DDD con capas `domain/` → `application/` → `infrastructure/` → `presentation/`

---

## Architecture

### Ubicación en el monorepo DDD

El módulo introduce un nuevo bounded context `efc-training` que sigue exactamente los mismos patrones de los contextos existentes (`instructor-operations`, `evolution-health-attendance`, etc.).

```
src/
├── domain/
│   └── efc-training/
│       ├── macrocycle.ts               ← entidad Macrocycle + reglas de dominio
│       ├── microcycle.ts               ← entidad Microcycle
│       ├── athlete-profile.ts          ← value objects biométricos
│       ├── one-rm.ts                   ← cálculos de 1RM (funciones puras)
│       ├── efc-formulas.ts             ← todas las fórmulas F-01..F-18 como funciones puras
│       ├── load-metrics.ts             ← sRPE, Monotonía, Strain, ACWR
│       └── weight-control.ts           ← Weight_Cut_Tracker domain logic
│
├── application/
│   └── efc-training/
│       ├── ports/
│       │   ├── efc-macrocycle-repository-port.ts
│       │   ├── efc-microcycle-repository-port.ts
│       │   ├── efc-athlete-profile-repository-port.ts
│       │   ├── efc-athlete-tests-repository-port.ts
│       │   ├── efc-one-rm-repository-port.ts
│       │   ├── efc-weight-control-repository-port.ts
│       │   └── efc-session-srpe-repository-port.ts
│       └── use-cases/
│           ├── manage-macrocycle.ts
│           ├── manage-microcycle.ts
│           ├── manage-athlete-efc-profile.ts
│           ├── manage-physical-tests.ts
│           ├── calculate-one-rm.ts
│           ├── get-load-visualizations.ts
│           ├── manage-weight-control.ts
│           └── export-efc-data.ts
│
├── infrastructure/
│   ├── efc-training/
│   │   ├── supabase-efc-macrocycle-repository.ts
│   │   ├── supabase-efc-microcycle-repository.ts
│   │   ├── supabase-efc-athlete-profile-repository.ts
│   │   ├── supabase-efc-athlete-tests-repository.ts
│   │   ├── supabase-efc-one-rm-repository.ts
│   │   ├── supabase-efc-weight-control-repository.ts
│   │   └── supabase-efc-session-srpe-repository.ts
│   └── composition/
│       └── efc-training-composition.ts ← factory que instancia todos los repos
│
└── app/
    └── dashboard/
        ├── trainings/
        │   └── efc/
        │       ├── layout.tsx                   ← Server Component
        │       ├── page.tsx                     ← EFC Dashboard (Server Component)
        │       ├── actions.ts                   ← Server Actions del módulo
        │       ├── efc-dashboard-client.tsx     ← "use client" para interactividad
        │       ├── athlete-selector.tsx         ← selector de deportista
        │       ├── macrocycle/
        │       │   ├── page.tsx                 ← Macrocycle Planner
        │       │   └── macrocycle-form.tsx      ← "use client" formulario reactivo
        │       ├── microcycle/
        │       │   ├── page.tsx
        │       │   └── microcycle-builder.tsx   ← "use client" constructor
        │       ├── one-rm/
        │       │   ├── page.tsx
        │       │   └── one-rm-calculator.tsx    ← "use client"
        │       ├── library/
        │       │   └── page.tsx                 ← EFC Library (Server Component)
        │       ├── load-charts/
        │       │   └── page.tsx
        │       └── weight-control/
        │           ├── page.tsx
        │           └── weight-control-tracker.tsx ← "use client"
        └── students/
            └── [studentId]/
                └── efc-profile/               ← nueva subruta para la tab EFC
                    ├── page.tsx               ← Server Component
                    ├── actions.ts             ← Server Actions EFC profile
                    └── efc-profile-form.tsx   ← "use client"
```

### Decisión de integración de la tab EFC en la ficha del alumno

La ficha de alumno existente usa `section` como query param para navegar entre tabs (`?section=summary`, `?section=membership`, etc.). La tab EFC se integra como un nuevo valor `section=efc` que carga datos del perfil EFC desde la misma página, siguiendo exactamente el mismo patrón de las otras tabs.

---

## Components and Interfaces

### Composition Factory

```typescript
// src/infrastructure/composition/efc-training-composition.ts
export async function createEfcTrainingDeps() {
  const client = await createSupabaseServerClient();
  return {
    macrocycles: new SupabaseEfcMacrocycleRepository(client),
    microcycles: new SupabaseEfcMicrocycleRepository(client),
    athleteProfile: new SupabaseEfcAthleteProfileRepository(client),
    athleteTests: new SupabaseEfcAthleteTestsRepository(client),
    oneRmRecords: new SupabaseEfcOneRmRepository(client),
    weightControl: new SupabaseEfcWeightControlRepository(client),
    sessionSrpe: new SupabaseEfcSessionSrpeRepository(client),
  };
}
```

### Port Interfaces Clave

```typescript
// efc-macrocycle-repository-port.ts
export interface EfcMacrocycleRepositoryPort {
  findActive(
    tenantId: string,
    athleteId: string,
  ): Promise<EfcMacrocycle | null>;
  list(tenantId: string, athleteId: string): Promise<EfcMacrocycle[]>;
  create(input: CreateMacrocycleInput): Promise<EfcMacrocycle>;
  update(input: UpdateMacrocycleInput): Promise<EfcMacrocycle>;
}

// efc-athlete-profile-repository-port.ts
export interface EfcAthleteProfileRepositoryPort {
  findByAthleteId(
    tenantId: string,
    athleteId: string,
  ): Promise<EfcAthleteProfile | null>;
  upsert(input: UpsertEfcProfileInput): Promise<EfcAthleteProfile>;
}

// efc-microcycle-repository-port.ts
export interface EfcMicrocycleRepositoryPort {
  findByWeek(
    macrocycleId: string,
    weekNumber: number,
  ): Promise<EfcMicrocycle | null>;
  listByMacrocycle(macrocycleId: string): Promise<EfcMicrocycle[]>;
  create(input: CreateMicrocycleInput): Promise<EfcMicrocycle>;
  upsertSessionLoads(
    microcycleId: string,
    loads: SessionLoadInput[],
  ): Promise<void>;
}
```

### Componentes React Principales

| Componente             | Tipo             | Responsabilidad                                                            |
| ---------------------- | ---------------- | -------------------------------------------------------------------------- |
| `efc/page.tsx`         | Server Component | Fetching del macrociclo activo, datos ACWR, renderiza `EfcDashboardClient` |
| `EfcDashboardClient`   | Client Component | Interactividad del dashboard, selector de deportista                       |
| `MacrocycleForm`       | Client Component | Formulario reactivo con debounce, recalcula distribuciones en ≤500ms       |
| `MicrocycleBuilder`    | Client Component | Matriz de carga días×actividades, recalcula totales en ≤300ms              |
| `OneRmCalculator`      | Client Component | Calculadora 1RM con inputs reactivos, tabla de porcentajes                 |
| `EfcLibrary`           | Server Component | Contenido estático de la biblioteca con scroll restoration                 |
| `EfcProfileForm`       | Client Component | Formulario biométrico con cálculos automáticos en tiempo real              |
| `LoadCharts`           | Client Component | 4 gráficos Recharts con datos preprocesados en el servidor                 |
| `WeightControlTracker` | Client Component | Registro de peso diario, curva de descenso, alerta roja                    |
| `EfcAthleteSelector`   | Client Component | Selector de deportista para modo standalone de la calculadora              |

### Componentes de UI Reutilizables del módulo EFC

```typescript
// Componentes específicos del módulo EFC (dentro de app/dashboard/trainings/efc/)

// EfcPeriodBadge: muestra E/F/C con colores diferenciados
// EfcAcwrIndicator: semáforo de 4 colores con texto descriptivo
// EfcTimelineCell: celda de semana coloreada por período en el timeline
// EfcFormulaDisplay: renderiza fórmulas con KaTeX
// EfcDistributionBar: barra de progreso para distribución E/F/C
```

---

## Data Models

### Esquema de Base de Datos

```sql
-- ─── efc_macrocycles ───────────────────────────────────────────────────────
CREATE TABLE efc_macrocycles (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id             uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tenant_id              uuid NOT NULL,
  start_date             date NOT NULL,
  competition_date       date NOT NULL,
  hours_per_session      numeric(4,2) NOT NULL CHECK (hours_per_session BETWEEN 0.5 AND 8.0),
  training_days_per_week integer       NOT NULL CHECK (training_days_per_week BETWEEN 1 AND 7),
  sessions_per_day       integer       NOT NULL DEFAULT 1 CHECK (sessions_per_day BETWEEN 1 AND 5),
  e_percentage           integer       NOT NULL DEFAULT 50 CHECK (e_percentage BETWEEN 0 AND 100),
  f_percentage           integer       NOT NULL DEFAULT 30 CHECK (f_percentage BETWEEN 0 AND 100),
  c_percentage           integer       NOT NULL DEFAULT 20 CHECK (c_percentage BETWEEN 0 AND 100),
  justification          text          CHECK (char_length(justification) <= 1000),
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT efc_percentages_sum CHECK (e_percentage + f_percentage + c_percentage = 100),
  CONSTRAINT efc_dates_order     CHECK (competition_date > start_date)
);

-- ─── efc_microcycles ───────────────────────────────────────────────────────
CREATE TABLE efc_microcycles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  macrocycle_id    uuid NOT NULL REFERENCES efc_macrocycles(id) ON DELETE CASCADE,
  week_number      integer     NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  microcycle_type  text        NOT NULL CHECK (microcycle_type IN ('AJ','C','I','AC','CO','R')),
  intensity_target integer     CHECK (intensity_target BETWEEN 0 AND 9),
  objective        text        CHECK (char_length(objective) <= 500),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (macrocycle_id, week_number)
);

-- ─── efc_session_loads ─────────────────────────────────────────────────────
CREATE TABLE efc_session_loads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  microcycle_id  uuid    NOT NULL REFERENCES efc_microcycles(id) ON DELETE CASCADE,
  day_of_week    integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  category       text    NOT NULL CHECK (char_length(category) <= 100),
  subcategory    text    NOT NULL CHECK (char_length(subcategory) <= 100),
  minutes        integer NOT NULL DEFAULT 0 CHECK (minutes BETWEEN 0 AND 480),
  notes          text    CHECK (char_length(notes) <= 500),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── efc_athlete_profile ───────────────────────────────────────────────────
CREATE TABLE efc_athlete_profile (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id  uuid    NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  tenant_id   uuid    NOT NULL,
  fc_rest     integer CHECK (fc_rest BETWEEN 20 AND 220),
  is_smoker   boolean NOT NULL DEFAULT false,
  efc_period  text    CHECK (efc_period IN ('E','F','C')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── efc_athlete_tests ─────────────────────────────────────────────────────
CREATE TABLE efc_athlete_tests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        uuid    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tenant_id         uuid    NOT NULL,
  evaluation_date   date    NOT NULL,
  abs_1min          integer CHECK (abs_1min BETWEEN 0 AND 300),
  seat_and_reach_cm numeric(4,1) CHECK (seat_and_reach_cm BETWEEN -30.0 AND 50.0),
  pull_ups          integer CHECK (pull_ups BETWEEN 0 AND 100),
  push_ups_1min     integer CHECK (push_ups_1min BETWEEN 0 AND 300),
  sprint_10x5_sec   numeric(5,1) CHECK (sprint_10x5_sec BETWEEN 10.0 AND 120.0),
  waist_cm          numeric(5,1) CHECK (waist_cm BETWEEN 40.0 AND 200.0),
  endurance_meters  integer CHECK (endurance_meters BETWEEN 100 AND 10000),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── efc_1rm_records ───────────────────────────────────────────────────────
CREATE TABLE efc_1rm_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id       uuid    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tenant_id        uuid    NOT NULL,
  exercise         text    NOT NULL CHECK (char_length(exercise) <= 150),
  evaluation_date  date    NOT NULL,
  weight_kg        numeric(6,2) NOT NULL CHECK (weight_kg BETWEEN 0.5 AND 999.9),
  reps_performed   integer      NOT NULL CHECK (reps_performed BETWEEN 1 AND 30),
  rir              integer      NOT NULL CHECK (rir BETWEEN 0 AND 5),
  one_rm_epley     numeric(7,2) NOT NULL CHECK (one_rm_epley BETWEEN 0.5 AND 1500.0),
  one_rm_brzycki   numeric(7,2) CHECK (one_rm_brzycki BETWEEN 0.5 AND 1500.0),
  one_rm_average   numeric(7,2) NOT NULL CHECK (one_rm_average BETWEEN 0.5 AND 1500.0),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── efc_weight_control ────────────────────────────────────────────────────
CREATE TABLE efc_weight_control (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id           uuid    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tenant_id            uuid    NOT NULL,
  record_date          date    NOT NULL,
  weight_kg            numeric(5,1) NOT NULL CHECK (weight_kg BETWEEN 30.0 AND 200.0),
  category_name        text    CHECK (char_length(category_name) <= 50),
  category_limit_kg    numeric(5,1) CHECK (category_limit_kg BETWEEN 20.0 AND 150.0),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ─── efc_session_srpe ──────────────────────────────────────────────────────
CREATE TABLE efc_session_srpe (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  microcycle_id    uuid    NOT NULL REFERENCES efc_microcycles(id) ON DELETE CASCADE,
  athlete_id       uuid    NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tenant_id        uuid    NOT NULL,
  day_of_week      integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  rpe              integer NOT NULL CHECK (rpe BETWEEN 1 AND 10),
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 1 AND 480),
  srpe             integer NOT NULL,  -- calculado: rpe × duration_minutes
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT srpe_computed CHECK (srpe = rpe * duration_minutes)
);
```

### RLS Policies (patrón uniforme por tenant)

Cada tabla tiene las cuatro políticas:

```sql
-- Ejemplo para efc_macrocycles (se replica en todas las tablas EFC)
ALTER TABLE efc_macrocycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY efc_macrocycles_select ON efc_macrocycles
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY efc_macrocycles_insert ON efc_macrocycles
  FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY efc_macrocycles_update ON efc_macrocycles
  FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY efc_macrocycles_delete ON efc_macrocycles
  FOR DELETE USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### Tipos TypeScript del Dominio

```typescript
// src/domain/efc-training/macrocycle.ts
export interface EfcMacrocycle {
  id: string;
  athleteId: string;
  tenantId: string;
  startDate: string; // ISO date string
  competitionDate: string; // ISO date string
  hoursPerSession: number;
  trainingDaysPerWeek: number;
  sessionsPerDay: number;
  ePercentage: number;
  fPercentage: number;
  cPercentage: number;
  justification: string | null;
  createdAt: string;
  updatedAt: string;
}

// Computed view — no persisted, derived from EfcMacrocycle
export interface MacrocycleDistribution {
  totalWeeks: number;
  totalMinutes: number;
  totalHours: number;
  eMinutes: number;
  fMinutes: number;
  cMinutes: number;
  weeksByType: {
    AJ: number;
    C: number;
    I: number;
    AC: number;
    CO: number;
    R: number;
  };
}

// src/domain/efc-training/athlete-profile.ts
export interface EfcAthleteProfile {
  id: string;
  athleteId: string;
  tenantId: string;
  fcRest: number | null;
  isSmoker: boolean;
  efcPeriod: "E" | "F" | "C" | null;
}

// Computed biometrics — derived from base student profile + EFC profile
export interface EfcComputedBiometrics {
  imc: number | null;
  fcMax: number | null;
  tmb: number | null;
  fcr: number | null;
  vo2max: number | null;
}
```

---

## Lógica de Cálculo — Domain Layer

Todas las fórmulas matemáticas (F-01..F-18) se implementan como **funciones puras exportadas** en `src/domain/efc-training/efc-formulas.ts`. No tienen dependencias externas; reciben primitivos y devuelven primitivos.

```typescript
// src/domain/efc-training/efc-formulas.ts

// ── F-01: Volumen total del macrociclo ──────────────────────────────────────
export function computeMacrocycleVolume(input: {
  startDate: string;
  competitionDate: string;
  hoursPerSession: number;
  trainingDaysPerWeek: number;
  sessionsPerDay: number;
}): { totalWeeks: number; totalMinutes: number; totalHours: number } {
  const start = new Date(input.startDate);
  const end = new Date(input.competitionDate);
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMinutes =
    totalWeeks *
    input.trainingDaysPerWeek *
    input.sessionsPerDay *
    input.hoursPerSession *
    60;
  return { totalWeeks, totalMinutes, totalHours: totalMinutes / 60 };
}

// ── F-02: Distribución EFC ──────────────────────────────────────────────────
export function computeEfcDistribution(
  totalMinutes: number,
  ePercentage: number,
  fPercentage: number,
  cPercentage: number,
): { eMinutes: number; fMinutes: number; cMinutes: number } {
  return {
    eMinutes: totalMinutes * (ePercentage / 100),
    fMinutes: totalMinutes * (fPercentage / 100),
    cMinutes: totalMinutes * (cPercentage / 100),
  };
}

// ── F-07: IMC ───────────────────────────────────────────────────────────────
export function computeImc(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

// ── F-08: FCMax (Tanaka) ────────────────────────────────────────────────────
export function computeFcMax(ageYears: number): number {
  return 208 - 0.7 * ageYears;
}

// ── F-09: TMB (Mifflin-St Jeor) ────────────────────────────────────────────
export function computeTmb(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: "male" | "female",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return gender === "male" ? base + 5 : base - 161;
}

// ── F-10: FCR (Karvonen) ────────────────────────────────────────────────────
export function computeFcr(fcMax: number, fcRest: number): number {
  return fcMax - fcRest;
}

// ── F-11: VO2max (Cooper) ───────────────────────────────────────────────────
export function computeVo2max(distanceMeters: number): number {
  return (distanceMeters - 504.9) / 44.73;
}

// ── F-13: sRPE ─────────────────────────────────────────────────────────────
export function computeSrpe(rpe: number, durationMinutes: number): number {
  return rpe * durationMinutes;
}

// ── F-14: Monotonía Foster y Strain ─────────────────────────────────────────
export function computeWeeklyLoadMetrics(dailySrpe: number[]): {
  weeklyTotal: number;
  dailyMean: number;
  monotonia: number | null; // null si SD = 0
  strain: number | null;
} {
  const weeklyTotal = dailySrpe.reduce((s, x) => s + x, 0);
  const dailyMean = weeklyTotal / 7;
  const variance =
    dailySrpe.reduce((s, x) => s + Math.pow(x - dailyMean, 2), 0) / 7;
  const sd = Math.sqrt(variance);
  if (sd === 0)
    return { weeklyTotal, dailyMean, monotonia: null, strain: null };
  const monotonia = dailyMean / sd;
  const strain = weeklyTotal * monotonia;
  return { weeklyTotal, dailyMean, monotonia, strain };
}

// ── F-15: ACWR ──────────────────────────────────────────────────────────────
export function computeAcwr(
  dailyLoads: { date: string; srpe: number }[],
  referenceDate: string,
): { ca: number; cc: number; acwr: number | null } | null {
  const ref = new Date(referenceDate).getTime();
  const loads7 = dailyLoads.filter((d) => {
    const diff = (ref - new Date(d.date).getTime()) / 86_400_000;
    return diff >= 0 && diff < 7;
  });
  const loads28 = dailyLoads.filter((d) => {
    const diff = (ref - new Date(d.date).getTime()) / 86_400_000;
    return diff >= 0 && diff < 28;
  });
  const ca = loads7.reduce((s, d) => s + d.srpe, 0) / 7;
  const cc = loads28.reduce((s, d) => s + d.srpe, 0) / 28;
  if (cc === 0) return { ca, cc, acwr: null };
  return { ca, cc, acwr: ca / cc };
}

// ── F-15: Clasificación ACWR ────────────────────────────────────────────────
export type AcwrLevel = "undertrained" | "optimal" | "caution" | "danger";

export function classifyAcwr(acwr: number): AcwrLevel {
  if (acwr < 0.8) return "undertrained";
  if (acwr <= 1.3) return "optimal";
  if (acwr <= 1.5) return "caution";
  return "danger";
}

// ── F-16: 1RM (Epley y Brzycki) ────────────────────────────────────────────
export function computeOneRm(
  weightKg: number,
  repsPerformed: number,
  rir: number,
): {
  repsTotal: number;
  epley: number;
  brzycki: number | null; // null si (37 - repsTotal) <= 0
  average: number;
  unreliable: boolean;
} {
  const repsTotal = repsPerformed + rir;
  const epley = weightKg * (1 + repsTotal / 30);
  const denom = 37 - repsTotal;
  const brzycki = denom > 0 ? weightKg * (36 / denom) : null;
  const average = brzycki != null ? (epley + brzycki) / 2 : epley;
  return { repsTotal, epley, brzycki, average, unreliable: repsTotal > 30 };
}

// ── F-18: Control de peso ────────────────────────────────────────────────────
export function computeWeightDeltaPercent(
  baselineKg: number,
  currentKg: number,
): number {
  return ((currentKg - baselineKg) / Math.abs(baselineKg)) * 100;
}

export function classifyWeightCutRisk(
  deltaPercent: number,
  daysElapsed: number,
): "safe" | "warning" | "danger" {
  if (deltaPercent < -5 && daysElapsed < 7) return "danger";
  if (deltaPercent < 0) return "warning";
  return "safe";
}
```

**Principio clave:** Las funciones del dominio son la única fuente de verdad para todos los cálculos. Los componentes Client solo llaman estas funciones directamente (sin llamadas a red) para los recálculos en tiempo real, garantizando la latencia de ≤300ms / ≤500ms requerida.

---

## Flujo de Datos

### Patrón General (Server Component + Client Component)

```
Server Component (page.tsx)
  │  await requireOperationalMembership()
  │  await createEfcTrainingDeps()
  │  await use-case-function(input, deps)
  │
  └─► Client Component (recibe datos como props serializadas)
        │  usa funciones del domain para recálculos locales
        │  llama Server Actions para mutaciones
        └─► Server Action (actions.ts)
              │  'use server'
              │  await requireOperationalMembership()
              │  await createEfcTrainingDeps()
              └─► use-case-function(input, deps)
```

### Flujo del EFC Dashboard

```
GET /dashboard/trainings/efc?athleteId=xxx
  │
  ├─ page.tsx (Server Component)
  │   ├─ requireOperationalMembership() → { tenantId, role }
  │   ├─ createEfcTrainingDeps() → { macrocycles, sessionSrpe, … }
  │   ├─ macrocycles.findActive(tenantId, athleteId) → EfcMacrocycle | null
  │   ├─ sessionSrpe.listLast28Days(tenantId, athleteId) → SrpeRecord[]
  │   ├─ computeAcwr(records, today) → { ca, cc, acwr }
  │   └─ <EfcDashboardClient macrocycle={...} acwr={...} />
  │
  └─ EfcDashboardClient (Client Component)
      ├─ muestra distribución E/F/C con barras de progreso
      ├─ semáforo ACWR con classifyAcwr()
      └─ enlace directo a OneRM Calculator

```

### Flujo del Macrocycle Planner (Recálculo en Tiempo Real)

```
MacrocycleForm (Client Component)
  │
  ├─ Estado local: formValues (startDate, competitionDate, hours, days, sessions, %E, %F, %C)
  │
  ├─ onChange → useCallback con debounce de 300ms
  │       └─ computeMacrocycleVolume(formValues)   ← domain function, sin red
  │       └─ computeEfcDistribution(...)            ← domain function, sin red
  │       └─ computeSubdistributions(...)           ← domain functions F-04..F-06
  │       └─ setState({ distribution, timeline })   ← actualiza UI ≤500ms ✓
  │
  └─ onSubmit → Server Action: saveMacrocycleAction(formData)
        └─ manage-macrocycle.ts use case → repo.create()
```

### Flujo del Microcycle Builder (Recálculo en Tiempo Real)

```
MicycleBuilder (Client Component)
  │
  ├─ Estado local: grid[category][subcategory][day] = minutes
  │
  ├─ onMinutesChange → inmediato (sin debounce: actualiza solo sumas)
  │       └─ Σ minutos por categoría     ← O(1) por celda
  │       └─ Σ minutos por día           ← O(1) por celda
  │       └─ Σ total semanal             ← O(1) por celda
  │       → actualiza UI ≤300ms ✓
  │
  └─ onSave → Server Action: saveMicrocycleAction(formData)
```

---

## Integrations

### KaTeX para Fórmulas Matemáticas

**Librería:** `katex` (SSR-compatible, sin dependencia de MathJax).

```typescript
// Uso en Server Component (renderizado en servidor, cero JS de cliente):
import renderToString from "katex/contrib/auto-render";
// O usando la API directa:
import katex from "katex";

// En Client Components donde sea necesaria interactividad:
// Lazy import para evitar bloquear el bundle inicial
const KatexFormula = dynamic(() => import("./katex-formula"), { ssr: false });
```

La instalación requiere añadir `katex` a las dependencias y el CSS de KaTeX en el layout del módulo EFC.

### Recharts para Gráficos

**Librería:** `recharts` (compatible con React 18+, SSR-safe con `dynamic` import).

Los componentes de gráficos **siempre** se importan con `next/dynamic` y `{ ssr: false }` porque acceden a las dimensiones del DOM.

```typescript
// src/app/dashboard/trainings/efc/load-charts/page.tsx
const LoadVolumeChart = dynamic(() => import("./charts/load-volume-chart"), {
  ssr: false,
});
const EfcCompareChart = dynamic(() => import("./charts/efc-compare-chart"), {
  ssr: false,
});
const IntensityLineChart = dynamic(
  () => import("./charts/intensity-line-chart"),
  { ssr: false },
);
const EfcDistributionChart = dynamic(
  () => import("./charts/efc-distribution-chart"),
  { ssr: false },
);
```

Los **datos de los gráficos se preparan en el Server Component** (agregaciones, filtros) y se pasan como props serializables a los Client Components de Recharts. Los componentes de gráfico no hacen fetch propio.

### Exportación PDF

**Librería:** `@react-pdf/renderer` (SSR en Next.js mediante Server Actions).

La generación de PDF ocurre en el servidor dentro de un Server Action:

```typescript
// actions.ts
"use server";
export async function exportMacrocyclePdfAction(macrocycleId: string) {
  // 1. Cargar datos del macrociclo y microciclos
  // 2. Renderizar con @react-pdf/renderer a Buffer
  // 3. Retornar como base64 para descarga via <a download>
}
```

### Exportación/Importación Excel

**Librería:** `exceljs` (pure JS, sin bindings nativos, funciona en Edge/Node runtimes de Next.js).

```typescript
// Exportación: Server Action genera workbook y retorna como buffer base64
// Importación: Server Action lee el archivo enviado como FormData multipart
export async function importAthleteExcelAction(formData: FormData) {
  const file = formData.get("file") as File;
  // Validación de tamaño (≤5 MB) antes de procesar
  // Parseo con exceljs
  // Retorno de resumen: { valid: number, discarded: number, errors: ... }
}
```

---

## Consideraciones de Rendimiento

### Debounce para Recálculos

El `MacrocycleForm` usa un debounce de **300ms** (no 500ms) para garantizar margen holgado frente al límite de 500ms del requisito. El `MicycleBuilder` actualiza **síncronamente** (sin debounce) porque las sumas son O(n) sobre un vector pequeño (máximo 7 días × ~40 actividades = 280 celdas), terminando en <5ms en hardware moderno.

```typescript
// Hook de debounce personalizado
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
```

### Caché de Datos del Macrociclo

El macrociclo activo se pasa como prop desde el Server Component a todos los subcomponentes que lo necesitan dentro del mismo árbol de rendering. No se hace re-fetch por subruta.

Para páginas anidadas (calculadora 1RM, control de peso) que necesitan el contexto del macrociclo activo, se recibe `athleteId` como search param y se hace un fetch ligero solo de los campos necesarios.

### Estrategia de Paginación

El historial de tests físicos (EFC_Profile, Req 4.6) usa server-side pagination con `?testsPage=N` como query param. El límite es 50 registros por página.

Los gráficos de evolución (EFC_Profile, Req 4.7) usan solo los últimos 10 registros, que se obtienen en la misma query mediante `ORDER BY evaluation_date DESC LIMIT 10`.

---

## Error Handling

| Escenario                                          | Comportamiento                                                                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fallo de persistencia Supabase (INSERT/UPDATE)     | Server Action retorna `{ success: false, error: string }`. El Client Component muestra un toast de error no bloqueante. Los datos del formulario se preservan. |
| Deportista sin macrociclo activo                   | El Dashboard muestra estado vacío descriptivo con CTA al Macrocycle Planner.                                                                                   |
| ACWR con CC = 0 (sin datos históricos suficientes) | Muestra "N/A" con aviso "datos insuficientes para carga crónica estable".                                                                                      |
| Monotonía indefinida (SD_diaria = 0)               | Muestra "N/A" con advertencia de variabilidad nula.                                                                                                            |
| Brzycki no aplicable (reps_total ≥ 37)             | Solo se muestra el valor Epley; Brzycki muestra "N/A".                                                                                                         |
| Importación Excel con registros inválidos          | Se importan solo los válidos; se muestra resumen detallado de errores por campo.                                                                               |
| Archivo Excel > 5MB o formato incorrecto           | Se rechaza antes de procesar con mensaje descriptivo del motivo.                                                                                               |
| Error al cargar sección de EFC_Library             | Se muestra mensaje "Contenido no disponible" en el área de la sección; el menú de navegación permanece funcional.                                              |
| Operación RLS rechazada (tenant incorrecto)        | Supabase retorna 403; el use case propaga el error; la Server Action devuelve error genérico al cliente sin exponer detalles del tenant.                       |

---

## Testing Strategy

### Enfoque Dual

El módulo usa una combinación de:

- **Unit tests con Jest/Vitest** para funciones de dominio puras y casos específicos.
- **Property-based tests con fast-check** para validar las propiedades universales de las fórmulas matemáticas.

### Unit Tests (Jest/Vitest)

Cubren:

- Casos específicos de fórmulas con valores conocidos (IMC de 70kg/1.70m = 24.22).
- Casos borde (ACWR con CC=0, Brzycki con reps=37, Monotonía con SD=0).
- Validaciones de los schemas Zod en use cases.
- Comportamiento de los Server Actions ante errores de Supabase (mocks).
- Renderizado de componentes Server Component con datos ficticios.

### Property-Based Tests (fast-check)

La librería elegida es **fast-check** (TypeScript-first, sin dependencias nativas, ampliamente usada en ecosistemas Next.js).

Cada property test se configura con **mínimo 100 iteraciones** (`numRuns: 100`).

Formato de tag para cada test:

```
// Feature: efc-training-module, Property N: [descripción]
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Distribución EFC suma al volumen total

_Para cualquier_ entrada válida de macrociclo (fechas, horas/sesión, días/semana, sesiones/día, porcentajes E/F/C que sumen 100), la suma de los minutos distribuidos en las tres etapas debe ser igual al volumen total calculado.

**Validates: Requirements 5.2, 5.3**

### Property 2: Volumen total es no-negativo y crece con los parámetros de sesión

_Para cualquier_ par de fechas válidas con competición posterior al inicio, y parámetros positivos de sesión, el volumen total calculado debe ser no-negativo, y si se incrementa cualquiera de los parámetros de sesión manteniendo el resto constante, el volumen total no debe disminuir.

**Validates: Requirements 5.2**

### Property 3: IMC es invariante a la escala de talla

_Para cualquier_ peso positivo y talla positiva, el IMC calculado como peso/(talla_m)² debe ser un número positivo finito, y duplicar tanto el peso como la talla al cuadrado debe dejar el IMC invariante en su relación lineal.

**Validates: Requirements 4.3**

### Property 4: Las fórmulas fisiológicas producen resultados en dominio válido

_Para cualquier_ entrada dentro del dominio definido (edad 10–80, peso 30–200kg, talla 100–250cm, género male/female), FCMax (Tanaka) debe estar en [152, 201] bpm, TMB debe ser positiva, y VO2max con distancia [100, 10000] m debe estar en un rango positivo.

**Validates: Requirements 4.3**

### Property 5: Clasificación ACWR es exhaustiva y mutuamente excluyente

_Para cualquier_ valor de ACWR positivo, la función `classifyAcwr` debe retornar exactamente uno de los cuatro niveles (undertrained, optimal, caution, danger), y el nivel retornado debe corresponder exactamente al intervalo de umbrales definido.

**Validates: Requirements 2.10**

### Property 6: ACWR con historial de carga uniforme permanece en zona óptima

_Para cualquier_ secuencia de 28 días con carga sRPE constante y positiva, el ACWR calculado debe ser exactamente 1.0 (carga aguda = carga crónica), clasificándose siempre como 'optimal'.

**Validates: Requirements 2.4, 2.10**

### Property 7: sRPE es el producto exacto de RPE y duración

_Para cualquier_ RPE en [1, 10] y duración en [1, 480] minutos, el sRPE calculado debe ser exactamente igual a RPE × duración, sin redondeo ni truncamiento.

**Validates: Requirements 6.10**

### Property 8: Métricas semanales de carga son consistentes internamente

_Para cualquier_ vector de 7 valores de sRPE no-negativos, la carga semanal total debe ser la suma exacta, la media diaria debe ser la carga semanal dividida entre 7, y cuando la desviación estándar es positiva, el Strain debe ser igual a carga_semanal × monotonía.

**Validates: Requirements 6.11**

### Property 9: 1RM de Epley crece con el peso levantado y las repeticiones totales

_Para cualquier_ peso positivo y repeticiones totales en [1, 30], el 1RM de Epley debe ser mayor que el peso levantado (ya que se levantó más de una repetición), y mantener el peso constante mientras se aumentan las repeticiones totales debe producir un 1RM igual o mayor.

**Validates: Requirements 7.4**

### Property 10: RIR derivado de RPE satisface RIR = round(10 − RPE)

_Para cualquier_ valor de RPE en [6.0, 10.0], el RIR derivado debe ser igual a round(10 − RPE), y debe estar en el rango [0, 4] (ya que RPE ∈ [6, 10]).

**Validates: Requirements 7.3**

### Property 11: Δ% de peso tiene el signo correcto

_Para cualquier_ secuencia de pesos positivos, Δ% = ((peso_actual − peso_basal) / peso_basal) × 100 debe ser negativo si el peso actual es menor que el basal, cero si son iguales, y positivo si el peso actual es mayor.

**Validates: Requirements 12.4**

### Property 12: La alerta de descenso rápido de peso es monótona en el riesgo

_Para cualquier_ Δ% más negativo que −5% con 6 días transcurridos o menos, la clasificación de riesgo debe ser 'danger'; para cualquier Δ% con 7 días o más transcurridos, nunca debe ser 'danger' por razón temporal independientemente del Δ%.

**Validates: Requirements 12.7**

### Property 13: Validación de FC_Rest rechaza todo valor fuera de [30, 220]

_Para cualquier_ entero fuera del intervalo [30, 220], la validación del campo FC_Rest debe retornar un error; para cualquier entero dentro de [30, 220], debe aceptar el valor.

**Validates: Requirements 4.2**

### Property 14: La suma de porcentajes E+F+C = 100 es condición necesaria y suficiente para habilitar el guardado

_Para cualquier_ triple de enteros no-negativos (%E, %F, %C), el guardado del macrociclo debe estar habilitado (sujeto a otras validaciones) si y solo si %E + %F + %C = 100.

**Validates: Requirements 5.6**
