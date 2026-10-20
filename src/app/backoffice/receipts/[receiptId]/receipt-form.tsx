"use client";

import { startTransition,useActionState,useEffect,useRef,useState } from "react";
import { Button } from "@/presentation/components/primitives";
import { receiptAction } from "./actions";

export function ReceiptForm({ receiptId,operationId,intent,recipient,source }: {
  receiptId: string; operationId: string; intent: "retry" | "send"; recipient?: string; source?: "billing" | "primary_contact";
}) {
  const [operation] = useState(operationId);
  const [state,dispatch,pending] = useActionState(receiptAction,{ error: null,message: null });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error || state.message) form.current?.querySelector<HTMLElement>('[role="alert"],[role="status"]')?.focus();
  },[state]);
  return <form ref={form} className="mt-3 grid gap-3" aria-busy={pending} aria-label={intent === "retry" ? "Recuperar PDF" : "Enviar comprobante"} onSubmit={(event) => {
    event.preventDefault(); if (pending || state.message) return;
    const data = new FormData(event.currentTarget); startTransition(() => dispatch(data));
  }}>
    <input type="hidden" name="receiptId" value={receiptId} /><input type="hidden" name="operationId" value={operation} />
    <input type="hidden" name="intent" value={intent} /><input type="hidden" name="recipient" value={recipient ?? ""} />
    <input type="hidden" name="source" value={source ?? ""} />
    {intent === "send" ? <fieldset disabled={pending || Boolean(state.message)} className="grid gap-3">
      <p className="break-all text-sm">Destinatario: <strong>{recipient}</strong></p>
      {source === "primary_contact" ? <label className="flex min-h-11 items-start gap-3 rounded-lg border border-warning/30 p-3 text-sm">
        <input name="fallbackApproved" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0" />No hay correo de facturación. Autorizo usar el contacto principal solo para este envío, sin modificar la facturación.</label> : null}
      <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-sm"><input name="accepted" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0" />Revisé el destinatario y confirmo enviar este PDF.</label>
    </fieldset> : null}
    {state.error ? <p role="alert" tabIndex={-1} className="text-sm text-destructive">{state.error}</p> : null}
    {state.message ? <p role="status" tabIndex={-1} className="text-sm text-success">{state.message}</p> : null}
    <Button type="submit" disabled={pending || Boolean(state.message)} className="min-h-11 w-full scroll-mb-28 sm:w-fit">{pending ? "Procesando…" : intent === "retry" ? "Reintentar generación PDF" : "Confirmar envío del PDF"}</Button>
  </form>;
}
