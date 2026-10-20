import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";

const schema = z.object({
  tenantId: z.string().uuid(),
  search: z.string().trim().min(2, "Escribe al menos 2 caracteres").max(100),
  page: z.number().int().min(1).max(10000),
});

export async function searchAttendanceStudents(
  input: z.input<typeof schema>,
  deps: { attendance: { searchStudents: (tenantId: string, search: string, page: number) => Promise<{
    students: Array<{ studentId: string; studentName: string }>; total: number;
  }> } },
) {
  const parsed = parseWithSchema(schema, input);
  return deps.attendance.searchStudents(parsed.tenantId, parsed.search, parsed.page);
}
