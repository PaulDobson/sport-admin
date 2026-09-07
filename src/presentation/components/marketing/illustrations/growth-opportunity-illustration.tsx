export function GrowthOpportunityIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      role="img"
      aria-label="Locaciones creciendo alrededor de un punto central"
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
      <circle cx="100" cy="88" r="20" fill="var(--color-primary)" />
      <circle cx="44" cy="52" r="10" fill="var(--color-info)" opacity="0.85" />
      <circle cx="156" cy="52" r="10" fill="var(--color-info)" opacity="0.85" />
      <circle cx="44" cy="124" r="10" fill="var(--color-info)" opacity="0.6" />
      <circle cx="156" cy="124" r="10" fill="var(--color-info)" opacity="0.6" />
      <line
        x1="100"
        y1="88"
        x2="44"
        y2="52"
        stroke="var(--color-border)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <line
        x1="100"
        y1="88"
        x2="156"
        y2="52"
        stroke="var(--color-border)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <line
        x1="100"
        y1="88"
        x2="44"
        y2="124"
        stroke="var(--color-border)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <line
        x1="100"
        y1="88"
        x2="156"
        y2="124"
        stroke="var(--color-border)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
    </svg>
  );
}
