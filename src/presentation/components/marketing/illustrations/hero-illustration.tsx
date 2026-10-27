"use client";

import { motion } from "framer-motion";
import { useMotionPreferences } from "../use-motion-preferences";

/** Dashboard mockup rendered as an inline SVG-backed component */
export function HeroDashboardMock() {
  const { prefersReducedMotion } = useMotionPreferences();

  const chartPoints = [
    [0, 68],
    [60, 48],
    [120, 58],
    [180, 28],
    [240, 38],
    [300, 14],
    [360, 24],
    [420, 8],
  ];

  const pathD = chartPoints
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");

  const areaD = pathD + ` L 420 90 L 0 90 Z`;

  const barData = [
    { h: 28, x: 16, accent: "primary" },
    { h: 42, x: 36, accent: "primary" },
    { h: 35, x: 56, accent: "primary" },
    { h: 54, x: 76, accent: "success" },
    { h: 40, x: 96, accent: "primary" },
    { h: 62, x: 116, accent: "success" },
    { h: 48, x: 136, accent: "primary" },
  ];

  return (
    <div
      role="img"
      aria-label="Panel operativo de Sport Admin con métricas de alumnos, ingresos y reservas"
      className="select-none bg-card p-3 sm:p-5"
    >
      {/* Topbar mock */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-primary">SA</span>
          </div>
          <div className="h-2.5 w-20 rounded-full bg-muted" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-16 rounded-md bg-primary/15 border border-primary/25" />
          <div className="h-6 w-6 rounded-md bg-muted" />
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          {
            label: "Alumnos",
            value: "48",
            sub: "+3 este mes",
            color: "primary",
          },
          {
            label: "Ingresos",
            value: "$84k",
            sub: "Mes actual",
            color: "success",
          },
          {
            label: "Clases hoy",
            value: "6",
            sub: "2 pendientes",
            color: "info",
          },
        ].map((stat) => {
          const colorMap: Record<string, { bg: string; text: string }> = {
            primary: { bg: "bg-primary/10", text: "text-primary" },
            success: { bg: "bg-success/10", text: "text-success" },
            info: { bg: "bg-info/10", text: "text-info" },
          };
          const c = colorMap[stat.color];
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-white/6 bg-surface-raised p-2.5 sm:p-3"
            >
              <div
                className={`mb-1.5 inline-flex rounded-md ${c.bg} px-1.5 py-0.5`}
              >
                <span className={`text-[9px] font-semibold ${c.text}`}>
                  {stat.label}
                </span>
              </div>
              <p
                className={`metric-number text-lg font-bold ${c.text} sm:text-xl`}
              >
                {stat.value}
              </p>
              <p className="text-[9px] text-muted-foreground">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Chart section */}
      <div className="mb-3 overflow-hidden rounded-xl border border-white/6 bg-surface-raised p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="h-2 w-24 rounded-full bg-foreground/20" />
            <div className="mt-1 h-1.5 w-16 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="flex gap-1">
            {["7d", "1m", "3m"].map((t) => (
              <div
                key={t}
                className={`rounded px-2 py-0.5 text-[9px] ${
                  t === "1m"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Sparkline chart */}
        <svg
          viewBox="0 0 420 90"
          className="h-20 w-full sm:h-24"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-primary)"
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor="var(--color-primary)"
                stopOpacity="0.02"
              />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-info)" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 30, 60, 90].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="420"
              y2={y}
              stroke="var(--color-border)"
              strokeWidth="0.5"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area */}
          <path d={areaD} fill="url(#chartGrad)" />

          {/* Line */}
          {prefersReducedMotion ? (
            <path
              d={pathD}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <motion.path
              d={pathD}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
            />
          )}

          {/* Last point dot */}
          <circle cx="420" cy="8" r="4" fill="var(--color-primary)" />
          <circle
            cx="420"
            cy="8"
            r="8"
            fill="var(--color-primary)"
            opacity="0.2"
          />
        </svg>
      </div>

      {/* Bottom two panels */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Mini bar chart */}
        <div className="overflow-hidden rounded-xl border border-white/6 bg-surface-raised p-3">
          <div className="mb-2 h-2 w-20 rounded-full bg-foreground/15" />
          <svg viewBox="0 0 160 72" className="h-14 w-full" aria-hidden="true">
            {barData.map((bar) => {
              const color =
                bar.accent === "success"
                  ? "var(--color-success)"
                  : "var(--color-primary)";
              return (
                <rect
                  key={bar.x}
                  x={bar.x}
                  y={72 - bar.h}
                  width="14"
                  height={bar.h}
                  rx="4"
                  fill={color}
                  opacity="0.75"
                />
              );
            })}
          </svg>
        </div>

        {/* Attendance list mock */}
        <div className="overflow-hidden rounded-xl border border-white/6 bg-surface-raised p-3">
          <div className="mb-2 h-2 w-16 rounded-full bg-foreground/15" />
          <div className="flex flex-col gap-1.5">
            {[
              { w: "w-3/4", dot: "bg-success" },
              { w: "w-2/3", dot: "bg-success" },
              { w: "w-5/6", dot: "bg-primary" },
              { w: "w-1/2", dot: "bg-warning" },
            ].map((row, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.dot}`}
                />
                <div
                  className={`h-1.5 ${row.w} rounded-full bg-muted-foreground/25`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Legacy export kept for backward compat */
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
