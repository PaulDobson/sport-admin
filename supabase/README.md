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

The verification scripts run inside a transaction and roll back their fixture tenants, memberships, and other rows. They do not require Docker, the Supabase CLI, or a local database.
