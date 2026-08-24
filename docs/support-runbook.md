# Support runbook

## Intake

Record environment, UTC timestamp, affected capability, expected behavior, observed status code, and whether the issue is reproducible. Do not copy names, email addresses, tenant or student identifiers, health details, request bodies, access tokens, cookies, or provider payloads into tickets or logs.

Classify the incident:

- `P1`: suspected cross-tenant access, privileged-key exposure, unauthorized health access, or broad outage.
- `P2`: billing, authentication, synchronization, or notification failure affecting multiple users.
- `P3`: isolated workflow failure with an available workaround.

For `P1`, stop rollout, preserve sanitized evidence, restrict access to the incident channel, and escalate to security and the service owner. Do not enable health processing or remove a retention hold during incident response.

## Diagnosis

1. Confirm the deployment and migration versions for the affected environment.
2. Search structured records described in [observability.md](observability.md) by `area`, `operation`, `outcome`, `errorCode`, and time window only.
3. Check the relevant GitHub Actions run and Vercel deployment health.
4. Reproduce in staging with synthetic data. Never reproduce against another tenant's production records.
5. For offline issues, preserve the visible queue state and retry only through the application flow. Do not delete IndexedDB entries manually.
6. For authorization failures, verify account, tenant, and membership state. Do not bypass RLS with a privileged key.

## Recovery

- Prefer replay-safe application operations and documented feature flags.
- Apply database changes through a reviewed migration, never an ad hoc production schema edit.
- Roll back the client only when it remains compatible with the deployed schema.
- Verify the repaired path in staging, then monitor rejection and failure rates after release.

Close the incident with cause, sanitized timeline, corrective action, verification evidence, and any required privacy or billing follow-up.

## References

- Architecture and environment variables: [../README.md](../README.md)
- Migration order and SQL verification: [../supabase/README.md](../supabase/README.md)
- Privacy production gate: [privacy-governance.md](privacy-governance.md)
- Billing incidents: [billing-runbook.md](billing-runbook.md)
