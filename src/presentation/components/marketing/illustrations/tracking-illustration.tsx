"use client";

import { motion } from "framer-motion";
import { useMotionPreferences } from "../use-motion-preferences";

const metrics = [
  { label: "Peso (kg)", initial: 84, current: 78, goal: 75, color: "primary" },
  { label: "% Grasa", initial: 22, current: 17, goal: 15, color: "info" },
  { label: "Fuerza (kg)", initial: 60, current: 80, goal: 90, color: "success" },
];

const attendanceDots = [
  true, true, false, true, true, true, false,
  true, true, true, true, false, true, true,
  false, true, true, true, true, true, false,
];

export function TrackingIllustration() {
  const { prefersReducedMotion } = useMotionPreferences();

  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[280px] flex-col gap-3 p-5 sm:p-6 lg:min-h-[360px]"
    >
      {/* Student header */}
      <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-card px-4 py-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-info/15 text-xs font-bold text-info">
          LM
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Lucía M.</p>
          <p className="text-xs text-muted-foreground">
            CrossFit · Activo desde Enero
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-semibold text-success">
            En progreso
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-2">
        {metrics.map((m, i) => {
          const progress = Math.round(
            ((m.initial - m.current) / (m.initial - m.goal)) * 100,
          );
          const pct = Math.max(0, Math.min(100, progress));
          const colorMap: Record<string, { track: string; text: string }> = {
            primary: { track: "bg-primary", text: "text-primary" },
            info: { track: "bg-info", text: "text-info" },
            success: { track: "bg-success", text: "text-success" },
          };
          const c = colorMap[m.color];

          return (
            <div
              key={m.label}
              className="rounded-xl border border-white/6 bg-surface-raised px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {m.label}
                </p>
                <div className="flex items-center gap-2">
                  <span className="metric-number text-xs text-muted-foreground line-through">
                    {m.initial}
                  </span>
                  <span className={`metric-number text-sm font-bold ${c.text}`}>
                    {m.current}
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <motion.div
                  className={`h-full rounded-full ${c.track}`}
                  initial={prefersReducedMotion ? false : { width: "0%" }}
                  whileInView={
                    prefersReducedMotion ? undefined : { width: `${pct}%` }
                  }
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.08 * i }}
                />
              </div>
              <p className="mt-1 text-right text-[9px] text-muted-foreground">
                {pct}% hacia la meta
              </p>
            </div>
          );
        })}
      </div>

      {/* Attendance grid */}
      <div className="rounded-xl border border-white/6 bg-card px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
          Asistencia últimas 3 semanas
        </p>
        <div className="grid grid-cols-7 gap-1">
          {attendanceDots.map((present, i) => (
            <motion.span
              key={i}
              initial={prefersReducedMotion ? false : { scale: 0 }}
              whileInView={prefersReducedMotion ? undefined : { scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: 0.02 * i }}
              className={`aspect-square rounded-sm ${
                present ? "bg-success/70" : "bg-surface-raised"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
