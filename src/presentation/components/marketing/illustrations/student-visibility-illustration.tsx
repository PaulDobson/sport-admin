export function StudentVisibilityIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      role="img"
      aria-label="Lista de alumnos con estado de asistencia"
      className="h-full w-full"
    >
      <rect
        x="0"
        y="0"
        width="200"
        height="160"
        rx="18"
        fill="var(--color-card)"
      />
      {[36, 72, 108].map((y, index) => (
        <g key={y}>
          <circle
            cx="40"
            cy={y}
            r="14"
            fill="var(--color-primary)"
            opacity={index === 1 ? 0.5 : 0.9}
          />
          <rect
            x="66"
            y={y - 6}
            width="90"
            height="8"
            rx="4"
            fill="var(--color-muted-foreground)"
            opacity="0.7"
          />
          <rect
            x="66"
            y={y + 6}
            width="56"
            height="6"
            rx="3"
            fill="var(--color-muted-foreground)"
            opacity="0.4"
          />
          <circle
            cx="168"
            cy={y}
            r="6"
            fill={index === 1 ? "var(--color-warning)" : "var(--color-success)"}
          />
        </g>
      ))}
    </svg>
  );
}
