import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { Surface } from "@/presentation/components/primitives";
import { formatMoney } from "@/lib/format-money";
import { BusinessRuleViolationError } from "@/domain/shared/errors";
import { getSaasDocumentConfiguration } from "@/infrastructure/composition/saas-documents-composition";
import { loadBackofficeContext } from "../../_lib/backoffice-context";
import { ReceiptForm } from "./receipt-form";
import { ReconciliationForm } from "./reconciliation-form";

const statuses = { queued: "En cola",sending: "Enviando",accepted: "Enviado al proveedor (no confirma entrega)",
  delivered: "Entrega confirmada",failed: "Fallido",unknown: "Resultado incierto: requiere conciliación" };
export default async function ReceiptPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const [{ deps,shell },{ receiptId }] = await Promise.all([loadBackofficeContext(),params]);
  if (!z.uuid().safeParse(receiptId).success) notFound();
  let receipt;
  try { receipt = await deps.billingPayments.getReceipt(receiptId); }
  catch (error) {
    if (!(error instanceof BusinessRuleViolationError)) throw error;
    return <BackofficeShell title="Comprobante" current="collections" {...shell}><Surface><p role="alert" className="text-destructive">{error.message}</p></Surface></BackofficeShell>;
  }
  const config = getSaasDocumentConfiguration();
  const s = receipt.snapshot;
  const recipient = receipt.billing_email || receipt.primary_email;
  const blocked = receipt.deliveries.some((d) => ["unknown","queued","sending"].includes(d.status));
  return <BackofficeShell title={`Comprobante ${receipt.folio}`} description="Comprobante referencial · sin validez tributaria" current="collections" {...shell}>
    <div className="mx-auto grid max-w-3xl gap-5">
      <Link href={`/backoffice/collections/${receipt.invoice_id}`} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 text-sm font-semibold">Volver al cobro</Link>
      <Surface><h2 className="text-lg font-bold">Pago confirmado · {formatMoney(s.total,"CLP")}</h2>
        <p className="mt-2 break-words text-sm">{s.tenant.name} · {s.plan_name} · {s.invoice_number}</p>
        <p className="mt-2 text-sm text-muted-foreground">Pago: {s.paid_on} · Neto {formatMoney(s.net,"CLP")} + IVA informativo incluido {formatMoney(s.vat,"CLP")}.</p>
        <p className="mt-2 text-sm text-muted-foreground">Emisor registrado: {s.issuer.legal_name} · RUT {s.issuer.tax_id}. Los cambios posteriores no alteran este comprobante.</p>
      </Surface>
      <Surface><h2 className="font-bold">Documento PDF</h2>
        {receipt.document ? <a href={`/api/saas/receipts/${receipt.id}/download`} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Descargar PDF privado</a>
          : <><p role="status" className="mt-2 text-sm">{receipt.pdf_job.status === "failed" ? "La generación falló. El pago permanece confirmado." : receipt.pdf_job.status === "running" ? "Generando PDF…" : "PDF en cola. El pago ya está registrado."}</p>
            {receipt.pdf_job.last_error ? <p className="mt-2 break-all text-xs text-destructive">{receipt.pdf_job.last_error}</p> : null}
            {receipt.pdf_job.status === "failed" ? <ReceiptForm receiptId={receipt.id} operationId={randomUUID()} intent="retry" /> : null}</>}
        {!config.enabled ? <p className="mt-3 text-sm text-warning">El procesador está desactivado. Habilítalo después de validar SQL y configurar el scheduler.</p> : null}
        <Link href="/backoffice/finance/documents" className="mt-3 inline-flex min-h-11 items-center text-sm underline">Revisar procesador PDF y correo</Link>
      </Surface>
      <Surface><h2 className="font-bold">Enviar o reenviar por correo</h2>
        {!config.mailConfigured ? <p className="mt-2 text-sm text-warning">Resend o el remitente no están configurados. La descarga del PDF es independiente del correo.</p> : null}
        {!recipient ? <p className="mt-2 text-sm text-warning">No hay correo de facturación ni contacto principal. Actualiza los datos del tenant antes de enviar.</p> : null}
        {blocked ? <p role="alert" className="mt-2 text-sm text-warning">Hay un envío pendiente o incierto. No se permite reenviar hasta finalizar o conciliar esa solicitud.</p> : null}
        {recipient && receipt.document && config.enabled && config.mailConfigured && !blocked
          ? <ReceiptForm receiptId={receipt.id} operationId={randomUUID()} intent="send" recipient={recipient} source={receipt.billing_email ? "billing" : "primary_contact"} /> : null}
        <ul className="mt-3 divide-y divide-border">{receipt.deliveries.map((d) => <li key={d.id} className="grid gap-1 py-3 text-sm">
          <p className="font-semibold">{statuses[d.status]}</p><p className="break-all">{d.recipient}</p><p className="text-xs text-muted-foreground">{d.requested_at}</p>
          {d.last_error ? <p className="break-all text-xs text-destructive">{d.last_error}</p> : null}
          {d.status === "unknown" ? <ReconciliationForm receiptId={receipt.id} deliveryId={d.id} /> : null}</li>)}</ul>
      </Surface>
    </div>
  </BackofficeShell>;
}
