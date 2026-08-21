# ADR-002: Template-Based Export and Manual SharePoint Handoff

- **Status:** Superseded by ADR-003 for authentication, photo storage, and
  removal of technical SharePoint routes
- **Date:** 2026-08-18

## Context

The previous export path generated an arbitrary single-sheet workbook and the previous sync path uploaded a generated file to SharePoint. The approved operational flow requires the company workbook format to remain recognizable and requires the user to upload the downloaded result to SharePoint manually.

## Decision

1. Full export reads active records from the CRMS database and fills the sanitized company template, preserving the six source sheets, the `Master (jangan dihapus)` reference sheet, and the new `LRP` sheet.
2. The export endpoint returns a new `.xlsx` download. It never calls a SharePoint client and never overwrites a SharePoint file.
3. The legacy automatic sync/upload routes are removed from the active API. The
   old single-sheet payload export path is retained only as a compatibility URL
   that now returns the full template workbook.
4. An optional `year` query scopes the workbook; `All`, `Semua`, or an empty value means all years. The final export scope policy remains separately configurable until the product owner confirms it.

## Consequences

- The downloaded workbook can be uploaded by the user to the company SharePoint location using the normal company process.
- Export takes longer than creating a blank workbook because it loads and rewrites the styled template.
- The template file must be deployed with the API and updated through a reviewed template-version change.
- SharePoint credentials are not needed for this flow, reducing the risk of an unmaintained integration after the internship.
