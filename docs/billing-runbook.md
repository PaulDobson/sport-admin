# SaaS billing runbook

This runbook covers the platform subscription ledger. It does not cover payments that instructors record for students.

## Webhook checks

The normalized endpoint is `POST /api/webhooks/saas`. It accepts `charge.succeeded`, `charge.failed`, `refund.succeeded`, and `refund.failed` events. Requests must include `x-saas-timestamp` and `x-saas-signature`, use the configured HMAC secret, remain within the five-minute tolerance, and not exceed 64 KiB.

Interpret responses:

- `200`: processed or replayed idempotently; retain the returned internal event ID in restricted provider operations records.
- `400`: invalid normalized payload; correct provider mapping before retrying.
- `401`: invalid signature or timestamp; verify endpoint secret and clock synchronization.
- `413`: payload too large; reduce the normalized payload.
- `422`: valid request rejected by a business rule; inspect subscription, invoice, charge, or refund state.
- `500`: transient processing failure; allow the provider to retry with the same event identity.

Never paste signatures, secrets, raw payloads, provider references, or customer data into general logs or tickets.

## Reconciliation

1. Select the UTC accounting period and currency.
2. Compare provider totals with the SaaS finance dashboard: net collected, pending, past due, refunds, MRR, and ARR.
3. Keep the SaaS ledger separate from instructor membership payments.
4. Investigate differences by immutable normalized event identity and status; do not modify historical events.
5. Replay a missing provider event only with its original identity so `process_saas_payment_event` remains idempotent.
6. Validate corrections in staging and preserve sanitized evidence of the final totals.

Run focused verification before release:

```sh
pnpm exec vitest run src/application/saas-administration/use-cases/handle-payment-webhook.test.ts src/infrastructure/payments/generic-hmac-payment-provider.test.ts src/app/api/webhooks/saas/route.test.ts src/application/saas-administration/use-cases/get-saas-financial-dashboard.test.ts
```

Database verification uses migrations `0014`, `0016`, `0018`, and `0019` with their corresponding transactional tests documented in [../supabase/README.md](../supabase/README.md).

## Incident actions

- Signature failures: reject requests, compare configured secret versions through the secret manager, then rotate through the deployment platform if exposure is suspected.
- Duplicate delivery: return the existing event result; do not create a second ledger event.
- Processing outage: monitor `saas_webhook/process/failure`, keep provider retries enabled, and reconcile after recovery.
- Incorrect tenant state: use audited backoffice transitions with a reason; do not update tenant or subscription tables directly.
- Refund discrepancy: verify the original charge, cumulative refunded amount, currency, and provider event identity before replay.

Escalate suspected ledger corruption, cross-tenant visibility, or secret exposure as `P1` under [support-runbook.md](support-runbook.md).
