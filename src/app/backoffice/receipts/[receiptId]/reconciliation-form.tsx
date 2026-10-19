"use client";
import { startTransition,useActionState,useEffect,useRef } from "react";
import { Button,FieldControl } from "@/presentation/components/primitives";
import { receiptAction } from "./actions";
export function ReconciliationForm({ receiptId,deliveryId }: { receiptId: string; deliveryId: string }) {
  const [state,dispatch,pending] = useActionState(receiptAction,{ error: null,message: null });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error || state.message) form.current?.querySelector<HTMLElement>('[role="alert"],[role="status"]')?.focus();
  },[state]);
  return <form ref={form} aria-busy={pending} className="mt-3 grid gap-3 rounded-lg border border-warning/30 p-3" onSubmit={(event) => {
    event.preventDefault(); if (pending || state.message) return;
    const data = new FormData(event.currentTarget); startTransition(() => dispatch(data));
  }}>
    <input type="hidden" name="intent" value="reconcile" /><input type="hidden" name="receiptId" value={receiptId} /><input type="hidden" name="deliveryId" value={deliveryId} />
    <fieldset disabled={pending || Boolean(state.message)} className="grid gap-3">
      <label className="grid gap-1 text-xs">Resultado verificado con Resend<select name="resolution" className="h-11 rounded-lg border border-input bg-card px-3 text-sm"><option value="accepted">Aceptado por el proveedor</option><option value="not_sent">Confirmado que no se envió</option></select></label>
      <label className="grid gap-1 text-xs">ID del proveedor (solo si fue aceptado)<FieldControl name="providerId" maxLength={200} /></label>
      <label className="grid gap-1 text-xs">Evidencia o motivo de conciliación<FieldControl name="reason" required minLength={3} maxLength={500} /></label>
      <label className="flex min-h-11 items-start gap-3 text-sm"><input name="accepted" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0" />Verifiqué el resultado con el proveedor. No estoy suponiendo que el mensaje falló.</label>
    </fieldset>
    {state.error ? <p role="alert" tabIndex={-1} className="text-sm text-destructive">{state.error}</p> : null}
    {state.message ? <p role="status" tabIndex={-1} className="text-sm text-success">{state.message}</p> : null}
    <Button type="submit" disabled={pending || Boolean(state.message)} className="min-h-11 scroll-mb-28">Registrar conciliación</Button>
  </form>;
}
