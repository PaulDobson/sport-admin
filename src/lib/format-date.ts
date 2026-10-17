const shortDate = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats an ISO calendar date (`YYYY-MM-DD`) without shifting it to the local time zone. */
export function formatShortDate(isoDate: string) {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? isoDate : shortDate.format(date);
}

/** Today's calendar date in the user's time zone as `YYYY-MM-DD`. */
export function localIsoDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

const monthYear = new Intl.DateTimeFormat("es-CL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Formats a `YYYY-MM` period as e.g. "abril de 2026". */
export function formatPeriod(period: string) {
  const date = new Date(`${period}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? period : monthYear.format(date);
}
