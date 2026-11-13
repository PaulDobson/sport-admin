"use client";

import dynamic from "next/dynamic";
import { BarChart2 } from "lucide-react";
import type { EfcMacrocycle, EfcMicrocycle, SessionLoad } from "@/domain/efc-training";
import { MICROCYCLE_TYPE_LABELS, EFC_PERIOD_LABELS } from "@/domain/efc-training";

// Lazy-load Recharts (SSR off)
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

interface MicrocycleLoad {
  microcycle: EfcMicrocycle;
  loads: SessionLoad[];
}

interface Props {
  macrocycle: EfcMacrocycle | null;
  microcycleLoads: MicrocycleLoad[];
}

const TYPE_COLORS: Record<string, string> = {
  AJ: "#6366f1", C: "#f59e0b", I: "#ef4444",
  AC: "#10b981", CO: "#3b82f6", R: "#8b5cf6",
};

const PERIOD_COLORS = { E: "#3b82f6", F: "#10b981", C: "#f59e0b" } as const;

export function LoadChartsClient({ macrocycle, microcycleLoads }: Props) {
  if (!macrocycle) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
        <BarChart2 className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold">Sin macrociclo activo</p>
        <p className="text-sm text-muted-foreground">Selecciona un deportista con macrociclo activo para ver los gráficos.</p>
      </div>
    );
  }

  if (microcycleLoads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
        <BarChart2 className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold">Sin microciclos registrados</p>
        <p className="text-sm text-muted-foreground">Los gráficos se generarán al registrar el primer microciclo en el constructor.</p>
      </div>
    );
  }

  // ── Build chart data ────────────────────────────────────────────────
  const volumeData = microcycleLoads.map(({ microcycle: mc, loads }) => ({
    week: `S${mc.weekNumber}`,
    minutes: loads.reduce((s, l) => s + l.minutes, 0),
    type: mc.microcycleType,
    color: TYPE_COLORS[mc.microcycleType] ?? "#94a3b8",
  }));

  const intensityData = microcycleLoads.map(({ microcycle: mc }) => ({
    week: `S${mc.weekNumber}`,
    intensidad: mc.intensityTarget,
  }));

  // EFC distribution real vs planned
  const totalE = macrocycle.ePercentage / 100;
  const totalF = macrocycle.fPercentage / 100;
  const totalC = macrocycle.cPercentage / 100;
  const totalMinutes = microcycleLoads.reduce((s, { loads }) => s + loads.reduce((ls, l) => ls + l.minutes, 0), 0);
  // Simplified: assume E=first 50%, F=middle 30%, C=last 20% by week position
  const nWeeks = microcycleLoads.length;
  const eWeeks = Math.round(nWeeks * totalE);
  const fWeeks = Math.round(nWeeks * totalF);
  const eMinReal = microcycleLoads.slice(0, eWeeks).reduce((s, { loads }) => s + loads.reduce((ls, l) => ls + l.minutes, 0), 0);
  const fMinReal = microcycleLoads.slice(eWeeks, eWeeks + fWeeks).reduce((s, { loads }) => s + loads.reduce((ls, l) => ls + l.minutes, 0), 0);
  const cMinReal = microcycleLoads.slice(eWeeks + fWeeks).reduce((s, { loads }) => s + loads.reduce((ls, l) => ls + l.minutes, 0), 0);

  const distData = [
    { period: "E — " + EFC_PERIOD_LABELS.E, real: totalMinutes ? Math.round((eMinReal / totalMinutes) * 100) : 0, planned: macrocycle.ePercentage },
    { period: "F — " + EFC_PERIOD_LABELS.F, real: totalMinutes ? Math.round((fMinReal / totalMinutes) * 100) : 0, planned: macrocycle.fPercentage },
    { period: "C — " + EFC_PERIOD_LABELS.C, real: totalMinutes ? Math.round((cMinReal / totalMinutes) * 100) : 0, planned: macrocycle.cPercentage },
  ];

  return (
    <div className="space-y-6">
      {/* ── Chart 1: Volume per week ──────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Volumen de carga semanal">
        <h2 className="mb-4 text-sm font-semibold">Volumen de Carga Semanal (minutos)</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
              <Bar dataKey="minutes" name="Minutos" radius={[4, 4, 0, 0]}
                fill="#f59e0b"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Leyenda por tipo de microciclo">
          {Object.entries(TYPE_COLORS).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} aria-hidden="true" />
              {k} — {MICROCYCLE_TYPE_LABELS[k as keyof typeof MICROCYCLE_TYPE_LABELS]}
            </span>
          ))}
        </div>
      </section>

      {/* ── Chart 2: EFC distribution real vs planned ─────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Distribución EFC real vs planificada">
        <h2 className="mb-4 text-sm font-semibold">Distribución EFC — Real vs. Planificado (%)</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="planned" name="Planificado %" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="real" name="Real %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ⚠️ Distribución estimada por posición cronológica de semanas. Para mayor precisión, asigna períodos explícitamente en el macrociclo.
        </p>
      </section>

      {/* ── Chart 3: Daily intensity line ─────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Intensidad objetivo por semana">
        <h2 className="mb-4 text-sm font-semibold">Intensidad Objetivo por Semana (escala 0–9)</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={intensityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 9]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }} />
              <Line type="monotone" dataKey="intensidad" name="Intensidad" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
