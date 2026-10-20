import { BusinessRuleViolationError } from "@/domain/shared/errors";

const timezone = "America/Santiago";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date): string {
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function nextDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function startOfOperationalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day);
  let lowerBound = targetUtc - 48 * 60 * 60 * 1000;
  let upperBound = targetUtc + 48 * 60 * 60 * 1000;

  while (upperBound - lowerBound > 1) {
    const midpoint = Math.floor((lowerBound + upperBound) / 2);
    if (dateKey(new Date(midpoint)) >= value) upperBound = midpoint;
    else lowerBound = midpoint;
  }
  return new Date(upperBound);
}

export function operationalDateRange(from?: string, through?: string) {
  for (const value of [from, through]) {
    if (!value) continue;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new BusinessRuleViolationError("Selecciona una fecha válida.");
    }
    const [, year, month, day] = match;
    const calendarDate = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    if (calendarDate.toISOString().slice(0, 10) !== value) {
      throw new BusinessRuleViolationError("Selecciona una fecha válida.");
    }
  }
  if (from && through && through < from) {
    throw new BusinessRuleViolationError(
      "La fecha final no puede ser anterior a la fecha inicial.",
    );
  }

  return {
    startsOnOrAfter: from ? startOfOperationalDate(from) : undefined,
    startsBefore: through
      ? startOfOperationalDate(nextDate(through))
      : undefined,
  };
}
