"use client";

import Link from "next/link";
import {
  startTransition, useActionState, useEffect, useId, useRef, useState,
} from "react";
import { Check, ClipboardCheck, Eye, Save } from "lucide-react";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import { formatMoney } from "@/lib/format-money";
import { formatSaasFeature } from "@/lib/format-saas-feature";
import { Button, FieldControl, Surface } from "@/presentation/components/primitives";
import { assignmentAction, type AssignmentFormState } from "./actions";

const initial: AssignmentFormState = {
  error: null, fieldErrors: {}, preview: null, result: null, stale: false,
};

export function AssignmentForm({
  tenantId, tenantName, plans, businessDate, operationId,
}: {
  tenantId: string; tenantName: string; plans: SaasCatalogPlan[]; businessDate: string; operationId: string;
}) {
  const [state, action, pending] = useActionState(assignmentAction, initial);
  const [values, setValues] = useState({
    planVersionId: "", startsOn: businessDate, dueOn: "", useTrial: false, reason: "", accepted: false,
  });
  const [currentOperationId, setOperationId] = useState(operationId);
  const [previewEdited, setPreviewEdited] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const previewRef = useRef<HTMLHeadingElement>(null);
  const prefix = useId();
  const selected = plans.find((p) => p.currentVersion.id === values.planVersionId);
  const preview = !previewEdited && state.preview
    && state.preview.planVersionId === values.planVersionId
    && state.preview.startsOn === values.startsOn && state.preview.useTrial === values.useTrial
    && state.preview.dueOn === (values.dueOn || null) ? state.preview : null;

  useEffect(() => {
    if (state.error) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
    else if (state.preview) previewRef.current?.focus();
  }, [state]);

  function change(update: Partial<typeof values>, invalidatesPreview = true) {
    setValues((previous) => ({ ...previous, ...update, ...(invalidatesPreview ? { accepted: false } : {}) }));
    setOperationId(crypto.randomUUID());
    if (invalidatesPreview) setPreviewEdited(true);
  }
  function accessibility(name: string) {
    return {
      id: `${prefix}-${name}`,
      "aria-invalid": Boolean(state.fieldErrors[name]),
      "aria-describedby": state.fieldErrors[name] ? `${prefix}-${name}-error` : undefined,
    };
  }
  function error(name: string) {
    return state.fieldErrors[name]
      ? <p id={`${prefix}-${name}-error`} className="text-xs text-destructive">{state.fieldErrors[name]}</p> : null;
  }
  if (state.result) return (
    <Surface className="grid gap-3">
      <h2 className="flex items-center gap-2 font-bold"><Check aria-hidden className="h-4 w-4 shrink-0" />Plan asignado</h2>
      <p role="status" className="text-sm">
        La suscripción de {tenantName} quedó registrada.
        {state.result.invoiceId ? ` Se emitió un cobro pendiente de ${formatMoney(state.result.initialAmount, "CLP")}. No se registró ningún pago.` : " No se registró ningún pago ni comprobante."}
      </p>
      <Link href={`/backoffice/tenants?tenant=${tenantId}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold">Volver al tenant</Link>
    </Surface>
  );

  return (
    <Surface>
      <h2 className="flex items-center gap-2 text-lg font-bold"><ClipboardCheck aria-hidden className="h-4 w-4 shrink-0" />Asignar plan</h2>
      <p className="mt-1 text-sm text-muted-foreground">Revisa las condiciones antes de crear el contrato de {tenantName}. Esta acción no registra un pago ni cambia el estado administrativo del gimnasio.</p>
      {plans.length === 0 ? <p role="status" className="mt-4 text-sm text-muted-foreground">No hay planes activos con precio entero en CLP. <Link href="/backoffice/plans?new=1" className="font-semibold text-primary underline">Crea o publica un plan</Link> antes de asignar.</p> : (
        <form ref={formRef} aria-label="Asignación de plan" aria-busy={pending} className="mt-5 grid gap-5" onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const data = new FormData(event.currentTarget);
          if (!preview) setPreviewEdited(false);
          startTransition(() => action(data));
        }}>
          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="operationId" value={currentOperationId} />
          <input type="hidden" name="fingerprint" value={preview?.fingerprint ?? ""} />
          <input type="hidden" name="intent" value={preview ? "confirm" : "preview"} />
          <fieldset disabled={pending} className="grid min-w-0 gap-4">
            <div className="grid gap-1.5">
              <label htmlFor={`${prefix}-planVersionId`} className="text-xs font-semibold">Plan y versión</label>
              <select {...accessibility("planVersionId")} name="planVersionId" required value={values.planVersionId} onChange={(e) => change({ planVersionId: e.target.value, useTrial: false })}
                className="h-11 min-w-0 w-full rounded-lg border border-input bg-background/50 px-3 text-sm">
                <option value="">Selecciona un plan</option>
                {plans.map((p) => <option key={p.id} value={p.currentVersion.id}>{p.currentVersion.name} · v{p.currentVersion.versionNumber} · {formatMoney(p.currentVersion.price, "CLP")}</option>)}
              </select>
              {error("planVersionId")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor={`${prefix}-startsOn`} className="text-xs font-semibold">Fecha de inicio (Chile)</label>
                <FieldControl {...accessibility("startsOn")} name="startsOn" type="date" min={businessDate} required value={values.startsOn} onChange={(e) => change({ startsOn: e.target.value })} />
                {error("startsOn")}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor={`${prefix}-dueOn`} className="text-xs font-semibold">Vencimiento del primer cobro (opcional)</label>
                <FieldControl {...accessibility("dueOn")} name="dueOn" type="date" min={businessDate} value={values.dueOn} onChange={(e) => change({ dueOn: e.target.value })} />
                <p className="text-xs text-muted-foreground">Vacío: inicio del primer período pagable. Se mostrará la fecha exacta antes de confirmar.</p>
                {error("dueOn")}
              </div>
            </div>
            {selected?.currentVersion.trialDays ? <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" name="useTrial" checked={values.useTrial} onChange={(e) => change({ useTrial: e.target.checked })} className="h-4 w-4 shrink-0 accent-primary" />
              Usar {selected.currentVersion.trialDays} días de prueba. No se cobrará al asignar.
            </label> : null}
            {preview ? <section aria-labelledby={`${prefix}-preview-heading`} className="grid gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <h3 ref={previewRef} tabIndex={-1} id={`${prefix}-preview-heading`} className="flex items-center gap-2 font-bold outline-none"><Eye aria-hidden className="h-4 w-4 shrink-0" />Revisar asignación</h3>
              <p className="break-words text-sm font-semibold">{preview.planName} · versión {preview.versionNumber}</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Inicio</dt><dd>{preview.startsOn}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Precio contratado</dt><dd className="font-semibold">{formatMoney(preview.price, "CLP")} cada {preview.durationCount} {preview.durationUnit === "months" ? "mes(es)" : "día(s)"}</dd></div>
                {preview.trialEndExclusive ? <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Prueba</dt><dd>Desde {preview.startsOn} hasta antes del {preview.trialEndExclusive}</dd></div> : null}
                <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Primer período pagable</dt><dd>{preview.firstPaidPeriod.startsOn} hasta antes del {preview.firstPaidPeriod.endsBefore}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Cobro al asignar</dt><dd className="text-xl font-bold">{formatMoney(preview.initialAmount, "CLP")}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Vencimiento del primer cobro</dt><dd>{preview.resolvedDueOn}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Alumnos activos / cupo</dt><dd>{preview.activeStudents} / {preview.maxStudents}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Usuarios activos / cupo</dt><dd>{preview.activeUsers} / {preview.maxUsers}</dd></div>
              </dl>
              <p className="text-xs text-muted-foreground">{preview.createsInvoice
                ? `IVA 19% incluido: neto ${formatMoney(preview.net, "CLP")} + IVA ${formatMoney(preview.vat, "CLP")}. Se emitirá deuda pendiente, no un pago.`
                : "No se emitirá cobro inicial, pago ni comprobante. El precio del primer período pagable se conserva en el contrato."}</p>
              <p className="text-xs">Funciones: {preview.features.map(formatSaasFeature).join(", ") || "Sin funciones adicionales"}</p>
              {preview.services.length ? <ul className="list-inside list-disc text-sm">{preview.services.map((s, i) => <li className="break-words" key={i}>{s}</li>)}</ul> : null}
              <div className="grid gap-1.5">
                <label htmlFor={`${prefix}-reason`} className="text-xs font-semibold">Motivo de asignación</label>
                <FieldControl {...accessibility("reason")} name="reason" required minLength={3} maxLength={500} value={values.reason} onChange={(e) => change({ reason: e.target.value }, false)} />
                {error("reason")}
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input {...accessibility("accepted")} name="accepted" type="checkbox" required checked={values.accepted} onChange={(e) => change({ accepted: e.target.checked }, false)} className="h-4 w-4 shrink-0 accent-primary" />
                Revisé el plan, los límites, las fechas y el cobro pendiente.
              </label>
              {error("accepted")}
            </section> : null}
          </fieldset>
          {state.error ? <p role="alert" tabIndex={-1} className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
          {state.stale && !preview ? <p className="text-sm text-muted-foreground">Tus datos se conservaron. Vuelve a previsualizar para comprobar el estado y uso actuales.</p> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {preview ? <Button className="min-h-11" disabled={pending} onClick={() => { setPreviewEdited(true); setValues((v) => ({ ...v, accepted: false })); }}>Volver a previsualizar</Button> : null}
            <Button type="submit" variant="primary" isLoading={pending} className="min-h-11">
              {preview ? <Save aria-hidden className="h-4 w-4 shrink-0" /> : <Eye aria-hidden className="h-4 w-4 shrink-0" />}
              {preview ? "Confirmar asignación" : "Previsualizar asignación"}
            </Button>
          </div>
        </form>
      )}
    </Surface>
  );
}
