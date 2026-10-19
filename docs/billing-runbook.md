# SaaS billing runbook

This runbook covers the platform subscription ledger. It does not cover payments that instructors record for students.

## Staging execution report — 2026-10-18

The operator confirmed successful execution in **staging** of migrations
0048–0052, rollback regressions 0043–0048, the integrated
[0049 lifecycle regression](../supabase/tests/0049_saas_billing_lifecycle.sql),
and the [scheduler template](../supabase/operations/saas_billing_scheduler.sql).
This updates the earlier preparation/deferred-execution status below. Do not
rerun committed migrations or recreate cron jobs merely to follow this runbook.

This is an operator-reported result, not an independently observed execution.
Concurrent two-connection tests, real endpoint responses/worker heartbeats,
private storage upload/download and an explicit Resend send still need validation.
Executing scheduler SQL does not prove the application flags are enabled or
that HTTP requests succeed. No production deployment is confirmed.

Next, inspect the staging renewal and document consoles for actual worker calls,
check cron HTTP results and rejected unauthorized requests, then execute the
authenticated lifecycle smoke below using synthetic staging data. Keep production
automation disabled until those checks and the concurrency gate pass.

## Observed localhost smoke — 2026-10-18

The operator authorized testing Academia 1 through `http://localhost:3000`,
signed into the integrated browser as a platform administrator, and explicitly
prohibited email sends. The application uses the existing connected database:
these are persistent synthetic billing records, not a disposable local database.

- Created `PRUEBA LOCAL Academia 1 - Diario`, CLP 11,900 per calendar day,
  with 100 student / 5 user limits, reports and two descriptive services.
  Configured a clearly fictitious test issuer with an `example.invalid` email.
  Replace that issuer with verified commercial details before real collections.
- Initial assignment refuses past dates. With renewed operator approval, assigned
  the period `[2026-10-18, 2026-10-19)`, without changing the tenant's active
  administrative status. Renewal execution is deferred until October 19;
  no dates or database validations were bypassed.
- Recorded one explicitly labeled simulated transfer for the full CLP 11,900.
  Invoice `30844938-ed19-407f-91b2-80684f7a8389` and the subscription show paid,
  with zero outstanding balance. This is a test ledger entry, not money received.
- Receipt `16ada7ea-6717-484f-9999-a322e9102d58`, folio 1, was initially queued.
  An authenticated document-worker request returned HTTP 200 with
  `processed: 1`, `failed: 0`, `unknown: 0`. It became downloadable through the
  normal administrator UI.
- The authenticated download returned HTTP 200, `application/pdf`,
  `private, no-store`, and attachment filename `comprobante-1.pdf`.
  The actual 7,696-byte, one-page stored PDF matched the private download's SHA-256
  `4dd611b2502466b8c658ead78ca4342face3bdd62e4d233ea4fe1a59597c256d`.
  PDF.js extracted the academy, fictitious issuer, services, test reference,
  CLP 11,900 total / 10,000 net / 1,900 included VAT, and non-tax disclaimer.
  Anonymous application download returned 401; the public storage route
  returned 400 and did not expose the file.
- Both worker endpoints returned 401 without bearer authorization and 200 with
  independent local secrets. The idle renewal request processed zero periods.
  Both consoles displayed real heartbeat timestamps; documents ended with
  zero queued jobs, failures and uncertain results.
- Dashboard, all four linked ledger views and CSV agreed for October 2026 CLP:
  collected 11,900, pending 0, past due 0, MRR 361,958.33 before display rounding,
  ARR 4,343,500. The daily plan's normalized MRR is not monthly cash received.
- The platform-administrator session, without an active owner membership,
  was correctly denied the owner-only subscription read. The operator then
  signed in as the actual Academia 1 owner: contract, services, limits, paid
  invoice and zero debt were visible, with no administrative billing actions.
  Owner download returned the same 7,696 bytes and SHA-256 as the admin download.
  A query for Academia 2 was rejected without exposing its billing information.
  Trying the administrator collection detail redirected the owner to the
  operational dashboard rather than exposing payment controls.
- The real owner page had no horizontal overflow at 320, 375, 390, 768, 1280 and
  1440 px; every visible link/button had a 44 px touch height. A raw `reports`
  feature identifier discovered during this smoke was corrected to `Reportes`
  through a shared formatter used by catalog, assignment and owner billing.
  All four known feature labels and unknown historical-code preservation have
  regression coverage: 21 focused tests, independent TypeScript and targeted
  ESLint passed, and the corrected label was verified in the real owner page.

The authorized worker configuration lives only in Git-ignored `.env.local`,
with independent generated secrets; neither values nor credentials were logged.
Next.js recognized it without restarting the existing user-owned server.
Resend remains unconfigured, no delivery was requested, and no email was sent.
No remote cron configuration was changed: the staging scheduler is not proven
to reach localhost, and these manual HTTP calls do not prove automatic scheduling.
Concurrency, recovery under real failure, suspended-owner and cross-tenant
document access, upgrades/downgrades, due renewal and provider delivery remain
separate verification gates. No academy was suspended or membership changed
to manufacture a permission test.

During the denied backoffice navigation, the operational dashboard also emitted
an unrelated React hydration warning: its offline synchronization badge rendered
`Sin conexión` on the server and `Sincronizado` on the client. No offline/dashboard
code was changed as part of this billing smoke; that warning remains unresolved.

## Document recovery inbox — prepared migration 0053

The recovery inbox completes the existing processor console with a bounded,
audited read of PDF and email jobs. It is reached from **Finanzas SaaS → Revisar
PDF y correo** at `/backoffice/finance/documents`.

This increment was implemented after the operator asked to postpone tests.
Migration [0053](../supabase/migrations/0053_saas_document_job_queue.sql) is
prepared, **not executed**. It requires the existing chain through 0052.
The previous staging SQL confirmation does not include it. If it is absent,
the inbox shows an explicit migration message without replacing status counts
with fictitious zeroes or hiding the existing processor configuration.

Operational workflow:

1. Start with **Requieren atención**: failed jobs, uncertain outcomes and running
   jobs whose lease has expired. Search by academy and filter PDF/email as needed.
2. Use **En cola** to inspect automatic PDF retries and their availability times.
   The inbox shows attempts/max attempts and timestamps in America/Santiago.
3. Open **Revisar comprobante**. Failed PDFs use the existing explicit requeue
   action, preserving payment and folio. Expired PDF leases are recovered by the
   worker; opening a page does not claim or run them.
4. Expired email leases need a worker pass to become uncertain. Reconcile an
   uncertain delivery with provider evidence on the receipt page before requesting
   another send. A completed email job means provider acceptance/reconciliation,
   not confirmed delivery.
5. Filtering/pagination never queues email, retries a job or changes the ledger.
   The existing explicit receipt actions invalidate the inbox after changes.

The RPC requires a logged-in platform administrator, checks filters in SQL,
returns count/items from one snapshot, and audits the read. It returns no lease
token, recipient, provider credential, document path or receipt snapshot.
Existing direct table grants and storage access remain unchanged.

Only static TypeScript/lint checks are being performed for this increment.
Deferred verification includes SQL/RLS and audit checks, pagination/filter
reconciliation, expired leases, recovery/reconciliation navigation, browser
responsiveness and regression suites. Do not treat this section as evidence of
runtime success or a reason to enable production automation.

## Plan version history — prepared migration 0054

The plan catalog now links each active or archived plan to a read-only,
paginated history at `/backoffice/plans/{planId}`. It displays the immutable
name, description, price/currency, duration, trial allowance, limits, platform
features and descriptive services for each version. Registration times use
America/Santiago. Mobile cards and a desktop table expose the same conditions.

The **Vigente en catálogo** badge follows `saas_plans.current_version_id`,
not the greatest version number: imported negotiated contract versions can have
a greater number without ever being the current catalog offer. Other rows are
labeled **No vigente en catálogo**. Imported versions retain their original
amounts/currencies and are not presented as new CLP offers with inferred tax terms.

This page does not assign old versions, edit snapshots, restore archived plans,
or change contracts, receipts or money. Publishing a version and archiving a
plan invalidate the history route as well as the catalog. Publication remains
available only through the existing active-plan workflow.

Migration [0054](../supabase/migrations/0054_saas_plan_version_history.sql)
adds `list_saas_plan_versions`, restricted to authenticated platform admins
with an audited read and bounded SQL pagination. Plan identity, current-version
reference, count and rows come from one SQL snapshot. It returns no creator
user identity and grants no direct access to the underlying version table.
The adapter reuses the catalog's version schema/mapper and verifies the requested
plan/page against the returned identities.

0054 is prepared, **not executed**. Apply new migrations in order when database
validation resumes; the previous staging report does not cover 0053 or 0054.
If the function is missing, the history page displays an explicit migration
message instead of an empty-success response. Existing catalog operations remain
independent of this new RPC.

Static TypeScript and focused lint checks passed for this increment.
SQL permissions/audit, immutable-history behavior, pagination, active/archived
navigation, regressions and browser checks remain deferred at the operator's
request. This is implementation status, not a new runtime verification claim.

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

## Collections and issuer configuration (0048)

The operator reported successful staging execution through migration 0052,
including [0048](../supabase/migrations/0048_saas_collections_and_issuer.sql)
and [its rollback regression](../supabase/tests/0048_saas_collections_and_issuer.sql).
See the dated execution report above for scope and remaining checks. Do not rerun
already committed migrations; use an isolated disposable database for new fixtures.

1. Open `/backoffice/collections` as a platform administrator. Filter by academy,
   tenant ID (from its subscription screen), state, currency and due-date range.
   Results and total counts use the same database statement and deterministic
   due-date/issuance/ID ordering. Pagination is offset-based; concurrent additions
   can change subsequent pages.
2. Inspect the invoice detail before reconciliation. Balance is invoice amount
   minus successful/refunded original charges, floored at zero; pending or failed
   attempts do not reduce it. Refunds are displayed separately, not re-invoiced.
   Draft, void and refunded invoices have no collectible balance. Imported paid
   legacy invoices without charge history remain settled. The date of maturity
   uses America/Santiago and includes the due date, matching the dashboard's
   financial convention.
3. Never add amounts across currencies. Historical USD/EUR cents are retained.
   The ledger, event counts and detail arrays are read in one MVCC snapshot.
   Each event array is capped at 100; a visible notice reports truncation.
4. Configure `/backoffice/finance/issuer`: legal name, Chilean RUT with checksum,
   address and email. This is the SaaS provider, not the gym's contact.
   Changes require a reason and preserve old issuer versions for future receipt
   snapshots. No API keys or sender secrets belong in these fields.
5. If saving fails ambiguously, retry unchanged values with the original form.
   Editing a field creates a new operation; the expected-version check still
   prevents overwriting an intervening successful save. A stale-version conflict
   requires reviewing the persisted version before confirming again.
6. Missing 0048 or malformed RPC contracts must be displayed as errors, never as
   an empty portfolio or a default issuer. Refresh the PostgREST schema cache
   after migration if it still reports the RPC missing.

Payment, voiding and receipt actions are implemented by the subsequent 0049–0052
increment below. Issuer configuration alone still does not certify processor
readiness, provider acceptance or SII authorization. Never bypass the audited
operations with direct financial-table updates.

## Renewal processor (prepared, not yet enabled)

The renewal code and migration are prepared, **not certified against PostgreSQL
or deployed to a live scheduler**. Do not use production as a test fixture.
Keep `SAAS_RENEWALS_ENABLED=false` until the database and staging checks below
pass. The flag gates the application endpoint and manual task; it is not a
replacement for the database RPC's platform-admin/service-role authorization.

### Preconditions

1. On a disposable Supabase/PostgreSQL database, apply the complete migration
   chain through [0047](../supabase/migrations/0047_saas_subscription_renewals.sql).
2. Execute the prepared rollback-only tests
   [0043](../supabase/tests/0043_saas_plan_catalog.sql),
   [0044](../supabase/tests/0044_saas_subscription_assignment.sql),
   [0045](../supabase/tests/0045_saas_flexible_financial_dashboard.sql),
   [0046](../supabase/tests/0046_saas_contract_plan_changes.sql) and
   [0047](../supabase/tests/0047_saas_subscription_renewals.sql), plus the existing
   webhook, limits, audit and dashboard compatibility regressions.
3. Verify backfill ambiguity explicitly. Foreign/fractional legacy contracts,
   anchors that do not match the stored period/index, and legacy limits-only
   schedules are not silently rewritten by renewal. Reconcile them through a
   reviewed migration/administrative procedure before enabling the worker.
4. Run the two-connection test described below. A single rollback script cannot
   prove concurrent behavior.
5. In staging only, configure the independent `SAAS_RENEWAL_WORKER_SECRET` via
   the secret manager, then enable `SAAS_RENEWALS_ENABLED=true`. Never reuse the
   payment webhook or notification worker secret.
6. Schedule authenticated `POST /api/saas/renewals/process` requests, for example
   every five minutes. No scheduler configuration has been installed by this
   change. Verify an actual authorized invocation and a rejected unauthorized
   invocation before considering the scheduler deployed.

### Processing semantics

- The endpoint processes at most 10 periods, not 10 invoices or all historical
  debt. Each RPC commits one period, its limits, optional invoice, change state
  and audit together. Older overdue periods are processed first.
- An idle result means no currently available candidate; locked subscriptions,
  retry cooldowns or exhausted failures may still leave a backlog. Check the
  console's due count and failures instead of interpreting idle as debt-free.
- Calendar periods retain the original anchor. A trial's first paid period and
  an upgrade's next full period start at their preserved boundary without
  skipping a duration. Subsequent renewals use the contracted immutable version,
  including when the catalog identity has been archived.
- Catch-up keeps original service/due dates. Invoice `issued_at` records actual
  issuance time; it does not manufacture an earlier emission timestamp. Contract
  events for applied changes take effect at their service boundary.
- A scheduled downgrade revalidates active students and users under the same
  usage locks as resource activation. If blocked, renew the previous terms once,
  retain the reason, show a platform-admin notice in the console and enqueue an
  internal notification for each active owner. The existing notification worker
  processes that internal delivery. This is not receipt email delivery.
- Renewal never records a payment or receipt, invents a zero-value invoice,
  deletes resources or reactivates an administratively suspended tenant.

### Responses and observability

- `200`: bounded processing completed without a recorded period failure.
- `207`: at least one period failed. Inspect `results`; do not report the entire
  batch as successful. Other periods may already have committed.
- `401`: absent/invalid bearer authorization; no billing RPC is invoked.
- `503`: renewals are disabled; no billing RPC is invoked.
- `500`: configuration, transport or unexpected processing failure. Review
  durable results before retrying; earlier RPCs in the batch may have committed.

Open **Finance → Revisar renovaciones y cambios bloqueados** at
`/backoffice/finance/renewals`. Configuration alone is not readiness. Manual
executions do not refresh the separate worker heartbeat. A missing heartbeat
or one older than 30 minutes displays a warning. The console shows up to 50
failures and 50 blocked changes; inspect each tenant when the limit is reached.
Raw database error messages and credentials are not returned or logged.

### Recovery and idempotency

An individual failed period rolls back all commercial mutations before saving
its failure and SQLSTATE. Automatic retries wait five minutes, at most three
attempts per subscription/boundary; after that the contract requires review.
The failed request result is immutable. Repeating the same request ID and
payload returns it; reusing the ID with another payload or actor is rejected.

After reconciling the cause, use **Gestionar suscripción → Renovar un período
vencido**. Review the current and scheduled prices, the fallback if usage exceeds
the new cap, and the expected boundary. A retry after an ambiguous timeout keeps
the request ID; first inspect the recorded result. After an actual reconciliation,
use **Revisé el contrato: iniciar nuevo intento** to create a fresh request.
Successful recovery clears the active failure state but preserves previous run
and audit history. Reload before processing another overdue period.

For an outage, disable the application flag to stop new endpoint/manual work,
pause the scheduler, inspect in-flight results and reconcile committed periods.
Do not delete invoices, change event history or reset boundaries as a retry
mechanism. Never run the synthetic fixture SQL against production.

### Required two-connection disposable test

Create a single synthetic due subscription in a disposable database and keep
the fixture committed only for this concurrency test. Use two independent
database sessions with authorized identities:

1. In session A, begin a transaction and call
   `process_saas_subscription_renewal(request_a, subscription_id, expected_end)`.
   Leave the transaction open after its result to retain usage/subscription locks.
2. In session B, request the same boundary with a different request ID. The
   manual call must report a conflict without creating another period/invoice;
   a service-role batch call must skip the locked candidate.
3. Commit A, then retry the original boundary from B. It must not advance the
   already-renewed boundary. Replay A's identical request and verify its exact
   cached result.
4. Assert one commercial invoice for the boundary, one effective limits
   snapshot, correct applied tariff and one scheduled-change transition.
5. Repeat with two automatic workers, growth across the downgrade's cap, and
   cancellation concurrent with renewal. Verify that either cancellation wins
   before execution or renewal completes the change, never a partial combination.
6. Force an invoice-period uniqueness conflict after the renewal mutations and
   confirm that contract dates, limits and scheduled-change state roll back
   together, while an explicit failure/run is retained. Remove the synthetic
   conflict via the fixture setup and verify reviewed recovery.

These steps remain pending execution. Preserve sanitized results before enabling
the scheduler outside staging.

## Payments documents and owner access 0049–0052

Code is implemented locally and the operator has reported successful staging SQL
execution as recorded above. Runtime worker, storage, provider and concurrency
verification remain separate release gates. Keep production processor flags false
until they pass. Do not rerun committed migrations or use production as a fixture.

### Migration and compatibility gate

1. Apply 0048, 0049, 0050, 0051 and 0052 in order on a disposable Supabase instance.
   Run the preceding rollback regressions and
   [the lifecycle regression](../supabase/tests/0049_saas_billing_lifecycle.sql).
2. Verify a complete remnant settlement on an invoice with historical partial
   payments. Confirm that partial/overpayment, future dates, missing references,
   stale balances, absent issuer and in-flight charges are rejected.
3. Check issuer edits cannot change an emitted snapshot. Inject a transactional
   outbox failure: no charge, paid invoice or receipt may remain. Then inject
   external rendering/storage failure: the payment and folio must remain.
4. Repeat the legacy provider/refund regressions. The provider wrapper locks the
   subscription, delegates normalized event idempotency, preserves administrative
   suspension and recomputes debt across all invoices. New commercial CLP
   provider payments use the same atomic receipt helper; old `legacy` provider
   invoices preserve their existing document behavior and amounts. Historical
   non-CLP invoices are not converted and cannot use the new manual CLP form.
5. Reconcile all four ledger metrics against dashboard/export in historical
   and current months, separately per currency, with refunds, late settlements,
   imported paid invoices and flexible-duration MRR. Ledger pagination must not
   alter the total. Links to current invoice/contract state are explicitly current,
   not evidence that a historical balance equals today's balance.

### Manual collection and receipts

Open the invoice from Cobranza, review issuer, full remaining amount, actual
Chile payment date, method/reference and reason, then confirm receipt of funds.
No PAN/card details are accepted. Editing after an attempt creates a new
operation; retrying unchanged data keeps its operation ID. After an ambiguous
response, reconcile the invoice before intentionally starting another operation.
An invoice with payments or pending/processing charges cannot be voided.

The receipt page shows three independent facts: confirmed payment, document
generation and email request. PDFs use immutable snapshots, a licensed static
Noto Sans WOFF font subset into TrueType, deterministically fixed metadata and
the non-tax disclaimer on every page. WOFF2/variable-font embedding is not used:
real extraction tests caught invalid glyph mapping/subset failures in that format.
The package's SIL OFL 1.1 license remains distributed with the font.

The existing 0042 `saas-receipts` bucket is private, limited to PDF and 10 MiB.
Never add public read policies. Storage path is `{receiptId}/v1.pdf`, with no
overwrite; an existing upload is accepted only after deterministic hash matching.
Document metadata is immutable. Every authenticated download first checks the
user's current admin/active-owner authorization, audits access and only then
uses service-role storage. Bytes are hash/size checked, returned as PDF with
private/no-store headers, and never exposed via permanent public URLs.

### PDF and email processing

Configure server-only `SAAS_DOCUMENT_WORKER_SECRET` independently of renewal,
webhook and notification secrets. `POST /api/saas/documents/process` requires its
bearer token and `SAAS_DOCUMENTS_ENABLED=true`; default is false. Missing/malformed
authorization is rejected before privileged clients are created. Five jobs per
request is the default, with a five-minute database lease. The route allows
180 seconds; verify the hosting plan supports that execution budget. Service-role
credentials and Resend settings must never be prefixed `NEXT_PUBLIC_`.

Only PDF failures automatically retry, with exponential delay and a maximum of
five attempts. An expired PDF lease can be reclaimed; an exhausted job requires
explicit retry from its receipt. If upload succeeded but acknowledgment was lost,
recovery verifies identical bytes and retains the same folio. Never manually
delete or overwrite the immutable receipt to recover generation.

Configure both `RESEND_API_KEY` and `SAAS_RECEIPT_FROM` using a verified sender
domain. Confirm recipient explicitly before each intentional send/re-send.
Current billing email is mandatory when present; primary contact is allowed
only when billing email is absent and fallback is separately approved.
Credentials missing does not prevent a payment, PDF generation or download;
it prevents sending and produces visible configuration/delivery failure.
Each delivery has a stable Resend idempotency key and PDF attachment.

A Resend response with an ID means **accepted by provider**, not delivered.
No delivery webhook is claimed by this implementation. Transport timeout,
HTTP 408/409/5xx, invalid acknowledgement or expired email lease means unknown.
The operator must verify the provider outcome and use the receipt's explicit
reconciliation form: record a verified provider ID, or verified not-sent with
reason. Never assume timeout means failure. Unknown/queued/sending requests block
another send. Confirmed failure or reconciled not-sent permits a new explicit
delivery operation without duplicating payment, receipt or folio.

### Owner access and operational isolation

`/billing` is outside the operational dashboard guard. Active owner memberships
are rechecked by the RPC and again per document download; revoked memberships,
other tenant owners, tenant admins, instructors and assistants must be denied.
Suspended owners may read their plan, limits/services, scheduled change, total
debt by currency, paginated invoices/payments and own receipts, without
reactivating gym operation. Test query-parameter tampering and direct download
URLs, not just hidden buttons. No administrative billing mutations are offered.

### Opt-in scheduler and staging release

Enable pg_cron/pg_net and configure the three Vault entries documented in the
[opt-in scheduler template](../supabase/operations/saas_billing_scheduler.sql).
Use a validated HTTPS origin without trailing slash and independent secrets of
at least 32 characters matching the server environment. The template schedules
renewals every 15 minutes and documents every five minutes; nothing executes
until an operator runs it, and disabled application flags still reject work.
Cron SQL reads Vault at execution time, never embeds secret literals.

Check actual HTTP responses as well as cron history; a cron job enqueue is not
proof that an endpoint processed successfully. A 207 contains persisted
failed/unknown jobs requiring review; a 500 can mean lost acknowledgment, not
payment rollback. `/backoffice/finance/documents` distinguishes configured values
from actual worker calls, with an alert after 30 minutes without activity.
The renewal console independently reports its heartbeat.

Before production, use staging to execute create plan → assign → settle → PDF
download → explicit mail → upgrade → schedule downgrade → renew → compare
dashboard/ledger/export. Verify a real Resend acknowledgement and download bytes.
Then use two sessions for manual/manual and manual/provider races, void/payment,
duplicate delivery requests, concurrent job claims, expired leases and lost
acknowledgments. Only one settlement/document/intent may win each identity.
For PDF claim recovery, finish using the old token must be rejected. For email
lease recovery, a second worker must not resend unknown work.

To pause automation, set the processor flags false and unschedule the named
cron jobs through the platform. Retain all ledger/outbox/receipt history and
reconcile in-progress sends; do not perform destructive rollback.
