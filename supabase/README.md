# Supabase scripts

Run these files from the Supabase Dashboard SQL Editor:

1. Execute `migrations/0001_init.sql` once. It creates the MVP tables, the `current_tenant_ids()` function, and RLS policies.
2. Open `tests/0001_rls_isolation.sql`. Replace the two example user UUIDs with IDs from Authentication > Users, then execute it.
3. The isolation queries must return one visible student for each user. The final query must show four policies per listed table: SELECT, INSERT, UPDATE, and DELETE.
4. Execute `migrations/0002_identity.sql` once. It adds `profiles`, `platform_admins`, `audit_log`, tenant/membership status values, and the `is_platform_admin()` / `current_membership_role()` functions.
5. To make a user a platform (SaaS) administrator, insert their auth user id into `platform_admins` directly from the SQL Editor (there is no self-service path, by design).
6. Execute `migrations/0003_identity_access_hardening.sql`. It removes suspended and cancelled tenants from operational access even when their memberships remain active.
7. Execute `migrations/0004_onboarding_bootstrap_visibility.sql`. It lets a tenant creator read the new account row required to claim its first owner membership, without granting access to operational tables.
8. Open `tests/0002_identity_cross_tenant.sql`. Set the two user UUIDs at the top from Authentication > Users, then execute it as a single script.
9. Expected results: user A sees only Tenant A's student and audit entry; cross-tenant writes are rejected or affect zero rows; suspended tenants and revoked memberships grant no operational role; and the platform administrator can inspect identity and audit metadata across tenants. Any failed assertion aborts the script, and all fixtures are rolled back afterward.
10. Execute `migrations/0005_instructor_operations_students_locations.sql` to add typed external locations, student archival, and tenant-scoped contacts.
11. Open `tests/0003_students_locations.sql`, set its two user UUIDs, and execute it as one script. It verifies all four location types, preserved archived students and contacts, and SELECT/INSERT/UPDATE/DELETE isolation for contact data.
12. Execute `migrations/0006_instructor_schedule.sql` to add disciplines, class templates, recurring schedules, and database-level conflict protection.
13. Open `tests/0004_instructor_schedule.sql`, set its two user UUIDs, and execute it as one script. It verifies relationships, capacity, timezone persistence, rejected overlaps, explicit conflict confirmation, and tenant isolation.
14. Execute `migrations/0007_instructor_sessions_enrollments.sql` to add concrete sessions, enrollments, capacity enforcement, waitlists, and cancellation promotion.
15. Open `tests/0005_sessions_enrollments.sql`, set its two user UUIDs, and execute it as one script. It verifies generated session values, edits, capacity, waitlisting, cancellation promotion, expected participants, and tenant isolation.
16. Execute `migrations/0008_instructor_role_permissions.sql` to scope operational access by owner, responsible instructor, and explicit assistant-to-instructor assignments.
17. Open `tests/0006_instructor_role_permissions.sql`, set its two user UUIDs, and execute it as one script. It verifies owner-wide access, instructor-owned schedules and sessions, assistant read-only student access, and enrollment management only for assigned instructors.
18. Execute `migrations/0009_evolution_health_attendance.sql` to add configurable metrics, immutable evaluations, health history, restrictions, class-session attendance, alerts, sensitive auditing, and tenant/student/date indexes.
19. Open `tests/0007_evolution_health_attendance.sql`, set its two user UUIDs, and execute it as one script. It verifies persistence, immutable history, resolution, automatic and explicit audit events, required indexes, RLS, cross-tenant isolation, and denial of medical access to platform administrators.
20. Execute `migrations/0010_abandonment_policies.sql` to add configurable instructor thresholds and concurrency-safe deduplication for abandonment alerts.
21. Open `tests/0008_abandonment_policies.sql`, set its two user UUIDs, and execute it as one script. It verifies policy persistence, alert deduplication, resolution history, and cross-tenant isolation.
22. Open `tests/0009_health_privacy_roles.sql`, set its two user UUIDs, and execute it as one script. It verifies that assistants and platform administrators cannot read, modify, or create sensitive health records.
23. Execute `migrations/0011_instructor_finance_foundation.sql` to expand membership plans and student memberships with currency, billing cycles, prices, due dates, and traceable states, and to add instructor payments, adjustments, and immutable financial events.
24. Open `tests/0010_instructor_finance_foundation.sql`, set its two user UUIDs, and execute it as one script. It verifies currencies, periodicities, membership/payment states, discounts, credits, taxes, immutable events, RLS, and cross-tenant isolation.
25. Execute `migrations/0012_student_membership_lifecycle.sql` to add atomic activation, pause, renewal, expiration, grace-period, and cancellation transitions with one financial event per operation.
26. Open `tests/0011_student_membership_lifecycle.sql`, set its auth user UUID, and execute it as one script. It verifies plan snapshots, lifecycle transitions, grace-period eligibility, event history, and rejection of renewal after cancellation.
27. Execute `migrations/0013_membership_payments.sql` to record paid amounts, adjustments, and their audit event atomically and idempotently.
28. Open `tests/0012_membership_payments.sql`, set its auth user UUID, and execute it as one script. It verifies adjusted balances, duplicate-operation protection, currency validation, and immutable adjustment and event history.
29. Execute `migrations/0014_saas_billing_foundation.sql` to add the isolated SaaS plan, subscription, limit, invoice, charge, refund, and tenant-status ledger with role-aware RLS.
30. Open `tests/0013_saas_billing_foundation.sql`, set its two auth user UUIDs, and execute it as one script. It verifies tenant and platform-admin visibility, suspended-account billing access, constraints, operation uniqueness, and separation from instructor finances.
31. Execute `migrations/0015_saas_tenant_backoffice.sql` to add platform-admin-only tenant listing, status-history access, and atomic status transitions with mandatory reasons.
32. Open `tests/0014_saas_tenant_backoffice.sql`, set its tenant-owner and platform-admin auth user UUIDs, and execute it as one script. It verifies registration review, trial, activation, suspension, reactivation, cancellation, immutable history, and denial for tenant owners.
33. Execute `migrations/0016_saas_payment_webhooks.sql` to add provider identities, the service-only normalized event ledger, and atomic processing for charges and refunds.
34. Execute `tests/0015_saas_payment_webhooks.sql` as one script. It verifies successful and failed charges, a full refund, replay idempotency, tenant-safe provider references, audit events, and separation from instructor finances.
35. Execute `migrations/0017_saas_plan_limits.sql` to enforce active student/user limits, add `reports`, `offline`, and `realtime` entitlements, and preserve date-effective plan snapshots.
36. Open `tests/0016_saas_plan_limits.sql`, set its tenant-owner and platform-admin auth user UUIDs, and execute it as one script. It verifies actionable limit blocks, archived/invited resource counting, plan changes, feature access, suspension, and cross-tenant denial.
37. Execute `migrations/0018_saas_financial_dashboard.sql` to preserve subscription status events and add the platform-admin monthly SaaS financial aggregate, separated by currency and UTC calendar period.
38. Open `tests/0017_saas_financial_dashboard.sql`, set its tenant-owner and platform-admin auth user UUIDs, and execute it as one script. It verifies billing-cycle normalization, MRR, ARR, ARPA, churn, trial conversion, net collections, pending and overdue balances, UTC boundaries, currency isolation, reproducibility, and separation from instructor finances.
39. Execute `migrations/0019_saas_privileged_audit.sql` to add immutable privileged-access auditing around tenant status, limits, plan, and financial administration RPCs.
40. Execute `migrations/0020_health_access_null_hardening.sql` to make health authorization return an explicit denial for users without an operational tenant membership, including platform administrators.
41. Open `tests/0018_saas_admin_privacy_audit.sql`, set its tenant-owner and platform-admin auth user UUIDs, and execute it as one script. It verifies authorized SaaS state and finance management, explicit health-data and capability denial, tenant-owner denial, immutable privileged audit records, actor, tenant or global scope, reason, date, and result.
42. Execute `migrations/0021_offline_sync_versioning.sql` to add server-controlled versions to attendance and sensitive health records.
43. Open `tests/0019_offline_sync_versioning.sql`, set its auth user UUID, and execute it as one script. It verifies initial and incremented versions, stale attendance-write rejection, preservation of health transitions, and sensitive audit history.
44. Execute `migrations/0022_session_realtime_events.sql` to publish minimal attendance and alert signals scoped by tenant and session without medical details.
45. Open `tests/0020_session_realtime_events.sql`, set its two auth user UUIDs, and execute it as one script. It verifies attendance and alert signals, publication configuration, minimal payload columns, and cross-tenant denial.
46. Execute `migrations/0023_notifications_activity_foundation.sql` to add notification preferences, the internal activity center, delivery tracking, retry history, and database deduplication.
47. Open `tests/0021_notifications_activity_foundation.sql`, set its two auth user UUIDs, and execute it as one script. It verifies pending, delivered, failed, and resolved states, immutable attempts, deduplication, recipient scope, and cross-tenant denial.
48. Execute `migrations/0024_notification_event_routing.sql` to generate and route membership, attendance, abandonment, authorized health, and SaaS billing activity events.
49. Open `tests/0022_notification_event_routing.sql`, set its owner and instructor auth user UUIDs, and execute it as one script. It verifies tenant and role routing, notification preferences, event deduplication, and medical payload redaction.
50. Execute `migrations/0025_notification_delivery_processing.sql` to add atomic delivery claims, retry scheduling, idempotent completion, and immutable attempt history.
51. Open `tests/0023_notification_delivery_processing.sql`, set its auth user UUID, and execute it as one script. It verifies exclusive claims, retry backoff, duplicate completion protection, successful retry, and final non-retryable failure.
52. Execute `migrations/0026_push_feature_flag.sql` to add push as a phase-three plan entitlement and suppress external push delivery when the tenant lacks the feature.
53. Open `tests/0024_push_feature_flag.sql`, set its auth user UUID, and execute it as one script. It verifies enabled and disabled plans and preserves the internal activity fallback.
54. Open `tests/0025_quality_rls_matrix.sql`, set its owner and assistant auth user UUIDs, and execute it as one script. It verifies RLS on every exposed table plus tenant and recipient isolation across notification preferences, events, activity-center rows, deliveries, and immutable attempts.
55. Execute `migrations/0027_health_privacy_governance.sql` to keep health disabled until legal approval and add versioned consent, audited export/correction, and 30-day erasure requests with a default retention hold.
56. Open `tests/0026_health_privacy_governance.sql`, set its two auth user UUIDs, and execute it as one script. It verifies fail-closed health access, consent replay and revocation, immutable history, tenant isolation, audited data rights, and blocked erasure during retention.
57. Execute `migrations/0031_student_portal.sql` to add one-time, email-bound student portal invitations, account-to-student links, isolated session discovery, and authorized self-service enrollment/cancellation RPCs. Reapply `enroll_student_in_session` and `cancel_session_enrollment` from this migration after `0007_instructor_sessions_enrollments.sql` and `0008_instructor_role_permissions.sql`.
58. Open `tests/0027_student_portal.sql`, set the owner, invited guardian, and unrelated user UUIDs from Authentication > Users, and execute it as one script. It verifies email matching, one-time redemption, onboarding protection, linked-student isolation, future-session enrollment/cancellation, and denial of unlinked records. The script rolls back all fixtures.
59. Execute `migrations/0032_instructor_session_publishing.sql` to add atomic one-off session publishing and timezone-aware weekly occurrence generation, bounded to eight weeks.
60. Open `tests/0028_instructor_session_publishing.sql`, set distinct existing owner and unrelated Auth user UUIDs, and run it as one script. It verifies archived one-off sources, weekly occurrence counts, idempotent publication, the range limit, and authorization. All fixtures roll back.
61. Before deploying class editing/deletion, execute `migrations/0033_class_template_administration.sql`. It replaces cascading class-to-schedule deletion with a restrictive foreign key, adds indexed usage counts, and exposes an authorized catalog RPC to owners, admins, and instructors. Counts include historical records and other instructors' references without exposing their session or schedule details.
62. Open `tests/0029_class_template_administration.sql`, set two distinct existing Auth user UUIDs, and execute it as one script. It verifies restricted deletion, hidden historical usage, tenant/role authorization, persistent editing, and preserved published capacity. Fixtures roll back.
## Student portal

An owner, admin, or instructor opens a student record and generates a seven-day invitation for its active primary email contact. Share the one-time URL directly with the student or guardian. The invitee creates an account, confirms the same email, accepts the invitation, and can then see upcoming sessions and reserve/cancel for the linked student only. Confirmed enrollment and waitlist status are assigned atomically by the database. Assistants cannot issue invitations. Email delivery is not configured in this repository, so the app displays a copyable invitation link instead of claiming to send email.

The verification scripts run inside a transaction and roll back their fixture tenants, memberships, and other rows. They do not require Docker, the Supabase CLI, or a local database.

## Membership payment method verification

After applying `migrations/0029_membership_payment_method.sql` and `migrations/0030_membership_collection_notices.sql` with their prerequisites, open `tests/0029_membership_payment_method.sql` in the Supabase SQL Editor. Set `test.user_a` to an existing Auth user UUID and execute the complete script. It verifies payment idempotency, stored payment methods, invalid-method rejection, and collection-notice resolution after full payment.

Payment and notification counts are scoped to the fixture tenant so existing records accessible to the selected user do not affect the assertions. The script ends with `rollback` and does not persist its fixtures. If execution fails in a session that keeps the transaction open, run `rollback;` before retrying the complete script.

## Student profile details

Execute `migrations/0035_student_profile_details.sql` to add optional gender, height, weight, and emergency-contact details to student profiles. Allergies stay in consent-gated health history rather than the basic profile.
Execute `migrations/0036_student_contact_fields_backfill.sql` to preserve existing primary emergency contacts in the new emergency phone field.

## Commercial SaaS renewals (prepared migrations, not production instructions)

On 2026-10-18 the operator confirmed successful **staging** execution of migrations
0048–0052, regressions 0043–0048, the integrated 0049 lifecycle regression and the
scheduler template. This is operator-reported, not independently observed.
Two-connection concurrency and actual worker/storage/provider smoke remain pending.
The new [0048 migration](migrations/0048_saas_collections_and_issuer.sql) adds
collections/detail reads and versioned issuer configuration; it is prepared,
not applied by the assistant but included in the operator's staging confirmation.
Do not rerun committed migrations. Use a disposable database for further fixtures
and complete the runtime/concurrency gate before production automation.

The [0048 regression](tests/0048_saas_collections_and_issuer.sql) covers
non-admin denial, revoked direct view access, literal name search, tenant/status/
currency/due filters, stable pagination, partial legacy balances, imported
settlements, pending attempts, historical refunds, issuer checksum validation,
immutable versions, stale updates, operation replay/payload mismatch and audit.
It ends in `rollback`; it has not been executed by the assistant.

If migration `0042` failed with duplicate constraint
`saas_charges_manual_reference_check`, use the corrected migration: its
column-length check is explicitly named `saas_charges_manual_reference_length_check`,
separate from the cross-field payment check. Run `rollback;` if the failed
transaction is still open, then rerun the complete `0042` script. Do not rerun
an already committed `0041` or drop payment constraints to bypass the error.

The new [renewal regression](tests/0047_saas_subscription_renewals.sql) rolls back
synthetic identities and contracts, checking archived-version renewal, trial
completion, applied/blocked downgrades, owner notification routing, free periods,
idempotency, permission denial, rollback after invoice conflict, retry exhaustion
and reviewed recovery. It does not replace a two-connection concurrency test.
See [the billing runbook](../docs/billing-runbook.md#renewal-processor-prepared-not-yet-enabled)
for the release gate, protected endpoint, manual recovery and required concurrent
verification. No remote migration or scheduler deployment is performed by the
application code.

## Manual payments, private receipts and owner billing (prepared 0049–0052)

The following migrations are included in the operator's successful staging
execution report. They are listed in dependency order for fresh environments;
do not rerun them in staging if already committed:

1. [0049](migrations/0049_saas_manual_payments.sql): atomic full-balance payments,
   audited voids, shared provider overpayment protection and receipt/PDF outbox.
   Existing provider invoices tagged `legacy` retain their historical document
   behavior and amounts; new commercial CLP provider invoices share receipt creation.
2. [0050](migrations/0050_saas_receipt_processing.sql): per-document owner/admin
   authorization, delivery recipient checks, PDF/email worker leases,
   uncertain-email reconciliation and heartbeat.
3. [0051](migrations/0051_saas_owner_billing.sql): named owned-academy selection,
   total debt per currency, paginated invoices and read-only suspended-owner access.
4. [0052](migrations/0052_saas_financial_drilldown.sql): exact-period financial
   ledger, including signed refunds and historical duration-aware MRR.

The integrated [lifecycle regression](tests/0049_saas_billing_lifecycle.sql)
requires the complete chain through 0052 and rolls back all synthetic fixtures.
It checks partial/overpayment rejection, operation replay, transactional outbox
failure, retained debt, private document grants, lease/retry/unknown delivery,
owner/foreign-role authorization and dashboard reconciliation. The operator
confirmed it ran successfully in staging. Keep earlier regression scripts and two-connection tests in the
release gate; this integrated script alone does not certify concurrency.

The [scheduler template](operations/saas_billing_scheduler.sql) is opt-in, not a
migration; its execution in staging is operator-confirmed, but actual endpoint
processing is not yet verified. Configure independent worker secrets through Vault, not cron literals.
Read [the runbook](../docs/billing-runbook.md#payments-documents-and-owner-access-0049–0052)
before enabling either worker. No storage object, email or cron schedule was
created remotely by the assistant during that staging preparation. The later
authorized localhost smoke uploaded one synthetic receipt to the connected
private bucket, as recorded in the runbook; it did not send email or change cron.

## Document recovery inbox (prepared 0053, not executed)

[0053](migrations/0053_saas_document_job_queue.sql) adds an audited,
platform-admin-only read RPC for the existing PDF/email outbox. It does not
change job processing, delivery semantics, receipts, payments or cron schedules.
Apply it after 0052 when database validation resumes; it has not been executed
or included in the operator's previous migration confirmation.

The inbox is available from **Finanzas SaaS → Revisar PDF y correo**. It filters
by academy name, job kind and state, with server-side pagination and counts from
one SQL snapshot. The default attention view includes failed/uncertain jobs and
running jobs with expired leases. Queue reads never claim or execute a job.
No worker lease tokens, storage paths, provider secrets or receipt snapshots are
returned. Existing table privileges and RLS remain unchanged.

Before 0053 is installed, the application shows an explicit missing-migration
message for the inbox while retaining the existing processor status console.
SQL/RLS, runtime and browser checks for this increment are deferred at the
operator's request; type checking and focused lint are separate static checks.

## Read-only plan version history (prepared 0054, not executed)

[0054](migrations/0054_saas_plan_version_history.sql) exposes the immutable
plan versions through a paginated, audited, platform-admin-only RPC.
It does not change existing versions, contracts, prices, limits or table grants.
The history is reachable from active and archived catalog entries; the current
offer is identified by `current_version_id`, not the highest version number.
This matters for imported negotiated legacy versions.

The returned rows preserve original amounts/currencies and omit creator user
identities. Runtime parsing checks both the requested plan and pagination.
Missing RPC installation produces an explicit 0054 migration message without
breaking the existing catalog. Execute migrations in numeric order when SQL
validation resumes; neither 0053 nor 0054 is covered by the earlier staging
confirmation. SQL/runtime/browser verification is deferred; static TypeScript
and focused lint passed.
