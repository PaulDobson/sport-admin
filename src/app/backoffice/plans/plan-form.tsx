"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Archive, Check, Layers3, Save } from "lucide-react";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import type { SaasFeature } from "@/domain/saas-administration/plan-entitlement";
import { includedVat, maxClpAmount } from "@/domain/saas-administration/billing-money";
import { formatMoney } from "@/lib/format-money";
import { formatSaasFeature } from "@/lib/format-saas-feature";
import { Button, FieldControl, Surface } from "@/presentation/components/primitives";
import { archivePlanAction, publishPlanAction, type PlanFormState } from "./actions";

const initialState: PlanFormState = { error: null, fieldErrors: {}, saved: false };
const features: { value: SaasFeature; description: string }[] = [
  { value: "reports", description: "Consultas y exportaciones habilitadas." },
  { value: "offline", description: "Funciones offline disponibles en la plataforma." },
  { value: "realtime", description: "Actualizaciones en vivo." },
  { value: "push", description: "Notificaciones en dispositivos compatibles." },
];
const textareaClass = "min-h-24 w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground";

export function PlanForm({ plan, operationId }: { plan?: SaasCatalogPlan; operationId: string }) {
  const [currentOperationId, setOperationId] = useState(operationId);
  const [hasEdits, setHasEdits] = useState(false);
  const [state, action, pending] = useActionState(async (previous: PlanFormState, form: FormData) => {
    const result = await publishPlanAction(previous, form);
    if (result.saved) {
      setOperationId(crypto.randomUUID());
      setHasEdits(false);
    }
    return result;
  }, initialState);
  const v = plan?.currentVersion;
  const [price, setPrice] = useState(v && v.currency === "CLP" ? String(v.price) : "");
  const [values, setValues] = useState({
    name: v?.name ?? "", description: v?.description ?? "",
    durationCount: String(v?.durationCount ?? 1), durationUnit: v?.durationUnit ?? "months",
    maxStudents: String(v?.maxStudents ?? 100), maxUsers: String(v?.maxUsers ?? 5),
    trialDays: String(v?.trialDays ?? 0), services: v?.services.join("\n") ?? "", reason: "",
  });
  const [selectedFeatures, setSelectedFeatures] = useState<SaasFeature[]>(v?.features ?? []);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [state]);
  function control(name: keyof typeof values) {
    return {
      value: values[name],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setValues((previous) => ({ ...previous, [name]: value }));
      },
    };
  }
  const priceNumber = price.trim() ? Number(price) : NaN;
  const vat = Number.isSafeInteger(priceNumber) && priceNumber >= 0 && priceNumber <= maxClpAmount
    ? includedVat(priceNumber) : null;
  const prefix = useId();
  function fieldError(name: string) {
    return state.fieldErrors[name] ?? Object.entries(state.fieldErrors)
      .find(([path]) => path === `terms.${name}` || path.startsWith(`terms.${name}.`))?.[1];
  }
  function field(label: string, name: string, control: ReactNode) {
    const error = fieldError(name);
    return (
      <div className="grid gap-1.5">
        <label htmlFor={`${prefix}-${name}`} className="text-xs font-semibold text-muted-foreground">{label}</label>
        {control}
        {error ? <p id={`${prefix}-${name}-error`} className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }
  function a11y(name: string) {
    const invalid = Boolean(fieldError(name));
    return { id: `${prefix}-${name}`, "aria-invalid": invalid, "aria-describedby": invalid ? `${prefix}-${name}-error` : undefined };
  }

  return (
    <Surface className="mx-auto max-w-3xl">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Layers3 aria-hidden className="h-4 w-4 shrink-0" />
        {plan ? `Nueva versión de ${v?.name}` : "Crear plan"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {plan ? "Publicar no cambia los contratos vigentes. La nueva versión se usará en futuras asignaciones y cambios confirmados." : "Define el precio final, la duración y lo que incluye el servicio."}
      </p>
      {v?.currency !== "CLP" && v ? (
        <p role="note" className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          Versión histórica en {v.currency}. El nuevo precio se publica en CLP: no se realizará una conversión automática.
        </p>
      ) : null}
      {/* Dispatch explicitly to preserve the draft instead of React's automatic form-action reset. */}
      <form ref={formRef} onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }} aria-label="Condiciones del plan" aria-busy={pending} onChange={() => setHasEdits(true)} className="mt-5 grid gap-5">
        <input type="hidden" name="operationId" value={currentOperationId} />
        <input type="hidden" name="planId" value={plan?.id ?? ""} />
        <input type="hidden" name="expectedVersionId" value={v?.id ?? ""} />
        <fieldset disabled={pending} className="grid min-w-0 gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("Nombre del plan", "name", <FieldControl {...a11y("name")} {...control("name")} name="name" required maxLength={160} />)}
            {field("Precio final en CLP", "price", <FieldControl {...a11y("price")} name="price" type="number" inputMode="numeric" min={0} max={maxClpAmount} step={1} required value={price} onChange={(e) => setPrice(e.target.value)} />)}
          </div>
          {vat ? <p className="-mt-2 text-xs text-muted-foreground" aria-live="polite">
            IVA 19% incluido: neto {formatMoney(vat.net, "CLP")} + IVA {formatMoney(vat.vat, "CLP")}. No se añade al precio.
          </p> : null}
          {field("Descripción (opcional)", "description", <textarea {...a11y("description")} {...control("description")} name="description" maxLength={2000} className={textareaClass} />)}
          <div className="grid grid-cols-2 gap-4">
            {field("Duración", "durationCount", <FieldControl {...a11y("durationCount")} {...control("durationCount")} name="durationCount" type="number" inputMode="numeric" min={1} max={2147483647} step={1} required />)}
            {field("Unidad", "durationUnit", <select {...a11y("durationUnit")} {...control("durationUnit")} name="durationUnit" className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 text-sm">
              <option value="months">Meses calendario</option><option value="days">Días calendario</option>
            </select>)}
            {field("Máximo de alumnos", "maxStudents", <FieldControl {...a11y("maxStudents")} {...control("maxStudents")} name="maxStudents" type="number" inputMode="numeric" min={1} max={2147483647} step={1} required />)}
            {field("Máximo de usuarios", "maxUsers", <FieldControl {...a11y("maxUsers")} {...control("maxUsers")} name="maxUsers" type="number" inputMode="numeric" min={1} max={2147483647} step={1} required />)}
          </div>
          {field("Días de prueba disponibles (0 sin prueba)", "trialDays", <FieldControl {...a11y("trialDays")} {...control("trialDays")} name="trialDays" type="number" inputMode="numeric" min={0} max={365} step={1} required />)}
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-2 text-sm font-semibold">Funciones de la plataforma</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {features.map((feature) => <label key={feature.value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
                <input type="checkbox" name="features" value={feature.value} checked={selectedFeatures.includes(feature.value)} onChange={(event) => {
                  const checked = event.target.checked;
                  setSelectedFeatures((previous) => checked ? [...previous, feature.value] : previous.filter((f) => f !== feature.value));
                }} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
                <span><span className="block text-sm font-semibold">{formatSaasFeature(feature.value)}</span><span className="block text-xs text-muted-foreground">{feature.description}</span></span>
              </label>)}
            </div>
            {fieldError("features") ? <p className="text-xs text-destructive">{fieldError("features")}</p> : null}
          </fieldset>
          {field("Servicios incluidos (uno por línea, hasta 50)", "services", <textarea {...a11y("services")} {...control("services")} name="services" placeholder={"Soporte de puesta en marcha\nCapacitación del equipo"} className={textareaClass} />)}
          <p className="-mt-3 text-xs text-muted-foreground">Los servicios describen la oferta comercial; no habilitan funciones adicionales de la plataforma.</p>
          {field("Motivo de publicación", "reason", <FieldControl {...a11y("reason")} {...control("reason")} name="reason" required minLength={3} maxLength={500} placeholder="Ej.: nueva oferta para academias" />)}
        </fieldset>
        {state.error ? <p role="alert" tabIndex={-1} className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
        {state.saved && !hasEdits ? <p role="status" className="flex items-center gap-2 text-sm text-success"><Check aria-hidden className="h-4 w-4 shrink-0" />Versión publicada. Los contratos existentes se conservaron.</p> : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href="/backoffice/plans" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold">Volver al catálogo</Link>
          <Button type="submit" variant="primary" isLoading={pending} disabled={state.saved && !hasEdits} className="min-h-11"><Save aria-hidden className="h-4 w-4 shrink-0" />{plan ? "Publicar nueva versión" : "Crear plan"}</Button>
        </div>
      </form>
    </Surface>
  );
}

export function ArchivePlanForm({ plan, operationId }: { plan: SaasCatalogPlan; operationId: string }) {
  const [state, action, pending] = useActionState(archivePlanAction, initialState);
  const [reason, setReason] = useState("");
  const id = useId();
  return (
    <form action={action} className="grid gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="operationId" value={operationId} />
      <input type="hidden" name="planId" value={plan.id} />
      <input type="hidden" name="expectedVersionId" value={plan.currentVersion.id} />
      <p className="text-xs text-muted-foreground">Archivar impide nuevas asignaciones. No cancela ni cambia suscripciones existentes.</p>
      <label htmlFor={id} className="text-xs font-semibold">Motivo de archivo</label>
      <FieldControl id={id} name="reason" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={500} disabled={pending} />
      <Button type="submit" variant="danger" isLoading={pending} className="min-h-11"><Archive aria-hidden className="h-4 w-4 shrink-0" />Confirmar archivo</Button>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      {state.saved ? <p role="status" className="text-sm text-success">Plan archivado.</p> : null}
    </form>
  );
}
