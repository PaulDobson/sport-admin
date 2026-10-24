import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { LocationRepositoryPort } from "../ports/location-repository-port";

const updateLocationSchema = z.object({
  tenantId: z.string().uuid(),
  id: z.string().min(1),
  name: z.string().trim().min(1, "Location name is required"),
  type: z.enum(["external_gym", "park", "home", "online"]),
  address: z.string().trim().min(1).nullable().default(null),
});

export type UpdateLocationInput = z.input<typeof updateLocationSchema>;

export async function updateLocation(
  input: UpdateLocationInput,
  deps: { locations: LocationRepositoryPort },
) {
  return deps.locations.update(parseWithSchema(updateLocationSchema, input));
}
