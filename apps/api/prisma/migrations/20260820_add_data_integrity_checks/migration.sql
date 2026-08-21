-- Data-integrity checks reconciled from schema.sql.
-- Run scripts/db/check-integrity.ts before applying this migration to an
-- existing database. The baseline intentionally starts without these checks
-- so this migration can be applied to both fresh and already-provisioned DBs.

ALTER TABLE `proposals`
  ADD CONSTRAINT `proposals_status_check`
  CHECK (`status` IN ('Accept', 'Decline'));

ALTER TABLE `csr_projects`
  ADD CONSTRAINT `csr_projects_status_check`
  CHECK (`status` IN ('Planning', 'On Going', 'Completed', 'Cancelled'));

ALTER TABLE `grievance`
  ADD CONSTRAINT `grievance_significance_check`
  CHECK (`significance` IN ('Low', 'Medium', 'High', 'Critical'));

ALTER TABLE `grievance`
  ADD CONSTRAINT `grievance_status_check`
  CHECK (`status` IN ('Open', 'On Progress', 'Resolved', 'Closed'));

ALTER TABLE `sync_log`
  ADD CONSTRAINT `sync_log_status_check`
  CHECK (`status` IN ('SUCCESS', 'FAILED'));
