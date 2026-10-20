import { receiptCoreSchema } from "./payment-receipt";

export const receiptFixture = receiptCoreSchema.parse({
  id: "ad490000-0000-4000-8000-000000000001",tenant_id: "ad490000-0000-4000-8000-000000000011",
  folio: 1,created_at: "2026-10-18T00:00:00Z",snapshot: {
    template_version: 1,issuer: { legal_name: "Plataforma Deportiva",tax_id: "12345678-5",address: "Ñuble 123",email: "emisor@example.invalid" },
    tenant: { name: "Academia Ñandú",tax_id: null,billing_contact_name: "María Pérez",billing_contact_email: null,address: "Concepción" },
    invoice_number: "INV-1",concept: "initial",plan_name: "Academia",services: ["Capacitación y atención"],
    period_starts_on: "2026-10-01",period_end_exclusive: "2026-11-01",paid_on: "2026-10-18",
    method: "transfer",reference: "TRANSFER-123",total: 11900,net: 10000,vat: 1900,currency: "CLP",vat_rate: 19,
  },
});
