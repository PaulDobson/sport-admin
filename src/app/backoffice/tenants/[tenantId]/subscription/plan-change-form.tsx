"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { ArrowLeftRight, Check, Eye, Save } from "lucide-react";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import { formatMoney } from "@/lib/format-money";
import { formatSaasFeature } from "@/lib/format-saas-feature";
import { Button, FieldControl, Surface } from "@/presentation/components/primitives";
import { cancelPlanChangeAction, planChangeAction, type PlanChangeFormState } from "./actions";

const initial: PlanChangeFormState = { error: null, preview: null, result: null, stale: false };
const kindLabels = { upgrade: "Upgrade inmediato", downgrade: "Downgrade a renovación", equivalent: "Cambio equivalente a renovación" };

export function PlanChangeForm({ tenantId, currentVersionId, plans, operationId }: {
  tenantId: string; currentVersionId: string | null; plans: SaasCatalogPlan[]; operationId: string;
}) {
  const [state, action, pending] = useActionState(planChangeAction, initial);
  const [planVersionId, setVersion] = useState("");
  const [reason, setReason] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [edited, setEdited] = useState(false);
  const [identity, setIdentity] = useState(operationId);
  const ref = useRef<HTMLFormElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const preview = !edited && state.preview?.planVersionId === planVersionId ? state.preview : null;
  const options = plans.filter((p) => p.currentVersion.id !== currentVersionId);
  useEffect(() => {
    if (state.error) ref.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
    else if (state.preview) previewHeading.current?.focus();
  }, [state]);
  const changeIdentity = () => setIdentity(crypto.randomUUID());
  if (state.result) return <Surface className="grid gap-3">
    <h2 className="flex items-center gap-2 font-bold"><Check aria-hidden className="h-4 w-4 shrink-0" />Cambio registrado</h2>
    <p role="status" className="text-sm">{state.result.kind === "upgrade"
      ? `Upgrade aplicado. ${state.result.amountDue > 0 ? `Cobro proporcional pendiente: ${formatMoney(state.result.amountDue, "CLP")}.` : "El redondeo de la diferencia es cero: no se creó un cobro ficticio."} La fecha de renovación no cambió.`
      : `Cambio programado para ${state.result.effectiveOn}. Se conserva el plan vigente hasta su renovación y se revalidará el uso antes de aplicar.`} No se registró un pago ni un reembolso.</p>
    <Link href={`/backoffice/tenants/${tenantId}/subscription`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold">Revisar contrato actualizado</Link>
  </Surface>;
  return <Surface>
    <h2 className="flex items-center gap-2 text-lg font-bold"><ArrowLeftRight aria-hidden className="h-4 w-4 shrink-0" />Cambiar plan</h2>
    <p className="mt-1 text-sm text-muted-foreground">La comparación usa tarifas diarias exactas. Un upgrade se activa al confirmar y deja la diferencia pendiente; un downgrade o cambio equivalente se programa a la renovación.</p>
    {options.length === 0 ? <p role="status" className="mt-4 text-sm text-muted-foreground">No hay otra versión activa en CLP disponible. Publica una oferta en <Link href="/backoffice/plans" className="text-primary underline">Planes</Link>.</p> : <form ref={ref} aria-label="Cambio contractual de plan" aria-busy={pending} className="mt-4 grid gap-4" onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const data = new FormData(event.currentTarget);
      if (!preview) setEdited(false);
      startTransition(() => action(data));
    }}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="operationId" value={identity} />
      <input type="hidden" name="fingerprint" value={preview?.fingerprint ?? ""} />
      <input type="hidden" name="intent" value={preview ? "confirm" : "preview"} />
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        <label htmlFor={`${id}-plan`} className="text-xs font-semibold">Nuevo plan y versión</label>
        <select id={`${id}-plan`} name="planVersionId" required value={planVersionId} onChange={(e) => {
          setVersion(e.target.value); setEdited(true); setAccepted(false); changeIdentity();
        }} className="h-11 w-full min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm">
          <option value="">Selecciona una versión</option>
          {options.map((p) => <option key={p.id} value={p.currentVersion.id}>{p.currentVersion.name} · v{p.currentVersion.versionNumber} · {formatMoney(p.currentVersion.price, "CLP")}</option>)}
        </select>
        {preview ? <section aria-labelledby={`${id}-preview`} className="grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 id={`${id}-preview`} ref={previewHeading} tabIndex={-1} className="font-bold outline-none">{kindLabels[preview.kind]}</h3>
          <p className="break-words text-sm">{preview.currentPlanName ?? "Contrato vigente"} → {preview.planName} · v{preview.versionNumber}</p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Aplicación</dt><dd>{preview.effectiveOn}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Renovación actual (sin cambio)</dt><dd>{preview.periodEndExclusive}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Días restantes</dt><dd>{preview.remainingDays}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Cobro proporcional pendiente</dt><dd className="text-xl font-bold">{formatMoney(preview.amountDue, "CLP")}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Precio desde la siguiente renovación</dt><dd>{formatMoney(preview.price, "CLP")} por {preview.durationCount} {preview.durationUnit === "days" ? "día(s)" : "mes(es)"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Alumnos activos / nuevo cupo</dt><dd>{preview.activeStudents} / {preview.maxStudents}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Usuarios activos / nuevo cupo</dt><dd>{preview.activeUsers} / {preview.maxUsers}</dd></div>
          </dl>
          {preview.kind === "upgrade" ? <p className="text-xs text-muted-foreground">Tarifas diarias: {preview.currentRateNumerator}/{preview.currentRateDenominator} → {preview.newRateNumerator}/{preview.newRateDenominator} CLP. Diferencia positiva × {preview.remainingDays} días; redondeo único al peso.</p>
            : <p className="text-xs text-muted-foreground">No se cobra ni reembolsa una diferencia ahora. El uso se revalida al renovar; si excede el nuevo cupo, el cambio queda bloqueado sin borrar recursos.</p>}
          <p className="text-xs text-muted-foreground">IVA 19% incluido: neto {formatMoney(preview.net, "CLP")} + IVA {formatMoney(preview.vat, "CLP")}.</p>
          <p className="text-xs">Funciones: {preview.features.map(formatSaasFeature).join(", ") || "Sin funciones adicionales"}</p>
          {preview.services.length ? <ul className="list-inside list-disc text-sm">{preview.services.map((s, i) => <li key={i} className="break-words">{s}</li>)}</ul> : null}
          <label htmlFor={`${id}-reason`} className="text-xs font-semibold">Motivo del cambio</label>
          <FieldControl id={`${id}-reason`} name="reason" minLength={3} maxLength={500} required value={reason} onChange={(e) => { setReason(e.target.value); changeIdentity(); }} />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" name="accepted" required checked={accepted} onChange={(e) => { setAccepted(e.target.checked); changeIdentity(); }} className="h-4 w-4 shrink-0 accent-primary" />
            Revisé la fecha, el prorrateo y los nuevos límites.
          </label>
        </section> : null}
      </fieldset>
      {state.error ? <p role="alert" tabIndex={-1} className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
      {state.stale && !preview ? <p className="text-xs text-muted-foreground">Se conservaron tus datos. Obtén una nueva vista previa antes de confirmar.</p> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {preview ? <Button className="min-h-11" disabled={pending} onClick={() => { setEdited(true); setAccepted(false); }}>Volver a previsualizar</Button> : null}
        <Button type="submit" variant="primary" isLoading={pending} className="min-h-11">{preview ? <Save aria-hidden className="h-4 w-4 shrink-0" /> : <Eye aria-hidden className="h-4 w-4 shrink-0" />}{preview ? "Confirmar cambio de plan" : "Previsualizar cambio"}</Button>
      </div>
    </form>}
  </Surface>;
}

export function CancelScheduledChangeForm({ tenantId, scheduledChangeId, operationId }: {
  tenantId: string; scheduledChangeId: string; operationId: string;
}) {
  const [state, action, pending] = useActionState(cancelPlanChangeAction, { error: null, saved: false });
  const [reason, setReason] = useState("");
  const [identity, setIdentity] = useState(operationId);
  const id = useId();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) ref.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
  }, [state]);
  return <form ref={ref} aria-label="Cancelar cambio programado" aria-busy={pending} className="mt-3 grid gap-3" onSubmit={(event) => {
    event.preventDefault();
    if (pending || state.saved) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }}>
    <input type="hidden" name="tenantId" value={tenantId} /><input type="hidden" name="scheduledChangeId" value={scheduledChangeId} /><input type="hidden" name="operationId" value={identity} />
    <label htmlFor={id} className="text-xs font-semibold">Motivo de cancelación</label>
    <FieldControl id={id} name="reason" value={reason} onChange={(e) => { setReason(e.target.value); setIdentity(crypto.randomUUID()); }} minLength={3} maxLength={500} required disabled={pending || state.saved} />
    <Button type="submit" className="min-h-11" isLoading={pending} disabled={state.saved}>Cancelar cambio programado</Button>
    {state.error ? <p role="alert" tabIndex={-1} className="text-sm text-destructive">{state.error}</p> : null}
    {state.saved ? <p role="status" className="text-sm text-success">Cambio cancelado. <Link className="underline" href={`/backoffice/tenants/${tenantId}/subscription`}>Actualizar contrato</Link> para continuar.</p> : null}
  </form>;
}
