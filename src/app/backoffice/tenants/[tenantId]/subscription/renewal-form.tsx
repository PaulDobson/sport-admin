"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatMoney } from "@/lib/format-money";
import { Button, Surface } from "@/presentation/components/primitives";
import { renewalAction } from "./renewal-action";

export function RenewalForm({ subscriptionId, tenantId, expectedPeriodEnd, requestId, price, enabled, scheduledPrice }: {
  subscriptionId: string; tenantId: string; expectedPeriodEnd: string; requestId: string;
  price: number; enabled: boolean; scheduledPrice: number | null;
}) {
  const [state, action, pending] = useActionState(renewalAction, { error: null, result: null });
  const [accepted, setAccepted] = useState(false);
  const [identity, setIdentity] = useState(requestId);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) ref.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
  }, [state]);
  return <Surface>
    <h2 className="flex items-center gap-2 text-lg font-bold"><RefreshCw aria-hidden className="h-4 w-4 shrink-0" />Renovar un período vencido</h2>
    <p className="mt-2 text-sm text-muted-foreground">Procesa solamente el período que comienza el {expectedPeriodEnd}. Precio del contrato vigente: {formatMoney(price, "CLP")}, IVA incluido. No registra un pago ni cambia el estado administrativo del gimnasio.</p>
    {scheduledPrice !== null ? <p className="mt-2 text-sm">El cambio programado se revalidará contra el uso actual. Si cumple, se cobrará {formatMoney(scheduledPrice, "CLP")}; si excede los cupos, quedará bloqueado y se cobrará {formatMoney(price, "CLP")} del plan anterior. Ambos precios incluyen IVA.</p> : null}
    {!enabled ? <p role="status" className="mt-3 text-sm text-muted-foreground">Renovaciones desactivadas hasta completar la validación PostgreSQL y habilitar el procesador.</p>
      : state.result ? <div className="mt-3 grid gap-2">
        <p role="status" className="text-sm">Período renovado: {state.result.periodStartsOn} hasta antes del {state.result.periodEndExclusive}. {state.result.invoiceId ? `Cobro pendiente: ${formatMoney(state.result.amount, "CLP")}.` : "Período gratuito: no se creó un cobro ficticio."} No se registró un pago.</p>
        {state.result.blockedReason ? <p role="alert" className="text-sm text-destructive">{state.result.blockedReason}</p> : null}
        <Link href={`/backoffice/tenants/${tenantId}/subscription`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold">Actualizar contrato y revisar siguientes períodos</Link>
      </div> : <form ref={ref} aria-label="Renovar período vencido" aria-busy={pending} className="mt-3 grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <input type="hidden" name="expectedPeriodEnd" value={expectedPeriodEnd} />
        <input type="hidden" name="requestId" value={identity} />
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="accepted" required checked={accepted} disabled={pending} className="h-4 w-4 shrink-0 accent-primary"
            onChange={(event) => { setAccepted(event.target.checked); setIdentity(crypto.randomUUID()); }} />
          Revisé el contrato, el cambio pendiente y el cobro de un período completo.
        </label>
        {state.error ? <p role="alert" tabIndex={-1} className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
        {state.error ? <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Reintentar sin cambios conserva la identidad de la solicitud. Después de conciliar el contrato, inicia explícitamente un nuevo intento; si hubo un timeout, verifica primero el resultado.</p>
          <Button disabled={pending} className="min-h-11" onClick={() => { setIdentity(crypto.randomUUID()); setAccepted(false); }}>Revisé el contrato: iniciar nuevo intento</Button>
        </div> : null}
        <Button type="submit" variant="primary" isLoading={pending} className="min-h-11"><RefreshCw aria-hidden className="h-4 w-4 shrink-0" />Renovar este período</Button>
      </form>}
  </Surface>;
}
