import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { LocationRepositoryPort } from "../ports/location-repository-port";

const createLocationSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(1, "Location name is required"),
  type: z.enum(["external_gym", "park", "home", "online"]),
  address: z.string().trim().min(1).nullable().default(null),
});

export type CreateLocationInput = z.input<typeof createLocationSchema>;

export async function createLocation(
  input: CreateLocationInput,
  deps: { locations: LocationRepositoryPort },
) {
  return deps.locations.create(parseWithSchema(createLocationSchema, input));
}
