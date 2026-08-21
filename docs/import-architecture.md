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

The import pipeline has no technical SharePoint dependency. Legacy workbook
attachment/link columns may still be parsed for historical compatibility, but
their values are reported or discarded according to the import contract; they
are never persisted as URLs and never select a Graph or mock client. The user
downloads the resulting files and uploads them to SharePoint manually outside
CRMS.
