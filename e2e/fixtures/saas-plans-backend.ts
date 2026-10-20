import type { SaasCatalogPlan, SaasPlanVersion } from "../../src/domain/saas-administration/plan-catalog";
import type { PlanFormState } from "../../src/app/backoffice/plans/actions";
import type { SaasFeature } from "../../src/domain/saas-administration/plan-entitlement";
import type { AssignmentFormState } from "../../src/app/backoffice/tenants/[tenantId]/subscription/actions";
import type { AssignmentPreview, SubscriptionManagement } from "../../src/domain/saas-administration/subscription-management";
import { quoteSubscriptionAssignment } from "../../src/domain/saas-administration/subscription-assignment";
import { billingRate, includedVat } from "../../src/domain/saas-administration/billing-money";
import { daysBetween } from "../../src/domain/saas-administration/billing-period";
import { quotePlanChange } from "../../src/domain/saas-administration/plan-change";
import type { PlanChangeFormState } from "../../src/app/backoffice/tenants/[tenantId]/subscription/actions";
import type { PlanChangePreview } from "../../src/domain/saas-administration/plan-change-management";
import type { RenewalFormState } from "../../src/app/backoffice/tenants/[tenantId]/subscription/renewal-action";
import type { RenewalProcessorStatus } from "../../src/domain/saas-administration/renewal-processing";
import { quoteSubscriptionRenewal, type RenewalTerms } from "../../src/domain/saas-administration/subscription-renewal";
import type { BillingIssuer } from "../../src/domain/saas-administration/billing-issuer";
import type { CollectionFilters, SaasCollection } from "../../src/domain/saas-administration/collections";
import type { IssuerFormState } from "../../src/app/backoffice/finance/issuer/actions";
import { saveSaasBillingIssuer } from "../../src/application/saas-administration/use-cases/manage-billing-issuer";
import { NotFoundError, ValidationError } from "../../src/domain/shared/errors";
import { receiptFixture } from "../../src/domain/saas-administration/payment-receipt.fixture";
import type { ReceiptDetail } from "../../src/domain/saas-administration/payment-receipt";
import type { BillingPaymentsPort } from "../../src/application/saas-administration/ports/billing-payments-port";
import type { DocumentJobsPort } from "../../src/application/saas-administration/ports/document-jobs-port";
import type { DocumentJobsPage } from "../../src/domain/saas-administration/document-jobs";
import type { FinancialLedgerRequest } from "../../src/domain/saas-administration/financial-ledger";
import type { PaymentFormState } from "../../src/app/backoffice/collections/[invoiceId]/payment-actions";
import type { ReceiptFormState } from "../../src/app/backoffice/receipts/[receiptId]/actions";
import { recordSaasPayment,voidSaasInvoice,requestSaasReceiptDelivery,retrySaasReceiptPdf,reconcileSaasReceiptDelivery } from "../../src/application/saas-administration/use-cases/manage-billing-payments";

export const randomUUID = () => crypto.randomUUID();
export const getSaasRenewalConfiguration = () => ({
  enabled: localStorage.getItem("saas-renewals-enabled-fixture") === "true", schedulerConfigured: false,
});
export function notFound(): never { throw new Error("Fixture route not found"); }
export function redirect(path: string): never { throw new Error(`Fixture redirected to ${path}`); }
export async function signOutAction() {}
const initial: SaasCatalogPlan = {
  id: "ad430000-0000-4000-8000-000000000001", slug: "academia", status: "active",
  currentVersion: {
    id: "ad430000-0000-4000-8000-000000000002", versionNumber: 1,
    name: "Academia Pro", description: "Herramientas para gestionar tu academia.",
    price: 11900, currency: "CLP", durationUnit: "months", durationCount: 1,
    trialDays: 7, maxStudents: 100, maxUsers: 5, features: ["reports"],
    services: ["Capacitación del equipo"], legacy: false, createdAt: "2026-01-01T00:00:00Z",
  },
};
const load = (): SaasCatalogPlan[] => JSON.parse(localStorage.getItem("saas-plans-fixture") ?? JSON.stringify([initial]));
const tenantId = "ad440000-0000-4000-8000-000000000011";
const management = (): SubscriptionManagement => JSON.parse(localStorage.getItem("saas-assignment-fixture") ?? JSON.stringify({
  tenantId, tenantName: "Academia Central", tenantStatus: "pending",
  businessDate: "2028-01-31", activeStudents: 10, activeUsers: 2, subscription: null, scheduledChange: null,
}));
export async function loadBackofficeContext() {
  return {
    shell: { accountName: "Ana Administradora" },
    deps: {
      planCatalog: { isPlatformAdmin: async () => true, list: async () => load(),
        listVersions: async (input: { planId: string; page: number; pageSize: number }) => {
          const plan = load().find((item) => item.id === input.planId);
          if (!plan) throw new NotFoundError("Plan", input.planId);
          const saved: SaasPlanVersion[] = JSON.parse(localStorage.getItem(`saas-plan-history:${plan.id}`) ?? "[]");
          const versions = [...saved.filter((version) => version.id !== plan.currentVersion.id), plan.currentVersion]
            .sort((a, b) => b.versionNumber - a.versionNumber);
          return { planId: plan.id, slug: plan.slug, status: plan.status,
            currentVersionId: plan.currentVersion.id, queriedAt: new Date().toISOString(),
            page: input.page, pageSize: input.pageSize, total: versions.length,
            versions: versions.slice((input.page - 1) * input.pageSize, input.page * input.pageSize) };
        },
      },
      subscriptions: { isPlatformAdmin: async () => true, getManagement: async () => management() },
      renewals: { isPlatformAdmin: async () => true, getStatus: async () => renewalStatus() },
      collections: { isPlatformAdmin: async () => true, list: async (filters: CollectionFilters) => {
        const items = readCollections().filter((i) => (!filters.tenantId || i.tenantId === filters.tenantId)
          && i.tenantName.toLocaleLowerCase("es").includes(filters.query.toLocaleLowerCase("es"))
          && (filters.status === "all" || i.status === filters.status) && (!filters.currency || i.currency === filters.currency)
          && (!filters.dueFrom || (i.dueOn !== null && i.dueOn >= filters.dueFrom))
          && (!filters.dueUntil || (i.dueOn !== null && i.dueOn <= filters.dueUntil)));
        return { businessDate: "2026-10-18", total: items.length, page: filters.page, pageSize: filters.pageSize,
          items: items.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize) };
      }, get: async (id: string) => {
        const invoice = readCollections().find((i) => i.id === id);
        if (!invoice) throw new Error("Unknown fixture invoice");
        return { businessDate: "2026-10-18", invoice, charges: invoice.confirmedAmount ? [{
          id: invoice.id, amount: invoice.confirmedAmount, currency: invoice.currency, status: "succeeded" as const,
          occurredAt: "2026-01-01T00:00:00Z", provider: "Proveedor histórico", manualMethod: null, manualReference: null,
        }] : [], refunds: [], chargeCount: invoice.confirmedAmount ? 1 : 0, refundCount: 0 };
      } },
      billingIssuer: { isPlatformAdmin: async () => true, get: async () => readIssuer() },
      billingPayments: fixturePayments,
      financialLedger: { isPlatformAdmin: async () => true,get: async (input: FinancialLedgerRequest) => ({
        ...input,total: 25,amount: 10000,entries: Array.from({ length: input.page === 1 ? 20 : 5 },(_,i) => ({
          id: `ad520000-0000-4000-8000-${String((input.page-1)*20+i+1).padStart(12,"0")}`,
          tenant_id: tenantId,tenant_name: "Academia Central",invoice_id: collectionInvoices[3].id,
          label: "Pago confirmado",event_at: "2026-10-18T00:00:00Z",amount: 400,
        })),
      }) },
    },
  };
}

const collectionInvoices: SaasCollection[] = Array.from({ length: 25 }, (_, index) => ({
  id: `ad480000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, tenantId,
  tenantName: index === 1 ? "Academia Internacional" : "Academia Central",
  subscriptionId: tenantId, invoiceNumber: `INV-${String(index + 1).padStart(3, "0")}`,
  storedStatus: index === 2 ? "paid" : "open", status: index === 2 ? "paid" : "past_due", kind: "legacy",
  amount: index === 1 ? 19.99 : 11900, currency: index === 1 ? "USD" : "CLP",
  confirmedAmount: index === 0 ? 3900 : index === 1 ? 9.99 : 0,
  balance: index === 0 ? 8000 : index === 1 ? 10 : index === 2 ? 0 : 11900,
  inFlightCount: index === 0 ? 1 : 0, importedSettlement: index === 2,
  periodStartsOn: "2026-01-01", periodEndExclusive: "2026-02-01",
  dueOn: "2026-01-01", issuedAt: "2026-01-01T00:00:00Z",
  paidAt: index === 2 ? "2026-01-01T00:00:00Z" : null, planName: index === 2 ? null : "Plan Academia",
}));
const readIssuer = (): BillingIssuer | null => JSON.parse(localStorage.getItem("saas-issuer-fixture") ?? "null");
const readCollections = (): SaasCollection[] => JSON.parse(localStorage.getItem("saas-collections-fixture") ?? JSON.stringify(collectionInvoices));
const readReceipts = (): ReceiptDetail[] => JSON.parse(localStorage.getItem("saas-receipts-fixture") ?? "[]");
const saveReceipts = (items: ReceiptDetail[]) => localStorage.setItem("saas-receipts-fixture",JSON.stringify(items));
const fixturePayments: BillingPaymentsPort & DocumentJobsPort = {
  async listDocumentJobs(filters) {
    const queriedAt = new Date().toISOString();
    const jobs: DocumentJobsPage["items"] = readReceipts().flatMap((receipt) => {
      const common = {
        receipt_id: receipt.id, folio: receipt.folio, tenant_id: receipt.tenant_id,
        tenant_name: receipt.snapshot.tenant.name, max_attempts: 5,
        available_at: receipt.created_at, lease_expires_at: null, lease_expired: false,
        created_at: receipt.created_at, completed_at: null,
      };
      return [
        { ...common, id: receipt.id, kind: "receipt_pdf" as const, status: receipt.pdf_job.status,
          attempts: receipt.pdf_job.attempts, last_error: receipt.pdf_job.last_error },
        ...receipt.deliveries.map((delivery) => ({
          ...common, id: delivery.id, kind: "receipt_email" as const,
          status: delivery.status === "accepted" || delivery.status === "delivered" ? "succeeded" as const
            : delivery.status === "sending" ? "running" as const : delivery.status,
          attempts: delivery.status === "queued" ? 0 : 1, last_error: delivery.last_error,
          created_at: delivery.requested_at,
        })),
      ];
    });
    const filtered = jobs.filter((job) => (filters.kind === "all" || job.kind === filters.kind)
      && (filters.status === "all" || job.status === filters.status
        || (filters.status === "attention" && ["failed", "unknown"].includes(job.status)))
      && job.tenant_name.toLowerCase().includes(filters.query.toLowerCase()))
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
    return { queried_at: queriedAt, page: filters.page, page_size: filters.pageSize, total: filtered.length,
      items: filtered.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize) };
  },
  isPlatformAdmin: async () => true,
  listReceipts: async (invoiceId) => readReceipts().filter((r) => r.invoice_id === invoiceId).map((r) => ({
    id: r.id,folio: r.folio,total: r.snapshot.total,created_at: r.created_at,ready: Boolean(r.document),
  })),
  getReceipt: async (id) => {
    const r = readReceipts().find((r) => r.id === id); if (!r) throw new Error("Unknown fixture receipt"); return r;
  },
  pay: async (input) => {
    const invoices = readCollections(); const invoice = invoices.find((i) => i.id === input.invoiceId);
    if (!invoice || invoice.balance !== input.amount || invoice.inFlightCount) throw new Error("El saldo cambió.");
    invoice.balance = 0; invoice.confirmedAmount += input.amount; invoice.status = "paid"; invoice.storedStatus = "paid";
    localStorage.setItem("saas-collections-fixture",JSON.stringify(invoices));
    const receipt: ReceiptDetail = { ...receiptFixture,id: randomUUID(),tenant_id: tenantId,invoice_id: input.invoiceId,
      snapshot: { ...receiptFixture.snapshot,...includedVat(input.amount),paid_on: input.paidOn,
        reference: input.reference,method: input.method,tenant: { ...receiptFixture.snapshot.tenant,name: invoice.tenantName } },
      document: null,pdf_job: { status: "failed",attempts: 5,last_error: "SYNTHETIC_STORAGE_FAILURE" },
      deliveries: [],billing_email: "facturacion@example.invalid",primary_email: "principal@example.invalid" };
    saveReceipts([...readReceipts(),receipt]);
    return { invoiceId: invoice.id,tenantId,chargeId: randomUUID(),receiptId: receipt.id,amount: input.amount,status: "paid" };
  },
  voidInvoice: async ({ invoiceId }) => {
    const invoices = readCollections(); const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice || invoice.confirmedAmount || invoice.inFlightCount) throw new Error("No se puede anular.");
    invoice.balance = 0; invoice.status = "void"; invoice.storedStatus = "void";
    localStorage.setItem("saas-collections-fixture",JSON.stringify(invoices));
  },
  retryPdf: async (id) => {
    const receipts = readReceipts(); const receipt = receipts.find((r) => r.id === id);
    if (!receipt) throw new Error("Unknown receipt");
    receipt.document = { receipt_id: id,storage_path: `${id}/v1.pdf`,sha256: "a".repeat(64),byte_size: 100,content_type: "application/pdf" };
    receipt.pdf_job = { status: "succeeded",attempts: 1,last_error: null }; saveReceipts(receipts);
    return { status: "queued" };
  },
  requestDelivery: async (input) => {
    const receipts = readReceipts(); const receipt = receipts.find((r) => r.id === input.receiptId);
    if (!receipt?.document) throw new Error("PDF no disponible");
    const deliveryId = randomUUID(); const status = localStorage.getItem("saas-mail-result-fixture") === "unknown" ? "unknown" : "failed";
    receipt.deliveries.unshift({ id: deliveryId,recipient: input.recipient,status,requested_at: new Date().toISOString(),last_error: "SYNTHETIC_MAIL_FAILURE" });
    saveReceipts(receipts); return { deliveryId,status: "queued" };
  },
  reconcileDelivery: async (input) => {
    const receipts = readReceipts();
    for (const r of receipts) { const d = r.deliveries.find((d) => d.id === input.deliveryId);
      if (d) { d.status = input.notSent ? "failed" : "accepted"; d.last_error = null; } }
    saveReceipts(receipts);
  },
};
export const getSaasDocumentConfiguration = () => ({ enabled: true,workerConfigured: false,mailConfigured: true });
export const getSaasDocumentProcessorStatus = async () => ({ last_worker_at: null,queued: 2,failed: 1,unknown: 0 });
export async function paymentAction(_previous: PaymentFormState,form: FormData): Promise<PaymentFormState> {
  await new Promise((resolve) => setTimeout(resolve,200));
  if (form.get("reason") === "Fallo simulado") return { error: "Sin conexión; revisa antes de reintentar.",fieldErrors: {},result: null,voided: false };
  try {
    const common = { invoiceId: form.get("invoiceId"),operationId: form.get("operationId"),reason: form.get("reason") };
    if (form.get("intent") === "void") { await voidSaasInvoice(common,fixturePayments); return { error: null,fieldErrors: {},result: null,voided: true }; }
    const result = await recordSaasPayment({ ...common,amount: Number(form.get("amount")),paidOn: form.get("paidOn"),method: form.get("method"),reference: form.get("reference") || null },fixturePayments);
    return { error: null,fieldErrors: {},result,voided: false };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error",fieldErrors: error instanceof ValidationError ? Object.fromEntries(error.issues.map((i) => [i.path,i.message])) : {},result: null,voided: false };
  }
}
export async function receiptAction(_previous: ReceiptFormState,form: FormData): Promise<ReceiptFormState> {
  await new Promise((resolve) => setTimeout(resolve,200));
  try {
    if (form.get("intent") === "retry") await retrySaasReceiptPdf(form.get("receiptId"),fixturePayments);
    else if (form.get("intent") === "reconcile") await reconcileSaasReceiptDelivery({ deliveryId: form.get("deliveryId"),
      notSent: form.get("resolution") === "not_sent",providerId: form.get("providerId") || null,reason: form.get("reason") },fixturePayments);
    else await requestSaasReceiptDelivery({ receiptId: form.get("receiptId"),operationId: form.get("operationId"),
      recipient: form.get("recipient"),source: form.get("source"),fallbackApproved: form.get("fallbackApproved") === "on" },fixturePayments);
    return { error: null,message: "Solicitud registrada en fixture. Actualiza para consultar el resultado." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Error",message: null }; }
}
export const createAuthDeps = async () => ({ auth: { getCurrentUserId: async () => "fixture-owner" },memberships: {
  findActiveByUser: async () => [{ tenantId,role: "owner" }],findOperationalByUser: async () => [],
} });
export const createOwnerBillingDeps = async () => ({ ownerBilling: { get: async () => ({
  tenant_id: tenantId,tenant_name: "Academia Central",tenant_status: "suspended",owner_tenants: [{ id: tenantId,name: "Academia Central" }],
  balances: [{ currency: "CLP",amount: 11900 }],subscription: {
    id: tenantId,status: "suspended",payment_status: "pending",plan_name: "Academia Pro",price: 11900,currency: "CLP",
    period_starts_on: "2026-10-01",period_end_exclusive: "2026-11-01",duration_unit: "months",duration_count: 1,
    services: ["Capacitación del equipo"],features: ["reports"],max_students: 100,max_users: 5,
  },scheduled_change: null,page: 1,total: 1,invoices: [{
    id: collectionInvoices[3].id,invoice_number: "INV-004",amount: 11900,currency: "CLP",balance: 11900,
    status: "past_due",due_on: "2026-10-18",imported_settlement: false,payments: [],
    receipts: readReceipts().map((r) => ({ id: r.id,folio: r.folio,total: r.snapshot.total,ready: Boolean(r.document) })),
  }],
}) } });
export async function saveIssuerAction(previous: IssuerFormState, form: FormData): Promise<IssuerFormState> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (form.get("legalName") === "Fallo simulado") return { error: "Sin conexión; tus datos se conservaron.", fieldErrors: {}, issuer: null };
  try {
    const issuer = await saveSaasBillingIssuer({
      operationId: form.get("operationId"), expectedVersionId: form.get("expectedVersionId") || null,
      legalName: form.get("legalName"), taxId: form.get("taxId"),
      address: form.get("address"), email: form.get("email"), reason: form.get("reason"),
    }, {
      isPlatformAdmin: async () => true, get: async () => readIssuer(), save: async (input) => {
        const current = readIssuer();
        if ((current?.id ?? null) !== input.expectedVersionId) throw new Error("Otro administrador cambió el emisor.");
        const saved = { id: randomUUID(), versionNumber: (current?.versionNumber ?? 0) + 1,
          legalName: input.legalName, taxId: input.taxId, address: input.address, email: input.email, createdAt: new Date().toISOString() };
        localStorage.setItem("saas-issuer-fixture", JSON.stringify(saved));
        return saved;
      },
    });
    return { issuer, error: null, fieldErrors: {} };
  } catch (error) {
    if (error instanceof ValidationError) return {
      issuer: null, error: "Revisa los datos del emisor.",
      fieldErrors: Object.fromEntries(error.issues.map((i) => [i.path, i.message])),
    };
    throw error;
  }
}

export async function assignmentAction(previous: AssignmentFormState, form: FormData): Promise<AssignmentFormState> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const selected = load().find((p) => p.currentVersion.id === form.get("planVersionId"));
  if (!selected) return { error: "Selecciona un plan.", fieldErrors: {}, preview: null, result: null, stale: false };
  const current = management();
  const quote = quoteSubscriptionAssignment({
    plan: selected, startsOn: String(form.get("startsOn")), today: current.businessDate,
    useTrial: form.get("useTrial") === "on", dueOn: String(form.get("dueOn") || "") || undefined,
    activeStudents: current.activeStudents, activeUsers: current.activeUsers, hasCurrentSubscription: Boolean(current.subscription),
  });
  const preview: AssignmentPreview = {
    ...quote, tenantId, tenantName: current.tenantName, tenantStatus: current.tenantStatus,
    businessDate: current.businessDate, planName: selected.currentVersion.name,
    versionNumber: selected.currentVersion.versionNumber, useTrial: Boolean(quote.trialPeriod),
    dueOn: String(form.get("dueOn") || "") || null, resolvedDueOn: quote.dueOn,
    fingerprint: "a".repeat(32), trialEndExclusive: quote.trialPeriod?.endsBefore ?? null,
    price: selected.currentVersion.price, initialAmount: quote.initialInvoice?.total ?? 0,
    createsInvoice: Boolean(quote.initialInvoice), net: quote.initialInvoice?.net ?? 0, vat: quote.initialInvoice?.vat ?? 0,
    durationUnit: selected.currentVersion.durationUnit, durationCount: selected.currentVersion.durationCount,
    activeStudents: current.activeStudents, activeUsers: current.activeUsers,
    maxStudents: selected.currentVersion.maxStudents, maxUsers: selected.currentVersion.maxUsers,
    features: selected.currentVersion.features, services: selected.currentVersion.services,
  };
  if (form.get("intent") !== "confirm") return { error: null, fieldErrors: {}, preview, result: null, stale: false };
  if (form.get("reason") === "Conflicto simulado") return {
    error: "El uso cambió. Revisa nuevamente las condiciones.", fieldErrors: {},
    preview: null, result: null, stale: true,
  };
  if (form.get("reason") === "Fallo simulado") return {
    error: "Sin conexión; tus datos se conservaron.", fieldErrors: {}, preview: previous.preview, result: null, stale: false,
  };
  const id = randomUUID();
  const end = quote.trialPeriod?.endsBefore ?? quote.firstPaidPeriod.endsBefore;
  localStorage.setItem("saas-assignment-fixture", JSON.stringify({
    ...current, subscription: {
      id, planId: selected.id, planVersionId: selected.currentVersion.id,
      planName: selected.currentVersion.name, status: quote.status, paymentStatus: quote.paymentStatus,
      startsOn: quote.startsOn, periodStartsOn: quote.startsOn, periodEndExclusive: end,
      nextBillingDate: end, price: selected.currentVersion.price, currency: "CLP",
      durationUnit: selected.currentVersion.durationUnit, durationCount: selected.currentVersion.durationCount,
    },
  }));
  return { error: null, fieldErrors: {}, preview: null, stale: false, result: {
    tenantId, subscriptionId: id, planVersionId: quote.planVersionId,
    invoiceId: quote.initialInvoice ? randomUUID() : null, status: quote.status,
    initialAmount: quote.initialInvoice?.total ?? 0, periodEndExclusive: end,
  } };
}
export async function publishPlanAction(_previous: PlanFormState, form: FormData): Promise<PlanFormState> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (form.get("name") === "Fallo simulado") {
    return { saved: false, error: "No pudimos guardar el plan. Tus cambios se conservaron.", fieldErrors: {} };
  }
  const plans = load();
  const previous = plans.find((p) => p.id === form.get("planId"));
  const selectedFeatures = form.getAll("features").filter((f): f is SaasFeature => ["reports", "offline", "realtime", "push"].includes(String(f)));
  const result: SaasCatalogPlan = {
    id: previous?.id ?? randomUUID(), slug: previous?.slug ?? "nuevo-plan", status: "active",
    currentVersion: {
      id: randomUUID(), versionNumber: (previous?.currentVersion.versionNumber ?? 0) + 1,
      name: String(form.get("name")), description: String(form.get("description") ?? "") || null,
      price: Number(form.get("price")), currency: "CLP",
      durationUnit: form.get("durationUnit") === "days" ? "days" : "months",
      durationCount: Number(form.get("durationCount")), trialDays: Number(form.get("trialDays")),
      maxStudents: Number(form.get("maxStudents")), maxUsers: Number(form.get("maxUsers")),
      features: selectedFeatures, services: String(form.get("services") ?? "").split("\n").filter(Boolean),
      legacy: false, createdAt: new Date().toISOString(),
    },
  };
  localStorage.setItem("saas-plans-fixture", JSON.stringify([...plans.filter((p) => p.id !== result.id), result]));
  if (previous) {
    const history: SaasPlanVersion[] = JSON.parse(localStorage.getItem(`saas-plan-history:${previous.id}`) ?? "[]");
    localStorage.setItem(`saas-plan-history:${previous.id}`, JSON.stringify([
      ...history.filter((version) => version.id !== previous.currentVersion.id), previous.currentVersion,
    ]));
  }
  return { saved: true, error: null, fieldErrors: {} };
}
export async function archivePlanAction(_previous: PlanFormState, form: FormData): Promise<PlanFormState> {
  const plans = load();
  localStorage.setItem("saas-plans-fixture", JSON.stringify(plans.map((p) =>
    p.id === form.get("planId") ? { ...p, status: "archived" } : p)));
  return { saved: true, error: null, fieldErrors: {} };
}

export async function planChangeAction(previous: PlanChangeFormState, form: FormData): Promise<PlanChangeFormState> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const selected = load().find((p) => p.currentVersion.id === form.get("planVersionId"))?.currentVersion;
  const current = management();
  const s = current.subscription;
  if (!selected || !s?.periodEndExclusive) throw new Error("Fixture contract or version missing");
  const stored = localStorage.getItem("saas-change-rate-fixture");
  const rate: { numerator: string; denominator: string } = stored ? JSON.parse(stored)
    : { numerator: String(s.price), denominator: String(daysBetween(s.periodStartsOn, s.periodEndExclusive)) };
  const quote = quotePlanChange({
    currentDailyRate: billingRate(BigInt(rate.numerator), BigInt(rate.denominator)),
    currentPeriod: { startsOn: s.periodStartsOn, endsBefore: s.periodEndExclusive },
    onDate: current.businessDate, newPrice: selected.price,
    newDuration: { unit: selected.durationUnit, count: selected.durationCount },
  });
  const preview: PlanChangePreview = {
    tenantId, planVersionId: selected.id, subscriptionId: s.id, currentVersionId: s.planVersionId!,
    currentPlanName: s.planName, planName: selected.name, versionNumber: selected.versionNumber,
    fingerprint: "a".repeat(32), kind: quote.kind, businessDate: current.businessDate, effectiveOn: quote.effectiveOn,
    periodStartsOn: s.periodStartsOn, periodEndExclusive: s.periodEndExclusive, remainingDays: quote.remainingDays,
    currentRateNumerator: rate.numerator, currentRateDenominator: rate.denominator,
    newRateNumerator: String(quote.newDailyRate.numerator), newRateDenominator: String(quote.newDailyRate.denominator),
    amountDue: quote.amountDue, net: includedVat(quote.amountDue).net, vat: includedVat(quote.amountDue).vat,
    price: selected.price, durationUnit: selected.durationUnit, durationCount: selected.durationCount,
    activeStudents: current.activeStudents, activeUsers: current.activeUsers,
    maxStudents: selected.maxStudents, maxUsers: selected.maxUsers, features: selected.features, services: selected.services,
  };
  if (form.get("intent") !== "confirm") return { error: null, preview, result: null, stale: false };
  if (form.get("reason") === "Conflicto simulado") return { error: "El contrato cambió. Previsualiza nuevamente.", preview: null, result: null, stale: true };
  if (form.get("reason") === "Fallo simulado") return { error: "Sin conexión.", preview: previous.preview, result: null, stale: false };
  const scheduledChangeId = quote.kind === "upgrade" ? null : randomUUID();
  if (quote.kind === "upgrade") {
    localStorage.setItem("saas-change-rate-fixture", JSON.stringify({ numerator: String(quote.newDailyRate.numerator), denominator: String(quote.newDailyRate.denominator) }));
    current.subscription = {
      ...s, planId: load().find((p) => p.currentVersion.id === selected.id)!.id, planVersionId: selected.id,
      planName: selected.name, price: selected.price, durationUnit: selected.durationUnit, durationCount: selected.durationCount,
    };
  } else current.scheduledChange = {
    id: scheduledChangeId!, planName: selected.name, price: selected.price, currency: "CLP", effectiveOn: quote.effectiveOn, status: "scheduled",
    reason: String(form.get("reason")), blockedReason: null,
  };
  localStorage.setItem("saas-assignment-fixture", JSON.stringify(current));
  return { error: null, preview: null, stale: false, result: {
    tenantId, planVersionId: selected.id, subscriptionId: s.id, kind: quote.kind,
    effectiveOn: quote.effectiveOn, amountDue: quote.amountDue, invoiceId: quote.amountDue > 0 ? randomUUID() : null, scheduledChangeId,
  } };
}

export async function cancelPlanChangeAction() {
  const current = management();
  current.scheduledChange = null;
  localStorage.setItem("saas-assignment-fixture", JSON.stringify(current));
  return { error: null, saved: true };
}

function renewalStatus(): RenewalProcessorStatus {
  const m = management();
  return {
    businessDate: m.businessDate, lastRunAt: localStorage.getItem("saas-renewal-last-run-fixture"),
    lastWorkerRunAt: null, dueCount: m.subscription && m.subscription.periodEndExclusive <= m.businessDate ? 1 : 0,
    failures: [],
    blockedChanges: m.scheduledChange?.status === "blocked" ? [{
      id: m.scheduledChange.id, subscriptionId: m.subscription!.id, tenantId: m.tenantId,
      tenantName: m.tenantName, effectiveOn: m.scheduledChange.effectiveOn, blockedReason: m.scheduledChange.blockedReason!,
    }] : [],
  };
}
export async function renewalAction(previous: RenewalFormState, form: FormData): Promise<RenewalFormState> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const current = management();
  const s = current.subscription;
  if (!s || !getSaasRenewalConfiguration().enabled) return { result: null, error: "Renovaciones desactivadas" };
  if (s.periodEndExclusive !== form.get("expectedPeriodEnd")) return { ...previous, result: null, error: "El período cambió" };
  const selected = load().find((p) => p.currentVersion.id === s.planVersionId)!;
  const next = load().find((p) => p.currentVersion.id === localStorage.getItem("saas-renewal-target-fixture"));
  const terms = (plan: SaasCatalogPlan): RenewalTerms => ({
    versionId: plan.currentVersion.id, price: plan.currentVersion.price,
    duration: { unit: plan.currentVersion.durationUnit, count: plan.currentVersion.durationCount },
    maxStudents: plan.currentVersion.maxStudents, maxUsers: plan.currentVersion.maxUsers,
  });
  const quote = quoteSubscriptionRenewal({
    today: current.businessDate, currentPeriod: { startsOn: s.periodStartsOn, endsBefore: s.periodEndExclusive },
    anchorOn: localStorage.getItem("saas-renewal-anchor-fixture") ?? s.periodStartsOn,
    periodIndex: Number(localStorage.getItem("saas-renewal-index-fixture") ?? 0),
    status: s.status, firstInvoiceDueOn: s.periodEndExclusive, terms: terms(selected),
    activeStudents: current.activeStudents, activeUsers: current.activeUsers,
    scheduledChange: next && current.scheduledChange?.status === "scheduled"
      ? { id: current.scheduledChange.id, effectiveOn: current.scheduledChange.effectiveOn, terms: terms(next) } : null,
  });
  const committedPlan = quote.change?.status === "applied" ? next! : selected;
  current.subscription = {
    ...s, planId: committedPlan.id, planVersionId: committedPlan.currentVersion.id, planName: committedPlan.currentVersion.name,
    price: quote.total, periodStartsOn: quote.period.startsOn, periodEndExclusive: quote.period.endsBefore,
    nextBillingDate: quote.period.endsBefore, status: quote.status,
    durationUnit: quote.terms.duration.unit, durationCount: quote.terms.duration.count,
  };
  if (quote.change?.status === "blocked") current.scheduledChange = { ...current.scheduledChange!, status: "blocked", blockedReason: quote.change.reason };
  if (quote.change?.status === "applied") current.scheduledChange = null;
  localStorage.setItem("saas-assignment-fixture", JSON.stringify(current));
  localStorage.setItem("saas-renewal-anchor-fixture", quote.anchorOn);
  localStorage.setItem("saas-renewal-index-fixture", String(quote.periodIndex));
  localStorage.setItem("saas-renewal-last-run-fixture", new Date().toISOString());
  return { error: null, result: {
    status: "renewed", tenantId: current.tenantId, subscriptionId: s.id, planVersionId: quote.terms.versionId,
    periodStartsOn: quote.period.startsOn, periodEndExclusive: quote.period.endsBefore, dueOn: quote.dueOn,
    amount: quote.total, invoiceId: quote.createsInvoice ? randomUUID() : null,
    changeStatus: quote.change?.status ?? null, blockedReason: quote.change?.reason ?? null,
  } };
}
