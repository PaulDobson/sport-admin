/**
 * Domain: EFC Training
 *
 * Unit tests for macrocycle volume and EFC distribution formulas (F-01 to F-06).
 */

import { describe, test, expect } from "vitest";
import {
  computeMacrocycleVolume,
  computeEfcDistribution,
  computeMicrocycleTypeDistribution,
  computeEstructuraSubdistribution,
  computeFuncionSubdistribution,
  computeCognicionSubdistribution,
  computeFullMacrocycleDistribution,
} from "./efc-formulas";

// ─── F-01: computeMacrocycleVolume ────────────────────────────────────────────

describe("computeMacrocycleVolume (F-01)", () => {
  test("computes correct values for a 70-day span", () => {
    // 2025-01-01 → 2025-03-12 = 70 days = 10 weeks
    const result = computeMacrocycleVolume({
      startDate: "2025-01-01",
      competitionDate: "2025-03-12",
      hoursPerSession: 1.5,
      trainingDaysPerWeek: 5,
      sessionsPerDay: 1,
    });

    expect(result.totalDays).toBe(70);
    expect(result.totalWeeks).toBe(10);
    // 10 weeks × 5 days × 1 session × 90 min = 4500
    expect(result.totalMinutes).toBe(4500);
    expect(result.totalHours).toBe(75);
  });

  test("computes correct weeks for a 100-day span (floor division)", () => {
    // 100 days → 14 full weeks (2 days remainder discarded)
    const result = computeMacrocycleVolume({
      startDate: "2025-01-01",
      competitionDate: "2025-04-11",
      hoursPerSession: 1,
      trainingDaysPerWeek: 3,
      sessionsPerDay: 1,
    });

    expect(result.totalDays).toBe(100);
    expect(result.totalWeeks).toBe(14);
    // 14 × 3 × 1 × 60 = 2520
    expect(result.totalMinutes).toBe(2520);
  });

  test("accounts for sessionsPerDay in total volume", () => {
    const result = computeMacrocycleVolume({
      startDate: "2025-01-01",
      competitionDate: "2025-03-12", // 70 days, 10 weeks
      hoursPerSession: 1,
      trainingDaysPerWeek: 3,
      sessionsPerDay: 2,
    });

    // 10 × 3 × 2 × 60 = 3600
    expect(result.totalMinutes).toBe(3600);
  });

  test("rounds totalMinutes and totalHours to 1 decimal place", () => {
    // 11 weeks (77 days) × 3 days × 1 session × 1.5h (90 min) = 2970.0
    const result = computeMacrocycleVolume({
      startDate: "2025-01-01",
      competitionDate: "2025-03-19", // 77 days
      hoursPerSession: 1.5,
      trainingDaysPerWeek: 3,
      sessionsPerDay: 1,
    });

    expect(result.totalMinutes).toBe(2970);
    expect(result.totalHours).toBe(49.5);
  });

  test("throws when competitionDate is before startDate", () => {
    expect(() =>
      computeMacrocycleVolume({
        startDate: "2025-06-01",
        competitionDate: "2025-01-01",
        hoursPerSession: 1,
        trainingDaysPerWeek: 3,
        sessionsPerDay: 1,
      }),
    ).toThrow();
  });

  test("throws when competitionDate equals startDate", () => {
    expect(() =>
      computeMacrocycleVolume({
        startDate: "2025-01-01",
        competitionDate: "2025-01-01",
        hoursPerSession: 1,
        trainingDaysPerWeek: 3,
        sessionsPerDay: 1,
      }),
    ).toThrow();
  });

  test("throws when totalWeeks < 10", () => {
    // 60 days = 8 weeks
    expect(() =>
      computeMacrocycleVolume({
        startDate: "2025-01-01",
        competitionDate: "2025-03-02", // 60 days
        hoursPerSession: 1,
        trainingDaysPerWeek: 3,
        sessionsPerDay: 1,
      }),
    ).toThrow(/10 weeks/i);
  });

  test("throws when hoursPerSession < 0.5", () => {
    expect(() =>
      computeMacrocycleVolume({
        startDate: "2025-01-01",
        competitionDate: "2026-01-01",
        hoursPerSession: 0.4,
        trainingDaysPerWeek: 3,
        sessionsPerDay: 1,
      }),
    ).toThrow();
  });

  test("throws when hoursPerSession > 8", () => {
    expect(() =>
      computeMacrocycleVolume({
        startDate: "2025-01-01",
        competitionDate: "2026-01-01",
        hoursPerSession: 8.1,
        trainingDaysPerWeek: 3,
        sessionsPerDay: 1,
      }),
    ).toThrow();
  });

  test("throws when trainingDaysPerWeek is out of range", () => {
    expect(() =>
      computeMacrocycleVolume({
        startDate: "2025-01-01",
        competitionDate: "2026-01-01",
        hoursPerSession: 1,
        trainingDaysPerWeek: 8,
        sessionsPerDay: 1,
      }),
    ).toThrow();
  });

  test("throws when sessionsPerDay is out of range", () => {
    expect(() =>
      computeMacrocycleVolume({
        startDate: "2025-01-01",
        competitionDate: "2026-01-01",
        hoursPerSession: 1,
        trainingDaysPerWeek: 3,
        sessionsPerDay: 6,
      }),
    ).toThrow();
  });
});

// ─── F-02: computeEfcDistribution ────────────────────────────────────────────

describe("computeEfcDistribution (F-02)", () => {
  test("distributes minutes correctly with default 50/30/20 split", () => {
    const result = computeEfcDistribution({
      totalMinutes: 4500,
      totalWeeks: 10,
      ePercentage: 50,
      fPercentage: 30,
      cPercentage: 20,
    });

    expect(result.estructuraMinutes).toBe(2250);
    expect(result.funcionMinutes).toBe(1350);
    expect(result.cognicionMinutes).toBe(900);
  });

  test("distributes semanas proportionally", () => {
    const result = computeEfcDistribution({
      totalMinutes: 1000,
      totalWeeks: 10,
      ePercentage: 50,
      fPercentage: 30,
      cPercentage: 20,
    });

    expect(result.estructuraSemanas).toBe(5);
    expect(result.funcionSemanas).toBe(3);
    expect(result.cognicionSemanas).toBe(2);
  });

  test("sum of distributed minutes equals totalMinutes", () => {
    const result = computeEfcDistribution({
      totalMinutes: 3000,
      totalWeeks: 12,
      ePercentage: 40,
      fPercentage: 35,
      cPercentage: 25,
    });

    const sum =
      result.estructuraMinutes +
      result.funcionMinutes +
      result.cognicionMinutes;
    expect(sum).toBeCloseTo(3000, 1);
  });

  test("rounds minute values to 1 decimal place", () => {
    // 1000 × 0.33 = 333.3...  → 333.3
    const result = computeEfcDistribution({
      totalMinutes: 1000,
      totalWeeks: 10,
      ePercentage: 33,
      fPercentage: 33,
      cPercentage: 34,
    });

    expect(result.estructuraMinutes).toBe(330);
    expect(result.funcionMinutes).toBe(330);
    expect(result.cognicionMinutes).toBe(340);
  });

  test("throws when percentages do not sum to 100", () => {
    expect(() =>
      computeEfcDistribution({
        totalMinutes: 1000,
        totalWeeks: 10,
        ePercentage: 50,
        fPercentage: 30,
        cPercentage: 25,
      }),
    ).toThrow();
  });

  test("throws when any percentage is negative", () => {
    expect(() =>
      computeEfcDistribution({
        totalMinutes: 1000,
        totalWeeks: 10,
        ePercentage: -10,
        fPercentage: 60,
        cPercentage: 50,
      }),
    ).toThrow();
  });

  test("throws when totalMinutes is negative", () => {
    expect(() =>
      computeEfcDistribution({
        totalMinutes: -100,
        totalWeeks: 10,
        ePercentage: 50,
        fPercentage: 30,
        cPercentage: 20,
      }),
    ).toThrow();
  });

  test("handles 0/0/100 edge case (all in C)", () => {
    const result = computeEfcDistribution({
      totalMinutes: 1000,
      totalWeeks: 10,
      ePercentage: 0,
      fPercentage: 0,
      cPercentage: 100,
    });

    expect(result.estructuraMinutes).toBe(0);
    expect(result.funcionMinutes).toBe(0);
    expect(result.cognicionMinutes).toBe(1000);
  });
});

// ─── F-03: computeMicrocycleTypeDistribution ──────────────────────────────────

describe("computeMicrocycleTypeDistribution (F-03)", () => {
  test("applies fixed distribution ratios correctly", () => {
    const result = computeMicrocycleTypeDistribution(100);

    expect(result.ajuste).toBe(10); // 10%
    expect(result.carga).toBe(40); // 40%
    expect(result.impacto).toBe(20); // 20%
    expect(result.activacion).toBe(8); //  8%
    expect(result.competencia).toBe(12); // 12%
    expect(result.recuperacion).toBe(10); // 10%
  });

  test("all types sum to totalWeeks", () => {
    const totalWeeks = 100;
    const result = computeMicrocycleTypeDistribution(totalWeeks);
    const sum =
      result.ajuste +
      result.carga +
      result.impacto +
      result.activacion +
      result.competencia +
      result.recuperacion;

    expect(sum).toBe(totalWeeks);
  });

  test("rounds values to 1 decimal place", () => {
    // 11 weeks
    const result = computeMicrocycleTypeDistribution(11);

    expect(result.ajuste).toBe(1.1); // 11 × 0.10
    expect(result.carga).toBe(4.4); // 11 × 0.40
    expect(result.impacto).toBe(2.2); // 11 × 0.20
    expect(result.activacion).toBe(0.9); // 11 × 0.08 = 0.88 → 0.9
    expect(result.competencia).toBe(1.3); // 11 × 0.12 = 1.32 → 1.3
    expect(result.recuperacion).toBe(1.1); // 11 × 0.10
  });

  test("throws for negative totalWeeks", () => {
    expect(() => computeMicrocycleTypeDistribution(-1)).toThrow();
  });

  test("returns all zeros for 0 weeks", () => {
    const result = computeMicrocycleTypeDistribution(0);

    expect(result.ajuste).toBe(0);
    expect(result.carga).toBe(0);
    expect(result.impacto).toBe(0);
    expect(result.activacion).toBe(0);
    expect(result.competencia).toBe(0);
    expect(result.recuperacion).toBe(0);
  });
});

// ─── F-04: computeEstructuraSubdistribution ───────────────────────────────────

describe("computeEstructuraSubdistribution (F-04)", () => {
  test("top-level blocks sum to estructuraMinutes", () => {
    const minutes = 1000;
    const result = computeEstructuraSubdistribution(minutes);
    const topSum =
      result.adaptAnatomica +
      result.condicional +
      result.coordinativo +
      result.tecnico +
      result.tacticoSimple;

    expect(topSum).toBe(minutes);
  });

  test("top-level block ratios are correct", () => {
    const result = computeEstructuraSubdistribution(1000);

    expect(result.adaptAnatomica).toBe(100); // 10%
    expect(result.condicional).toBe(200); // 20%
    expect(result.coordinativo).toBe(200); // 20%
    expect(result.tecnico).toBe(300); // 30%
    expect(result.tacticoSimple).toBe(200); // 20%
  });

  test("adaptAnatomica sub-blocks sum to adaptAnatomica", () => {
    const result = computeEstructuraSubdistribution(1000);
    const sum = result.adaptAnatomicaEstable + result.adaptAnatomicaInestable;

    expect(sum).toBe(result.adaptAnatomica);
  });

  test("condicional sub-blocks sum to condicional", () => {
    const result = computeEstructuraSubdistribution(1000);
    const sum =
      result.condicionalFuerza +
      result.condicionalVelocidad +
      result.condicionalResistencia +
      result.condicionalFlexibilidad;

    expect(sum).toBe(result.condicional);
  });

  test("coordinativo sub-blocks sum to coordinativo", () => {
    const result = computeEstructuraSubdistribution(1000);
    const sum =
      result.coordinativoDiferenciacion +
      result.coordinativoAcoplamiento +
      result.coordinativoOrientacion +
      result.coordinativoEquilibrio +
      result.coordinativoCambio +
      result.coordinativoRitmica +
      result.coordinativoRelajacion;

    expect(sum).toBe(result.coordinativo);
  });

  test("tecnico sub-blocks sum to tecnico", () => {
    const result = computeEstructuraSubdistribution(1000);
    const sum =
      result.tecnicoPatadas +
      result.tecnicoPunos +
      result.tecnicoBloqueos +
      result.tecnicoDesplazamiento;

    expect(sum).toBe(result.tecnico);
  });

  test("tacticoSimple sub-blocks sum to tacticoSimple", () => {
    const result = computeEstructuraSubdistribution(1000);
    const sum =
      result.tacticoAprendizaje +
      result.tacticoMecanizacion +
      result.tacticoAutomatizacion;

    expect(sum).toBe(result.tacticoSimple);
  });

  test("throws for negative estructuraMinutes", () => {
    expect(() => computeEstructuraSubdistribution(-1)).toThrow();
  });

  test("returns all zeros for 0 minutes", () => {
    const result = computeEstructuraSubdistribution(0);

    expect(result.adaptAnatomica).toBe(0);
    expect(result.condicional).toBe(0);
    expect(result.coordinativo).toBe(0);
    expect(result.tecnico).toBe(0);
    expect(result.tacticoSimple).toBe(0);
  });
});

// ─── F-05: computeFuncionSubdistribution ─────────────────────────────────────

describe("computeFuncionSubdistribution (F-05)", () => {
  test("top-level blocks sum to funcionMinutes", () => {
    const minutes = 1000;
    const result = computeFuncionSubdistribution(minutes);
    const topSum =
      result.condicional +
      result.coordinativo +
      result.tecnico +
      result.tacticoSimple +
      result.tacticoComplejo;

    expect(topSum).toBe(minutes);
  });

  test("top-level block ratios are correct", () => {
    const result = computeFuncionSubdistribution(1000);

    expect(result.condicional).toBe(300); // 30%
    expect(result.coordinativo).toBe(150); // 15%
    expect(result.tecnico).toBe(100); // 10%
    expect(result.tacticoSimple).toBe(300); // 30%
    expect(result.tacticoComplejo).toBe(150); // 15%
  });

  test("condicional sub-blocks sum to condicional", () => {
    const result = computeFuncionSubdistribution(1000);
    const sum =
      result.condicionalFuerza +
      result.condicionalResistencia +
      result.condicionalVelocidad +
      result.condicionalFlexibilidad;

    expect(sum).toBe(result.condicional);
  });

  test("tacticoSimple sub-blocks sum to tacticoSimple", () => {
    const result = computeFuncionSubdistribution(1000);
    const sum =
      result.tacticoSimpleAprendizaje +
      result.tacticoSimpleMecanizacion +
      result.tacticoSimpleAutomatizacion;

    expect(sum).toBe(result.tacticoSimple);
  });

  test("tacticoComplejo sub-blocks sum to tacticoComplejo", () => {
    const result = computeFuncionSubdistribution(1000);
    const sum =
      result.tacticoComplejoDecision3 + result.tacticoComplejoDecision5;

    expect(sum).toBe(result.tacticoComplejo);
  });

  test("throws for negative funcionMinutes", () => {
    expect(() => computeFuncionSubdistribution(-1)).toThrow();
  });
});

// ─── F-06: computeCognicionSubdistribution ────────────────────────────────────

describe("computeCognicionSubdistribution (F-06)", () => {
  test("top-level blocks sum to cognicionMinutes", () => {
    const minutes = 1000;
    const result = computeCognicionSubdistribution(minutes);
    const topSum =
      result.condicional + result.coordinativo + result.tacticoComplejo;

    expect(topSum).toBe(minutes);
  });

  test("top-level block ratios are correct", () => {
    const result = computeCognicionSubdistribution(1000);

    expect(result.condicional).toBe(280); // 28%
    expect(result.coordinativo).toBe(180); // 18%
    expect(result.tacticoComplejo).toBe(540); // 54%
  });

  test("condicional sub-blocks sum to condicional", () => {
    const result = computeCognicionSubdistribution(1000);
    const sum =
      result.condicionalFuerza +
      result.condicionalResistencia +
      result.condicionalVelocidad +
      result.condicionalFlexibilidad;

    expect(sum).toBe(result.condicional);
  });

  test("coordinativo sub-blocks sum to coordinativo", () => {
    const result = computeCognicionSubdistribution(1000);
    const sum =
      result.coordinativoDiferenciacion +
      result.coordinativoAcoplamiento +
      result.coordinativoOrientacion +
      result.coordinativoEquilibrio +
      result.coordinativoCambio +
      result.coordinativoRitmica +
      result.coordinativoRelajacion;

    expect(sum).toBe(result.coordinativo);
  });

  test("tacticoComplejo sub-blocks sum to tacticoComplejo", () => {
    const result = computeCognicionSubdistribution(1000);
    const sum =
      result.tacticoComplejoDecision3 + result.tacticoComplejoDecision5;

    expect(sum).toBe(result.tacticoComplejo);
  });

  test("C stage has no Táctica Simple (unlike E and F)", () => {
    const result = computeCognicionSubdistribution(1000) as unknown as Record<
      string,
      unknown
    >;
    // C stage does not have tacticoSimple — only tacticoComplejo
    expect("tacticoSimple" in result).toBe(false);
  });

  test("throws for negative cognicionMinutes", () => {
    expect(() => computeCognicionSubdistribution(-1)).toThrow();
  });
});

// ─── Combined: computeFullMacrocycleDistribution ──────────────────────────────

describe("computeFullMacrocycleDistribution (combined F-01 to F-06)", () => {
  const BASE_INPUT = {
    startDate: "2025-01-01",
    competitionDate: "2025-03-12", // 70 days, 10 weeks
    hoursPerSession: 1.5,
    trainingDaysPerWeek: 5,
    sessionsPerDay: 1,
    ePercentage: 50,
    fPercentage: 30,
    cPercentage: 20,
  };

  test("returns a fully populated MacrocycleDistribution", () => {
    const result = computeFullMacrocycleDistribution(BASE_INPUT);

    expect(result.totalDays).toBe(70);
    expect(result.totalWeeks).toBe(10);
    expect(result.totalMinutes).toBe(4500);
    expect(result.totalHours).toBe(75);
    expect(result.estructuraMinutes).toBe(2250);
    expect(result.funcionMinutes).toBe(1350);
    expect(result.cognicionMinutes).toBe(900);
    expect(result.estructuraSemanas).toBe(5);
    expect(result.funcionSemanas).toBe(3);
    expect(result.cognicionSemanas).toBe(2);
  });

  test("includes tiposMicrociclo from F-03", () => {
    const result = computeFullMacrocycleDistribution(BASE_INPUT);

    expect(result.tiposMicrociclo.carga).toBe(4); // 10 × 40%
    expect(result.tiposMicrociclo.ajuste).toBe(1); // 10 × 10%
    expect(result.tiposMicrociclo.impacto).toBe(2); // 10 × 20%
  });

  test("includes subdistributions for all three stages", () => {
    const result = computeFullMacrocycleDistribution(BASE_INPUT);

    expect(result.subdistributions.e).toBeDefined();
    expect(result.subdistributions.f).toBeDefined();
    expect(result.subdistributions.c).toBeDefined();
  });

  test("subdistribution totals match the EFC minute allocations", () => {
    const result = computeFullMacrocycleDistribution(BASE_INPUT);
    const { e, f, c } = result.subdistributions;

    // F-04 top-level sum for Estructura
    const eTopSum =
      e.adaptAnatomica +
      e.condicional +
      e.coordinativo +
      e.tecnico +
      e.tacticoSimple;
    expect(eTopSum).toBe(result.estructuraMinutes);

    // F-05 top-level sum for Función
    const fTopSum =
      f.condicional +
      f.coordinativo +
      f.tecnico +
      f.tacticoSimple +
      f.tacticoComplejo;
    expect(fTopSum).toBe(result.funcionMinutes);

    // F-06 top-level sum for Cognición
    const cTopSum = c.condicional + c.coordinativo + c.tacticoComplejo;
    expect(cTopSum).toBe(result.cognicionMinutes);
  });

  test("propagates errors from inner formulas", () => {
    expect(() =>
      computeFullMacrocycleDistribution({
        ...BASE_INPUT,
        ePercentage: 50,
        fPercentage: 30,
        cPercentage: 25, // doesn't sum to 100
      }),
    ).toThrow();
  });
});
