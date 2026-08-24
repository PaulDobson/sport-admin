import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import { UnauthorizedError } from "@/domain/shared/errors";
import type { SaasFinancialDashboardPort } from "../ports/saas-financial-dashboard-port";

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export async function getSaasFinancialDashboard(
  period: string,
  dashboard: SaasFinancialDashboardPort,
) {
  if (!(await dashboard.isPlatformAdmin())) {
    throw new UnauthorizedError("Platform administrator access required");
  }
  const validPeriod = parseWithSchema(periodSchema, period);
  return dashboard.getMonthlyMetrics(`${validPeriod}-01`);
}
