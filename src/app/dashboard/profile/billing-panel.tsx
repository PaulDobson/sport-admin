"use client";

import { useState } from "react";
import {
  FileText,
  CreditCard,
  Plus,
  Building2,
  Smartphone,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Receipt,
  AlertCircle,
  Wallet,
} from "lucide-react";
import type { OwnerBilling } from "@/domain/saas-administration/owner-billing";
import { StatusBadge, Button } from "@/presentation/components/primitives";
import { formatMoney } from "@/lib/format-money";

// ── helpers ──────────────────────────────────────────────────────────────────

type Invoice = OwnerBilling["invoices"][number];
type InvoiceStatus = Invoice["status"];

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function invoiceStatusTone(status: InvoiceStatus) {
  if (status === "paid") return "success" as const;
  if (status === "open") return "info" as const;
  if (status === "past_due") return "warning" as const;
  if (status === "void" || status === "refunded") return "neutral" as const;
  return "neutral" as const;
}

function invoiceStatusLabel(status: InvoiceStatus) {
  const map: Record<InvoiceStatus, string> = {
    draft: "Borrador",
    open: "Pendiente",
    paid: "Pagado",
    past_due: "Vencido",
    void: "Anulado",
    refunded: "Devuelto",
  };
  return map[status];
}

function invoiceStatusIcon(status: InvoiceStatus) {
  if (status === "paid")
    return <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />;
  if (status === "open" || status === "draft")
    return <Clock className="h-4 w-4 text-info" aria-hidden="true" />;
  if (status === "past_due")
    return <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />;
  return <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

// ── Payment method modal (UI only) ───────────────────────────────────────────

type PaymentMethodType = "card" | "bank_transfer" | "webpay";

interface PaymentMethod {
  type: PaymentMethodType;
  label: string;
  detail: string;
  icon: React.ReactNode;
}

const MOCK_METHODS: PaymentMethod[] = [
  {
    type: "card",
    label: "Tarjeta de crédito / débito",
    detail: "Visa, Mastercard, Redcompra",
    icon: <CreditCard className="h-5 w-5" aria-hidden="true" />,
  },
  {
    type: "webpay",
    label: "Webpay Plus",
    detail: "Transbank — pago en línea seguro",
    icon: <Smartphone className="h-5 w-5" aria-hidden="true" />,
  },
  {
    type: "bank_transfer",
    label: "Transferencia bancaria",
    detail: "Depósito directo a cuenta corriente",
    icon: <Building2 className="h-5 w-5" aria-hidden="true" />,
  },
];

function PaymentMethodSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<PaymentMethodType | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!selected) return;
    setSaved(true);
    setTimeout(onClose, 1400);
  }

  return (
    /* Overlay */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Método de pago"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-white/10 bg-card p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Método de pago preferido
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Integración con Transbank en desarrollo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2" role="radiogroup" aria-label="Selecciona un método">
          {MOCK_METHODS.map((method) => (
            <button
              key={method.type}
              type="button"
              role="radio"
              aria-checked={selected === method.type}
              onClick={() => setSelected(method.type)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                selected === method.type
                  ? "border-primary bg-primary/10"
                  : "border-white/6 bg-surface-raised/60 hover:border-white/12"
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  selected === method.type
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {method.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {method.label}
                </p>
                <p className="text-xs text-muted-foreground">{method.detail}</p>
              </div>
              {selected === method.type && (
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>

        {saved ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            <p className="text-sm text-success">
              Método guardado. Disponible pronto con Transbank.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              disabled={!selected}
              onClick={handleSave}
            >
              Guardar método
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        )}

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          🔒 Pago seguro procesado por Transbank · Próximamente disponible
        </p>
      </div>
    </div>
  );
}

// ── Invoice row card ─────────────────────────────────────────────────────────

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail =
    invoice.payments.length > 0 || invoice.receipts.length > 0;

  return (
    <li className="rounded-xl border border-white/6 bg-surface-raised/50">
      {/* Main row */}
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((v) => !v)}
        className={`flex w-full items-center gap-3 p-3.5 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
        aria-expanded={hasDetail ? expanded : undefined}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/50 text-muted-foreground">
          {invoiceStatusIcon(invoice.status)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {invoice.invoice_number}
            </span>
            <StatusBadge tone={invoiceStatusTone(invoice.status)}>
              {invoiceStatusLabel(invoice.status)}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {invoice.due_on
              ? `Vence ${formatDate(invoice.due_on)}`
              : "Sin fecha de vencimiento"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="metric-number text-sm font-bold text-foreground">
            {formatMoney(invoice.amount, invoice.currency)}
          </p>
          {invoice.balance > 0 && invoice.status !== "paid" && (
            <p className="text-[11px] text-warning">
              Saldo: {formatMoney(invoice.balance, invoice.currency)}
            </p>
          )}
        </div>

        {hasDetail && (
          <ChevronRight
            className={`ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div className="border-t border-white/6 px-4 py-3 space-y-3">
          {/* Payments */}
          {invoice.payments.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Pagos registrados
              </p>
              <ul className="space-y-1.5">
                {invoice.payments.map((pmt, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {pmt.status === "succeeded" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(pmt.occurred_at)}
                      </span>
                    </div>
                    <span className="metric-number text-xs font-semibold text-foreground">
                      {formatMoney(pmt.amount, pmt.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Receipts */}
          {invoice.receipts.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Boletas / recibos
              </p>
              <ul className="space-y-1.5">
                {invoice.receipts.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <span className="text-xs text-foreground">
                        Folio {r.folio}
                      </span>
                      {!r.ready && (
                        <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                          Procesando
                        </span>
                      )}
                    </div>
                    <span className="metric-number text-xs font-semibold text-foreground">
                      {formatMoney(r.total, "CLP")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function BillingPanel({
  invoices,
}: {
  invoices: OwnerBilling["invoices"];
}) {
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  return (
    <>
      <section
        aria-label="Facturación"
        className="rounded-2xl border border-white/6 bg-card p-5 sm:p-6"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Facturación
              </p>
              <h2 className="text-base font-semibold text-foreground">
                Facturas y pagos
              </h2>
            </div>
          </div>
        </div>

        {/* Payment method CTA */}
        <button
          type="button"
          onClick={() => setShowPaymentSheet(true)}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-border/60 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/50 text-muted-foreground">
            <Wallet className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">
              Método de pago preferido
            </p>
            <p className="text-xs text-muted-foreground">
              Configurar para pagos automáticos · Próximamente con Transbank
            </p>
          </div>
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>

        {/* Invoice list */}
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-8 text-center">
            <FileText
              className="mx-auto h-8 w-8 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium text-foreground">
              Sin facturas registradas
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aquí aparecerán tus pagos al sistema SaaS.
            </p>
          </div>
        ) : (
          <ul className="space-y-2" aria-label="Historial de facturas">
            {invoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </ul>
        )}
      </section>

      {/* Payment method modal */}
      {showPaymentSheet && (
        <PaymentMethodSheet onClose={() => setShowPaymentSheet(false)} />
      )}
    </>
  );
}
