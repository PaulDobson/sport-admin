"use client";

import { motion } from "framer-motion";
import { useMotionPreferences } from "../use-motion-preferences";

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const classes = [
  { day: 0, time: "07:00", name: "CrossFit", slots: 12, total: 16, pct: 75 },
  { day: 1, time: "08:30", name: "Funcional", slots: 8, total: 12, pct: 67 },
  { day: 2, time: "07:00", name: "CrossFit", slots: 16, total: 16, pct: 100 },
  { day: 3, time: "18:00", name: "Yoga", slots: 6, total: 10, pct: 60 },
  { day: 4, time: "07:00", name: "CrossFit", slots: 14, total: 16, pct: 88 },
  { day: 5, time: "09:00", name: "Funcional", slots: 10, total: 12, pct: 83 },
];

export function ReservationsIllustration() {
  const { prefersReducedMotion } = useMotionPreferences();

  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[280px] flex-col gap-3 p-5 sm:p-6 lg:min-h-[360px]"
    >
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {days.map((day, i) => (
          <button
            key={day}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={`flex-1 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              i === 2
                ? "bg-primary text-primary-foreground"
                : "bg-surface-raised text-muted-foreground"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Class list */}
      <div className="flex flex-1 flex-col gap-2 overflow-hidden">
        {classes.map((cls, i) => (
          <motion.div
            key={`${cls.day}-${cls.time}`}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="flex items-center gap-3 rounded-xl border border-white/6 bg-card px-3 py-2.5"
          >
            {/* Time badge */}
            <div className="shrink-0 text-center">
              <p className="metric-number text-[10px] font-bold text-primary">
                {cls.time}
              </p>
            </div>

            {/* Name */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{cls.name}</p>
              {/* Capacity bar */}
              <div className="mt-1 flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-raised">
                  <motion.div
                    className={`h-full rounded-full ${
                      cls.pct >= 100
                        ? "bg-destructive"
                        : cls.pct >= 80
                          ? "bg-warning"
                          : "bg-success"
                    }`}
                    initial={prefersReducedMotion ? false : { width: "0%" }}
                    whileInView={
                      prefersReducedMotion ? undefined : { width: `${cls.pct}%` }
                    }
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 * i }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {cls.slots}/{cls.total}
                </span>
              </div>
            </div>

            {/* Status chip */}
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                cls.pct >= 100
                  ? "bg-destructive/12 text-destructive"
                  : cls.pct >= 80
                    ? "bg-warning/12 text-warning"
                    : "bg-success/12 text-success"
              }`}
            >
              {cls.pct >= 100 ? "Lleno" : cls.pct >= 80 ? "Casi lleno" : "Disponible"}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
