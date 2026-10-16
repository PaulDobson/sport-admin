import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { ScheduleSessionRepositoryPort } from "../ports/schedule-session-repository-port";
import { operationalDateRange } from "./operational-date-range";

const schema = z.object({
  tenantId: z.string().uuid(),
  locationId: z.string().uuid().optional().catch(undefined),
  disciplineId: z.string().uuid().optional(),
  query: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(["all", "scheduled", "cancelled", "completed"]).default("scheduled"),
  from: z.string().optional(),
  through: z.string().optional(),
  page: z.coerce.number().int().min(1).max(100_000).catch(1).default(1),
});

const pageSize = 25;

export async function getScheduleSessions(
  input: z.input<typeof schema>,
  deps: { scheduleSessions: ScheduleSessionRepositoryPort },
) {
  const parsed = parseWithSchema(schema, input);
  const dateRange = operationalDateRange(parsed.from, parsed.through);
  const filters = {
    tenantId: parsed.tenantId,
    locationId: parsed.locationId,
    disciplineId: parsed.disciplineId,
    query: parsed.query || undefined,
    status: parsed.status,
    ...dateRange,
    page: parsed.page,
    pageSize,
  };
  const result = await deps.scheduleSessions.listPage(filters);
  const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
  if (parsed.page > lastPage) {
    const lastPageResult = await deps.scheduleSessions.listPage({
      ...filters,
      page: lastPage,
    });
    return { ...lastPageResult, page: lastPage, pageSize };
  }

  return { ...result, page: parsed.page, pageSize };
}
