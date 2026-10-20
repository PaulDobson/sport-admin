# Architecture

The application uses four layers with dependencies pointing inward:

```text
presentation -> application -> domain
infrastructure -> application -> domain
```

- `src/domain/`: business entities and rules. It has no framework, database, network, or UI imports.
- `src/application/`: use cases and ports. It may import `domain`, but not concrete infrastructure or presentation code.
- `src/infrastructure/`: Supabase clients, repositories, mappers, and other adapters. It implements application ports.
- `src/presentation/`: Next.js routes, Server Actions, and UI components. It invokes application use cases.

New business logic belongs in `domain` or `application`; external integrations belong in `infrastructure`; request and UI orchestration belongs in `presentation`.

Tailwind scans only `src/`, configured with explicit `@source` in
`src/presentation/styles/globals.css`. Keep generated build artifacts outside
this source tree to avoid interpreting generated content as utility classes.

## Environments and secrets

Three environments share the same schema of variables, defined in [.env.example](.env.example):

| Variable                        | Where it's used                     | Exposure                                                |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser + server                    | Public, bundled into client code                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server                    | Public, bundled into client code                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only (privileged operations) | Secret, never read by `src/app` or any client component |

- **local**: copy `.env.example` to `.env.local` (git-ignored) with your local/dev Supabase project values.
- **staging** and **production**: set the same variable names as Environment Variables in the Vercel project settings, scoped to the respective environment (Preview for staging, Production for production). Never commit real values.
- `SUPABASE_SERVICE_ROLE_KEY` must never be prefixed with `NEXT_PUBLIC_` and must never be imported from `src/app` or other presentation code; only server-side infrastructure code may use it.
- Browser clients read public configuration through static `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` references so Next.js can inline them. Do not import the server environment helper into a browser client: dynamic `process.env[name]` lookups are not available there. Rebuild after changing public environment variables.
- Run `pnpm build && pnpm verify:bundle-secrets` to confirm the client bundle never contains the service role key.

## Generic SaaS payment webhook

`POST /api/webhooks/saas` accepts normalized JSON events with type `charge.succeeded`, `charge.failed`, `refund.succeeded`, or `refund.failed`. Amounts use exact decimal strings such as `"49.00"`; charge events require `invoiceId`, and refund events require `refundId`.

Sign `${timestamp}.${rawBody}` with HMAC-SHA256 using `SAAS_WEBHOOK_SECRET`. Send the Unix timestamp in `x-saas-timestamp` and the lowercase hex digest as `x-saas-signature: sha256=<digest>`. Timestamps have a five-minute tolerance and payloads are limited to 64 KiB.

Successful processing and replay of an existing provider event both return HTTP 200 with the same internal event ID. Invalid signatures return 401, invalid payloads return 400, and transient processing failures return 500 so the sender can retry safely.

## Operations

### SaaS commercial plans (implementation in progress)

The platform-admin **Planes** section (`/backoffice/plans`) prepares the commercial
catalog: whole-peso CLP prices, included informational VAT, day/month duration,
optional trial, resource limits, supported features and descriptive services.
Publishing creates an immutable version; archiving prevents future assignment
without cancelling existing contracts. Historical foreign-currency amounts are
not converted. The editor requires entering a new CLP price for foreign-currency
plans rather than copying their numeric amount into a different currency.

New schema and RPCs are in the following ordered migrations:

1. `0041_saas_plan_versions.sql`: immutable versions, legacy 1/3/6/12-month
   backfill, separate contract snapshots, explicit exclusive period ends and
   a guard against assigning commercial plans through the limits-only path.
2. `0042_saas_receipt_outbox.sql`: scheduled changes, issuer versions, immutable
   receipt snapshots, private document metadata, delivery states and leased jobs.
3. `0043_saas_plan_catalog.sql`: audited catalog queries, idempotent publication
   and archive, and optimistic checks against stale versions.
4. `0044_saas_subscription_assignment.sql`: Chile business dates, anchored
   calendar boundaries, ordered contract events, authoritative subscription/usage
   reads and idempotent transactional initial assignment.
5. `0045_saas_flexible_financial_dashboard.sql`: duration-aware historical MRR
   and per-invoice balances after confirmed charges, preserving imported legacy
   settlements without a charge ledger.
6. `0046_saas_contract_plan_changes.sql`: authoritative plan-change previews,
   immediate prorated upgrades, scheduled downgrade/equivalent changes,
   cancellation and protection of the legacy limits-only RPC.
7. `0047_saas_subscription_renewals.sql`: one-period transactional renewal,
   trial completion, scheduled-change execution with usage revalidation, durable
   request results/failures and owner-only internal blocked-change notices.
8. `0048_saas_collections_and_issuer.sql`: audited paginated receivables/detail,
   exact SQL balances, immutable issuer configuration with RUT checksum,
   optimistic concurrency and operation replay.
9. `0049_saas_manual_payments.sql`: full-balance manual settlement and voiding,
   shared provider settlement guards, aggregate subscription payment state and
   atomic immutable receipt/PDF outbox creation for the new CLP billing flow.
10. `0050_saas_receipt_processing.sql`: authorized private downloads, explicit
    recipient confirmation, recoverable PDF leases, uncertain-email reconciliation
    and actual worker heartbeat.
11. `0051_saas_owner_billing.sql`: owner-only paginated billing, named academy
    selection and total debt per currency, including suspended academies.
12. `0052_saas_financial_drilldown.sql`: historical month/currency ledger for
    collected net, pending, overdue and normalized MRR.

On 2026-10-18 the operator confirmed successful **staging** execution of migrations
`0048`–`0052`, regressions `0043`–`0048`, the integrated `0049` lifecycle regression
and the scheduler SQL template. This is operator-reported, not independently
observed. Concurrent two-connection tests and actual worker/storage/email smoke
remain pending; no production deployment is confirmed. Do not rerun committed
migrations or use production as a test fixture.
`supabase/tests/0043_saas_plan_catalog.sql`
and the numbered `0044` through `0048` scripts provide rollback-only catalog,
assignment, dashboard, contractual-change, renewal, collection and issuer checks.
Full legacy backfill and concurrency checks remain pending.
The integrated `supabase/tests/0049_saas_billing_lifecycle.sql` additionally
prepares payment/receipt atomicity, outbox-failure rollback, worker recovery,
recipient priority, suspended-owner/foreign-role denial and ledger reconciliation
checks through `0052`; its successful staging execution is included in that report.

The **Cobranza** section at `/backoffice/collections` now lists invoices with
server-side pagination and filters for tenant/name, derived debt status,
currency and inclusive due-date range. Mobile cards and desktop tables link to
a detail screen with confirmed payments, pending attempts and legacy refunds.
List filters/page survive the detail round trip. Imported paid legacy invoices
without charges remain settled; no synthetic payments or currency conversion
are introduced. Refunds are displayed separately and do not reopen receivables.
Detail events are bounded to the latest 100 payments and 100 refunds, with total
counts and an explicit truncation notice.

Configure the platform issuer at `/backoffice/finance/issuer`, also linked from
Cobranza and Finanzas. Required fields are legal name, checksum-valid Chilean RUT,
address, email and change reason. Each save creates an immutable version; retries
reuse the same operation and stale versions are rejected. This does not configure
the email provider or certify SII authorization. Manual payment and void forms
are now implemented; their RPCs require the new migrations. A payment records the
full current balance only, requires issuer/date/method/reason/confirmation, and
creates its immutable receipt and PDF work atomically. No mail is automatic.

The tenant panel links to **Gestionar suscripción** at
`/backoffice/tenants/[tenantId]/subscription`. Its initial-assignment flow reviews
the selected immutable version, explicit optional trial, first payable period,
initial debt, included VAT and actual usage before confirmation with a reason.
The prepared RPC atomically persists the contract, limits, initial invoice and
audit, or none of them. Trial/free assignment never invents a payment or receipt.

For an existing CLP contract, a separate two-step task previews a plan change.
An upgrade updates the applied daily rate immediately, leaves the positive
rounded difference as debt and preserves the current renewal boundary.
Successive upgrades use the last applied rate, not the original tariff. A
downgrade or equivalent tariff schedules the new version for renewal, without
a refund; pending changes can be explicitly cancelled. Stale previews require
review again, while ambiguous retries retain the draft and operation identity.
Historical contract prices/currencies are read independently of today's catalog.
Changes during trial, reconciliation of foreign/fractional legacy contracts and
legacy limits schedules remain unavailable in this staged flow.

Until the migrations are installed, opening the catalog shows an explicit
configuration warning instead of disguising an incompatible schema as an empty
catalog or an editable empty contract. Renewal processing and scheduled-change
execution are now prepared in code, but **disabled by default**. Keep
`SAAS_RENEWALS_ENABLED=false` until disposable PostgreSQL tests, two-worker
concurrency checks and staging smoke pass. The protected endpoint is
`POST /api/saas/renewals/process`, using an independent bearer secret
`SAAS_RENEWAL_WORKER_SECRET`; no scheduler has been deployed by this work.

The renewal console at `/backoffice/finance/renewals` separates configuration,
actual worker history, backlog, retry exhaustion and blocked changes. It is
linked from Finance and subscription tasks. Opening a page never renews a
contract. When enabled, the tenant task allows explicit review and renewal of
one overdue period, sharing the same RPC as the worker.

Each automatic request processes at most ten periods; each RPC advances only
one. Trials start their first full payable period at the confirmed anchor;
upgrades start a full new duration at the preserved renewal boundary. Archived
contracted versions remain renewable. A blocked downgrade renews the previous
terms once, retains the blocked change for platform-admin review and queues
an internal owner notification. No external email is sent by that operation.
Failures roll back contract/invoice/limits mutations before recording a durable
result and retry state. After three failures, automatic retries stop pending
review. Legacy currency, anchor or limits ambiguities fail explicitly rather
than silently converting or overwriting the contract.

Actual PDF generation uses a statically embedded Noto Sans font (SIL OFL 1.1),
with extractable accented text, multipage services and the prominent
non-tax disclaimer. Private downloads reauthorize each receipt before privileged
storage access and verify its hash/size. `/backoffice/receipts/[receiptId]`
separates payment, PDF and mail states. Resend acceptance is not shown as delivery;
ambiguous timeouts require explicit provider reconciliation before another send.
Keep `SAAS_DOCUMENTS_ENABLED=false` until PostgreSQL/storage/staging checks pass.
The protected `POST /api/saas/documents/process` processes at most five jobs by
default; `/backoffice/finance/documents` reports configuration and real heartbeat.

Owners have read-only `/billing` access from desktop navigation/account menu.
An active owner membership can read billing for a suspended academy without
reactivating operational access. Other operational roles are not owners.
Finance links to `/backoffice/finance/ledger` with the exact UTC month, currency
and metric; totals cover all pages and preserve historical currency.

No payments, migrations, provider sends or remote deployments were performed
against a real environment by this work. An opt-in Vault/pg_cron template is
available at `supabase/operations/saas_billing_scheduler.sql`; the operator reports
executing it in staging. Actual endpoint processing still needs verification.
See the deployment/recovery procedure in
[the billing runbook](docs/billing-runbook.md#renewal-processor-prepared-not-yet-enabled).
Track full scope and verification in
[`manage-saas-plans-and-collections`](openspec/changes/manage-saas-plans-and-collections/tasks.md).

Run the catalog, assignment and plan-change real-page UI checks with synthetic storage:

```sh
pnpm exec playwright test --config=e2e/saas-plans.playwright.config.ts --workers=1
```

They check 320/375/390/768/1280/1440 px, card/table switching, 44 px targets,
16 px aligned icons, failed-draft retention (including feature checkboxes),
keyboard retry, reload persistence, optional trial, stale assignment review,
incremental successive upgrades, downgrade cancellation, renewal review,
applied/blocked downgrades, worker-readiness warnings and explicit archive.
The focused SaaS regression now includes real PDF text extraction, payment rules,
private storage integrity, protected workers/downloads and owner authorization.
The browser suite passes eighteen scenarios, including collections pagination,
issuer validation, failed payment draft retention, PDF retry, failed/uncertain
mail, voiding, historical-ledger pagination and suspended-owner read-only access.
The focused unit/integration suite passes 576 tests in 60 files. Type checking, lint and an
isolated production build also pass. These checks do not replace
the separate PostgreSQL regression or the final authenticated staging smoke.

### Academy details

Owners and administrators maintain **Mi gimnasio** from **Gestión** on desktop
or the account menu on mobile (`/dashboard/gym`). Only the gym name is required.
Address, main contact name/email, phone, city, and region are optional. City and
region are free text so existing academies are not restricted to one country.
These details are separate from SaaS billing contacts and operational locations.

Deploy `supabase/migrations/0039_tenant_details.sql` before using this page.
Existing academies keep their name and start with empty optional fields.
The RPC checks active owner/admin membership, updates the name and contact
details atomically, and writes an audit event without contact data.
Contact details have their own RLS-protected table; instructors and assistants
cannot read them. A submitted form must match the server's active tenant.
The form preserves failed input, shows field-level validation and pending/success
feedback, and warns before browser reload when there are unsaved changes.
The standalone SQL regression is `supabase/tests/0039_tenant_details.sql`;
run it only against a disposable database with migrations applied.

The SaaS **Tenants** backoffice also shows the main contact, phone, address,
city and region, with billing contacts in a separate section. Desktop rows and
mobile cards display the main contact; search includes both contact types and
location fields. Deploy `supabase/migrations/0040_saas_tenant_details.sql` after
0039 to extend the audited platform-admin listing. No direct table permissions
are added: tenant owners still cannot list other academies or read their contacts.
Academies without a details row remain visible with explicit empty-field labels.
The adapter validates the RPC response at runtime: a legacy listing without the
new columns raises a migration error instead of displaying saved data as missing.
Run `supabase/tests/0040_saas_tenant_details.sql` in a disposable database to verify
the privileged join, audit record, existing-tenant compatibility and denied access.

Run the targeted browser checks with synthetic data and the actual page and shell:

```sh
pnpm exec playwright test --config=e2e/gym.playwright.config.ts --workers=1
```

These cover 320, 375, 390, 768, 1280, and 1440 px, minimum 44 px controls,
mobile account-menu access, keyboard feedback, retry, optional-field clearing,
and reload persistence in the fixture. Real RPC requests, tenant selection, and
role enforcement are covered by Vitest and the separate SQL regression.

### Student administration

**Alumnos** uses cards on mobile and a table on desktop. Search by name or
switch between **Activos**, **Archivados**, and **Todos**. Filters and pagination
stay in the URL and are preserved when opening a task and returning to the list.
Out-of-range pages are normalized to a valid page.

**Nuevo alumno** opens a dedicated page. Identity and contact come first; only
the name is required. Emergency contact, profile details, and allergies are
optional expandable sections. Allergies still require an approved health policy
and explicit consent from the student or guardian. A partial health failure
identifies the already-created student and links to their record rather than
allowing the registration to be submitted twice.

The student record separates **Resumen**, **Membresía**, **Salud**, and
**Privacidad**. Editing basic details is a separate task. Forms preserve entered
values on errors, prevent duplicate submissions, and warn before discarding
unsaved changes. Protected health information is not fetched without the
existing policy and consent requirements.

Owners, admins, and instructors can create, edit, archive, and export students.
Assistants retain their existing read-only access and do not see sensitive task
sections. Server actions enforce these restrictions and academy isolation.

**Archivar** removes a student from the default active list while preserving
history, memberships, and attendance. It is not a personal-data deletion request;
that separate process remains under **Privacidad**. This module does not add
restoration or permanent deletion.

**Exportar página a Excel** downloads a real `.xlsx` containing the current
filtered page, not all pages. Personal-data export is a separate record action.

Run the six-viewport UI coverage with synthetic data and the actual task
pages/components:

```sh
pnpm exec playwright test --config=e2e/students.playwright.config.ts --workers=1
```

The fixture replaces server adapters
only in the test server; it does not bypass authentication in the application.
CRUD, authorization, consent and Excel behavior are covered by the corresponding
Vitest tests.

### Session views and filters

Attendance accepts students who attended without reserving. Open **Anadir alumnos
sin reserva**, type at least two characters, select one or more students across
searches, and confirm **Anadir a la lista** before saving the attendance batch.
The selector is full-screen on mobile and a dialog on desktop. Searches run after
275 ms, ignore case and Spanish accents, match separate name/surname terms, and
return at most 20 students per page with **Cargar mas**. Existing participants
cannot be selected twice; closing the dialog discards only its pending selection.
Results show names, initials and a short record reference, not contact or health data.
Deploy migration `0037_attendance_student_search.sql` before using this selector.
Its standalone PostgreSQL regression is
`supabase/tests/0037_attendance_student_search.sql` (use a disposable database).
Added students start
as present and are labeled **Sin reserva**; they do not create reservations,
consume booking capacity, or change the waitlist. Unsaved additions can be
removed from the batch. Recorded students remain on the roster after reload and
are included in authorized session health checks. Consult a newly added student's
profile before saving; the link opens in a new tab to preserve the draft.
Searching requires a connection; loaded results and selections remain usable
offline while the selector stays open, and the full attendance batch is queued
by the existing sync flow.

In **Agenda > Sesiones**, switch between **Grid** cards and a **Tabla** with
date/time, class, location, status, capacity, and attendance/maintenance actions.
Grid uses a single column on mobile and two columns on wide screens; the table
scrolls horizontally within its container on smaller screens.
The table prioritizes attendance with a highlighted clipboard icon; the quieter
pencil icon opens session maintenance in a separate panel instead of expanding
the row. Both controls have accessible labels and hover titles. Status badges,
capacity meters, and concise same-day time ranges keep rows easy to scan.

Filter by **Disciplina**, location, and status. **Dia**, **Semana**, and **Mes**
are visualization options above the list, separate from the filters.
The initial view shows the current month's scheduled sessions in `America/Santiago`.
Use previous/next period or **Hoy** to navigate dates without a date filter.
Weeks run Monday through Sunday; months cover the selected calendar month.
Date boundaries are converted to Santiago time before querying the database.
The discipline filter includes archived disciplines so historical sessions
remain searchable. Location and status filters remain available.

Filters, period, anchor date, and display mode are retained in the URL when
switching views or pages. Applying or clearing filters preserves the visualization
and date while resetting pagination. Searches still fetch 25 sessions per page rather
than loading the academy's entire agenda. Both views use the same permissions
and editing/cancellation/reactivation actions.

### Class administration

In **Agenda > Programación > Clases**, the searchable, paginated class catalog
offers **Editar** and **Eliminar** next to each class. Creation stays expanded
for an empty academy and becomes an expandable form when classes already exist,
keeping catalog actions easier to reach on mobile.
Direct links to class creation still expand that form, and catalog refreshes
preserve the selected task and visible creation feedback.

Editing changes only the name and capacity (1–500 whole-number places). The
discipline stays fixed to preserve historical classification. Names update
wherever the class is referenced, including history; capacity changes apply
only to subsequently published sessions. Existing sessions, reservations,
dates, and instructors are untouched.

Deletion requires explicit confirmation and is available only for classes
without any schedules or sessions, including archived/cancelled/completed
records. The catalog explains disabled actions. The database foreign keys
protect against concurrent references instead of cascading into schedules.
Usage counts include records hidden by instructor-assignment RLS; the
role-authorized RPC returns counts, not those records' details.

Dialogs preserve entered values on errors, prevent repeated submission and
dismissal while saving, protect unsaved edits from accidental closing, and
restore keyboard focus to the opener or catalog search after deletion.
Owners, admins, and instructors may manage classes; assistants cannot mutate.

Apply `supabase/migrations/0033_class_template_administration.sql` **before**
deploying this feature. Run `supabase/tests/0029_class_template_administration.sql`
with two distinct test Auth users to verify database behavior.

### Desktop navigation

The desktop topbar includes a keyboard-accessible **Colapsar navegación /
Expandir navegación** control. Collapsing the sidebar frees horizontal space
without hiding destinations: the compact rail keeps every role-allowed link,
including Agenda's sections, with labels on hover and keyboard focus.
The active destination remains highlighted. The selection stays in place while
navigating within the dashboard layout; a fresh page load starts expanded.
Mobile navigation is unchanged. Width transitions respect reduced-motion
preferences.

### Discipline catalog

Open **Agenda > Disciplinas** (`/dashboard/disciplines`) to search and filter the
academy's paginated discipline catalog. Owners, administrators, and instructors
can create disciplines, edit names, archive/reactivate, and confirm permanent
deletion. Assistants have read-only access.

Creating a class template in **Agenda > Programación** requires selecting an
active discipline from this catalog. The server checks the selected ID against
the active academy; it never creates disciplines implicitly. If the catalog has
no active disciplines, create or reactivate one before creating a class.

**Programación** guides creation through **Qué impartes → Dónde → Cuándo →
Revisar**. Select a class and place, or create the missing discipline, class,
or location inline; successful creation selects the new item. Choose a weekly
pattern or a one-off with explicit start/end dates. Weekly patterns support
multiple days and slots, a common duration, and personalized times or locations.
The final review shows the actual dated occurrences, existing sessions, and
contextual conflicts. Editing a reviewed value requires reviewing again.
Accept a conflict explicitly only after reading its details.

**Guardar horarios** saves weekly rules without creating sessions; **Publicar**
also creates occurrences in the reviewed date range (maximum 56 days).
**Horarios** groups matching existing rules for publication; groups are a UI
projection, not a new series table. Existing URL fragments and catalog links
remain compatible. Published sessions keep cancellations, capacity, waitlist,
and individual edits on republish; counts distinguish newly inserted from
already existing sessions. Scheduling supports valid IANA timezones and rejects
nonexistent DST times. The **Agenda** currently displays times explicitly in
**America/Santiago**, even when a rule uses another zone.

The class form explains why an active discipline is required for creating a
class. Existing active classes remain schedulable when their discipline has
subsequently been archived.

Deploy `supabase/migrations/0038_programming_batch.sql` before using the new
preview/commit actions. It adds a transactional RPC and replaces the original
recurring publishing function without changing its signature or any tables.
The authenticated caller's current active tenant membership is checked on
every call. Instructors program their own scope; owners/admins may explicitly
select another active instructor. No existing rule is reassigned.
Instructor and operation advisory locks serialize batches. Durable retry
receipts use valid archived schedule rows: a fixed operation/slot UUID and a
payload-derived UUID. Exact own rules may be reused, but another instructor's
rules are never reused. Keep those archived receipts for retry protection.

The local-only regression script is
`supabase/tests/0038_programming_batch.sql`; it rolls back synthetic Auth users
and all fixtures. Run against a disposable migrated local PostgreSQL/Supabase
instance, not a shared remote database. Migration 0038 and its behavioral tests
were also checked in isolated embedded PostgreSQL; applying the full migration
chain and RLS suite still requires a running local Supabase stack.

Names are unique within the academy, including archived disciplines. Archiving
preserves existing class templates and sessions. Permanent deletion is allowed
only when no class templates reference the discipline; the database foreign key
also enforces this restriction if a class is created concurrently. All operations
use the authenticated Supabase client, tenant scoping, and existing RLS policies;
no additional migration is required.

The structured log schema, sensitive-data restrictions, initial alert thresholds, and staging checks are documented in [docs/observability.md](docs/observability.md).

Health processing remains disabled until legal approval. The implemented controls and required production evidence are documented in [docs/privacy-governance.md](docs/privacy-governance.md).

Operational response is documented in [docs/support-runbook.md](docs/support-runbook.md). SaaS subscription reconciliation and webhook recovery are documented in [docs/billing-runbook.md](docs/billing-runbook.md).

## Continuous integration

The `CI` GitHub Actions workflow runs lint, type checking, unit and integration tests, a production build, the privileged-secret bundle scan, mobile Chromium PWA tests, and the current Supabase RLS matrices. Database checks use a disposable local Supabase stack with deterministic identities from `supabase/seed.sql`; they never connect to staging or production.

Run the browser checks locally with `pnpm exec playwright install chromium` followed by `pnpm test:e2e`.
