import { ValidationError } from "@/domain/shared/errors";

export interface BillingDuration {
  unit: "days" | "months";
  count: number;
}

export interface BillingPeriod {
  startsOn: string;
  endsBefore: string;
}

const dayMilliseconds = 86_400_000;

function dateError(path: string, message: string): never {
  throw new ValidationError([{ path, message }]);
}

function utcDate(year: number, month: number, day: number): Date {
  const result = new Date(0);
  result.setUTCFullYear(year, month - 1, day);
  return result;
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    dateError("date", "La fecha debe tener formato AAAA-MM-DD.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const result = utcDate(year, month, day);
  if (year < 1 || result.toISOString().slice(0, 10) !== value) {
    dateError("date", "La fecha no es válida.");
  }
  return result;
}

function formatDate(value: Date): string {
  if (!Number.isFinite(value.getTime()) || value.getUTCFullYear() < 1 || value.getUTCFullYear() > 9999) {
    dateError("date", "El período excede el rango de fechas permitido.");
  }
  return value.toISOString().slice(0, 10);
}

export function assertBillingDuration(duration: BillingDuration): void {
  if (!["days", "months"].includes(duration.unit) || !Number.isSafeInteger(duration.count) || duration.count <= 0) {
    dateError("duration", "La duración debe ser un número entero positivo de días o meses.");
  }
}

export function daysBetween(startsOn: string, endsBefore: string): number {
  return (parseDate(endsBefore).getTime() - parseDate(startsOn).getTime()) / dayMilliseconds;
}

export function assertBillingPeriod(period: BillingPeriod): void {
  if (daysBetween(period.startsOn, period.endsBefore) <= 0) {
    dateError("period", "El fin exclusivo debe ser posterior al inicio del período.");
  }
}

export function billingPeriodAt(anchor: string, duration: BillingDuration, index = 0): BillingPeriod {
  assertBillingDuration(duration);
  const original = parseDate(anchor);
  if (!Number.isSafeInteger(index) || index < 0) {
    dateError("index", "El índice del período debe ser un entero no negativo.");
  }
  const boundary = (periodIndex: number) => {
    const offset = duration.count * periodIndex;
    if (!Number.isSafeInteger(offset)) {
      dateError("duration", "El período excede el rango de fechas permitido.");
    }
    if (duration.unit === "days") {
      return formatDate(new Date(original.getTime() + offset * dayMilliseconds));
    }
    const monthIndex = original.getUTCMonth() + offset;
    const year = original.getUTCFullYear() + Math.floor(monthIndex / 12);
    if (year > 9999) dateError("duration", "El período excede el rango de fechas permitido.");
    const month = monthIndex % 12 + 1;
    const lastDay = utcDate(year, month + 1, 0).getUTCDate();
    return formatDate(utcDate(year, month, Math.min(original.getUTCDate(), lastDay)));
  };
  return { startsOn: boundary(index), endsBefore: boundary(index + 1) };
}

const chileDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function billingDateInChile(instant: Date): string {
  if (!Number.isFinite(instant.getTime())) dateError("date", "El instante no es válido.");
  const parts = chileDateFormatter.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)?.value;
  const result = `${part("year")}-${part("month")}-${part("day")}`;
  parseDate(result);
  return result;
}
