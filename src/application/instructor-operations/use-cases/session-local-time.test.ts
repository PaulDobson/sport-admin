import { describe, expect, it } from "vitest";
import { parseOperationalLocalDateTime } from "./session-local-time";

describe("parseOperationalLocalDateTime", () => {
  it("converts Santiago wall-clock time to the matching instant", () => {
    expect(parseOperationalLocalDateTime("2026-10-08T10:00").toISOString()).toBe(
      "2026-10-08T13:00:00.000Z",
    );
  });

  it("rejects invalid calendar values", () => {
    expect(() => parseOperationalLocalDateTime("2026-02-30T10:00")).toThrow(
      "Ingresa una fecha y hora válidas.",
    );
  });
});
