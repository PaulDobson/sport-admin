import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/shared/errors";
import { getOperationalReport } from "./get-operational-report";

describe("getOperationalReport", () => {
  it("passes validated tenant, period, and location filters", async () => {
    const load = vi.fn().mockResolvedValue({ activeStudents: 0 });
    await getOperationalReport(
      {
        tenantId: "25000000-0000-4000-8000-000000000001",
        from: "2026-08-01",
        to: "2026-08-31",
        locationId: "25000000-0000-4000-8000-000000000002",
      },
      { operationalReports: { load } },
    );

    expect(load).toHaveBeenCalledWith("25000000-0000-4000-8000-000000000001", {
      from: "2026-08-01",
      to: "2026-08-31",
      locationId: "25000000-0000-4000-8000-000000000002",
    });
  });

  it("rejects an inverted period before querying", async () => {
    await expect(
      getOperationalReport(
        {
          tenantId: "25000000-0000-4000-8000-000000000001",
          from: "2026-09-01",
          to: "2026-08-01",
        },
        { operationalReports: { load: vi.fn() } },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
