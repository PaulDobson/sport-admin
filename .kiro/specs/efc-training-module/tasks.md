# Implementation Plan: EFC Training Module

## Overview

Implement the EFC Training Module as a new DDD bounded context `efc-training` within the sport-admin Next.js 15 / Supabase / TypeScript / Tailwind CSS application. The implementation follows the same layer structure (`domain/` → `application/` → `infrastructure/` → `presentation/`) as existing bounded contexts (`instructor-operations`, `evolution-health-attendance`, etc.).

## Tasks

- [x] 1. Database migrations — create all EFC tables with constraints and RLS
  - [x] 1.1 Write migration file for `efc_macrocycles` and `efc_microcycles` tables
    - Create `efc_macrocycles` with all fields defined in design: `id`, `athlete_id` (FK → students), `tenant_id`, `start_date`, `competition_date`, `hours_per_session`, `training_days_per_week`, `sessions_per_day`, `e_percentage`, `f_percentage`, `c_percentage`, `justification`, `created_at`, `updated_at`
    - Add CHECK constraints: `efc_percentages_sum` (E+F+C=100), `efc_dates_order` (competition > start), range checks on numeric fields
    - Create `efc_microcycles` with `id`, `macrocycle_id` (FK → efc_macrocycles CASCADE), `week_number`, `microcycle_type` (enum AJ/C/I/AC/CO/R), `intensity_target`, `objective`, `created_at`, `updated_at`; UNIQUE (macrocycle_id, week_number)
    - Apply RLS on both tables: enable RLS + 4 policies (SELECT/INSERT/UPDATE/DELETE) filtering by `tenant_id = auth.jwt() ->> 'tenant_id'`
    - _Requirements: 10.1, 10.2, 10.7, 10.8, 10.9_

  - [x] 1.2 Write migration file for `efc_session_loads`, `efc_session_srpe`, and `efc_athlete_profile` tables
    - Create `efc_session_loads` with `id`, `microcycle_id` (FK CASCADE), `day_of_week` (1–7), `category` (100 chars), `subcategory` (100 chars), `minutes` (0–480), `notes` (500 chars nullable), `created_at`
    - Create `efc_session_srpe` with `id`, `microcycle_id` (FK CASCADE), `athlete_id` (FK), `tenant_id`, `day_of_week`, `rpe` (1–10), `duration_minutes` (1–480), `srpe` (computed), `created_at`; CHECK (srpe = rpe \* duration_minutes)
    - Create `efc_athlete_profile` with `id`, `athlete_id` (FK UNIQUE), `tenant_id`, `fc_rest` (20–220), `is_smoker`, `efc_period` (E/F/C), `created_at`, `updated_at`
    - Apply RLS on all three tables
    - _Requirements: 10.3, 10.4, 10.7, 10.9, 10.11_

  - [x] 1.3 Write migration file for `efc_athlete_tests`, `efc_1rm_records`, and `efc_weight_control` tables
    - Create `efc_athlete_tests` with all physical test fields (abs_1min, seat_and_reach_cm, pull_ups, push_ups_1min, sprint_10x5_sec, waist_cm, endurance_meters), all nullable with range CHECK constraints
    - Create `efc_1rm_records` with `weight_kg`, `reps_performed`, `rir`, `one_rm_epley`, `one_rm_brzycki`, `one_rm_average`, `exercise`, `evaluation_date`; all numeric range CHECK constraints
    - Create `efc_weight_control` with `record_date`, `weight_kg` (30–200), `category_name`, `category_limit_kg`; RLS policies
    - Apply RLS on all three tables
    - _Requirements: 10.5, 10.6, 10.7, 10.9, 10.10_

- [x] 2. Domain layer — pure calculation functions and TypeScript types
  - [x] 2.1 Create domain types file `src/domain/efc-training/macrocycle.ts`
    - Define `EfcMacrocycle` interface, `EfcMicrocycle` interface, `MacrocycleDistribution` computed view, `MicrocycleType` union type, `EfcPeriod` type
    - Define `EfcSessionLoad` and `EfcSessionSrpe` interfaces
    - _Requirements: 5.1, 6.1, 10.1, 10.2, 10.3_

  - [x] 2.2 Create domain types files for athlete entities
    - Create `src/domain/efc-training/athlete-profile.ts`: `EfcAthleteProfile`, `EfcComputedBiometrics` interfaces
    - Create `src/domain/efc-training/one-rm.ts`: `OneRmInput`, `OneRmResult` interfaces; `EfcPrescription` type
    - Create `src/domain/efc-training/weight-control.ts`: `EfcWeightControlRecord`, `WeightCutRisk` type
    - Create `src/domain/efc-training/load-metrics.ts`: `SrpeRecord`, `WeeklyLoadMetrics`, `AcwrResult`, `AcwrLevel` type
    - _Requirements: 4.2, 4.3, 7.1, 12.1, 12.4_

  - [x] 2.3 Implement formula functions F-01 to F-06 in `src/domain/efc-training/efc-formulas.ts`
    - Implement `computeMacrocycleVolume` (F-01): total days → total weeks (floor) → total minutes/hours
    - Implement `computeEfcDistribution` (F-02): distribute total minutes by %E/%F/%C
    - Implement `computeMicrocycleTypeDistribution` (F-03): distribute weeks by AJ/C/I/AC/CO/R ratios
    - Implement `computeStageSubdistributionE` (F-04), `computeStageSubdistributionF` (F-05), `computeStageSubdistributionC` (F-06): internal sub-distributions per stage
    - All functions accept primitives and return primitives; no side effects
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ]\* 2.4 Write property tests for F-01 and F-02 (fast-check)
    - **Property 1: EFC distribution sums to total volume** — for any valid macrocycle inputs with E+F+C=100, sum of eMinutes+fMinutes+cMinutes must equal totalMinutes
    - **Property 2: Total volume is non-negative and monotone in session params** — for any valid date pair and positive session params, volume ≥ 0; increasing any session param must not decrease volume
    - **Property 14: E+F+C sum = 100 is necessary and sufficient for save enablement** — for any triple of non-negative integers, the guard passes if and only if they sum to 100
    - Each test uses `numRuns: 100`; tag format `// Feature: efc-training-module, Property N: ...`
    - _Requirements: 5.2, 5.3, 5.6_

  - [x] 2.5 Implement physiological formula functions F-07 to F-12 in `efc-formulas.ts`
    - Implement `computeImc` (F-07): weight / (height_m)²
    - Implement `computeFcMax` (F-08, Tanaka): 208 − 0.7 × age
    - Implement `computeTmb` (F-09, Mifflin-St Jeor): separate male/female branches
    - Implement `computeFcr` (F-10, Karvonen): FCMax − FC_Rest
    - Implement `computeVo2max` (F-11, Cooper): (distance − 504.9) / 44.73
    - Implement `computeValueDeltaPercent` (F-12): ((current − baseline) / |baseline|) × 100
    - _Requirements: 4.3_

  - [ ]\* 2.6 Write property tests for physiological formulas (fast-check)
    - **Property 3: IMC is invariant to scale** — IMC(weight, height) produces positive finite result; doubling weight and height² preserves the linear relationship
    - **Property 4: Physiological formulas produce results in valid domain** — for age ∈ [10,80], weight ∈ [30,200], height ∈ [100,250], gender ∈ {male,female}: FCMax ∈ [152,201], TMB > 0, VO2max with distance ∈ [100,10000] is in valid positive range
    - Each test uses `numRuns: 100`
    - _Requirements: 4.3_

  - [x] 2.7 Implement sRPE, weekly load, and ACWR functions F-13 to F-15 in `efc-formulas.ts`
    - Implement `computeSrpe` (F-13): rpe × durationMinutes; returns integer
    - Implement `computeWeeklyLoadMetrics` (F-14): weeklyTotal, dailyMean, monotonia (null if SD=0), strain; population SD
    - Implement `computeAcwr` (F-15): CA (7-day rolling mean), CC (28-day rolling mean), ACWR = CA/CC (null if CC=0)
    - Implement `classifyAcwr` (F-15): returns `AcwrLevel` based on thresholds (< 0.8 / 0.8–1.3 / 1.3–1.5 / > 1.5)
    - _Requirements: 2.4, 2.10, 6.10, 6.11_

  - [ ]\* 2.8 Write property tests for sRPE, weekly load, and ACWR (fast-check)
    - **Property 5: ACWR classification is exhaustive and mutually exclusive** — for any positive ACWR, `classifyAcwr` returns exactly one of the four levels corresponding to the correct threshold interval
    - **Property 6: Uniform load history yields ACWR = 1.0** — for any 28-day sequence with constant positive sRPE, ACWR = 1.0, classified as 'optimal'
    - **Property 7: sRPE is the exact product of RPE and duration** — for RPE ∈ [1,10] and duration ∈ [1,480], srpe = rpe × duration exactly, no rounding
    - **Property 8: Weekly load metrics are internally consistent** — for any 7-element non-negative sRPE vector: weeklyTotal = exact sum; dailyMean = weeklyTotal/7; when SD > 0, strain = weeklyTotal × monotonia
    - Each test uses `numRuns: 100`
    - _Requirements: 2.4, 2.10, 6.10, 6.11_

  - [x] 2.9 Implement 1RM and weight control formula functions F-16 to F-18 in `efc-formulas.ts`
    - Implement `computeOneRm` (F-16): repsTotal = repsPerformed + rir; Epley (weight × (1 + repsTotal/30)); Brzycki (weight × (36 / (37 − repsTotal)), null if denom ≤ 0); average; unreliable flag if repsTotal > 30
    - Implement `computeOneRmPercentageTable`: for percentages 50–100 in steps of 5, compute weight (rounded to 0.5 kg) and estimated reps to failure (Epley inverted)
    - Implement `computeEfcPrescription` (F-17): return min/max weight and rep/series/RIR guidance by EFC period
    - Implement `computeWeightDeltaPercent` (F-18): delta% formula
    - Implement `classifyWeightCutRisk` (F-18): 'danger' if deltaPercent < −5 AND daysElapsed < 7, else 'warning' if deltaPercent < 0, else 'safe'
    - _Requirements: 7.3, 7.4, 7.6, 7.7, 12.4, 12.7_

  - [ ]\* 2.10 Write property tests for 1RM and weight control (fast-check)
    - **Property 9: Epley 1RM grows with weight and total reps** — for any positive weight and repsTotal ∈ [1,30], Epley 1RM > weight; keeping weight constant and increasing repsTotal must not decrease 1RM
    - **Property 10: RIR derived from RPE satisfies RIR = round(10 − RPE)** — for any RPE ∈ [6.0,10.0], RIR = round(10 − RPE); RIR ∈ [0,4]
    - **Property 11: Weight delta % has correct sign** — deltaPercent < 0 iff current < baseline; = 0 iff equal; > 0 iff current > baseline
    - **Property 12: Rapid weight loss alert is monotone in risk** — for deltaPercent < −5% and daysElapsed ≤ 6, risk = 'danger'; for daysElapsed ≥ 7, risk ≠ 'danger' regardless of deltaPercent
    - **Property 13: FC_Rest validation rejects all values outside [30, 220]** — any integer outside [30,220] must fail validation; any integer inside must pass
    - Each test uses `numRuns: 100`
    - _Requirements: 7.3, 7.4, 12.4, 12.7, 4.2_

- [x] 3. Application layer — ports and use cases
  - [x] 3.1 Create repository port interfaces in `src/application/efc-training/ports/`
    - Create `efc-macrocycle-repository-port.ts`: `EfcMacrocycleRepositoryPort` with `findActive`, `list`, `create`, `update`
    - Create `efc-microcycle-repository-port.ts`: `EfcMicrocycleRepositoryPort` with `findByWeek`, `listByMacrocycle`, `create`, `upsertSessionLoads`
    - Create `efc-athlete-profile-repository-port.ts`: `EfcAthleteProfileRepositoryPort` with `findByAthleteId`, `upsert`
    - Create `efc-athlete-tests-repository-port.ts`: `EfcAthleteTestsRepositoryPort` with `create`, `listByAthleteId` (with pagination offset/limit)
    - _Requirements: 5.9, 4.8, 6.6, 10.1–10.5_

  - [x] 3.2 Create remaining repository port interfaces in `src/application/efc-training/ports/`
    - Create `efc-one-rm-repository-port.ts`: `EfcOneRmRepositoryPort` with `create`, `listByAthleteId`
    - Create `efc-weight-control-repository-port.ts`: `EfcWeightControlRepositoryPort` with `create`, `listByAthleteId`
    - Create `efc-session-srpe-repository-port.ts`: `EfcSessionSrpeRepositoryPort` with `upsert`, `listLast28Days`
    - _Requirements: 7.11, 12.8, 2.4, 10.6, 10.10, 10.11_

  - [x] 3.3 Implement macrocycle and microcycle use cases in `src/application/efc-training/use-cases/`
    - Create `manage-macrocycle.ts`: `createMacrocycle` (validates dates, totalWeeks ≥ 10, percentages sum = 100, existing active warning), `updateMacrocycle`, `findActiveMacrocycle`, `listMacrocycles`
    - Create `manage-microcycle.ts`: `createMicrocycle` (conflict check for duplicate week), `getMicycleByWeek`, `listMicrocyclesByMacrocycle`, `saveMicrocycleSessionLoads`
    - Zod schemas for both use cases; validation errors propagate as typed results
    - _Requirements: 5.6, 5.7, 5.9, 5.10, 6.1, 6.6, 6.9_

  - [x] 3.4 Implement athlete profile, physical tests, and load visualization use cases
    - Create `manage-athlete-efc-profile.ts`: `getOrInitEfcProfile`, `upsertEfcProfile`; Zod schema validates fc_rest ∈ [30,220]
    - Create `manage-physical-tests.ts`: `createPhysicalTest` with per-field range validation; `listPhysicalTests` with pagination (page × 50 offset)
    - Create `get-load-visualizations.ts`: `getLoadVisualizationData` aggregates weekly volumes by microcycle_type, compares real vs planned EFC distribution, extracts daily intensity series from session_srpe
    - _Requirements: 4.2, 4.5, 4.6, 8.1–8.4_

  - [x] 3.5 Implement 1RM, weight control, and export use cases
    - Create `calculate-one-rm.ts`: `saveOneRmRecord`, `listOneRmRecords`; uses `computeOneRm` domain function; validates reps ∈ [1,30] and weight ≤ 999.9
    - Create `manage-weight-control.ts`: `createWeightRecord`, `listWeightRecords`; validates weight ∈ [30,200]
    - Create `export-efc-data.ts`: `exportMacrocyclePdf` (collect macrocycle + microcycles data), `exportAthleteExcel` (profile + tests + 1RM), `importAthleteExcel` (parse + validate + return summary)
    - _Requirements: 7.11, 7.12, 12.2, 12.8, 9.1–9.6_

- [x] 4. Infrastructure layer — Supabase repositories and composition factory
  - [x] 4.1 Implement Supabase repositories for macrocycles and microcycles
    - Create `src/infrastructure/efc-training/supabase-efc-macrocycle-repository.ts`: implements `EfcMacrocycleRepositoryPort`; `findActive` queries `start_date ≤ today AND competition_date > today LIMIT 1`; maps snake_case DB rows to camelCase domain types
    - Create `src/infrastructure/efc-training/supabase-efc-microcycle-repository.ts`: implements `EfcMicrocycleRepositoryPort`; `upsertSessionLoads` uses bulk upsert on `(microcycle_id, day_of_week, category, subcategory)` conflict key
    - _Requirements: 5.9, 6.6, 10.1, 10.2, 10.3_

  - [x] 4.2 Implement Supabase repositories for athlete profile, tests, 1RM, weight control, and sRPE
    - Create `supabase-efc-athlete-profile-repository.ts`: implements `EfcAthleteProfileRepositoryPort`; uses `upsert` on `athlete_id` conflict key
    - Create `supabase-efc-athlete-tests-repository.ts`: implements `EfcAthleteTestsRepositoryPort`; `listByAthleteId` applies `ORDER BY evaluation_date DESC LIMIT 50 OFFSET page*50`
    - Create `supabase-efc-one-rm-repository.ts`, `supabase-efc-weight-control-repository.ts`, `supabase-efc-session-srpe-repository.ts`
    - `listLast28Days` in sRPE repo filters `created_at >= now() - interval '28 days'`
    - _Requirements: 4.6, 4.8, 7.11, 12.8, 10.4–10.6, 10.10, 10.11_

  - [x] 4.3 Create the EFC composition factory
    - Create `src/infrastructure/composition/efc-training-composition.ts`
    - Export `createEfcTrainingDeps()` async factory following the exact pattern of `instructor-operations-composition.ts`: creates a single Supabase server client and injects it into all 7 repositories; returns typed object `{ macrocycles, microcycles, athleteProfile, athleteTests, oneRmRecords, weightControl, sessionSrpe }`
    - _Requirements: 5.9, 6.6, 4.8, 7.11, 12.8_

- [x] 5. Navigation integration — EFC card in /dashboard/trainings
  - [x] 5.1 Add EFC training card to `src/app/dashboard/trainings/page.tsx`
    - Add a new entry to the `tools` array for the EFC module with `href: "/dashboard/trainings/efc"`, appropriate image, accent colors (e.g. emerald/teal palette to differentiate from existing cards), label "Planificación EFC", tagline "Periodización Estructura–Función–Cognición", description referencing combat taekwondo periodization
    - Add two feature pills: periodización and macrociclos
    - Card must appear after the three existing cards (Cognitivo, Temporizadores, Combinaciones) without modifying them
    - _Requirements: 1.2, 1.3_

  - [x] 5.2 Create EFC module route layout and entry point
    - Create `src/app/dashboard/trainings/efc/layout.tsx` as Server Component: renders section navigation (EFC Dashboard, Macrociclo, Microciclo, Calculadora 1RM, Gráficos de Carga, Biblioteca, Control de Peso) using link-based nav consistent with existing dashboard layouts
    - Create `src/app/dashboard/trainings/efc/page.tsx` stub that re-exports to `EfcDashboardClient` (implemented in task 6)
    - Create `src/app/dashboard/trainings/efc/actions.ts` with `'use server'` and placeholder structure for all EFC server actions
    - _Requirements: 1.1, 1.3_

- [x] 6. EFC Dashboard — macrocycle summary, ACWR, and athlete selector
  - [x] 6.1 Implement athlete selector for EFC Dashboard
    - Create `src/app/dashboard/trainings/efc/athlete-selector.tsx` as Client Component
    - Renders a list/combobox of active students fetched via Server Component prop; on selection, updates the URL `?athleteId=xxx` using `useRouter().push` without full page reload
    - When no athlete is selected (`athleteId` absent from search params), the EFC Dashboard renders only this component
    - _Requirements: 1.4, 1.5_

  - [x] 6.2 Implement EFC Dashboard Server Component data fetching
    - In `src/app/dashboard/trainings/efc/page.tsx`: read `athleteId` from search params; call `requireOperationalMembership()`; call `createEfcTrainingDeps()`; fetch active macrocycle and last 28 days of sRPE records in parallel; call `computeAcwr` and `classifyAcwr` from domain; pass serialized props to `EfcDashboardClient`
    - Handle empty states: no athlete selected → render `AthleteSelector`; no active macrocycle → render empty state with link to Macrocycle Planner
    - _Requirements: 2.1, 2.3, 2.4, 2.7, 2.8_

  - [x] 6.3 Implement `EfcDashboardClient` interactive component
    - Create `src/app/dashboard/trainings/efc/efc-dashboard-client.tsx` as Client Component (`'use client'`)
    - Display: athlete name, active EFC period badge (E/F/C with distinct color per period — only active period visually highlighted), start/competition dates, total planned hours, E/F/C distribution with progress bars, integer weeks remaining (or "0 semanas restantes" if competition date ≤ today)
    - Display ACWR indicator: value + colored badge (blue/green/yellow/red) + descriptive text per `classifyAcwr`; show "N/A + datos insuficientes" when ACWR is null; show "datos insuficientes (< 28 días)" warning when CC data covers < 28 days
    - Show alert when no microcycle registered in last 14 days
    - Show direct link to OneRM Calculator with current athleteId in context
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10_

- [x] 7. EFC Profile tab in student detail page
  - [x] 7.1 Implement EFC Profile Server Component and add "efc" section tab
    - Create `src/app/dashboard/students/[studentId]/efc-profile/page.tsx` as Server Component: fetch `EfcAthleteProfile`, `EfcAthleteTests` history (page 1), and student base data (weight, height, birthDate, gender) via `createEfcTrainingDeps()` and `createInstructorOperationsDeps()`
    - Create `src/app/dashboard/students/[studentId]/efc-profile/actions.ts` with `'use server'` for `upsertEfcProfileAction` and `createPhysicalTestAction`
    - Add `['efc', 'EFC']` entry to the section tabs array in `src/app/dashboard/students/[studentId]/page.tsx`; add `section === 'efc'` branch that lazy-loads the EFC profile sub-route
    - _Requirements: 4.1, 4.8, 4.9_

  - [x] 7.2 Implement `EfcProfileForm` and computed biometrics display
    - Create `src/app/dashboard/students/[studentId]/efc-profile/efc-profile-form.tsx` as Client Component
    - Fields: `fc_rest` (input number, validates [30,220] on blur, shows error message on out-of-range), `is_smoker` (checkbox), `efc_period` (select: Estructura/Función/Cognición)
    - Computed biometrics section: auto-calculate and display IMC, FCMax (Tanaka), TMB (Mifflin), FCR (Karvonen), VO2max (Cooper) using domain functions in real-time from student base data; render each formula using KaTeX via `dangerouslySetInnerHTML` with pre-rendered LaTeX string
    - If gender is missing, show aviso that FCMax and TMB require gender
    - Persist via `upsertEfcProfileAction`; show success toast within 3 seconds; preserve form data on error
    - _Requirements: 4.2, 4.3, 4.4, 4.8, 4.9, 4.10_

  - [x] 7.3 Implement physical tests form and history table
    - Create physical test registration form in `efc-profile-form.tsx`: inputs for all 7 test fields with their validation ranges and `evaluation_date`; calls `createPhysicalTestAction`
    - Create tests history table: list sorted by `evaluation_date DESC`; show 50 rows per page; include pagination links using `?testsPage=N` query param
    - _Requirements: 4.5, 4.6_

  - [x] 7.4 Implement evolution charts for physical tests
    - Render a Recharts `LineChart` per test when ≥ 2 records exist; use last 10 records; lazy-import with `next/dynamic + { ssr: false }`
    - For the Cooper (endurance) test, add a secondary Y-axis showing body weight at each evaluation date
    - _Requirements: 4.7_

- [x] 8. Macrocycle Planner — form, real-time recalculation, timeline
  - [x] 8.1 Implement Macrocycle Planner Server Component and Server Action
    - Create `src/app/dashboard/trainings/efc/macrocycle/page.tsx` as Server Component: fetch list of macrocycles for selected athlete; fetch active macrocycle if present and pass as initial form values
    - Add `saveMacrocycleAction` to `efc/actions.ts`: validates via `createMacrocycle` use case; returns `{ success: true, macrocycle }` or `{ success: false, error: string }`; uses `requireOperationalMembership()`
    - _Requirements: 5.1, 5.9, 5.10, 5.11_

  - [x] 8.2 Implement `MacrocycleForm` with real-time recalculation
    - Create `src/app/dashboard/trainings/efc/macrocycle/macrocycle-form.tsx` as Client Component
    - Local state: `formValues` (startDate, competitionDate, hoursPerSession, trainingDaysPerWeek, sessionsPerDay, ePercentage, fPercentage, cPercentage, justification, manualPercentages)
    - Implement `useDebounced` custom hook with 300 ms delay; on debounced value change call: `computeMacrocycleVolume`, `computeEfcDistribution`, `computeMicrocycleTypeDistribution`, `computeStageSubdistributionE/F/C` — all domain functions, no network
    - Display: total weeks, total hours, E/F/C hours breakdown, microcycle type weeks; all values in HH:MM format; each percentage accompanied by "orientativo" warning badge
    - Guard: disable save button while E+F+C ≠ 100; require justification field (min 20 chars) when percentages differ from 50/30/20
    - Validation: show error and block save if competition ≤ start or totalWeeks < 10
    - Show "Deportista ya tiene macrociclo activo" warning before submit
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.9, 5.10, 5.11_

  - [x] 8.3 Implement macrocycle visual timeline
    - Add timeline section below form in `MacrocycleForm`: render one cell per week (up to totalWeeks) using `EfcTimelineCell` component
    - Each cell colored by EFC period (E=blue, F=green, C=orange/amber) and labeled with microcycle type (AJ/C/I/AC/CO/R)
    - Timeline scrolls horizontally on small viewports
    - _Requirements: 5.8_

- [x] 9. Microcycle Builder — load grid, post-session sRPE, Monotonía Foster
  - [x] 9.1 Implement Microcycle Builder Server Component and Server Action
    - Create `src/app/dashboard/trainings/efc/microcycle/page.tsx` as Server Component: accepts `?athleteId&macrocycleId&weekNumber`; fetch existing microcycle if present; fetch macrocycle `hours_per_session` for daily overflow warning threshold
    - Add `saveMicycleAction` and `saveSrpeAction` to `efc/actions.ts`; `saveMicycleAction` checks for duplicate week (Req 6.9) and returns conflict error
    - _Requirements: 6.1, 6.6, 6.8, 6.9_

  - [x] 9.2 Implement `MicrocycleBuilder` load grid
    - Create `src/app/dashboard/trainings/efc/microcycle/microcycle-builder.tsx` as Client Component
    - Render matrix: rows = all activity categories/subcategories from Req 6.2 (Cardiovascular, Condicionales, Coordinativas, Técnico-Patadas, Táctico); columns = 7 days of the week; each cell = integer input 0–480
    - Column footers: sum of minutes per day; row footers: sum per category; grand total footer
    - Update sums synchronously on each `onChange` (no debounce — O(n) over 280 cells max)
    - Show non-blocking yellow warning badge in day column header when daily total > macrocycle `hours_per_session × 60 × 1.20`
    - Notes input (500-char max) per activity per day
    - Display bar chart (Recharts, lazy-loaded) with one bar per day showing total minutes
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.7, 6.8_

  - [x] 9.3 Implement post-session sRPE section and Monotonía Foster display
    - Add post-session section at bottom of `MicrocycleBuilder`: for each of the 7 days, two inputs — RPE (1–10) and duration (1–480 min); auto-calculate and show sRPE = RPE × duration in real time
    - When all 7 days have sRPE recorded: calculate and display `weeklyTotal`, `dailyMean`, `monotonia`, `strain` using `computeWeeklyLoadMetrics`; show "Alta Monotonía" warning (red badge) when monotonia > 2.0; show "N/A" with variability-zero warning when SD = 0
    - Save sRPE via `saveSrpeAction`
    - _Requirements: 6.10, 6.11_

- [x] 10. 1RM Calculator — Epley/Brzycki, percentage table, EFC recommendations
  - [x] 10.1 Implement 1RM Calculator page and Server Action
    - Create `src/app/dashboard/trainings/efc/one-rm/page.tsx` as Server Component: accepts `?athleteId`; if athleteId provided, fetch `EfcAthleteProfile` to read `efcPeriod`; pass to `OneRmCalculator` as prop (or null for standalone mode)
    - Add `saveOneRmRecordAction` to `efc/actions.ts`; validates inputs; persists via `calculate-one-rm` use case
    - _Requirements: 7.1, 7.11, 7.12_

  - [x] 10.2 Implement `OneRmCalculator` client component
    - Create `src/app/dashboard/trainings/efc/one-rm/one-rm-calculator.tsx` as Client Component
    - Inputs: exercise selector (squat/bench/deadlift/other), weight_kg, repsPerformed (1–30), rir (0–5), optional RPE (6.0–10.0), optional workWeight
    - When RPE is set: derive RIR = round(10 − RPE), disable manual RIR field
    - Calculate in real time (< 300 ms) using `computeOneRm`: display Epley, Brzycki, average 1RM; Brzycki shows "N/A" when repsTotal ≥ 37; show low-reliability warning when repsTotal > 30
    - If workWeight provided: show `%1RM = (workWeight / average1RM) × 100`
    - Display Epley and Brzycki formulas rendered via KaTeX inline
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.13, 7.14_

  - [x] 10.3 Implement 1RM percentage table and EFC recommendations block
    - Implement `computeOneRmPercentageTable` and render table: columns = %, weight (rounded to 0.5 kg), estimated reps to failure; rows from 50% to 100% in 5% steps
    - EFC recommendations block: visible only in integrated mode (athleteId + efcPeriod set); show visually differentiated section (colored border/background) per period — "Recomendaciones para Estructura" (50–70%), "para Función" (70–85%), "para Cognición" (40–60%) with series/reps/RIR guidance, calculated weight range, and orientativo warning
    - Save button: only in integrated mode; calls `saveOneRmRecordAction`; shows error toast on failure without resetting inputs
    - _Requirements: 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

- [x] 11. Load Visualizations — 4 Recharts charts
  - [x] 11.1 Implement Load Visualizations Server Component data preparation
    - Create `src/app/dashboard/trainings/efc/load-charts/page.tsx` as Server Component: fetch macrocycle + all microcycles + session loads + sRPE records; call `getLoadVisualizationData` use case to aggregate: (1) weekly minutes by microcycle type, (2) cumulative real vs planned EFC distribution, (3) daily intensity series, (4) cumulative real EFC % vs target %
    - Pass serialized chart data as props to lazy-loaded Client chart components
    - Render empty state per chart when no microcycles registered yet
    - _Requirements: 8.1–8.6_

  - [x] 11.2 Implement the four Recharts chart components
    - All chart components lazy-loaded via `next/dynamic + { ssr: false }` (they access DOM dimensions)
    - `load-volume-chart.tsx`: stacked bar chart — X=week number, Y=total minutes, series per microcycle type with legend
    - `efc-compare-chart.tsx`: grouped bar or donut — real vs planned E/F/C distribution; hidden when macrocycle has no EFC distribution defined
    - `intensity-line-chart.tsx`: line chart — X=date (chronological), Y=intensity 1–10; skip/omit data points with invalid intensity values, show warning indicator if any are excluded
    - `efc-distribution-chart.tsx`: bar chart or donut showing cumulative real EFC % vs target %; hidden without EFC distribution config
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7_

- [x] 12. EFC Library — 7 navigable sections
  - [x] 12.1 Implement EFC Library Server Component with section navigation
    - Create `src/app/dashboard/trainings/efc/library/page.tsx` as Server Component
    - Seven sections: Fundamentos del EFC, Pirámide EFC, Capacidades Coordinativas, Capacidades Condicionales, Progresión de Cargas, Ondulación de Microciclos, Advertencias de Seguridad; each accessible within 1 user interaction via anchor/tab navigation
    - Navigation menu highlights active section (URL hash or query param `?sec=`); on click, scrolls to section
    - Implement scroll restoration: when navigating away and back, restore previous scroll position to the same pixel value (using `sessionStorage` keyed by section ID in a `useEffect`)
    - If a section fails to render, show "Contenido no disponible" message in that section area while keeping the navigation menu functional
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [x] 12.2 Add required disclaimers and content to EFC Library
    - Each section that mentions EFC percentages must display a non-collapsible warning: "Los porcentajes mostrados son orientativos y no han sido validados científicamente"
    - Add "Acerca del Método EFC" subsection with disclaimer: method is applicable to combat sports taekwondo and does not constitute medical or scientific prescription; visible without additional interaction
    - Render any mathematical formulas in the library using KaTeX via `dangerouslySetInnerHTML`
    - _Requirements: 3.2, 3.3_

- [x] 13. Weight Cut Tracker — daily weight, risk alerts, curve chart
  - [x] 13.1 Implement Weight Cut Tracker Server Component and Server Action
    - Create `src/app/dashboard/trainings/efc/weight-control/page.tsx` as Server Component: accepts `?athleteId`; accessible from EFC Dashboard only when active macrocycle has `competition_date` within 30 days; fetch existing weight records; compute `deltaPercent` and `daysElapsed` using domain functions; pass data to `WeightControlTracker`
    - Add `saveWeightRecordAction` to `efc/actions.ts`; validates weight ∈ [30,200]; persists via `manage-weight-control` use case; returns error without discarding input on failure
    - _Requirements: 12.1, 12.2, 12.8, 12.9_

  - [x] 13.2 Implement `WeightControlTracker` client component
    - Create `src/app/dashboard/trainings/efc/weight-control/weight-control-tracker.tsx` as Client Component
    - Display: daily weight input (decimal 1 dp, 30.0–200.0), date picker; category selector (World Taekwondo official categories, male and female), category limit input
    - When ≥ 1 record: show `Δ%` from baseline (first record); show difference to category limit in kg (green if ≤ 0, yellow if > 0)
    - Recharts `LineChart` (lazy-loaded): daily weight curve from start of control period to official weigh-in; X=date, Y=weight
    - Red alert banner when `classifyWeightCutRisk` returns 'danger': "Riesgo alto: descenso rápido de peso. Posible deshidratación severa y pérdida de potencia"
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 14. Export and Import — PDF, Excel
  - [x] 14.1 Implement PDF export for macrocycles
    - Install `@react-pdf/renderer` (pin to latest stable version at time of implementation)
    - Create a React PDF document component `efc-macrocycle-pdf-document.tsx` for `@react-pdf/renderer`: includes macrocycle name, start/competition dates, athlete list, weekly microcycle summary table (name, date, type)
    - Implement `exportMacrocyclePdfAction` Server Action in `efc/actions.ts`: render PDF to Buffer via `@react-pdf/renderer renderToBuffer`; return as base64 string; must complete within 10 seconds
    - In the Macrocycle Planner UI, add "Exportar PDF" button that triggers the action and initiates download via a temporary `<a download>` element
    - _Requirements: 9.1_

  - [x] 14.2 Implement Excel export for athlete data
    - Install `exceljs` (pin to latest stable version)
    - Implement `exportAthleteExcelAction` Server Action: create workbook with 3 sheets — EFC Profile (biometric fields), Physical Tests (all test records with dates), 1RM Records (by exercise with dates); return as base64 buffer; complete within 10 seconds
    - In EFC Profile page, add "Exportar Excel" button that triggers download
    - _Requirements: 9.2_

  - [x] 14.3 Implement Excel import for athlete data
    - Implement `importAthleteExcelAction` Server Action: accept `FormData` with file; reject if size > 5 MB or not `.xlsx`; parse with `exceljs`; validate each row's required fields and ranges; return `{ valid: number, discarded: number, errors: Array<{ row, fields }> }` summary WITHOUT persisting
    - Add `confirmImportAction` Server Action: persists only valid rows via `createPhysicalTest` use case; discards invalid
    - In EFC Profile page, add import UI: file input, "Analizar archivo" button that shows summary, confirmation step before persisting, error list for discarded rows
    - _Requirements: 9.3, 9.4, 9.5, 9.6_

- [x] 15. Checkpoint — domain and infrastructure tests pass
  - Ensure all property-based tests (tasks 2.4, 2.6, 2.8, 2.10) and unit tests pass, ask the user if questions arise.

- [x] 16. Accessibility and responsiveness audit
  - [x] 16.1 Apply responsive layout and keyboard navigation to all EFC components
    - Verify all EFC pages render correctly at 375px viewport: stacked columns on < 768px, horizontal layout on ≥ 768px; no content hidden, clipped, or requiring horizontal scroll
    - Ensure all form fields and interactive elements are reachable by keyboard (Tab/Enter/Space); visible focus outline of at least 2px on all focused elements
    - Verify minimum target size of 44×44px for all interactive elements on mobile viewports
    - _Requirements: 11.1, 11.2, 11.5_

  - [ ]\* 16.2 Verify WCAG 2.1 AA color contrast and ARIA attributes
    - Check text/background contrast ratios: ≥ 4.5:1 for normal text, ≥ 3:1 for large text across all EFC components
    - Add `aria-label` to all icon-only buttons in the EFC module; add `role`, `scope`, or `headers` attributes to all data tables and grids (microcycle builder matrix, 1RM percentage table, physical tests history table)
    - _Requirements: 11.3, 11.4, 11.6_

- [x] 17. Final checkpoint — all tests pass and module is wired end-to-end
  - Ensure all tests pass, all routes are reachable from navigation, and ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Property tests (tasks 2.4, 2.6, 2.8, 2.10) use **fast-check** with `numRuns: 100`; tag each test with `// Feature: efc-training-module, Property N: ...`
- Domain formula functions in `efc-formulas.ts` are the single source of truth for all calculations — Client Components call them directly (no network) to meet the ≤300ms/≤500ms responsiveness requirements
- All Recharts chart components must use `next/dynamic + { ssr: false }` since they access DOM dimensions
- Each Server Action must call `requireOperationalMembership()` before accessing any data
- The `EfcPeriodBadge`, `EfcAcwrIndicator`, `EfcTimelineCell`, `EfcDistributionBar` are small UI primitives that can be colocated in the route directory where first used
- KaTeX: add `katex` as a dependency and import the CSS in the EFC module layout to avoid FOUC

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.5", "2.7", "2.9"] },
    { "id": 3, "tasks": ["2.4", "2.6", "2.8", "2.10", "3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 5, "tasks": ["4.1", "4.2"] },
    { "id": 6, "tasks": ["4.3"] },
    { "id": 7, "tasks": ["5.1", "5.2"] },
    {
      "id": 8,
      "tasks": [
        "6.1",
        "6.2",
        "7.1",
        "8.1",
        "9.1",
        "10.1",
        "11.1",
        "12.1",
        "13.1",
        "14.1",
        "14.2"
      ]
    },
    {
      "id": 9,
      "tasks": [
        "6.3",
        "7.2",
        "7.3",
        "8.2",
        "9.2",
        "9.3",
        "10.2",
        "11.2",
        "12.2",
        "13.2",
        "14.3"
      ]
    },
    { "id": 10, "tasks": ["7.4", "8.3", "10.3", "16.1"] },
    { "id": 11, "tasks": ["16.2"] }
  ]
}
```
