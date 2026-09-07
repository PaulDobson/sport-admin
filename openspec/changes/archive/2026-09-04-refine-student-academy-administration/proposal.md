## Why

Teachers need stronger operational certainty before managing student records: the interface should make the active academy unmistakable, then provide a complete student administration surface instead of a simple registration-plus-list flow. The current student registration works, but the active student view lacks pagination, export, and row-level administration actions expected by an academy operator.

## What Changes

- Make the active academy visible on the student administration surface, including the user's operational role and tenant context before student data is changed or exported.
- Replace the simple active-student list with an administrative table that supports pagination and keeps the current registration flow available as the create action.
- Add row actions for viewing, editing, and deleting a student, where delete performs the existing logical archival behavior and preserves historical records.
- Add `.xlsx` export for student administration data, using a real Excel workbook format rather than CSV.
- Ensure table data and exports remain scoped to the active academy and respect authorized tenant membership.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `product-experience-shell`: strengthen the visible academy context for operational student administration.
- `instructor-operations`: expand student management from basic create/list/archive behavior to paginated administration, edit/view/archive actions, and Excel export.

## Impact

- Affected UI: student administration route, student detail/edit surfaces, shell topbar/context presentation, and empty/loading/error states around the student table.
- Affected application/infrastructure: student query port shape, Supabase student repository queries, edit/archive server actions, and an authenticated `.xlsx` export endpoint or server action.
- Dependencies: likely introduce an Excel workbook generator such as `exceljs` to produce `.xlsx` files with headers, column widths, and academy metadata.
- Data model: no required destructive schema change; existing `students` and `student_contacts` records should continue to support active and archived states.
