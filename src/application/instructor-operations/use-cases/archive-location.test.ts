import { describe, expect, it } from "vitest";
import { archiveLocation } from "./archive-location";
import { createLocation } from "./create-location";
import { FakeLocationRepository } from "../testing/fakes";

const tenantId = "10000000-0000-4000-8000-000000000001";

describe("archiveLocation", () => {
  it("preserves the location and excludes it from active results", async () => {
    const locations = new FakeLocationRepository();
    const location = await createLocation(
      { tenantId, name: "Old Gym", type: "external_gym" },
      { locations },
    );

    const archived = await archiveLocation(
      { tenantId, locationId: location.id },
      { locations },
    );

    expect(archived.status).toBe("archived");
    await expect(locations.findActiveByTenant(tenantId)).resolves.toEqual([]);
    expect(locations.locations).toHaveLength(1);
  });
});
