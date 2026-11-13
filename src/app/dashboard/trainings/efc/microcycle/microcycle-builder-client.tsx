"use client";

import { useReducer, useState, useTransition, useMemo } from "react";
import { AlertTriangle, ChevronDown, Save } from "lucide-react";
import type { EfcMacrocycle, EfcMicrocycle } from "@/domain/efc-training";
import {
  LOAD_CATEGORIES,
  INTENSITY_LABELS,
  MICROCYCLE_TYPE_LABELS,
  computeSrpe,
  computeFosterWeeklyMetrics,
} from "@/domain/efc-training";
import { saveMicrocycleAction, saveSrpeAction } from "./actions";

// ─── Types ─────────────────────────────────────────────────────────────────

type DayKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type CellKey = `${string}__${string}__${DayKey}`;

interface CellData { minutes: number; notes: string }
interface LoadState { [key: CellKey]: CellData }

interface SrpeEntry { rpe: string; duration: string }
type SrpeState = Record<DayKey, SrpeEntry>;

type LoadAction =
  | { type: "SET_MIN"; key: CellKey; minutes: number }
  | { type: "SET_NOTE"; key: CellKey; notes: string }
  | { type: "RESET" };

function loadReducer(state: LoadState, action: LoadAction): LoadState {
  switch (action.type) {
    case "SET_MIN": return { ...state, [action.key]: { ...state[action.key], minutes: action.minutes, notes: state[action.key]?.notes ?? "" } };
    case "SET_NOTE": return { ...state, [action.key]: { ...state[action.key], minutes: state[action.key]?.minutes ?? 0, notes: action.notes } };
    case "RESET": return {};
    default: return state;
  }
}

const DAYS: { key: DayKey; label: string }[] = [
  { key: 1, label: "Lun" }, { key: 2, label: "Mar" }, { key: 3, label: "Mié" },
  { key: 4, label: "Jue" }, { key: 5, label: "Vie" }, { key: 6, label: "Sáb" }, { key: 7, label: "Dom" },
];

function cellKey(cat: string, sub: string, day: DayKey): CellKey {
  return `${cat}__${sub}__${day}` as CellKey;
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
  macrocycle: EfcMacrocycle;
  existingMicrocycles: EfcMicrocycle[];
  athleteId: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function MicrocycleBuilderClient({ macrocycle, existingMicrocycles, athleteId }: Props) {
  const [loads, dispatch] = useReducer(loadReducer, {} as LoadState);
  const [weekNumber, setWeekNumber] = useState(1);
  const [microcycleType, setMicrocycleType] = useState<EfcMicrocycle["microcycleType"]>("C");
  const [intensityTarget, setIntensityTarget] = useState<EfcMicrocycle["intensityTarget"]>(3);
  const [objective, setObjective] = useState("");
  const [srpe, setSrpe] = useState<SrpeState>({ 1: { rpe: "", duration: "" }, 2: { rpe: "", duration: "" }, 3: { rpe: "", duration: "" }, 4: { rpe: "", duration: "" }, 5: { rpe: "", duration: "" }, 6: { rpe: "", duration: "" }, 7: { rpe: "", duration: "" } });
  const [expandedNoteKey, setExpandedNoteKey] = useState<CellKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingSrpeDay, setSavingSrpeDay] = useState<DayKey | null>(null);

  const dailyLimit = macrocycle.hoursPerSession * 60 * 1.2;

  // --- Totals ---
  const totals = useMemo(() => {
    const perDay: Record<DayKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const perCat: Record<string, number> = {};
    let grand = 0;
    for (const [key, cell] of Object.entries(loads)) {
      const [cat, , dayStr] = key.split("__");
      const day = Number(dayStr) as DayKey;
      perDay[day] += cell.minutes;
      perCat[cat] = (perCat[cat] ?? 0) + cell.minutes;
      grand += cell.minutes;
    }
    return { perDay, perCat, grand };
  }, [loads]);

  // --- sRPE ---
  const srpeValues = useMemo(() => {
    return DAYS.map(({ key }) => {
      const e = srpe[key];
      const r = Number(e.rpe);
      const d = Number(e.duration);
      if (r >= 1 && r <= 10 && d >= 1 && d <= 480) return computeSrpe(r, d);
      return null;
    });
  }, [srpe]);

  const fosterMetrics = useMemo(() => {
    const values = srpeValues.map((v) => v ?? 0);
    if (values.every((v) => v === 0)) return null;
    return computeFosterWeeklyMetrics(values);
  }, [srpeValues]);

  // --- Duplicate check ---
  const isDuplicate = existingMicrocycles.some((m) => m.weekNumber === weekNumber);

  // --- Build loads payload ---
  function buildLoads() {
    return Object.entries(loads)
      .filter(([, v]) => v.minutes > 0)
      .map(([key, v]) => {
        const parts = key.split("__");
        const cat = parts[0];
        const sub = parts[1];
        const day = Number(parts[2]);
        const catLabel = LOAD_CATEGORIES[cat as keyof typeof LOAD_CATEGORIES]?.label ?? cat;
        return { dayOfWeek: day, category: catLabel, subcategory: sub, minutes: v.minutes, notes: v.notes || null, tenantId: macrocycle.tenantId };
      });
  }

  // --- Save microcycle ---
  function handleSave() {
    if (isDuplicate || objective.length > 500) return;
    const fd = new FormData();
    fd.set("macrocycleId", macrocycle.id);
    fd.set("weekNumber", String(weekNumber));
    fd.set("microcycleType", microcycleType);
    fd.set("intensityTarget", String(intensityTarget));
    fd.set("objective", objective);
    fd.set("loads", JSON.stringify(buildLoads()));
    startTransition(async () => {
      const res = await saveMicrocycleAction(fd);
      setSaveMsg(res.success ? { ok: true, text: "Microciclo guardado" } : { ok: false, text: res.error });
    });
  }

  // --- Save sRPE for one day ---
  async function handleSaveSrpe(microcycleId: string, day: DayKey) {
    const e = srpe[day];
    const r = Number(e.rpe); const d = Number(e.duration);
    if (!(r >= 1 && r <= 10 && d >= 1)) return;
    setSavingSrpeDay(day);
    const fd = new FormData();
    fd.set("microcycleId", microcycleId);
    fd.set("athleteId", athleteId);
    fd.set("dayOfWeek", String(day));
    fd.set("rpe", String(r));
    fd.set("durationMinutes", String(d));
    await saveSrpeAction(fd);
    setSavingSrpeDay(null);
  }

  return (
    <div className="space-y-6">
      {/* ── Metadata ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Configuración del microciclo</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">Semana N°</span>
            <input type="number" min={1} max={52} value={weekNumber} onChange={(e) => setWeekNumber(Number(e.target.value))} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" aria-label="Número de semana" />
            {isDuplicate && <span className="text-xs text-destructive" role="alert">Ya existe un microciclo para la semana {weekNumber}</span>}
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">Tipo</span>
            <select value={microcycleType} onChange={(e) => setMicrocycleType(e.target.value as EfcMicrocycle["microcycleType"])} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" aria-label="Tipo de microciclo">
              {Object.entries(MICROCYCLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">Intensidad objetivo</span>
            <select value={intensityTarget} onChange={(e) => setIntensityTarget(Number(e.target.value) as EfcMicrocycle["intensityTarget"])} className="h-10 rounded-lg border border-input bg-background px-3 text-sm" aria-label="Intensidad objetivo">
              {Object.entries(INTENSITY_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">Objetivo</span>
            <input type="text" maxLength={500} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ej: Adaptación anatómica" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" aria-label="Objetivo del microciclo" />
          </label>
        </div>
      </section>

      {/* ── Load grid ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card" aria-label="Distribución de cargas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Actividad</th>
                {DAYS.map(({ key, label }) => (
                  <th key={key} scope="col" className="px-2 py-2 text-center text-xs font-semibold">
                    {label}
                    {totals.perDay[key] > dailyLimit && (
                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-400" title="Sobrecarga" aria-label="Advertencia de sobrecarga">!</span>
                    )}
                  </th>
                ))}
                <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(LOAD_CATEGORIES).map(([catKey, { label, subcategories }]) => (
                <>
                  {/* Category header */}
                  <tr key={`cat-${catKey}`} className="bg-surface-raised/50">
                    <td colSpan={9} className="sticky left-0 z-10 bg-surface-raised/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</td>
                  </tr>
                  {/* Subcategory rows */}
                  {subcategories.map((sub) => {
                    const rowTotal = DAYS.reduce((sum, { key }) => sum + (loads[cellKey(catKey, sub, key)]?.minutes ?? 0), 0);
                    return (
                      <tr key={`${catKey}-${sub}`} className="border-b border-border/50 hover:bg-surface-raised/30">
                        <td className="sticky left-0 z-10 bg-card px-3 py-1 text-xs">{sub}</td>
                        {DAYS.map(({ key }) => {
                          const ck = cellKey(catKey, sub, key);
                          const val = loads[ck]?.minutes ?? 0;
                          return (
                            <td key={key} className="px-1 py-0.5">
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number" min={0} max={480} value={val || ""}
                                  onChange={(e) => dispatch({ type: "SET_MIN", key: ck, minutes: Math.max(0, Math.min(480, Number(e.target.value) || 0)) })}
                                  className="h-7 w-14 rounded border border-input bg-background px-1.5 text-center text-xs"
                                  aria-label={`${sub} ${DAYS.find(d => d.key === key)?.label} minutos`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setExpandedNoteKey(expandedNoteKey === ck ? null : ck)}
                                  className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                                  aria-label={`Nota para ${sub} ${DAYS.find(d => d.key === key)?.label}`}
                                  aria-expanded={expandedNoteKey === ck}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                              {expandedNoteKey === ck && (
                                <textarea
                                  maxLength={500} rows={2}
                                  value={loads[ck]?.notes ?? ""}
                                  onChange={(e) => dispatch({ type: "SET_NOTE", key: ck, notes: e.target.value })}
                                  placeholder="Nota…"
                                  className="mt-1 w-full rounded border border-input bg-background p-1 text-xs"
                                  aria-label={`Nota ${sub} ${DAYS.find(d => d.key === key)?.label}`}
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 text-right text-xs font-medium tabular-nums">{rowTotal}</td>
                      </tr>
                    );
                  })}
                  {/* Category total */}
                  <tr key={`total-${catKey}`} className="bg-surface-raised/30">
                    <td className="sticky left-0 z-10 bg-surface-raised/30 px-3 py-1 text-xs font-semibold text-muted-foreground">Subtotal {label}</td>
                    {DAYS.map(({ key }) => (
                      <td key={key} className="px-2 py-1 text-center text-xs font-medium tabular-nums text-muted-foreground">
                        {Object.entries(loads).filter(([k]) => k.startsWith(`${catKey}__`) && k.endsWith(`__${key}`)).reduce((s, [, v]) => s + v.minutes, 0) || "—"}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right text-xs font-semibold tabular-nums">{totals.perCat[catKey] ?? 0}</td>
                  </tr>
                </>
              ))}
              {/* Grand total */}
              <tr className="border-t-2 border-border bg-card">
                <td className="sticky left-0 z-10 bg-card px-3 py-2 text-xs font-bold">TOTAL SEMANAL</td>
                {DAYS.map(({ key }) => (
                  <td key={key} className={`px-2 py-2 text-center text-xs font-bold tabular-nums ${totals.perDay[key] > dailyLimit ? "text-amber-400" : ""}`}>{totals.perDay[key] || "—"}</td>
                ))}
                <td className="px-2 py-2 text-right text-xs font-bold tabular-nums">{totals.grand}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Overload note */}
        {DAYS.some(({ key }) => totals.perDay[key] > dailyLimit) && (
          <div className="flex items-center gap-2 border-t border-border px-4 py-2 text-xs text-amber-400" role="alert">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Algunos días superan el límite de sesión ({Math.round(dailyLimit)} min). Ajusta la distribución.</span>
          </div>
        )}
      </section>

      {/* ── Save microcycle ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button" onClick={handleSave} disabled={isDuplicate || isPending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Guardando…" : "Guardar microciclo"}
        </button>
        {saveMsg && (
          <span className={`text-sm font-medium ${saveMsg.ok ? "text-green-400" : "text-destructive"}`} role="status">
            {saveMsg.text}
          </span>
        )}
      </div>

      {/* ── Post-session sRPE ─────────────────────────────────────────────── */}
      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary" aria-label="Registro post-sesión">
          Registro Post-Sesión (sRPE)
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" aria-hidden="true" />
        </summary>
        <div className="border-t border-border p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Registra el RPE y la duración real de cada sesión. El sRPE (carga interna) se calcula como RPE × duración.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DAYS.map(({ key, label }, i) => {
              const e = srpe[key];
              const computed = srpeValues[i];
              return (
                <div key={key} className="rounded-lg border border-border bg-surface-raised/30 p-3">
                  <p className="mb-2 text-xs font-semibold">{label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-xs">
                      <span className="text-muted-foreground">RPE (1–10)</span>
                      <input type="number" min={1} max={10} value={e.rpe} onChange={(ev) => setSrpe((s) => ({ ...s, [key]: { ...s[key], rpe: ev.target.value } }))} className="h-8 rounded border border-input bg-background px-2 text-xs" aria-label={`RPE ${label}`} />
                    </label>
                    <label className="grid gap-1 text-xs">
                      <span className="text-muted-foreground">Duración (min)</span>
                      <input type="number" min={1} max={480} value={e.duration} onChange={(ev) => setSrpe((s) => ({ ...s, [key]: { ...s[key], duration: ev.target.value } }))} className="h-8 rounded border border-input bg-background px-2 text-xs" aria-label={`Duración ${label}`} />
                    </label>
                  </div>
                  {computed !== null && (
                    <p className="mt-2 text-xs font-medium text-amber-400">sRPE: {computed} UA</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Foster metrics */}
          {fosterMetrics && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Métricas de Carga Semanal</h3>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  { label: "Carga semanal", value: fosterMetrics.weeklyLoad + " UA" },
                  { label: "Media diaria", value: fosterMetrics.dailyMean.toFixed(1) + " UA" },
                  { label: "Monotonía Foster", value: fosterMetrics.monotony?.toFixed(2) ?? "N/A" },
                  { label: "Strain", value: fosterMetrics.strain?.toFixed(0) ?? "N/A" },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              {fosterMetrics.highMonotonyWarning && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Alta Monotonía (&gt;2.0): Riesgo de estancamiento o fatiga. Varía la intensidad diaria.
                </div>
              )}
              {fosterMetrics.dailySD === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">Variabilidad nula — todos los días tienen la misma carga.</p>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
