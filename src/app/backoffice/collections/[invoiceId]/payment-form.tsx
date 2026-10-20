"use client";

import Link from "next/link";
import { startTransition,useActionState,useEffect,useId,useRef,useState } from "react";
import { Check,Save } from "lucide-react";
import { formatMoney } from "@/lib/format-money";
import { Button,FieldControl,Surface } from "@/presentation/components/primitives";
import { paymentAction,type PaymentFormState } from "./payment-actions";

const initial: PaymentFormState = { error: null,fieldErrors: {},result: null,voided: false };
export function PaymentForm({ invoiceId,amount,businessDate,operationId,intent,issuerName }: {
  invoiceId: string; amount: number; businessDate: string; operationId: string; intent: "pay" | "void"; issuerName?: string;
}) {
  const [operation,setOperation] = useState(operationId);
  const [attempted,setAttempted] = useState(false);
  const [state,dispatch,pending] = useActionState(paymentAction,initial);
  const prefix = useId();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) ref.current?.querySelector<HTMLElement>('[aria-invalid="true"],[role="alert"]')?.focus();
  },[state]);
  if (state.result) return <Surface><p role="status" className="flex items-center gap-2 font-semibold text-success"><Check aria-hidden className="h-4 w-4 shrink-0" />Pago confirmado por {formatMoney(state.result.amount,"CLP")}</p>
    <p className="mt-2 text-sm text-muted-foreground">Comprobante persistido; el PDF se procesa por separado. No se envió ningún correo automáticamente.</p>
    <Link href={`/backoffice/receipts/${state.result.receiptId}`} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold">Ver comprobante y estado PDF</Link></Surface>;
  if (state.voided) return <Surface><p role="status" className="font-semibold">Cobro anulado. El historial se conserva.</p></Surface>;
  const error = (name: string) => state.fieldErrors[name];
  return <Surface><h2 className="font-bold">{intent === "pay" ? "Registrar pago completo" : "Anular cobro"}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{intent === "pay"
      ? `Registrarás exactamente ${formatMoney(amount,"CLP")}. Emisor: ${issuerName}. No se admiten abonos ni sobrepagos; no ingreses datos de tarjeta.`
      : "Solo puede anularse si no existen pagos ni operaciones en curso. No se eliminan registros ni se generan reembolsos."}</p>
    <form ref={ref} aria-label={intent === "pay" ? "Registro de pago" : "Anulación de cobro"} aria-busy={pending} className="mt-4 grid gap-4" onChange={() => {
      if (attempted) { setOperation(crypto.randomUUID()); setAttempted(false); }
    }} onSubmit={(event) => {
      event.preventDefault(); if (pending) return;
      const form = new FormData(event.currentTarget); setAttempted(true);
      startTransition(() => dispatch(form));
    }}>
      <input type="hidden" name="invoiceId" value={invoiceId} /><input type="hidden" name="operationId" value={operation} />
      <input type="hidden" name="intent" value={intent} /><input type="hidden" name="amount" value={amount} />
      <fieldset disabled={pending} className="grid min-w-0 gap-4 sm:grid-cols-2">
        {intent === "pay" ? <>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Fecha real del pago<FieldControl name="paidOn" type="date" max={businessDate} defaultValue={businessDate} required aria-invalid={Boolean(error("paidOn"))} /></label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Método<select name="method" className="h-11 min-w-0 rounded-lg border border-input bg-background/50 px-3 text-sm text-foreground"><option value="transfer">Transferencia</option><option value="cash">Efectivo</option><option value="external_card">Tarjeta externa</option></select></label>
          <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">Referencia (obligatoria salvo efectivo)<FieldControl name="reference" maxLength={200} aria-invalid={Boolean(error("reference"))} /></label>
        </> : null}
        <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2">Motivo<FieldControl name="reason" minLength={3} maxLength={500} required aria-invalid={Boolean(error("reason"))} /></label>
        <label htmlFor={`${prefix}-accepted`} className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-sm sm:col-span-2">
          <input id={`${prefix}-accepted`} name="accepted" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0" />
          {intent === "pay" ? "Revisé el saldo, el emisor y la fecha. Confirmo que el dinero fue recibido y que corresponde al saldo completo." : "Revisé el cobro y confirmo su anulación con el motivo indicado."}
        </label>
      </fieldset>
      {state.error ? <div role="alert" tabIndex={-1} className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"><p>{state.error}</p>{Object.entries(state.fieldErrors).map(([field,message]) => <p key={field}>{message}</p>)}</div> : null}
      <Button type="submit" disabled={pending} variant={intent === "void" ? "danger" : "primary"} className="min-h-11 w-full scroll-mb-28 sm:w-fit"><Save aria-hidden className="h-4 w-4 shrink-0" />{pending ? "Confirmando…" : intent === "pay" ? "Confirmar pago recibido" : "Confirmar anulación"}</Button>
    </form>
  </Surface>;
}
