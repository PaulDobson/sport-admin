"use client";

import { useState, useTransition, useMemo } from "react";
import { Save, AlertTriangle } from "lucide-react";
import type { EfcAthleteProfile, EfcAthleteTest } from "@/domain/efc-training";
import {
  EFC_PERIOD_LABELS,
  IMC_CLASSIFICATION_LABELS,
  computePhysiologicalMetrics,
} from "@/domain/efc-training";
import { upsertEfcProfileAction, savePhysicalTestAction } from "./actions";

// ─── Props ─────────────────────────────────────────────────────────────────

interface Props {
  athleteId: string;
  profile: EfcAthleteProfile | null;
  student: { weightKg: number | null; heightCm: number | null; birthDate: string | null; gender: "male" | "female" | null };
  tests: EfcAthleteTest[];
}

// ─── Component ─────────────────────────────────────────────────────────────

export function EfcProfileForm({ athleteId, profile, student, tests }: Props) {
  const [fcRest, setFcRest] = useState(profile?.fcRest?.toString() ?? "");
  const [isSmoker, setIsSmoker] = useState(profile?.isSmoker ?? false);
  const [efcPeriod, setEfcPeriod] = useState<"E" | "F" | "C">(profile?.efcPeriod ?? "E");
  const [fcRestError, setFcRestError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Physical test fields
  const today = new Date().toISOString().slice(0, 10);
  const [testDate, setTestDate] = useState(today);
  const [testFields, setTestFields] = useState({ abs1min: "", seatAndReachCm: "", pullUps: "", pushUps1min: "", sprint10x5Sec: "", waistCm: "", enduranceMeters: "" });
  const [testPending, startTestTransition] = useTransition();
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ─── Live physiological metrics ───────────────────────────────────────
  const metrics = useMemo(() => computePhysiologicalMetrics({
    weightKg: student.weightKg,
    heightCm: student.heightCm,
    birthDate: student.birthDate,
    gender: student.gender,
    fcRest: fcRest ? Number(fcRest) : null,
    cooperDistanceMeters: tests[0]?.enduranceMeters ?? null,
  }), [student, fcRest, tests]);

  function validateFcRest(val: string) {
    const n = Number(val);
    if (val && (n < 20 || n > 220)) setFcRestError("FC Reposo debe estar entre 20 y 220 bpm");
    else setFcRestError("");
  }

  function handleSaveProfile() {
    if (fcRestError) return;
    const fd = new FormData();
    fd.set("athleteId", athleteId);
    fd.set("fcRest", fcRest);
    fd.set("isSmoker", String(isSmoker));
    fd.set("efcPeriod", efcPeriod);
    startTransition(async () => {
      const res = await upsertEfcProfileAction(fd);
      setSaveMsg(res.success ? { ok: true, text: "Perfil EFC guardado" } : { ok: false, text: res.error });
      setTimeout(() => setSaveMsg(null), 3000);
    });
  }

  function handleSaveTest() {
    const fd = new FormData();
    fd.set("athleteId", athleteId);
    fd.set("evaluationDate", testDate);
    Object.entries(testFields).forEach(([k, v]) => fd.set(k, v));
    startTestTransition(async () => {
      const res = await savePhysicalTestAction(fd);
      setTestMsg(res.success ? { ok: true, text: "Test guardado" } : { ok: false, text: res.error });
      if (res.success) setTestFields({ abs1min: "", seatAndReachCm: "", pullUps: "", pushUps1min: "", sprint10x5Sec: "", waistCm: "", enduranceMeters: "" });
      setTimeout(() => setTestMsg(null), 3000);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Profile section ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Datos fisiológicos EFC">
        <h3 className="mb-4 text-sm font-semibold">Datos fisiológicos</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">FC Reposo (bpm)</span>
            <input type="number" min={20} max={220} value={fcRest} onChange={(e) => { setFcRest(e.target.value); validateFcRest(e.target.value); }}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              aria-describedby={fcRestError ? "fc-rest-error" : undefined}
              aria-label="Frecuencia cardíaca en reposo" />
            {fcRestError && <span id="fc-rest-error" className="text-xs text-destructive" role="alert">{fcRestError}</span>}
          </label>

          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={isSmoker} onChange={(e) => setIsSmoker(e.target.checked)}
              className="h-4 w-4 rounded accent-primary" aria-label="Fumador" />
            <span className="font-medium text-muted-foreground">Fumador/a</span>
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-muted-foreground">Período EFC actual</span>
            <select value={efcPeriod} onChange={(e) => setEfcPeriod(e.target.value as "E" | "F" | "C")}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm" aria-label="Período EFC actual">
              {(["E", "F", "C"] as const).map((p) => (
                <option key={p} value={p}>{p} — {EFC_PERIOD_LABELS[p]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleSaveProfile} disabled={!!fcRestError || isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-primary">
            <Save className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Guardando…" : "Guardar perfil EFC"}
          </button>
          {saveMsg && <span className={`text-sm font-medium ${saveMsg.ok ? "text-green-400" : "text-destructive"}`} role="status">{saveMsg.text}</span>}
        </div>
      </section>

      {/* ── Computed biometrics ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Métricas fisiológicas calculadas">
        <h3 className="mb-4 text-sm font-semibold">Cálculos Fisiológicos Automáticos</h3>
        {!student.gender && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400" role="note">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            El género no está registrado. FCMax y TMB requieren género para calcularse.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "IMC", value: metrics.imc?.toFixed(1) ?? "—", detail: metrics.imcClassification ? IMC_CLASSIFICATION_LABELS[metrics.imcClassification] : "", formula: "IMC = Peso / (Talla m)²" },
            { label: "FC Máxima (Tanaka)", value: metrics.fcMax ? Math.round(metrics.fcMax) + " bpm" : "—", detail: "", formula: "FCMax = 208 − 0.7 × edad" },
            { label: "FC Reserva (Karvonen)", value: metrics.fcr ? Math.round(metrics.fcr) + " bpm" : "—", detail: "", formula: "FCR = FCMax − FC Reposo" },
            { label: "TMB (Mifflin-St Jeor)", value: metrics.tmb ? Math.round(metrics.tmb) + " kcal/día" : "—", detail: "", formula: "Hombres: 10P+6.25T−5E+5 / Mujeres: 10P+6.25T−5E−161" },
            { label: "VO₂máx (Cooper)", value: metrics.vo2max?.toFixed(1) ?? "—", detail: "mL·kg⁻¹·min⁻¹", formula: "VO2max = (distancia−504.9) / 44.73" },
          ].map(({ label, value, detail, formula }) => (
            <div key={label} className="rounded-lg border border-border bg-surface-raised/40 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold tabular-nums">{value} <span className="text-xs font-normal text-muted-foreground">{detail}</span></p>
              <p className="mt-1 text-[10px] text-muted-foreground/60 font-mono">{formula}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Physical tests form ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Registro de tests físicos">
        <h3 className="mb-4 text-sm font-semibold">Registrar Tests Físicos</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5 text-sm sm:col-span-2 lg:col-span-4">
            <span className="font-medium text-muted-foreground">Fecha de evaluación</span>
            <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="h-10 w-48 rounded-lg border border-input bg-background px-3 text-sm" aria-label="Fecha de evaluación" />
          </label>
          {[
            { key: "abs1min", label: "Abdominales 1 min", placeholder: "reps", min: "0", max: "300", step: "1" },
            { key: "seatAndReachCm", label: "Seat and Reach (cm)", placeholder: "cm", min: "-30", max: "50", step: "0.1" },
            { key: "pullUps", label: "Dominadas", placeholder: "reps", min: "0", max: "100", step: "1" },
            { key: "pushUps1min", label: "Flexo-ext. brazos 1 min", placeholder: "reps", min: "0", max: "300", step: "1" },
            { key: "sprint10x5Sec", label: "10×5 m (seg)", placeholder: "seg", min: "0.1", max: "120", step: "0.1" },
            { key: "waistCm", label: "Perímetro cintura (cm)", placeholder: "cm", min: "40", max: "200", step: "0.1" },
            { key: "enduranceMeters", label: "Resistencia Cooper (m)", placeholder: "metros", min: "100", max: "10000", step: "1" },
          ].map(({ key, label, placeholder, min, max, step }) => (
            <label key={key} className="grid gap-1.5 text-sm">
              <span className="font-medium text-muted-foreground">{label}</span>
              <input type="number" min={min} max={max} step={step} placeholder={placeholder}
                value={testFields[key as keyof typeof testFields]}
                onChange={(e) => setTestFields((f) => ({ ...f, [key]: e.target.value }))}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                aria-label={label} />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleSaveTest} disabled={!testDate || testPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-primary">
            <Save className="h-4 w-4" aria-hidden="true" />
            {testPending ? "Guardando…" : "Guardar tests"}
          </button>
          {testMsg && <span className={`text-sm font-medium ${testMsg.ok ? "text-green-400" : "text-destructive"}`} role="status">{testMsg.text}</span>}
        </div>
      </section>

      {/* ── Tests history ────────────────────────────────────────────────── */}
      {tests.length > 0 && (
        <section className="rounded-xl border border-border bg-card" aria-label="Historial de tests físicos">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold">Historial de Evaluaciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs" role="table">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {["Fecha", "Abs 1min", "Seat&Reach", "Dominadas", "Flex-ext", "10×5m", "Cintura", "Cooper (m)"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-surface-raised/30">
                    <td className="px-3 py-2 font-medium tabular-nums">{t.evaluationDate}</td>
                    <td className="px-3 py-2 tabular-nums">{t.abs1min ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{t.seatAndReachCm ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{t.pullUps ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{t.pushUps1min ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{t.sprint10x5Sec ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{t.waistCm ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{t.enduranceMeters ?? "—"}</td>
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
