# ADR-001: Separate Daily Activity Text Fields and Year-Scoped Statistics

- **Status:** Accepted
- **Date:** 2026-08-18
- **Decision owners:** CRS product decision recorded by the user; production owner/authentication remain pending IT confirmation.

## Context

The company workbook has separate `Keterangan` and `Hasil` columns. The earlier prototype modeled them as one `description_result` field, which would make the operational form and round-trip export ambiguous. The dashboard also needs to support both a selected year and an all-years view.

## Decision

1. Store `daily_activities.keterangan` and `daily_activities.hasil` as separate nullable text fields and expose them as separate form/table/export fields.
2. Keep `description_result` temporarily for backward compatibility. New structured writes derive it as `Keterangan - Hasil`; legacy requests that do not send the new fields continue to work.
3. Dashboard statistics accept a numeric year from 1900 through 2100 or an all-years value (`All`, `Semua`, or empty). The response reports the effective filter.

## Consequences

- Existing rows and clients are not forced through a destructive data migration.
- New import/API/export paths can preserve the two workbook columns losslessly.
- The combined field must not become a second source of truth; it is compatibility-only.
- Export scope (active year versus all years) is still a separate decision and must not be inferred from this dashboard decision.
