import { z } from "zod";
import { canManageTenantDetails, type TenantDetails } from "@/domain/tenants/tenant-details";
import type { TenantMembership } from "@/domain/tenants/tenant-membership";
import { NotFoundError, UnauthorizedError } from "@/domain/shared/errors";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { TenantDetailsPort } from "./ports/tenant-details-port";

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label}: máximo ${max} caracteres.`).transform(value => value || null);

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del gimnasio.").max(160, "El nombre admite hasta 160 caracteres."),
  address: optionalText(250, "Dirección"),
  contactName: optionalText(120, "Nombre del contacto"),
  contactEmail: z.string().trim().max(254, "El email admite hasta 254 caracteres.")
    .refine(value => !value || z.email().safeParse(value).success, "Ingresa un email de contacto válido.")
    .transform(value => value || null),
  phone: z.string().trim().max(30, "El teléfono admite hasta 30 caracteres.")
    .refine(value => !value || (/^\+?[0-9 ()-]+$/.test(value) && value.replace(/\D/g, "").length >= 7),
      "Ingresa un teléfono válido con al menos 7 dígitos.")
    .transform(value => value || null),
  city: optionalText(120, "Ciudad"),
  region: optionalText(120, "Región"),
});

export type TenantDetailsInput = z.input<typeof detailsSchema>;

function authorize(membership: TenantMembership) {
  if (membership.status !== "active" || !canManageTenantDetails(membership.role)) {
    throw new UnauthorizedError("Solo el dueño o administrador puede gestionar los datos del gimnasio.");
  }
}

export async function getTenantDetails(membership: TenantMembership, repository: TenantDetailsPort) {
  authorize(membership);
  const details = await repository.findByTenantId(membership.tenantId);
  if (!details) throw new NotFoundError("Gimnasio", membership.tenantId);
  return details;
}

export async function updateTenantDetails(
  membership: TenantMembership,
  input: TenantDetailsInput,
  repository: TenantDetailsPort,
): Promise<TenantDetails> {
  authorize(membership);
  const parsed = parseWithSchema(detailsSchema, input);
  const details = { ...parsed, tenantId: membership.tenantId };
  await repository.update(details);
  return details;
}
