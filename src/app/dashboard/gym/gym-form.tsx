"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Building2, MapPin, Save, UserRound } from "lucide-react";
import type { TenantDetails } from "@/domain/tenants/tenant-details";
import type { TenantDetailsInput } from "@/application/tenants/manage-tenant-details";
import { Button, FieldControl, Surface } from "@/presentation/components/primitives";
import { updateGymAction, type GymFormState } from "./actions";

const initialState: GymFormState = { error: null, saved: false };
const toFields = (details: TenantDetails): TenantDetailsInput => ({
  name: details.name, address: details.address ?? "", contactName: details.contactName ?? "",
  contactEmail: details.contactEmail ?? "", phone: details.phone ?? "",
  city: details.city ?? "", region: details.region ?? "",
});

export function GymForm({ details }: { details: TenantDetails }) {
  const [values, setValues] = useState(() => toFields(details));
  const [state, action, pending] = useActionState(async (previous: GymFormState, formData: FormData) => {
    const result = await updateGymAction(previous, formData);
    if (result.details) setValues(toFields(result.details));
    return result;
  }, initialState);
  const baseline = toFields(state.details ?? details);
  const dirty = Object.keys(baseline).some(key => values[key as keyof TenantDetailsInput] !== baseline[key as keyof TenantDetailsInput]);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!dirty && !pending) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, pending]);

  useEffect(() => {
    if (state.error) form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [state]);

  const field = (
    name: keyof TenantDetailsInput, label: string,
    options: { type?: "email" | "tel"; autoComplete?: string; placeholder?: string; maxLength: number },
  ) => (
    <div className="min-w-0 space-y-2">
      <label htmlFor={`gym-${name}`} className="block text-sm font-semibold">
        {label}{name === "name" ? <span className="text-primary"> *</span> : null}
      </label>
      <FieldControl
        id={`gym-${name}`}
        name={name}
        value={values[name]}
        onChange={event => setValues(previous => ({ ...previous, [name]: event.target.value }))}
        type={options.type ?? "text"}
        autoComplete={options.autoComplete}
        placeholder={options.placeholder}
        maxLength={options.maxLength}
        required={name === "name"}
        aria-invalid={Boolean(state.fieldErrors?.[name])}
        aria-describedby={state.fieldErrors?.[name] ? `gym-${name}-error` : undefined}
        className="min-w-0 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 aria-invalid:border-destructive sm:text-sm"
      />
      {state.fieldErrors?.[name] ? <p id={`gym-${name}-error`} className="text-sm text-destructive">{state.fieldErrors[name]}</p> : null}
    </div>
  );

  return (
    <form ref={form} action={action} aria-label="Datos del gimnasio" aria-busy={pending} className="space-y-4">
      <input type="hidden" name="tenantId" value={details.tenantId} />
      <p className="text-sm text-muted-foreground">Solo el nombre del gimnasio es obligatorio. Los demás campos son opcionales.</p>
      <fieldset disabled={pending} aria-labelledby="gym-identity-heading" className="min-w-0">
        <Surface className="rounded-xl p-4 sm:p-5">
          <h3 id="gym-identity-heading" className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span>Identidad</span>
          </h3>
          {field("name", "Nombre del gimnasio", { maxLength: 160, autoComplete: "organization", placeholder: "Ej. Academia Deportiva Central" })}
        </Surface>
      </fieldset>
      <fieldset disabled={pending} aria-labelledby="gym-location-heading" className="min-w-0">
        <Surface className="rounded-xl p-4 sm:p-5">
          <h3 id="gym-location-heading" className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span>Ubicación</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("address", "Dirección", { maxLength: 250, autoComplete: "street-address", placeholder: "Calle, número y local" })}</div>
            {field("city", "Ciudad", { maxLength: 120, autoComplete: "address-level2" })}
            {field("region", "Región", { maxLength: 120, autoComplete: "address-level1" })}
          </div>
        </Surface>
      </fieldset>
      <fieldset disabled={pending} aria-labelledby="gym-contact-heading" className="min-w-0">
        <Surface className="rounded-xl p-4 sm:p-5">
          <h3 id="gym-contact-heading" className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span>Contacto principal</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("contactName", "Nombre del contacto principal", { maxLength: 120, autoComplete: "name" })}</div>
            {field("contactEmail", "Email del contacto", { type: "email", maxLength: 254, autoComplete: "email", placeholder: "contacto@academia.cl" })}
            {field("phone", "Teléfono", { type: "tel", maxLength: 30, autoComplete: "tel", placeholder: "+56 9 1234 5678" })}
          </div>
        </Surface>
      </fieldset>
      <div aria-live="polite">
        {state.error ? <p role="alert" tabIndex={-1} className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{state.error}</p> : null}
        {state.saved && !dirty ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">Datos del gimnasio actualizados.</p> : null}
      </div>
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{pending ? "Guardando los datos del gimnasio…" : dirty ? "Tienes cambios sin guardar." : "No hay cambios pendientes."}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button" disabled={pending || !dirty}
            onClick={() => { if (window.confirm("¿Descartar los cambios sin guardar?")) setValues(baseline); }}
            className="min-h-11 focus-visible:outline-2 focus-visible:outline-primary"
          >Descartar cambios</Button>
          <Button type="submit" variant="primary" isLoading={pending} disabled={!dirty} className="min-h-11 focus-visible:outline-2 focus-visible:outline-primary">
            {!pending ? <Save className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}{pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </form>
  );
}
