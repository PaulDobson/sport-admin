# Health data privacy governance

Health processing is disabled by default. Enabling it requires an approved tenant policy with a jurisdiction code, policy version, approver, and approval timestamp.

This is a technical control, not legal approval.

## Implemented controls

- Fail-closed authorization for health reads and writes when no approved policy is enabled.
- Immutable, versioned consent events declared by an authorized instructor on behalf of a student or guardian.
- Current consent required for new health evaluations, conditions, injuries, restrictions, and health alerts.
- Tenant-scoped personal-data export with an immutable sensitive-access audit event.
- Tenant-scoped correction of student name and birth date with changed-field auditing; previous personal values are not copied into logs.
- Auditable erasure requests with a minimum 30-day waiting period.
- Retention hold enabled by default. No automated purge exists until legal review defines records that must be retained or anonymized.

## Production gate

Before enabling health for any production tenant, record approval of the target jurisdiction and policy version outside the application, then configure the tenant policy. Legal review must define:

- the lawful basis and acceptable evidence for represented consent;
- retention periods for health, financial, and audit records;
- export scope and identity-verification procedure;
- correction authority and historical-record treatment;
- erasure exceptions, anonymization rules, and approval process;
- incident response and regulator or data-subject notification duties.

Until those items are approved, keep `health_enabled = false` and `retention_hold = true`.

## Verification evidence

Run migration `0027_health_privacy_governance.sql`, followed by transactional test `0026_health_privacy_governance.sql`. Preserve the successful SQL Editor result with the legal approval record and staging release evidence. The test rolls back all fixtures.
