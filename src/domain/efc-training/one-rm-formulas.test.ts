/**
 * Domain: EFC Training
 *
 * Unit tests for 1RM and weight control formulas (F-16, F-17, F-18).
 */

import { describe, test, expect } from 'vitest';
import {
  roundToHalf,
  rpeToRir,
  computeOneRm,
  buildOneRmPercentageTable,
  computeWorkWeightPercentage,
  getEfcOneRmRecommendation,
  computeWeightCutMetrics,
} from './one-rm-formulas';

describe('roundToHalf', () => {
  test('rounds to nearest 0.5', () => {
    expect(roundToHalf(72.3)).toBe(72.5);
    expect(roundToHalf(72.1)).toBe(72.0);
    expect(roundToHalf(73.0)).toBe(73.0);
    expect(roundToHalf(72.25)).toBe(72.5);
    expect(roundToHalf(72.75)).toBe(73.0);
  });

  test('handles negative values', () => {
    expect(roundToHalf(-5.3)).toBe(-5.5);
    expect(roundToHalf(-5.1)).toBe(-5.0);
  });
});

describe('rpeToRir (F-16)', () => {
  test('converts RPE to RIR correctly', () => {
    expect(rpeToRir(10)).toBe(0);
    expect(rpeToRir(9)).toBe(1);
    expect(rpeToRir(8)).toBe(2);
    expect(rpeToRir(7)).toBe(3);
    expect(rpeToRir(6)).toBe(4);
  });

  test('rounds properly for decimal RPE', () => {
    expect(rpeToRir(9.5)).toBe(1); // round(0.5) = 1
    expect(rpeToRir(8.4)).toBe(2); // round(1.6) = 2
  });

  test('throws RangeError for invalid RPE', () => {
    expect(() => rpeToRir(-1)).toThrow(RangeError);
    expect(() => rpeToRir(11)).toThrow(RangeError);
  });
});

describe('computeOneRm (F-16)', () => {
  test('computes Epley and Brzycki for valid input', () => {
    const result = computeOneRm({
      weightKg: 100,
      repsPerformed: 5,
      rir: 2,
    });

    expect(result.repsTotal).toBe(7);
    // Epley: 100 * (1 + 7/30) = 123.33...
    expect(result.epley).toBeCloseTo(123.33, 1);
    // Brzycki: 100 * (36 / (37 - 7)) = 100 * 1.2 = 120
    expect(result.brzycki).toBeCloseTo(120, 1);
    // Average: (123.33 + 120) / 2 = 121.67
    expect(result.average).toBeCloseTo(121.67, 1);
    expect(result.unreliableWarning).toBe(false);
  });

  test('handles 1RM test (1 rep + 0 RIR)', () => {
    const result = computeOneRm({
      weightKg: 150,
      repsPerformed: 1,
      rir: 0,
    });

    expect(result.repsTotal).toBe(1);
    // Epley: 150 * (1 + 1/30) = 155
    expect(result.epley).toBeCloseTo(155, 1);
    // Brzycki: 150 * (36 / 36) = 150
    expect(result.brzycki).toBeCloseTo(150, 1);
    expect(result.average).toBeCloseTo(152.5, 1);
    expect(result.unreliableWarning).toBe(false);
  });

  test('sets unreliableWarning when repsTotal > 30', () => {
    const result = computeOneRm({
      weightKg: 50,
      repsPerformed: 25,
      rir: 6,
    });

    expect(result.repsTotal).toBe(31);
    expect(result.unreliableWarning).toBe(true);
  });

  test('returns null Brzycki when repsTotal >= 37', () => {
    const result = computeOneRm({
      weightKg: 40,
      repsPerformed: 30,
      rir: 7,
    });

    expect(result.repsTotal).toBe(37);
    expect(result.brzycki).toBeNull();
    // Average falls back to Epley when Brzycki is null
    expect(result.average).toBe(result.epley);
  });

  test('throws RangeError for invalid input', () => {
    expect(() =>
      computeOneRm({ weightKg: 0, repsPerformed: 5, rir: 2 }),
    ).toThrow(RangeError);
    expect(() =>
      computeOneRm({ weightKg: 100, repsPerformed: 0, rir: 2 }),
    ).toThrow(RangeError);
    expect(() =>
      computeOneRm({ weightKg: 100, repsPerformed: 5, rir: -1 }),
    ).toThrow(RangeError);
  });
});

describe('buildOneRmPercentageTable (F-16b)', () => {
  test('builds 11 rows from 50% to 100%', () => {
    const table = buildOneRmPercentageTable(100);

    expect(table).toHaveLength(11);
    expect(table[0]?.percentage).toBe(50);
    expect(table[10]?.percentage).toBe(100);
  });

  test('rounds weights to nearest 0.5', () => {
    const table = buildOneRmPercentageTable(123);

    // 50% of 123 = 61.5 → 61.5
    expect(table[0]?.weightKg).toBe(61.5);
    // 70% of 123 = 86.1 → 86.0
    const row70 = table.find((r) => r.percentage === 70);
    expect(row70?.weightKg).toBe(86);
  });

  test('caps repsToFailure at 30', () => {
    const table = buildOneRmPercentageTable(100);

    // 50% should have very high reps (capped at 30)
    expect(table[0]?.repsToFailure).toBe(30);
    // 100% should have 0 reps
    expect(table[10]?.repsToFailure).toBe(0);
  });

  test('throws RangeError for invalid 1RM', () => {
    expect(() => buildOneRmPercentageTable(0)).toThrow(RangeError);
    expect(() => buildOneRmPercentageTable(-50)).toThrow(RangeError);
  });
});

describe('computeWorkWeightPercentage (F-16c)', () => {
  test('calculates percentage correctly', () => {
    expect(computeWorkWeightPercentage(72.5, 100)).toBeCloseTo(72.5, 1);
    expect(computeWorkWeightPercentage(50, 100)).toBeCloseTo(50, 1);
    expect(computeWorkWeightPercentage(100, 100)).toBeCloseTo(100, 1);
  });

  test('handles work weight > 1RM', () => {
    expect(computeWorkWeightPercentage(110, 100)).toBeCloseTo(110, 1);
  });

  test('throws RangeError for invalid input', () => {
    expect(() => computeWorkWeightPercentage(0, 100)).toThrow(RangeError);
    expect(() => computeWorkWeightPercentage(50, 0)).toThrow(RangeError);
    expect(() => computeWorkWeightPercentage(-10, 100)).toThrow(RangeError);
  });
});

describe('getEfcOneRmRecommendation (F-17)', () => {
  test('returns correct prescription for period E', () => {
    const rec = getEfcOneRmRecommendation('E', 100);

    expect(rec.period).toBe('E');
    expect(rec.percentageMin).toBe(50);
    expect(rec.percentageMax).toBe(70);
    expect(rec.weightMin).toBe(50); // 50% of 100 = 50.0
    expect(rec.weightMax).toBe(70); // 70% of 100 = 70.0
    expect(rec.seriesRange).toBe('3–4');
    expect(rec.repsRange).toBe('8–15');
    expect(rec.rirRange).toBe('2–4');
    expect(rec.focus).toContain('Adaptación anatómica');
  });

  test('returns correct prescription for period F', () => {
    const rec = getEfcOneRmRecommendation('F', 100);

    expect(rec.period).toBe('F');
    expect(rec.percentageMin).toBe(70);
    expect(rec.percentageMax).toBe(85);
    expect(rec.weightMin).toBe(70);
    expect(rec.weightMax).toBe(85);
    expect(rec.seriesRange).toBe('4–6');
    expect(rec.repsRange).toBe('3–5');
    expect(rec.rirRange).toBe('2–3');
    expect(rec.focus).toContain('Potencia');
  });

  test('returns correct prescription for period C', () => {
    const rec = getEfcOneRmRecommendation('C', 100);

    expect(rec.period).toBe('C');
    expect(rec.percentageMin).toBe(40);
    expect(rec.percentageMax).toBe(60);
    expect(rec.weightMin).toBe(40);
    expect(rec.weightMax).toBe(60);
    expect(rec.seriesRange).toBe('3–5');
    expect(rec.repsRange).toBe('2–4');
    expect(rec.rirRange).toBe('> 3');
    expect(rec.focus).toContain('Mantenimiento');
  });

  test('rounds weight bounds correctly', () => {
    const rec = getEfcOneRmRecommendation('E', 123);

    // 50% of 123 = 61.5 → 61.5
    expect(rec.weightMin).toBe(61.5);
    // 70% of 123 = 86.1 → 86.0
    expect(rec.weightMax).toBe(86);
  });

  test('throws RangeError for invalid 1RM', () => {
    expect(() => getEfcOneRmRecommendation('E', 0)).toThrow(RangeError);
    expect(() => getEfcOneRmRecommendation('F', -50)).toThrow(RangeError);
  });
});

describe('computeWeightCutMetrics (F-18)', () => {
  test('calculates deltaPercent correctly', () => {
    const result = computeWeightCutMetrics({
      weightCurrent: 72,
      weightBaseline: 74,
      categoryLimitKg: 74,
      daysSinceBaseline: 10,
    });

    // (72 - 74) / 74 * 100 = -2.70%
    expect(result.deltaPercent).toBeCloseTo(-2.7, 1);
    expect(result.diffFromCategoryKg).toBeCloseTo(-2, 1);
    expect(result.isWithinCategory).toBe(true);
    expect(result.highRiskAlert).toBe(false);
  });

  test('flags high risk when deltaPercent < -5% AND days < 7', () => {
    const result = computeWeightCutMetrics({
      weightCurrent: 70,
      weightBaseline: 74,
      categoryLimitKg: 74,
      daysSinceBaseline: 5,
    });

    // (70 - 74) / 74 * 100 = -5.405%
    expect(result.deltaPercent).toBeLessThan(-5);
    expect(result.highRiskAlert).toBe(true);
  });

  test('no high risk when deltaPercent < -5% BUT days >= 7', () => {
    const result = computeWeightCutMetrics({
      weightCurrent: 70,
      weightBaseline: 74,
      categoryLimitKg: 74,
      daysSinceBaseline: 7,
    });

    expect(result.deltaPercent).toBeLessThan(-5);
    expect(result.highRiskAlert).toBe(false);
  });

  test('detects when weight is over category limit', () => {
    const result = computeWeightCutMetrics({
      weightCurrent: 75,
      weightBaseline: 74,
      categoryLimitKg: 74,
      daysSinceBaseline: 3,
    });

    expect(result.isWithinCategory).toBe(false);
    expect(result.diffFromCategoryKg).toBe(1);
  });

  test('throws RangeError for invalid input', () => {
    expect(() =>
      computeWeightCutMetrics({
        weightCurrent: 0,
        weightBaseline: 74,
        categoryLimitKg: 74,
        daysSinceBaseline: 5,
      }),
    ).toThrow(RangeError);

    expect(() =>
      computeWeightCutMetrics({
        weightCurrent: 72,
        weightBaseline: 74,
        categoryLimitKg: 74,
        daysSinceBaseline: -1,
      }),
    ).toThrow(RangeError);

    expect(() =>
      computeWeightCutMetrics({
        weightCurrent: 72,
        weightBaseline: 74,
        categoryLimitKg: 74,
        daysSinceBaseline: 5.5,
      }),
    ).toThrow(RangeError);
  });
});
