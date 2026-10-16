import { describe, expect, it } from "vitest";
import { sessionPeriod } from "./session-period";

describe("sessionPeriod", () => {
  it.each([
    ["2026-10-08", "day", "2026-10-08", "2026-10-08"],
    ["2026-10-08", "week", "2026-10-05", "2026-10-11"],
    ["2027-01-01", "week", "2026-12-28", "2027-01-03"],
    ["2028-02-10", "month", "2028-02-01", "2028-02-29"],
  ] as const)("calculates %s in %s mode", (date, period, from, through) => {
    expect(sessionPeriod(date, period)).toEqual({ from, through });
  });

  it("rejects invalid dates", () => {
    expect(() => sessionPeriod("2026-02-30", "day")).toThrow();
  });
});
