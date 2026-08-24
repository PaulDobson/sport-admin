import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { LocationRepositoryPort } from "../ports/location-repository-port";

const archiveLocationSchema = z.object({
  tenantId: z.string().uuid(),
  locationId: z.string().min(1),
});

export async function archiveLocation(
  input: z.input<typeof archiveLocationSchema>,
  deps: { locations: LocationRepositoryPort },
) {
  const parsed = parseWithSchema(archiveLocationSchema, input);
  return deps.locations.archive(parsed.tenantId, parsed.locationId);
}
