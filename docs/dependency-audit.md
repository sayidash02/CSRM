# Dependency audit

Audit date: 2026-08-20

## Scope and result

The audit was run from the repository root with the lockfile installed:

```text
pnpm audit --json
```

The final result was exit code 0 with no info, low, moderate, high, or
critical advisories. The initial audit before cleanup reported 3 low, 9
moderate, and 15 high advisories.

## Changes made

- Removed `react-router`; repository source has no import or route usage for
  it, so it was an unused direct runtime dependency.
- Kept React and React DOM at `18.3.1`, and pinned `@types/react` to
  `18.3.12` and `@types/react-dom` to `18.3.1`.
- Pinned `@prisma/client` and `prisma` to `5.22.0`. Removed
  `@prisma/config@7` and the unused `prisma.config.ts`; Prisma 5 CLI validates
  the schema without that config and the project does not use Prisma 6/7
  config features.
- Kept ExcelJS at `4.4.0` (the current direct version used by the project)
  and patched its transitive `uuid` dependency to `11.1.1`. The ExcelJS
  import/export fixture suite passed after this change.
- Pinned Vite to `6.4.3`, the patched Vite 6 line, without taking a Vite major
  upgrade.
- Added workspace overrides for `brace-expansion@2.1.4`, `js-yaml@3.15.1`,
  and `nanoid@3.3.18`. These are transitive fixes; no application code imports
  them directly.
- Added `packageManager: pnpm@11.17.0` and `.nvmrc` containing `24.19.0`.
  Overrides live in `pnpm-workspace.yaml`, which is the supported location for
  the pnpm version used here.

## Reachability review

The first post-cleanup audit still showed `brace-expansion` through the
ExcelJS → archiver path. That path is reachable from production workbook
import/export, so it was patched rather than documented as non-reachable.

The remaining intermediate findings were `js-yaml` through Jest/ts-jest and
`nanoid` through Vite/PostCSS. They are development and test tool paths, not
runtime application dependencies, but both were upgraded to their patched
versions anyway. The final audit therefore has no advisory left to defer as
non-reachable.

## Verification

- API unit suite: 15 suites, 57 tests passed.
- API integration suite: 22 suites, 120 tests passed using `.env.test`.
- The import/export fixtures include the ExcelJS paths affected by the
  transitive overrides.
- Run `pnpm audit --json` again whenever the lockfile changes; a non-zero exit
  must be investigated before release.
