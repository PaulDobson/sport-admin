import { serializeCsv } from "@/application/reporting/csv";
import { getOperationalReport } from "@/application/reporting/use-cases/get-operational-report";
import { getMonthlyFinancialProjection } from "@/application/instructor-finance/use-cases/get-monthly-financial-projection";
import { getSaasFinancialDashboard } from "@/application/saas-administration/use-cases/get-saas-financial-dashboard";
import { DomainError } from "@/domain/shared/errors";
import { createAuthDeps } from "@/infrastructure/composition/auth-composition";
import { createInstructorFinanceDeps } from "@/infrastructure/composition/instructor-finance-composition";
import { createReportingDeps } from "@/infrastructure/composition/reporting-composition";
import { createSaasAdministrationDeps } from "@/infrastructure/composition/saas-administration-composition";

function csvResponse(filename: string, rows: readonly (readonly unknown[])[]) {
  return new Response(`\uFEFF${serializeCsv(rows)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}

export async function GET(request: Request) {
  const auth = await createAuthDeps();
  const userId = await auth.auth.getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const report = url.searchParams.get("report");
  const period =
    url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
  const currency = url.searchParams.get("currency") ?? undefined;
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    return Response.json({ error: "Invalid currency" }, { status: 400 });
  }

  try {
    if (report === "saas-finance") {
      const { financialDashboard } = await createSaasAdministrationDeps();
      const metrics = await getSaasFinancialDashboard(
        period,
        financialDashboard,
      );
      const filtered = currency
        ? metrics.filter((row) => row.currency === currency)
        : metrics;
      return csvResponse(`saas-finance-${period}.csv`, [
        [
          "ledger",
          "period",
          "currency",
          "mrr",
          "arr",
          "arpa",
          "collected_net",
          "pending",
          "past_due",
        ],
        ...filtered.map((row) => [
          "saas",
          period,
          row.currency,
          row.mrr,
          row.arr,
          row.arpa,
          row.collectedNet,
          row.pendingAmount,
          row.pastDueAmount,
        ]),
      ]);
    }

    const memberships = await auth.memberships.findOperationalByUser(userId);
    if (memberships.length === 0)
      return Response.json({ error: "Forbidden" }, { status: 403 });
    const tenantId = memberships[0].tenantId;
    if (report === "instructor-finance") {
      const finance = await createInstructorFinanceDeps();
      const projections = await getMonthlyFinancialProjection(
        { tenantId, period },
        { financialProjections: finance.financialProjections },
      );
      const filtered = currency
        ? projections.filter((row) => row.currency === currency)
        : projections;
      return csvResponse(`instructor-finance-${period}.csv`, [
        [
          "ledger",
          "period",
          "currency",
          "contracted",
          "collectible",
          "collected",
        ],
        ...filtered.map((row) => [
          "instructor",
          period,
          row.currency,
          row.contractedAmount,
          row.collectibleAmount,
          row.collectedAmount,
        ]),
      ]);
    }
    if (report === "operational") {
      const from = url.searchParams.get("from") ?? `${period}-01`;
      const to =
        url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
      const locationId = url.searchParams.get("location") ?? undefined;
      const reporting = await createReportingDeps();
      const operational = await getOperationalReport(
        { tenantId, from, to, locationId },
        { operationalReports: reporting.operationalReports },
      );
      return csvResponse(`operations-${from}-${to}.csv`, [
        [
          "ledger",
          "from",
          "to",
          "location_id",
          "active_students",
          "attendance_total",
          "present",
          "absent",
          "late",
          "excused",
          "evaluations",
          "open_alerts",
        ],
        [
          "operations",
          from,
          to,
          locationId,
          operational.activeStudents,
          operational.attendance.total,
          operational.attendance.present,
          operational.attendance.absent,
          operational.attendance.late,
          operational.attendance.excused,
          operational.evaluations,
          operational.openAlerts,
        ],
      ]);
    }
    return Response.json({ error: "Unknown report" }, { status: 400 });
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
