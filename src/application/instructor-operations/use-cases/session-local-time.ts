import { BusinessRuleViolationError } from "@/domain/shared/errors";

const operationalTimezone = "America/Santiago";
const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: operationalTimezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatLocalDateTime(date: Date): string {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseOperationalLocalDateTime(value: string): Date {
  const match = localDateTimePattern.exec(value);
  if (!match) {
    throw new BusinessRuleViolationError("Ingresa una fecha y hora válidas.");
  }

  const [, year, month, day, hour, minute] = match;
  const localValue = `${year}-${month}-${day}T${hour}:${minute}`;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  if (new Date(localAsUtc).toISOString().slice(0, 16) !== localValue) {
    throw new BusinessRuleViolationError("Ingresa una fecha y hora válidas.");
  }

  const possibleOffsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = new Date(localAsUtc + hours * 60 * 60 * 1000);
    const sampleParts = Object.fromEntries(
      formatter
        .formatToParts(sample)
        .map(({ type, value }) => [type, value]),
    );
    const sampleAsUtc = Date.UTC(
      Number(sampleParts.year),
      Number(sampleParts.month) - 1,
      Number(sampleParts.day),
      Number(sampleParts.hour),
      Number(sampleParts.minute),
    );
    possibleOffsets.add(sampleAsUtc - sample.getTime());
  }

  const candidates = [...possibleOffsets]
    .map((offset) => new Date(localAsUtc - offset))
    .filter((candidate) => formatLocalDateTime(candidate) === localValue);

  if (candidates.length === 0) {
    throw new BusinessRuleViolationError(
      "Esa hora local no existe por el cambio de horario. Elige otra hora.",
    );
  }
  if (candidates.length > 1) {
    throw new BusinessRuleViolationError(
      "Esa hora local ocurre dos veces por el cambio de horario. Elige otra hora.",
    );
  }
  return candidates[0];
}
