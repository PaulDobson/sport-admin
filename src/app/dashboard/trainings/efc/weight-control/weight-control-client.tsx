"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { AlertTriangle, Save, Scale } from "lucide-react";
import type { EfcWeightControl } from "@/domain/efc-training";
import { WT_WEIGHT_CATEGORIES } from "@/domain/efc-training";
import { saveWeightControlAction } from "./actions";

const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), {
  ssr: false,
});
const Line = dynamic(() => import("recharts").then((m) => m.Line), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});
const ReferenceLine = undefined; // removed — using Line instead
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);

interface Props {
  athleteId: string;
  records: EfcWeightControl[];
  metrics: {
    deltaPercent: number;
    diffFromCategoryKg: number;
    isWithinCategory: boolean;
    highRiskAlert: boolean;
  } | null;
}

// Flatten WT categories for the selector
const ALL_CATEGORIES = [
  ...WT_WEIGHT_CATEGORIES.male.map((c) => ({ ...c, gender: "M" })),
  ...WT_WEIGHT_CATEGORIES.female.map((c) => ({ ...c, gender: "F" })),
];

export function WeightControlClient({ athleteId, records, metrics }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [recordDate, setRecordDate] = useState(today);
  const [weightKg, setWeightKg] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES[0]);
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  if (!athleteId) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
        <Scale className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Selecciona un deportista desde el dashboard EFC.
        </p>
      </div>
    );
  }

  function handleSave() {
    if (!weightKg || !recordDate) return;
    const fd = new FormData();
    fd.set("athleteId", athleteId);
    fd.set("recordDate", recordDate);
    fd.set("weightKg", weightKg);
    fd.set("categoryName", category.name);
    fd.set("categoryLimitKg", String(category.limit));
    startTransition(async () => {
      const res = await saveWeightControlAction(fd);
      setSaveMsg(
        res.success
          ? { ok: true, text: "Peso registrado" }
          : { ok: false, text: res.error },
      );
      if (res.success) {
        setWeightKg("");
      }
      setTimeout(() => setSaveMsg(null), 3000);
    });
  }

  const chartData = [...records].reverse().map((r) => ({
    date: r.recordDate,
    peso: r.weightKg,
    limite: r.categoryLimitKg,
  }));

  return (
    <div className="space-y-6">
      {/* ── High risk alert ─────────────────────────────────────────────── */}
      {metrics?.highRiskAlert && (
        <div
          className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            ⚠️ <strong>Riesgo alto:</strong> descenso &gt;5% en menos de 7 días.
            Posible deshidratación severa y pérdida de potencia. Consulta con un
            profesional de salud.
          </span>
        </div>
      )}

      {/* ── Current metrics ──────────────────────────────────────────────── */}
      {metrics && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Variación vs. peso basal
            </p>
            <p
              className={`text-3xl font-bold tabular-nums ${metrics.deltaPercent < -5 ? "text-red-400" : metrics.deltaPercent < 0 ? "text-amber-400" : "text-green-400"}`}
            >
              {metrics.deltaPercent.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Diferencia vs. categoría
            </p>
            <p
              className={`text-3xl font-bold tabular-nums ${metrics.isWithinCategory ? "text-green-400" : "text-amber-400"}`}
            >
              {metrics.diffFromCategoryKg > 0 ? "+" : ""}
              {metrics.diffFromCategoryKg.toFixed(1)} kg
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics.isWithinCategory
                ? "✅ Dentro de categoría"
                : "⚠️ Sobre el límite"}
            </p>
          </div>
        </div>
      )}

      {/* ── Log form ─────────────────────────────────────────────────────── */}
      <section
        className="rounded-xl border border-border bg-card p-5"
        aria-label="Registrar peso"
      >
        <h2 className="mb-4 text-sm font-semibold">Registrar Peso Diario</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">Fecha</span>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              aria-label="Fecha del registro de peso"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">Peso (kg)</span>
            <input
              type="number"
              min={30}
              max={200}
              step={0.1}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ej: 73.5"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              aria-label="Peso en kilogramos"
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-muted-foreground">
              Categoría WT
            </span>
            <select
              value={category.name}
              onChange={(e) => {
                const c = ALL_CATEGORIES.find((a) => a.name === e.target.value);
                if (c) setCategory(c);
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              aria-label="Categoría oficial World Taekwondo"
            >
              <optgroup label="Masculino">
                {WT_WEIGHT_CATEGORIES.male.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} (límite {c.limit} kg)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Femenino">
                {WT_WEIGHT_CATEGORIES.female.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} (límite {c.limit} kg)
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!weightKg || !recordDate || isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Guardando…" : "Registrar peso"}
          </button>
          {saveMsg && (
            <span
              className={`text-sm font-medium ${saveMsg.ok ? "text-green-400" : "text-destructive"}`}
              role="status"
            >
              {saveMsg.text}
            </span>
          )}
        </div>
      </section>

      {/* ── Weight curve chart ───────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <section
          className="rounded-xl border border-border bg-card p-5"
          aria-label="Curva de descenso de peso"
        >
          <h2 className="mb-4 text-sm font-semibold">
            Curva de Descenso de Peso
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="peso"
                  name="Peso (kg)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="limite"
                  name="Límite categoría"
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="6 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── History table ────────────────────────────────────────────────── */}
      {records.length > 0 && (
        <section
          className="rounded-xl border border-border bg-card"
          aria-label="Historial de registros de peso"
        >
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">Historial</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {[
                    "Fecha",
                    "Peso (kg)",
                    "Categoría",
                    "Límite (kg)",
                    "Diferencia (kg)",
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-2 text-left font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-surface-raised/30"
                  >
                    <td className="px-3 py-2 tabular-nums">{r.recordDate}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">
                      {r.weightKg}
                    </td>
                    <td className="px-3 py-2">{r.categoryName}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {r.categoryLimitKg}
                    </td>
                    <td
                      className={`px-3 py-2 font-medium tabular-nums ${r.weightKg > r.categoryLimitKg ? "text-amber-400" : "text-green-400"}`}
                    >
                      {(r.weightKg - r.categoryLimitKg).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
