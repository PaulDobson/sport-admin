export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 360"
      role="img"
      aria-label="Panel operativo con métricas de alumnos y sesiones"
      className="h-full w-full"
    >
      <rect
        x="0"
        y="0"
        width="480"
        height="360"
        rx="24"
        fill="var(--color-surface-raised)"
      />
      <circle
        cx="120"
        cy="120"
        r="90"
        fill="var(--color-primary)"
        opacity="0.16"
      />
      <circle
        cx="360"
        cy="240"
        r="120"
        fill="var(--color-info)"
        opacity="0.12"
      />
      <rect
        x="48"
        y="60"
        width="220"
        height="60"
        rx="16"
        fill="var(--color-card)"
        stroke="var(--color-border)"
      />
      <rect
        x="72"
        y="80"
        width="90"
        height="10"
        rx="5"
        fill="var(--color-primary)"
      />
      <rect
        x="72"
        y="98"
        width="140"
        height="8"
        rx="4"
        fill="var(--color-muted-foreground)"
        opacity="0.6"
      />
      <rect
        x="48"
        y="140"
        width="384"
        height="160"
        rx="20"
        fill="var(--color-card)"
        stroke="var(--color-border)"
      />
      <polyline
        points="72,260 140,210 200,235 260,170 320,200 392,150"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="392" cy="150" r="8" fill="var(--color-primary)" />
    </svg>
  );
}
