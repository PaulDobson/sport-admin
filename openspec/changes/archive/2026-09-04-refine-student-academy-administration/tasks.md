## 1. Student Administration Query Layer

- [x] 1.1 Add a paginated student administration query contract with page, page size, search, status, total count, and primary-contact row data, and verify it with application-level tests.
- [x] 1.2 Implement the Supabase-backed paginated student query using the active tenant scope and verify ordering, search, count, and tenant isolation with repository tests or focused integration coverage.
- [x] 1.3 Add student update support for basic identity and primary contact fields, and verify valid edits persist while invalid input is rejected.
- [x] 1.4 Wire an archive/delete server action around the existing logical archive use case and verify archived students disappear from active table results by default.

## 2. Academy Context and Student Table UI

- [x] 2.1 Update the student administration page to load the active academy name, role, tenant options, and table query parameters, and verify the page renders the academy context without opening the account menu.
- [x] 2.2 Replace the simple student list with a responsive administrative table showing student identity, primary contact, operational status, and row actions, and verify populated and empty states render correctly.
- [x] 2.3 Add URL-backed search, status, page, and page-size controls, and verify pagination updates the visible rows without losing academy context.
- [x] 2.4 Keep student registration available from the administration page as a create action or focused panel, and verify successful creation refreshes the current table view.

## 3. Row Actions

- [x] 3.1 Add a view action that opens the existing student detail page and verify the generated href remains scoped to the selected row.
- [x] 3.2 Add an edit action or edit surface for basic student data and primary contact, and verify saving updates the table and detail page.
- [x] 3.3 Add a delete/archive confirmation flow that explains history is preserved, and verify confirmation archives the student while cancellation leaves the row unchanged.
- [x] 3.4 Verify assistant/owner/admin permissions for view, edit, archive, and export actions match existing role rules and do not expose unauthorized mutations.

## 4. Excel Export

- [x] 4.1 Add the `.xlsx` workbook dependency and verify package installation and typecheck succeed.
- [x] 4.2 Implement a server-side Excel export path that resolves operational membership, applies the same table filters, and returns `.xlsx` response headers, and verify unauthorized or tenant-missing requests are rejected.
- [x] 4.3 Build the `Alumnos` worksheet with academy name, export timestamp, applied filters, administrative columns, and empty-result headers, and verify workbook content with a focused test.
- [x] 4.4 Add the export action to the student administration UI and verify it requests the current filtered view rather than an unrelated all-students dataset.

## 5. Validation

- [x] 5.1 Run focused Vitest coverage for student administration query, edit/archive actions, table rendering, pagination, and Excel export, and verify all focused tests pass.
- [x] 5.2 Run `pnpm typecheck` and verify TypeScript passes.
- [x] 5.3 Run `pnpm lint` and verify only known pre-existing warnings remain, if any.
- [x] 5.4 Run `openspec validate --change refine-student-academy-administration --strict` and verify the change artifacts pass.
