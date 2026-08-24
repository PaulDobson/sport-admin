import { describe, expect, it } from "vitest";
import { createLocation } from "./create-location";
import { FakeLocationRepository } from "../testing/fakes";

const tenantId = "10000000-0000-4000-8000-000000000001";

describe("createLocation", () => {
  it.each(["external_gym", "park", "home", "online"] as const)(
    "creates an active %s location",
    async (type) => {
      const locations = new FakeLocationRepository();

      const location = await createLocation(
        { tenantId, name: `Location ${type}`, type },
        { locations },
      );

      expect(location).toMatchObject({ tenantId, type, status: "active" });
    },
  );
});
