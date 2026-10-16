import { operationalDateRange } from "@/application/instructor-operations/use-cases/operational-date-range";

export function sessionPeriod(date: string, period: "day" | "week" | "month") {
  operationalDateRange(date, date);
  const anchor = new Date(`${date}T12:00:00Z`);
  const from = new Date(anchor);
  const through = new Date(anchor);
  if (period === "week") {
    const offset = (anchor.getUTCDay() + 6) % 7;
    from.setUTCDate(anchor.getUTCDate() - offset);
    through.setTime(from.getTime() + 6 * 86_400_000);
  } else if (period === "month") {
    from.setUTCDate(1);
    through.setUTCMonth(anchor.getUTCMonth() + 1, 0);
  }
  return {
    from: from.toISOString().slice(0, 10),
    through: through.toISOString().slice(0, 10),
  };
}
