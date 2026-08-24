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
- Run `pnpm build && pnpm verify:bundle-secrets` to confirm the client bundle never contains the service role key.

## Generic SaaS payment webhook

`POST /api/webhooks/saas` accepts normalized JSON events with type `charge.succeeded`, `charge.failed`, `refund.succeeded`, or `refund.failed`. Amounts use exact decimal strings such as `"49.00"`; charge events require `invoiceId`, and refund events require `refundId`.

Sign `${timestamp}.${rawBody}` with HMAC-SHA256 using `SAAS_WEBHOOK_SECRET`. Send the Unix timestamp in `x-saas-timestamp` and the lowercase hex digest as `x-saas-signature: sha256=<digest>`. Timestamps have a five-minute tolerance and payloads are limited to 64 KiB.

Successful processing and replay of an existing provider event both return HTTP 200 with the same internal event ID. Invalid signatures return 401, invalid payloads return 400, and transient processing failures return 500 so the sender can retry safely.

## Operations

The structured log schema, sensitive-data restrictions, initial alert thresholds, and staging checks are documented in [docs/observability.md](docs/observability.md).

Health processing remains disabled until legal approval. The implemented controls and required production evidence are documented in [docs/privacy-governance.md](docs/privacy-governance.md).

Operational response is documented in [docs/support-runbook.md](docs/support-runbook.md). SaaS subscription reconciliation and webhook recovery are documented in [docs/billing-runbook.md](docs/billing-runbook.md).

## Continuous integration

The `CI` GitHub Actions workflow runs lint, type checking, unit and integration tests, a production build, the privileged-secret bundle scan, mobile Chromium PWA tests, and the current Supabase RLS matrices. Database checks use a disposable local Supabase stack with deterministic identities from `supabase/seed.sql`; they never connect to staging or production.

Run the browser checks locally with `pnpm exec playwright install chromium` followed by `pnpm test:e2e`.
