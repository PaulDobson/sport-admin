"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { Save } from "lucide-react";
import type { BillingIssuer } from "@/domain/saas-administration/billing-issuer";
import { Button, FieldControl } from "@/presentation/components/primitives";
import { saveIssuerAction, type IssuerFormState } from "./actions";

const initial: IssuerFormState = { error: null, fieldErrors: {}, issuer: null };
export function IssuerForm({ issuer, operationId }: { issuer: BillingIssuer | null; operationId: string }) {
  const [versionId, setVersionId] = useState(issuer?.id ?? "");
  const [operation, setOperation] = useState(operationId);
  const [submitted, setSubmitted] = useState(false);
  const [edited, setEdited] = useState(false);
  const [state, dispatch, pending] = useActionState(async (previous: IssuerFormState, form: FormData) => {
    const result = await saveIssuerAction(previous, form);
    if (result.issuer) setVersionId(result.issuer.id);
    return result;
  }, initial);
  const prefix = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({
    legalName: issuer?.legalName ?? "", taxId: issuer?.taxId ?? "",
    address: issuer?.address ?? "", email: issuer?.email ?? "", reason: "",
  });
  useEffect(() => {
    if (state.error) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [state]);
  const fields = [
    ["legalName", "Razón social del emisor", 160], ["taxId", "RUT del emisor", 12],
    ["address", "Dirección del emisor", 250], ["email", "Correo del emisor", 254], ["reason", "Motivo del cambio", 500],
  ] as const;
  return <form ref={formRef} aria-label="Datos del emisor" aria-busy={pending} className="mt-4 grid gap-4" onSubmit={(event) => {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setSubmitted(true);
    setEdited(false);
    startTransition(() => dispatch(form));
  }}>
    <input type="hidden" name="operationId" value={operation} /><input type="hidden" name="expectedVersionId" value={versionId} />
    <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
      {fields.map(([name, label, maxLength]) => <div key={name} className={`grid min-w-0 gap-1.5 ${name === "address" || name === "reason" ? "sm:col-span-2" : ""}`}>
        <label htmlFor={`${prefix}-${name}`} className="text-xs font-semibold text-muted-foreground">{label}</label>
        <FieldControl id={`${prefix}-${name}`} name={name} type={name === "email" ? "email" : "text"} required maxLength={maxLength}
          value={values[name]} aria-invalid={Boolean(state.fieldErrors[name])} aria-describedby={state.fieldErrors[name] ? `${prefix}-${name}-error` : undefined}
          onChange={(event) => {
            const value = event.target.value;
            if (submitted) { setOperation(crypto.randomUUID()); setSubmitted(false); }
            setEdited(true);
            setValues((previous) => ({ ...previous, [name]: value }));
          }} />
        {state.fieldErrors[name] ? <p id={`${prefix}-${name}-error`} className="text-xs text-destructive">{state.fieldErrors[name]}</p> : null}
      </div>)}
    </fieldset>
    <p className="text-xs text-muted-foreground">RUT con dígito verificador, por ejemplo 12.345.678-5. Esta configuración identifica al emisor; no constituye autorización del SII ni configura el remitente de correo.</p>
    {state.error ? <p role="alert" tabIndex={-1} className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{state.error} Tus datos se conservaron. Si existe un conflicto de versión, recarga para revisar el emisor vigente antes de confirmar.</p> : null}
    {state.issuer && !edited ? <p role="status" className="text-sm text-success">Emisor guardado · versión {state.issuer.versionNumber}. Los comprobantes anteriores conservan sus datos originales.</p> : null}
    <Button type="submit" disabled={pending || (Boolean(state.issuer) && !edited)} className="min-h-11 w-full scroll-mb-[calc(var(--bottom-nav-height)+var(--safe-area-bottom)+1.5rem)] gap-2 sm:w-fit"><Save aria-hidden className="h-4 w-4 shrink-0" />{pending ? "Guardando…" : "Guardar nueva versión"}</Button>
  </form>;
}
