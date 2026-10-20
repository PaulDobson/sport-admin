import { z } from "zod";
import type { BillingIssuerPort } from "@/application/saas-administration/ports/billing-issuer-port";
import { isValidIssuerTaxId, type SaveBillingIssuerInput } from "@/domain/saas-administration/billing-issuer";
import type { SupabaseDatabaseClient } from "@/infrastructure/supabase/database-client";
import { parseBillingContract, throwBillingRpcError } from "./billing-rpc-contract";

const issuerSchema = z.object({
  id: z.uuid(), version_number: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  legal_name: z.string().trim().min(1).max(160), tax_id: z.string().refine(isValidIssuerTaxId),
  address: z.string().trim().min(1).max(250), email: z.email().max(254),
  created_at: z.iso.datetime({ offset: true }),
}).transform((v) => ({
  id: v.id, versionNumber: v.version_number, legalName: v.legal_name,
  taxId: v.tax_id, address: v.address, email: v.email, createdAt: v.created_at,
}));

export class SupabaseBillingIssuer implements BillingIssuerPort {
  constructor(private readonly client: SupabaseDatabaseClient) {}
  async isPlatformAdmin() {
    const { data, error } = await this.client.rpc("is_platform_admin");
    if (error) throw error;
    return data === true;
  }
  async get() {
    const { data, error } = await this.client.rpc("get_saas_billing_issuer");
    if (error) throwBillingRpcError(error);
    return parseBillingContract(z.object({ issuer: issuerSchema.nullable() }), data).issuer;
  }
  async save(input: SaveBillingIssuerInput) {
    const { data, error } = await this.client.rpc("save_saas_billing_issuer", {
      operation_id: input.operationId, expected_version: input.expectedVersionId,
      legal_name: input.legalName, tax_id: input.taxId, address: input.address,
      email: input.email, change_reason: input.reason,
    });
    if (error) throwBillingRpcError(error);
    const issuer = parseBillingContract(z.object({ issuer: issuerSchema }), data).issuer;
    if (issuer.id === input.expectedVersionId || issuer.legalName !== input.legalName
      || issuer.taxId !== input.taxId || issuer.address !== input.address || issuer.email !== input.email) {
      throw new Error("La confirmación del emisor no coincide con los datos solicitados.");
    }
    return issuer;
  }
}
