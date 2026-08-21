# ADR-003: Local Authentication and MySQL Photo Storage

- **Status:** Accepted
- **Date:** 2026-08-21
- **Supersedes:** SharePoint integration assumptions in earlier architecture drafts

## Context

CRMS is deployed on a company server and is accessed from more than one
workstation. The application must require a login, but it does not need to call
SharePoint. The user creates Daily Activities, attaches photos, and downloads
MOM or recap files. Uploading those downloaded files to SharePoint is a separate
manual company workflow.

The old design used SharePoint URL fields and a development mock directory for
attachments. That design creates an unnecessary external dependency and makes
the photo path unavailable in production.

## Decision

1. Authenticate with local username/password accounts and server-side sessions.
2. Separate `USER` and `ADMIN` roles. Users manage operational data; admins
   manage accounts but do not mutate operational records.
3. Store Daily Activity photo bytes and metadata in MySQL in a dedicated
   attachment table. A photo is not represented by a SharePoint URL, client
   filesystem path, or Base64 field inside the activity row.
4. Generate Excel, Word, and PDF outputs from the database. Embed every photo
   in the MOM and Daily Activities recap using the approved MOM dimensions.
5. Remove SharePoint credentials, Graph clients, sync routes, SharePoint URL
   validators, and SharePoint link fields from the active application contract.
6. Preserve the existing Excel workbook layout and historical import flow unless
   an explicit product decision changes them.
7. Keep account registration private: IT provisions the first admin once on a
   new database, and an authenticated `ADMIN` creates subsequent `USER` or
   `ADMIN` accounts. There is no public register or password-reset endpoint.
8. If every admin loses access, IT may run the server-only recovery command for
   an existing account after an explicit confirmation; it cannot create a new
   account and records an audit event.

## Alternatives Considered

### Microsoft Graph integration

Rejected because SharePoint upload is a manual external workflow and the
application has no need for a network dependency, service credential, or sync
state.

### Filesystem-only photo storage

Rejected as the primary store because the database backup/restore workflow must
cover the data required to regenerate MOM and recap outputs. The server may use
temporary files during export, but the durable photo record is in MySQL.

### Shared server access token

Rejected as the user login mechanism. It does not identify users or support the
required account administration and role boundary.

## Consequences

- MySQL backups become larger because they include photo binaries.
- Export tests must cover large workbooks and multiple full-size photos.
- A migration must remove legacy link columns only after a backup and clone
  rehearsal.
- The WSL/VM service configuration remains a deployment concern and is not
  coupled to the application boundary.
