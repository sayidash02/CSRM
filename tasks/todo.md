# CRMS — Post-SharePoint Boundary Revision Checklist

## Phase A — Contract and schema baseline

- [x] Update root architecture document to the current manual-SharePoint
  boundary, local auth, MySQL photo storage, MOM outputs, and roles.
- [x] Update `schema.sql` and `apps/api/prisma/schema.prisma` with `users`,
  `daily_activity_photos`, and LRP `program/year` contract.
- [x] Add migration plan for legacy SharePoint/link fields; do not run against
  a user database without a backup and clone rehearsal.
- [x] Add schema contract tests for users, roles, photo metadata, and foreign
  keys.

## Phase B — Local authentication and authorization

- [x] Replace shared-token login with username/password login.
- [x] Hash passwords with a current password hashing library and rate-limit
  login attempts.
- [x] Add account management endpoints restricted to `ADMIN`.
- [x] Prove `USER` cannot mutate account records and `ADMIN` cannot mutate
  domain data.
- [x] Add frontend login/logout boundary.
- [x] Add ADMIN-only browser UI for creating accounts, changing role/status, and
  resetting passwords without exposing password hashes.
- [x] Keep registration closed to the public; provision the first admin through
  the IT-controlled setup command and protect account creation with backend
  `ADMIN` authorization.
- [x] Make initial admin provisioning a create-once, interactive server command
  and keep emergency recovery explicit and server-only.

## Phase C — MySQL photo workflow

- [x] Add authenticated upload/read/delete endpoints for Daily Activity photos.
- [x] Restrict uploads to JPEG/PNG and 5 MB per file.
- [x] Store binary data and metadata transactionally in MySQL.
- [x] Associate multiple photos with one Daily Activity using stable ordering.
- [x] Preserve soft-delete/restore semantics and audit photo mutations.

## Phase D — Export/import compatibility

- [x] Keep existing Excel rekap sheet names, columns, styles, and filters.
- [x] Embed every activity photo at the requested MOM size in the Daily
  Activities rekap; do not emit SharePoint hyperlinks.
- [x] Keep one-activity MOM and combined MOM workflows.
- [x] Add DOCX and PDF outputs with the same field/photo contract. Visual
  workstation UAT remains a deployment gate when LibreOffice is available.
- [x] Add deterministic MOM golden fixture and structural contract checks.
- [ ] Run `pnpm test:mom-golden -- --require-renderer` on the company
  workstation/server and inspect the generated diff PNGs.
- [x] Keep historical Excel import and add fixtures for embedded photos,
  legacy links, missing photos, and duplicate rows.

## Phase E — Remove stale SharePoint surface

- [x] Remove SharePoint link fields from forms and API contracts.
- [x] Remove Graph/mock clients, sync route/service, SharePoint validators,
  and SharePoint-specific helpers after replacement tests are green.
- [x] Confirm production build contains no SharePoint credential requirement.
- [x] Update README, runbook, ADRs, and import/export documentation.

## Phase F — Verification and handoff

- [x] Run migration-on-empty check; clone rehearsal remains deployment-only.
- [x] Compare constraints and photo schema in the disposable test database;
  production clone row-count comparison remains deployment-only.
- [x] Run the P0 API/web/unit/integration gates using `.env.test` only.
- [ ] Perform actual workstation UAT for login, CRUD, photo, MOM, rekap, and
  historical import.
- [ ] Update deployment/rollback documentation after WSL/VM details are known.
