"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { CollectionItem } from "@/domain/instructor-finance/collection";
import { formatMoney } from "@/lib/format-money";
import {
  Button,
  EmptyState,
  StatusBadge,
  Surface,
} from "@/presentation/components/primitives";
import {
  recordPaymentAction,
  transitionMembershipAction,
  type CollectionFormState,
} from "./actions";
import { BottomSheet } from "./bottom-sheet";

const initialState: CollectionFormState = { error: null, saved: false };

const fieldClass =
  "h-11 rounded-lg border border-input bg-background px-3 text-foreground";
const labelClass = "flex flex-col gap-1 text-sm text-muted-foreground";

const statusLabels: Record<string, string> = {
  active: "Activa",
  paused: "Pausada",
  past_due: "En mora",
  expired: "Vencida",
  cancelled: "Cancelada",
};

function PaymentForm({ item, today }: { item: CollectionItem; today: string }) {
  const [state, formAction, pending] = useActionState(
    recordPaymentAction,
    initialState,
  );
  const [amount, setAmount] = useState(item.balance);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="membershipId" value={item.membershipId} />
      <input type="hidden" name="currency" value={item.currency} />
      <label className={labelClass}>
        Monto
        <input
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className={fieldClass}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Fecha
          <input
            name="paidOn"
            type="date"
            defaultValue={today}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Método
          <select name="method" defaultValue="cash" className={fieldClass}>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="card">Tarjeta</option>
            <option value="other">Otro</option>
          </select>
        </label>
      </div>
      <label className={labelClass}>
        Referencia (opcional)
        <input name="reference" className={fieldClass} />
      </label>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          Agregar ajuste
        </summary>
        <div className="mt-3 grid gap-3">
          <label className={labelClass}>
            Tipo
            <select
              name="adjustmentKind"
              defaultValue="discount"
              className={fieldClass}
            >
              <option value="discount">Descuento</option>
              <option value="credit">Crédito</option>
              <option value="tax">Impuesto</option>
            </select>
          </label>
          <label className={labelClass}>
            Monto del ajuste
            <input
              name="adjustmentAmount"
              type="number"
              min="0"
              step="1"
              defaultValue={0}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Motivo
            <input name="adjustmentReason" className={fieldClass} />
          </label>
        </div>
      </details>
      <p className="text-sm text-muted-foreground">
        Saldo tras el pago:{" "}
        <span className="metric-number font-semibold text-foreground">
          {formatMoney(Math.max(0, item.balance - amount), item.currency)}
        </span>
      </p>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-success">
          Pago registrado.
        </p>
      ) : null}
      <Button type="submit" variant="primary" isLoading={pending}>
        Registrar pago
      </Button>
    </form>
  );
}

function LifecycleForm({ item }: { item: CollectionItem }) {
  const [state, formAction, pending] = useActionState(
    transitionMembershipAction,
    initialState,
  );
  const [transition, setTransition] = useState("renew");
  const [confirmed, setConfirmed] = useState(false);
  const destructive = transition === "cancel" || transition === "expire";
  const available = (
    [
      {
        value: "renew",
        label: "Renovar",
        allowed: item.status !== "cancelled",
      },
      {
        value: "pause",
        label: "Pausar",
        allowed: item.status === "active" || item.status === "past_due",
      },
      {
        value: "expire",
        label: "Marcar vencida",
        allowed: item.status === "active" || item.status === "past_due",
      },
      {
        value: "cancel",
        label: "Cancelar",
        allowed: item.status !== "cancelled",
      },
    ] as const
  ).filter((option) => option.allowed);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="membershipId" value={item.membershipId} />
      <label className={labelClass}>
        Acción
        <select
          name="transition"
          value={transition}
          onChange={(event) => {
            setTransition(event.target.value);
            setConfirmed(false);
          }}
          className={fieldClass}
        >
          {available.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {destructive ? (
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1"
          />
          Confirmo que la membresía deja de generar cobros y el saldo pendiente
          queda registrado en el historial.
        </label>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-success">
          Membresía actualizada.
        </p>
      ) : null}
      <Button
        type="submit"
        variant={destructive ? "danger" : "secondary"}
        isLoading={pending}
        disabled={destructive && !confirmed}
      >
        Aplicar
      </Button>
    </form>
  );
}

export function CollectionList({
  items,
  today,
  canManage,
}: {
  items: CollectionItem[];
  today: string;
  canManage: boolean;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin cobros pendientes"
        description="No hay membresías con saldo para estos filtros. Ajusta el estado o el rango de fechas."
      />
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.membershipId}>
          <Surface className="grid gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/dashboard/students/${item.studentId}`}
                  className="truncate font-semibold text-foreground"
                >
                  {item.studentName}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.planName} · vence{" "}
                  <time dateTime={item.dueOn}>{item.dueOn}</time>
                </p>
                <div className="mt-2">
                  <StatusBadge tone={item.isOverdue ? "warning" : "neutral"}>
                    {item.isOverdue
                      ? `Mora ${item.overdueDays} d`
                      : (statusLabels[item.status] ?? item.status)}
                  </StatusBadge>
                </div>
              </div>
              <p className="metric-number shrink-0 text-right text-lg font-semibold">
                {formatMoney(item.balance, item.currency)}
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <BottomSheet
                  title={`Cobrar a ${item.studentName}`}
                  description={`${item.planName} · saldo ${formatMoney(item.balance, item.currency)}`}
                  trigger="Cobrar"
                  triggerClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-transparent bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <PaymentForm item={item} today={today} />
                </BottomSheet>
                <BottomSheet
                  title={`Membresía de ${item.studentName}`}
                  description="Pausar, renovar, marcar vencida o cancelar."
                  trigger="Membresía"
                  triggerClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-surface-raised px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay"
                >
                  <LifecycleForm item={item} />
                </BottomSheet>
              </div>
            ) : null}
          </Surface>
        </li>
      ))}
    </ul>
  );
}
