import { describe, expect, it } from "vitest";
import { addProgrammingDays, endTimeForDuration, programmingDateLabel } from "./programming-time";

describe("programming time controls", () => {
  it("calculates precise custom durations and midnight rollover", () => {
    expect(endTimeForDuration("18:00", 45)).toEqual({ time: "18:45", nextDays: 0 });
    expect(endTimeForDuration("23:30", 90)).toEqual({ time: "01:00", nextDays: 1 });
    expect(endTimeForDuration("23:59", 1)).toEqual({ time: "00:00", nextDays: 1 });
    expect(endTimeForDuration("00:00", 2880)).toEqual({ time: "00:00", nextDays: 2 });
  });
  it("does not calculate with incomplete or invalid values", () => {
    expect(endTimeForDuration("", 60)).toBeNull();
    expect(endTimeForDuration("25:00", 60)).toBeNull();
    expect(endTimeForDuration("18:00", 0)).toBeNull();
    expect(endTimeForDuration("18:00", 1.5)).toBeNull();
  });
  it("adds calendar days independent of local timezone and month boundaries", () => {
    expect(addProgrammingDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addProgrammingDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(programmingDateLabel("2026-10-19")).toBe("19 de octubre de 2026");
    expect(programmingDateLabel("")).toBe("Selecciona una fecha");
  });
});
