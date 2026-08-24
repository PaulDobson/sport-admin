import { z } from "zod";
import { parseWithSchema } from "@/application/shared/validation/parse-with-schema";
import type { PaymentRepositoryPort } from "../ports/payment-repository-port";

const adjustmentSchema = z.object({
  kind: z.enum(["discount", "credit", "tax"]),
  amount: z.number().positive(),
  reason: z.string().trim().min(1),
});

const paymentSchema = z.object({
  tenantId: z.string().uuid(),
  membershipId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  paidAt: z.date(),
  reference: z.string().trim().min(1).optional(),
  actorMembershipId: z.string().uuid(),
  operationId: z.string().uuid(),
  adjustments: z.array(adjustmentSchema).default([]),
});

const membershipSchema = z.object({
  tenantId: z.string().uuid(),
  membershipId: z.string().uuid(),
});

export function recordMembershipPayment(
  input: z.input<typeof paymentSchema>,
  deps: { payments: PaymentRepositoryPort },
) {
  return deps.payments.record(parseWithSchema(paymentSchema, input));
}

export function getMembershipBalance(
  input: z.input<typeof membershipSchema>,
  deps: { payments: PaymentRepositoryPort },
) {
  const parsed = parseWithSchema(membershipSchema, input);
  return deps.payments.getBalance(parsed.tenantId, parsed.membershipId);
}

export function getMembershipPaymentHistory(
  input: z.input<typeof membershipSchema>,
  deps: { payments: PaymentRepositoryPort },
) {
  const parsed = parseWithSchema(membershipSchema, input);
  return deps.payments.listHistory(parsed.tenantId, parsed.membershipId);
}
