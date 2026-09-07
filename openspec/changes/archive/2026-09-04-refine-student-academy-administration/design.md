## Context

See proposal.md for motivation. The current student route already resolves an operational tenant membership, creates students, lists active students by tenant, and opens a student detail page. The domain and repository already support logical archival, while privacy erasure remains a separate governed flow.

The current list query loads all active students for a tenant and renders them as a simple list. A complete administration table needs server-side query parameters for pagination and search, a richer row projection, and an export path that can intentionally include the filtered result set without relying on client-side table state.

## Goals / Non-Goals

**Goals:**

- Make the active academy name and role visible on the student administration page before any mutating or export action.
- Move student administration to a paginated, query-backed table with stable filters that can be shared by the UI and export.
- Add edit and archive actions while preserving the existing detail page as the primary view action.
- Generate a real `.xlsx` workbook for exports.
- Keep tenant isolation enforced by the existing operational context and Supabase RLS-backed repositories.

**Non-Goals:**

- Do not physically delete student records as part of the table delete action.
- Do not implement legal/privacy erasure through the administrative delete action.
- Do not redesign all dashboard routes or create a new academy-management domain separate from tenants.
- Do not require a database migration unless implementation discovers missing student/contact fields that cannot be derived from existing tables.

## Decisions

### Use tenant as the academy context

The product already models the managed organization as a tenant. The UI should label this context as the academy where appropriate, but implementation should continue using tenant membership and active tenant resolution as the source of truth.

Alternative considered: introduce a separate academy entity. That would add migration and permission complexity without a clear product distinction yet.

### Query students through a paginated application port

Add a student administration query to the instructor-operations application boundary that accepts `tenantId`, page, page size, optional search, and optional status filters, and returns rows plus total count. The existing `findActiveByTenant` can remain for dashboard summaries and lightweight use cases.

Alternative considered: load all students and paginate in the browser. That would be simpler initially, but scales poorly and would make exports, URLs, and tenant-scoped filtering harder to validate consistently.

### Keep filters URL-backed

Search, page, page size, and status should live in query parameters. This keeps the table state refreshable, makes server-rendered pagination straightforward, and lets export consume the same parameters.

Alternative considered: client-only table state. That would feel fast for small lists, but it risks exporting a different dataset than the one visible to the user.

### Treat delete as archive in the operational UI

The row action can be labelled `Eliminar` for user familiarity, but the confirmation copy should explain that the student will be removed from active lists while preserving history. The implementation should call the existing archive use case or a thin action around it.

Alternative considered: physical delete. That conflicts with attendance, membership, health/privacy history, and audit expectations.

### Use a dedicated Excel export endpoint

Provide an authenticated route or server action that resolves the same operational membership, applies the same query filters, and returns a workbook with `Content-Type` and `Content-Disposition` headers for `.xlsx`. The workbook should include academy name, export timestamp, applied filters, and a single `Alumnos` sheet with administrative columns.

Alternative considered: generate Excel in the browser. Server generation keeps tenant checks close to the data query, avoids shipping unnecessary student data to the client, and centralizes workbook formatting.

### Prefer ExcelJS for workbook generation

Use `exceljs` unless implementation uncovers a repo constraint against it. It supports real `.xlsx` output, worksheets, column widths, headers, and simple styling without hand-building spreadsheet XML.

Alternative considered: CSV. The user explicitly chose `.xlsx`, and CSV would not satisfy the expected file format.

## Risks / Trade-offs

- [Risk] Exporting all filtered rows could become expensive for very large academies. -> Mitigation: keep export query server-side, cap export size if needed, and surface a clear error if limits are introduced.
- [Risk] The UI label `Eliminar` may imply irreversible deletion. -> Mitigation: use confirmation text that states the student is archived and history is preserved.
- [Risk] Export and table can drift if they use separate query logic. -> Mitigation: share a query shape/use case between table rendering and export.
- [Risk] Editing contact data can be broader than current create form. -> Mitigation: keep the first edit scope to basic student identity and primary contact unless further requirements expand contact management.

## Migration Plan

1. Add the application query/edit/archive/export capabilities behind existing tenant membership resolution.
2. Replace the student page list with the academy context header, table, pagination controls, export action, and create entry point.
3. Add focused tests for table rendering, pagination state, archive confirmation/action, edit persistence, and `.xlsx` response headers/content basics.
4. Roll back by removing the new route/action/UI and returning to the existing `findActiveByTenant` list path; no destructive data migration is expected.
