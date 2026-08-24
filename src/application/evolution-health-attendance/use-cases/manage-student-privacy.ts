import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { PrivacyRepositoryPort } from "../ports/privacy-repository-port";

const idsSchema = z.object({
  tenantId: z.string().uuid(),
  studentId: z.string().uuid(),
});

const consentSchema = idsSchema
  .extend({
    policyVersion: z.string().trim().min(1).max(80),
    decision: z.enum(["granted", "revoked"]),
    operationId: z.string().uuid(),
    representedConsentConfirmed: z.boolean().default(false),
  })
  .refine(
    (input) =>
      input.decision !== "granted" || input.representedConsentConfirmed,
    { message: "Represented consent confirmation is required" },
  );

const correctionSchema = idsSchema
  .extend({
    fullName: z.string().trim().min(1).optional(),
    birthDate: z.string().date().optional(),
  })
  .refine(
    (input) => input.fullName !== undefined || input.birthDate !== undefined,
    {
      message: "At least one correction is required",
    },
  );

const erasureSchema = idsSchema.extend({
  reason: z.enum(["subject_request", "consent_withdrawn", "tenant_request"]),
});

export function getStudentPrivacyState(
  input: z.input<typeof idsSchema>,
  deps: { privacy: PrivacyRepositoryPort },
) {
  const parsed = parseWithSchema(idsSchema, input);
  return deps.privacy.getStudentState(parsed.tenantId, parsed.studentId);
}

export function registerStudentHealthConsent(
  input: z.input<typeof consentSchema>,
  deps: { privacy: PrivacyRepositoryPort },
) {
  const { representedConsentConfirmed: _confirmed, ...consent } =
    parseWithSchema(consentSchema, input);
  return deps.privacy.registerConsent(consent);
}

export function exportStudentPersonalData(
  input: z.input<typeof idsSchema>,
  deps: { privacy: PrivacyRepositoryPort },
) {
  const parsed = parseWithSchema(idsSchema, input);
  return deps.privacy.exportPersonalData(parsed.tenantId, parsed.studentId);
}

export function correctStudentPersonalData(
  input: z.input<typeof correctionSchema>,
  deps: { privacy: PrivacyRepositoryPort },
) {
  return deps.privacy.correctPersonalData(
    parseWithSchema(correctionSchema, input),
  );
}

export function requestStudentErasure(
  input: z.input<typeof erasureSchema>,
  deps: { privacy: PrivacyRepositoryPort },
) {
  return deps.privacy.requestErasure(parseWithSchema(erasureSchema, input));
}
