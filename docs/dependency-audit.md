# Dependency audit — 21 August 2026

The active API package no longer includes the SharePoint/Graph dependencies
(`@azure/msal-node`, `@microsoft/microsoft-graph-client`, or
`isomorphic-fetch`). The Prisma toolchain is aligned to 5.22.0, React and its
type packages are aligned to 18.x, and the lockfile was regenerated with pnpm
11.17.0.

`pnpm install --lockfile-only --ignore-scripts` completed successfully and the
lockfile contains no SharePoint/Graph package entry. The production build and
P0 test gate passed after the lockfile update.

The active MOM document renderers use `docx@9.6.1` and `pdf-lib@1.17.1` as
direct production dependencies. Both are exercised by the DOCX/PDF unit and
integration tests; no runtime SharePoint or Graph client is required.

The npm advisory endpoint was not reachable from this workstation during the
audit (`pnpm audit --prod` returned registry `EACCES`). No advisory is marked
as non-reachable or ignored based on that failed network check. Re-run the
audit from the company CI/server network before deployment and record the
advisory IDs and reachability analysis here.
