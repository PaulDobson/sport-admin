"use client";

import { useState } from "react";
import { Timer, Repeat2, TrendingUp } from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { SeriesTimer } from "./series-timer";
import { PyramidTimer } from "./pyramid-timer";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode = "countdown" | "series" | "pyramid";

// ─── Tab configuration ────────────────────────────────────────────────────────

const MODES: ReadonlyArray<{
  id: TimerMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Timer;
  accent: string;
  activeTab: string;
  activeBg: string;
  activeBorder: string;
}> = [
  {
    id: "countdown",
    label: "Cuenta Regresiva",
    shortLabel: "Regresiva",
    description: "Fija un tiempo y cuenta hacia cero",
    icon: Timer,
    accent: "text-primary",
    activeTab: "text-primary",
    activeBg: "bg-primary/10",
    activeBorder: "border-primary/40",
  },
  {
    id: "series",
    label: "Series",
    shortLabel: "Series",
    description: "Alterna fases de trabajo y descanso",
    icon: Repeat2,
    accent: "text-warning",
    activeTab: "text-warning",
    activeBg: "bg-warning/10",
    activeBorder: "border-warning/40",
  },
  {
    id: "pyramid",
    label: "Piramidal",
    shortLabel: "Piramidal",
    description: "Incrementos y decrementos progresivos",
    icon: TrendingUp,
    accent: "text-info",
    activeTab: "text-info",
    activeBg: "bg-info/10",
    activeBorder: "border-info/40",
  },
];

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: TimerMode;
  onChange: (mode: TimerMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de temporizador"
      className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-border bg-surface-raised/50 p-1"
    >
      {MODES.map((mode) => {
        const isActive = active === mode.id;
        const Icon = mode.icon;
        return (
          <button
            key={mode.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`timer-panel-${mode.id}`}
            id={`timer-tab-${mode.id}`}
            onClick={() => onChange(mode.id)}
            className={`group flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:py-3 ${
              isActive
                ? `${mode.activeBg} ${mode.activeBorder} ${mode.activeTab} shadow-sm`
                : "border-transparent text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
            }`}
          >
            <Icon
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 transition-colors ${isActive ? mode.accent : ""}`}
            />
            <span className="text-xs font-semibold leading-none sm:text-sm">
              {/* Show short label on mobile, full on sm+ */}
              <span className="sm:hidden">{mode.shortLabel}</span>
              <span className="hidden sm:inline">{mode.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Active mode description ──────────────────────────────────────────────────

function ModeDescription({ mode }: { mode: (typeof MODES)[number] }) {
  return (
    <p className="text-center text-xs text-muted-foreground sm:text-sm">
      {mode.description}
    </p>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function TimersPanel() {
  const [activeMode, setActiveMode] = useState<TimerMode>("countdown");

  const currentMode = MODES.find((m) => m.id === activeMode)!;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Tab selector */}
      <TabBar active={activeMode} onChange={setActiveMode} />

      {/* Description */}
      <ModeDescription mode={currentMode} />

      {/* Timer panel — using hidden visibility instead of conditional render so
          timers maintain their state when the user switches tabs (e.g. pauses a
          countdown, checks the series config, then comes back). Each panel keeps
          its own state alive without re-mounting. */}
      <div className="min-h-112">
        {MODES.map((mode) => (
          <div
            key={mode.id}
            role="tabpanel"
            id={`timer-panel-${mode.id}`}
            aria-labelledby={`timer-tab-${mode.id}`}
            hidden={activeMode !== mode.id}
          >
            {mode.id === "countdown" && <CountdownTimer />}
            {mode.id === "series" && <SeriesTimer />}
            {mode.id === "pyramid" && <PyramidTimer />}
          </div>
        ))}
      </div>
    </div>
  );
}
