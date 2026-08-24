import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { OperationalReportRepositoryPort } from "../ports/operational-report-repository-port";

const inputSchema = z
  .object({
    tenantId: z.string().uuid(),
    from: z.iso.date(),
    to: z.iso.date(),
    locationId: z.string().uuid().optional(),
  })
  .refine((input) => input.from <= input.to, {
    path: ["to"],
    message: "Report end date must not precede start date",
  });

export async function getOperationalReport(
  input: z.input<typeof inputSchema>,
  deps: { operationalReports: OperationalReportRepositoryPort },
) {
  const parsed = parseWithSchema(inputSchema, input);
  return deps.operationalReports.load(parsed.tenantId, {
    from: parsed.from,
    to: parsed.to,
    locationId: parsed.locationId,
  });
}
