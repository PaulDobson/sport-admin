import { z } from "zod";
import { isValidIssuerTaxId, normalizeIssuerTaxId } from "@/domain/saas-administration/billing-issuer";
import { UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { BillingIssuerPort } from "../ports/billing-issuer-port";

const issuerSchema = z.object({
  operationId: z.uuid(),
  expectedVersionId: z.uuid().nullable(),
  legalName: z.string().trim().min(1, "Ingresa la razón social.").max(160, "Admite hasta 160 caracteres."),
  taxId: z.string().transform(normalizeIssuerTaxId)
    .refine(isValidIssuerTaxId, "Ingresa un RUT válido con dígito verificador."),
  address: z.string().trim().min(1, "Ingresa la dirección del emisor.").max(250, "Admite hasta 250 caracteres."),
  email: z.string().trim().pipe(z.email("Ingresa un correo válido.").max(254, "Admite hasta 254 caracteres.")),
  reason: z.string().trim().min(3, "Indica un motivo de al menos 3 caracteres.").max(500, "Admite hasta 500 caracteres."),
});

async function authorize(port: BillingIssuerPort) {
  if (!(await port.isPlatformAdmin())) throw new UnauthorizedError("Se requiere acceso de administrador de plataforma.");
}

export async function getSaasBillingIssuer(port: BillingIssuerPort) {
  await authorize(port);
  return port.get();
}

export async function saveSaasBillingIssuer(input: unknown, port: BillingIssuerPort) {
  await authorize(port);
  return port.save(parseWithSchema(issuerSchema, input));
}
