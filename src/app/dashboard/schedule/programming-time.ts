export const programmingDays = [
  { value: 1, short: "Lun", name: "Lunes" },
  { value: 2, short: "Mar", name: "Martes" },
  { value: 3, short: "Mié", name: "Miércoles" },
  { value: 4, short: "Jue", name: "Jueves" },
  { value: 5, short: "Vie", name: "Viernes" },
  { value: 6, short: "Sáb", name: "Sábado" },
  { value: 0, short: "Dom", name: "Domingo" },
];

export function addProgrammingDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function endTimeForDuration(start: string, duration: number) {
  if (!/^\d{2}:\d{2}$/.test(start) || !Number.isInteger(duration) || duration <= 0) return null;
  const [hour, minute] = start.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;
  const total = hour * 60 + minute + duration;
  return {
    time: `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
    nextDays: Math.floor(total / 1440),
  };
}

export function programmingDateLabel(value: string) {
  if (!value) return "Selecciona una fecha";
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}
