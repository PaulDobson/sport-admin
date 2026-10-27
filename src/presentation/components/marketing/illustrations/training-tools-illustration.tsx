"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { useMotionPreferences } from "../use-motion-preferences";

function DigitalClock({ seconds }: { seconds: number }) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return (
    <span className="metric-number text-3xl font-bold tracking-widest text-foreground sm:text-4xl">
      {mins}:{secs}
    </span>
  );
}

export function TrainingToolsIllustration() {
  const { prefersReducedMotion } = useMotionPreferences();
  const [elapsed, setElapsed] = useState(0);
  const [running] = useState(true);
  const lastTime = useRef<number | null>(null);
  const accum = useRef(0);

  useAnimationFrame((t) => {
    if (!running || prefersReducedMotion) return;
    if (lastTime.current === null) {
      lastTime.current = t;
      return;
    }
    accum.current += t - lastTime.current;
    lastTime.current = t;
    if (accum.current >= 1000) {
      accum.current -= 1000;
      setElapsed((e) => (e + 1) % 180);
    }
  });

  const roundTotal = 180;
  const progress = (elapsed % roundTotal) / roundTotal;
  const circumference = 2 * Math.PI * 48;
  const dashOffset = circumference * (1 - progress);
  const round = Math.floor(elapsed / roundTotal) + 1;

  const stimuli = [
    { color: "bg-destructive", label: "Rojo — ¡STOP!" },
    { color: "bg-success", label: "Verde — Avanza" },
    { color: "bg-warning", label: "Amarillo — Prepara" },
    { color: "bg-info", label: "Azul — Izquierda" },
  ];

  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-[280px] flex-col gap-3 p-5 sm:p-6 lg:min-h-[360px]"
    >
      {/* Timer circle */}
      <div className="flex items-center justify-center gap-6 rounded-xl border border-warning/20 bg-warning/6 px-4 py-5">
        <div className="relative">
          <svg width="116" height="116" viewBox="0 0 116 116">
            {/* Track */}
            <circle
              cx="58"
              cy="58"
              r="48"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="6"
            />
            {/* Progress */}
            {prefersReducedMotion ? (
              <circle
                cx="58"
                cy="58"
                r="48"
                fill="none"
                stroke="var(--color-warning)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * 0.3}
                transform="rotate(-90 58 58)"
              />
            ) : (
              <motion.circle
                cx="58"
                cy="58"
                r="48"
                fill="none"
                stroke="var(--color-warning)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 58 58)"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <DigitalClock seconds={prefersReducedMotion ? 112 : elapsed % roundTotal} />
            <p className="text-[9px] text-muted-foreground">Round {round}</p>
          </div>
        </div>

        {/* Round info */}
        <div className="flex flex-col gap-2">
          <div className="rounded-lg bg-surface-raised px-3 py-2">
            <p className="text-[9px] text-muted-foreground">Trabajo</p>
            <p className="metric-number text-sm font-bold text-warning">3:00</p>
          </div>
          <div className="rounded-lg bg-surface-raised px-3 py-2">
            <p className="text-[9px] text-muted-foreground">Descanso</p>
            <p className="metric-number text-sm font-bold text-info">1:00</p>
          </div>
          <div className="rounded-lg bg-surface-raised px-3 py-2">
            <p className="text-[9px] text-muted-foreground">Rounds</p>
            <p className="metric-number text-sm font-bold text-foreground">
              {round} / 6
            </p>
          </div>
        </div>
      </div>

      {/* Cognitive stimuli */}
      <div className="flex-1 overflow-hidden rounded-xl border border-white/6 bg-card px-4 py-3">
        <p className="mb-2.5 text-[10px] font-semibold text-muted-foreground">
          Estímulos cognitivos
        </p>
        <div className="grid grid-cols-2 gap-2">
          {stimuli.map((s, i) => (
            <motion.div
              key={s.label}
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      opacity:
                        !prefersReducedMotion && elapsed % 4 === i ? 1 : 0.5,
                    }
              }
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-2 rounded-lg border border-white/5 bg-surface-raised p-2 transition-opacity`}
            >
              <span
                className={`h-3 w-3 shrink-0 rounded-sm ${s.color} opacity-80`}
              />
              <span className="text-[9px] text-muted-foreground">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
