"use client";

import { memo, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type {
  MetricDefinition,
  MetricEvaluation,
} from "@/domain/evolution-health-attendance/metric";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Period = 30 | 90 | 180 | 365;

interface DataPoint {
  date: Date;
  value: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DATE_SHORT = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
});

function buildPoints(
  evaluations: MetricEvaluation[],
  slug: string,
  days: Period | null,
): DataPoint[] {
  const cutoff = days !== null ? Date.now() - days * 86_400_000 : 0;
  return evaluations
    .filter(
      (e) =>
        e.evaluatedAt.getTime() >= cutoff && typeof e.values[slug] === "number",
    )
    .map((e) => ({ date: e.evaluatedAt, value: e.values[slug] as number }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Generate evenly-spaced y-axis tick values that look clean */
function niceYTicks(min: number, max: number, tickCount = 4): number[] {
  const range = max - min || 1;
  const rawStep = range / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceSteps = [1, 2, 2.5, 5, 10];
  const step =
    magnitude *
    (niceSteps.find((s) => s * magnitude >= rawStep) ?? niceSteps.at(-1)!);
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (
    let v = start;
    v <= max + step * 0.5;
    v = parseFloat((v + step).toFixed(10))
  ) {
    ticks.push(parseFloat(v.toFixed(4)));
  }
  return ticks;
}

/** Pick representative x-axis tick points, always including first and last */
function xTicks(points: DataPoint[], maxTicks = 5): DataPoint[] {
  if (points.length <= maxTicks) return points;
  const result: DataPoint[] = [points[0]];
  const innerCount = maxTicks - 2;
  for (let i = 1; i <= innerCount; i++) {
    const idx = Math.round((i / (innerCount + 1)) * (points.length - 1));
    result.push(points[idx]);
  }
  result.push(points[points.length - 1]);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG geometry — computed once per data change, NOT on tooltip hover
// ─────────────────────────────────────────────────────────────────────────────

// Logical coordinate space — SVG scales to fill container width via viewBox
const VB_W = 560;
const VB_H = 180;
const PAD = { top: 16, right: 12, bottom: 32, left: 40 };
const INNER_W = VB_W - PAD.left - PAD.right;
const INNER_H = VB_H - PAD.top - PAD.bottom;

interface ChartGeometry {
  yTicks: number[];
  xTickPts: DataPoint[];
  linePath: string;
  areaPath: string;
  /** Convert point index → SVG x coordinate */
  toX: (i: number) => number;
  /** Convert value → SVG y coordinate */
  toY: (v: number) => number;
}

function computeChartGeometry(points: DataPoint[]): ChartGeometry {
  const values = points.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const yTicksArr = niceYTicks(minV, maxV);
  const yMin = yTicksArr[0];
  const yMax = yTicksArr[yTicksArr.length - 1];
  const yRange = yMax - yMin || 1;

  const toX = (i: number) =>
    PAD.left +
    (points.length === 1 ? INNER_W / 2 : (i / (points.length - 1)) * INNER_W);
  const toY = (v: number) =>
    PAD.top + INNER_H - ((v - yMin) / yRange) * INNER_H;

  // Smooth cubic bezier path — computed once
  let linePath: string;
  if (points.length === 1) {
    linePath = `M ${toX(0)},${toY(points[0].value)}`;
  } else {
    linePath = `M ${toX(0)},${toY(points[0].value)}`;
    for (let i = 1; i < points.length; i++) {
      const x0 = toX(i - 1);
      const y0 = toY(points[i - 1].value);
      const x1 = toX(i);
      const y1 = toY(points[i].value);
      const cpX = (x0 + x1) / 2;
      linePath += ` C ${cpX},${y0} ${cpX},${y1} ${x1},${y1}`;
    }
  }

  const areaPath =
    linePath +
    ` L ${toX(points.length - 1)},${PAD.top + INNER_H}` +
    ` L ${toX(0)},${PAD.top + INNER_H} Z`;

  return {
    yTicks: yTicksArr,
    xTickPts: xTicks(points),
    linePath,
    areaPath,
    toX,
    toY,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Period selector dropdown
// ─────────────────────────────────────────────────────────────────────────────

const PERIODS: { value: Period; label: string }[] = [
  { value: 30, label: "30 días" },
  { value: 90, label: "3 meses" },
  { value: 180, label: "6 meses" },
  { value: 365, label: "1 año" },
];

function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = PERIODS.find((p) => p.value === value)?.label ?? "";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-surface-raised px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
      >
        {label}
        <ChevronDown
          aria-hidden
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <>
          {/* backdrop to close on outside click */}
          <button
            type="button"
            aria-label="Cerrar"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label="Seleccionar período"
            className="absolute right-0 top-full z-20 mt-1.5 min-w-[7.5rem] overflow-hidden rounded-xl border border-white/10 bg-surface-overlay py-1 shadow-xl"
          >
            {PERIODS.map((p) => (
              <li key={p.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.value === value}
                  onClick={() => {
                    onChange(p.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-xs transition-colors hover:bg-white/6 ${
                    p.value === value
                      ? "font-semibold text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG line chart with hover tooltip
// ─────────────────────────────────────────────────────────────────────────────

interface TooltipState {
  index: number;
  x: number; // viewBox coords
  y: number;
}

const LineChart = memo(function LineChart({
  points,
  unit,
  accentColor,
  emptyLabel,
  gradientId,
}: {
  points: DataPoint[];
  unit?: string;
  accentColor: string;
  emptyLabel: string;
  gradientId: string;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── KEY OPTIMISATION: geometry is memoized by points identity.
  // Tooltip state changes do NOT trigger recomputation of SVG paths/ticks.
  const geo = useMemo<ChartGeometry | null>(() => {
    if (points.length === 0) return null;
    return computeChartGeometry(points);
  }, [points]);

  if (!geo) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-white/8">
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  const { yTicks, xTickPts, linePath, areaPath, toX, toY } = geo;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * VB_W;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(toX(i) - mouseX);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setTooltip({ index: best, x: toX(best), y: toY(points[best].value) });
  };

  const tooltipPt = tooltip !== null ? points[tooltip.index] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full"
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTooltip(null)}
      style={{ touchAction: "none" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
        </linearGradient>
        <clipPath id={`${gradientId}-clip`}>
          <rect x={PAD.left} y={PAD.top} width={INNER_W} height={INNER_H} />
        </clipPath>
      </defs>

      {/* Y-axis grid + labels */}
      {yTicks.map((v) => {
        const y = toY(v);
        const label = v % 1 === 0 ? String(v) : v.toFixed(1);
        return (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={y}
              x2={VB_W - PAD.right}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9}
              fill="rgba(255,255,255,0.3)"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
        clipPath={`url(#${gradientId}-clip)`}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={accentColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath={`url(#${gradientId}-clip)`}
      />

      {/* Dots — only when few points */}
      {points.length <= 30
        ? points.map((p, i) => (
            <circle
              key={i}
              cx={toX(i)}
              cy={toY(p.value)}
              r={3}
              fill={accentColor}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={1.5}
            />
          ))
        : null}

      {/* X-axis tick labels */}
      {xTickPts.map((p) => {
        const i = points.indexOf(p);
        return (
          <text
            key={i}
            x={toX(i)}
            y={VB_H - 4}
            textAnchor="middle"
            fontSize={9}
            fill="rgba(255,255,255,0.3)"
          >
            {DATE_SHORT.format(p.date)}
          </text>
        );
      })}

      {/* Tooltip vertical line + bubble */}
      {tooltip !== null && tooltipPt !== null ? (
        <g>
          {/* vertical rule */}
          <line
            x1={tooltip.x}
            y1={PAD.top}
            x2={tooltip.x}
            y2={PAD.top + INNER_H}
            stroke={accentColor}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.6}
          />
          {/* dot highlight */}
          <circle
            cx={tooltip.x}
            cy={tooltip.y}
            r={5}
            fill={accentColor}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={2}
          />
          {/* bubble — flip to left side when close to right edge */}
          {(() => {
            const flipLeft = tooltip.x > VB_W * 0.7;
            const bw = 110;
            const bh = 38;
            const bx = flipLeft ? tooltip.x - bw - 10 : tooltip.x + 10;
            const by = Math.max(PAD.top, tooltip.y - bh / 2);
            const valStr =
              tooltipPt.value % 1 === 0
                ? String(tooltipPt.value)
                : tooltipPt.value.toFixed(1);
            return (
              <g>
                <rect
                  x={bx}
                  y={by}
                  width={bw}
                  height={bh}
                  rx={6}
                  fill="rgba(15,15,25,0.92)"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                />
                <text
                  x={bx + bw / 2}
                  y={by + 13}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="700"
                  fill={accentColor}
                >
                  {valStr}
                  {unit ? ` ${unit}` : ""}
                </text>
                <text
                  x={bx + bw / 2}
                  y={by + 27}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(255,255,255,0.45)"
                >
                  {DATE_SHORT.format(tooltipPt.date)}
                </text>
              </g>
            );
          })()}
        </g>
      ) : null}
    </svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Metric config — accent color + empty state label per slug
// ─────────────────────────────────────────────────────────────────────────────

const METRIC_CONFIG: Record<string, { color: string; emptyLabel: string }> = {
  "weight-kg": { color: "#60a5fa", emptyLabel: "Sin registros de peso" },
  "body-fat-pct": {
    color: "#fb923c",
    emptyLabel: "Sin registros de grasa corporal",
  },
  "muscle-mass-kg": {
    color: "#34d399",
    emptyLabel: "Sin registros de masa muscular",
  },
  "cardio-vo2max": {
    color: "#f472b6",
    emptyLabel: "Sin registros de capacidad aeróbica",
  },
  "strength-bench-press": {
    color: "#fbbf24",
    emptyLabel: "Sin registros de press de banca",
  },
  "strength-squat": {
    color: "#fbbf24",
    emptyLabel: "Sin registros de sentadilla",
  },
  "strength-deadlift": {
    color: "#fbbf24",
    emptyLabel: "Sin registros de peso muerto",
  },
  "speed-40m": { color: "#22d3ee", emptyLabel: "Sin registros de velocidad" },
  "speed-100m": { color: "#22d3ee", emptyLabel: "Sin registros de velocidad" },
};
const DEFAULT_CONFIG = { color: "#a78bfa", emptyLabel: "Sin registros" };

// ─────────────────────────────────────────────────────────────────────────────
// Metric chart card — header, value summary, period selector, chart
// ─────────────────────────────────────────────────────────────────────────────

// Memoized: only re-renders when its own props change (period state lives inside)
const MetricChartCard = memo(function MetricChartCard({
  definition,
  // Receives ONLY the evaluations that contain this slug (pre-filtered by parent)
  evaluations,
}: {
  definition: MetricDefinition;
  evaluations: MetricEvaluation[];
}) {
  const [period, setPeriod] = useState<Period>(90);
  const gradientId = useId().replace(/:/g, "");
  const cfg = METRIC_CONFIG[definition.slug] ?? DEFAULT_CONFIG;

  // ── KEY OPTIMISATION: memoize both point arrays.
  // Re-runs only when evaluations array reference or period changes —
  // NOT on tooltip hover (which only updates state inside LineChart).
  const allPoints = useMemo(
    () => buildPoints(evaluations, definition.slug, null),
    [evaluations, definition.slug],
  );

  const points = useMemo(
    () => buildPoints(evaluations, definition.slug, period),
    [evaluations, definition.slug, period],
  );

  const latest = allPoints.at(-1);
  const previous = allPoints.at(-2);

  const delta = latest && previous ? latest.value - previous.value : null;

  const pctChange =
    delta !== null && previous
      ? (delta / (Math.abs(previous.value) || 1)) * 100
      : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-white/6 bg-card">
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {definition.name}
          </p>
          {/* Current value + delta */}
          <div className="mt-1 flex items-baseline gap-2">
            <p
              className="metric-number text-2xl font-bold leading-none"
              style={{ color: cfg.color }}
            >
              {latest
                ? latest.value % 1 === 0
                  ? latest.value
                  : latest.value.toFixed(1)
                : "—"}
              {definition.unit ? (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {definition.unit}
                </span>
              ) : null}
            </p>
            {pctChange !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  pctChange > 0.05
                    ? "bg-success/12 text-success"
                    : pctChange < -0.05
                      ? "bg-destructive/12 text-destructive"
                      : "bg-white/6 text-muted-foreground"
                }`}
              >
                {pctChange > 0.05 ? (
                  <TrendingUp aria-hidden className="h-2.5 w-2.5" />
                ) : pctChange < -0.05 ? (
                  <TrendingDown aria-hidden className="h-2.5 w-2.5" />
                ) : (
                  <Minus aria-hidden className="h-2.5 w-2.5" />
                )}
                {pctChange > 0 ? "+" : ""}
                {pctChange.toFixed(1)}%
              </span>
            ) : null}
          </div>
          {latest ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {DATE_SHORT.format(latest.date)}
              {delta !== null
                ? ` · ${delta > 0 ? "+" : ""}${delta % 1 === 0 ? delta : delta.toFixed(1)} ${definition.unit ?? ""}`
                : ""}
            </p>
          ) : null}
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Chart */}
      <div className="px-1 pb-2 pt-3">
        <LineChart
          points={points}
          unit={definition.unit}
          accentColor={cfg.color}
          emptyLabel={cfg.emptyLabel}
          gradientId={`grad-${gradientId}`}
        />
      </div>
    </article>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_SLUGS = [
  "weight-kg",
  "body-fat-pct",
  "muscle-mass-kg",
  "cardio-vo2max",
  "strength-bench-press",
  "strength-squat",
  "strength-deadlift",
  "speed-40m",
  "speed-100m",
];

export function StudentEvolutionCharts({
  definitions,
  evaluations,
}: {
  definitions: MetricDefinition[];
  evaluations: MetricEvaluation[];
}) {
  // ── KEY OPTIMISATION: build slug→evaluations index once, then filter/sort
  // definitions. Each MetricChartCard receives only the subset it needs instead
  // of the full evaluations array, reducing per-card work from O(n) to O(k)
  // where k << n (only evaluations that contain that specific slug).
  const { active, evalsBySlug } = useMemo(() => {
    const bySlug = new Map<string, MetricEvaluation[]>();
    for (const evaluation of evaluations) {
      for (const slug of Object.keys(evaluation.values)) {
        const existing = bySlug.get(slug);
        if (existing) {
          existing.push(evaluation);
        } else {
          bySlug.set(slug, [evaluation]);
        }
      }
    }

    const sorted = [...definitions]
      .filter((d) => bySlug.has(d.slug))
      .sort((a, b) => {
        const ai = PRIORITY_SLUGS.indexOf(a.slug);
        const bi = PRIORITY_SLUGS.indexOf(b.slug);
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name, "es");
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

    return { active: sorted, evalsBySlug: bySlug };
  }, [definitions, evaluations]);

  if (active.length === 0) return null;

  return (
    <section aria-labelledby="evo-charts-hdg" className="space-y-3">
      <h3
        id="evo-charts-hdg"
        className="text-base font-semibold text-foreground"
      >
        Evolución
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {active.map((def) => (
          <MetricChartCard
            key={def.slug}
            definition={def}
            // Pass only the evaluations that contain this slug — O(k) instead of O(n)
            evaluations={evalsBySlug.get(def.slug) ?? []}
          />
        ))}
      </div>
    </section>
  );
}
