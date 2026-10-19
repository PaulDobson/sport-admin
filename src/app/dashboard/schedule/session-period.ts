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

const monthTitleFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const dayTitleFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const weekBoundFormatter = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

export function sessionPeriodTitle(
  range: { from: string; through: string },
  period: "day" | "week" | "month",
) {
  const from = new Date(`${range.from}T12:00:00Z`);
  const through = new Date(`${range.through}T12:00:00Z`);
  if (period === "month") return monthTitleFormatter.format(from);
  if (period === "day") return dayTitleFormatter.format(from);
  return `${weekBoundFormatter.format(from)} – ${weekBoundFormatter.format(through)} ${through.getUTCFullYear()}`;
}
