# Observability

Sport Admin emits one-line JSON records to stdout/stderr. Vercel or another log drain can index records where `type` is `sport_admin_observability`.

## Safe schema

- `area`: `application`, `offline_sync`, `realtime_resync`, `rls`, or `saas_webhook`.
- `operation`: fixed operation name defined by the application.
- `outcome`: `success`, `rejected`, or `failure`.
- `durationMs`: non-negative integer.
- `itemCount`: optional non-negative integer.
- `errorCode`: optional uppercase technical code.

The observer deliberately rejects arbitrary context. Do not add request bodies, URLs with identifiers, tenant/user/student/session IDs, provider references, names, email addresses, free-form error messages, health data, or stack traces to these records.

## Initial alerts

Configure these in staging before production:

- Any `saas_webhook/process/failure` event.
- Any `offline_sync/process_commands` or `realtime_resync/recover_events` failure sustained for five minutes.
- A sharp increase in `rls/*/rejected` compared with the staging baseline.
- p95 `durationMs` above 2,000 ms for synchronization or above 1,000 ms for webhooks over fifteen minutes.

A rejected authorization or validation request is operational evidence, not an application exception. Alert on rate changes rather than individual rejected events.

## Verification

Run the observability and route tests:

```sh
pnpm exec vitest run src/infrastructure/observability/console-observability.test.ts src/app/api/synchronization/commands/route.test.ts 'src/app/api/synchronization/sessions/[sessionId]/changes/route.test.ts' src/app/api/webhooks/saas/route.test.ts src/app/dashboard/offline-synchronization.test.tsx
```

Before production, exercise one successful and one rejected request for each monitored route in staging. Confirm records are searchable by safe fields and inspect exported logs for identifiers or medical text.
