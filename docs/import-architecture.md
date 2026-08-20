# Import architecture decision

The canonical workbook import pipeline is the generic import flow:

`ImportWizardModal` → `POST /api/import/preview` → `ExcelImportService.preview()` →
parser/validator/preview services → `POST /api/import/confirm` → commit service.

The pipeline is intentionally split into four boundaries:

- parser: converts workbook cells into typed row data;
- validator: checks the workbook contract and produces blocking conflicts;
- preview: reports counts and master-data additions without writes;
- commit: performs the single Prisma transaction and duplicate merge.

`/api/daily-activities/import/parse` and `/api/daily-activities/import/commit` remain
a compatibility adapter for the existing Daily Activities screen. They are not a
second architecture to extend: new workbook import features belong in the generic
pipeline. Removing the adapter requires migrating that screen to
`ImportWizardModal` and a workstation smoke test; it is deliberately deferred so
this refactor does not change the current user workflow.

The SharePoint sync route is disabled and returns `410`. Upload clients remain
active because `/api/upload` still selects Graph in configured production
environments and the mock client in development/test environments.
