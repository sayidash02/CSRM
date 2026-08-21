-- CRMS v3 boundary migration.
--
-- This migration intentionally removes legacy SharePoint/link fields. Apply it
-- only after a verified backup and clone rehearsal. Existing databases must
-- never be changed by running schema.sql directly.

CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_login_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  KEY `users_role_idx` (`role`),
  KEY `users_is_active_idx` (`is_active`),
  CONSTRAINT `users_role_check` CHECK (`role` IN ('USER', 'ADMIN'))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `daily_activity_photos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `activity_id` BIGINT NOT NULL,
  `photo_data` MEDIUMBLOB NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `size_bytes` INT NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `daily_activity_photos_activity_sha256_key` (`activity_id`, `sha256`),
  KEY `daily_activity_photos_activity_order_idx` (`activity_id`, `sort_order`),
  KEY `daily_activity_photos_is_deleted_idx` (`is_deleted`),
  CONSTRAINT `daily_activity_photos_activity_id_fkey`
    FOREIGN KEY (`activity_id`) REFERENCES `daily_activities` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `daily_activity_photos_size_check`
    CHECK (`size_bytes` > 0 AND `size_bytes` <= 5242880)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `export_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `exported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `scope_year` INT NULL,
  `format` VARCHAR(10) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `error_message` TEXT NULL,
  `actor_user_id` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `export_logs_exported_at_idx` (`exported_at`),
  KEY `export_logs_status_idx` (`status`),
  KEY `export_logs_actor_user_id_idx` (`actor_user_id`),
  CONSTRAINT `export_logs_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_logs_status_check`
    CHECK (`status` IN ('SUCCESS', 'FAILED'))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `daily_activities`
  DROP COLUMN `document_link`;

ALTER TABLE `stakeholder_engagement`
  DROP COLUMN `document_link`;

ALTER TABLE `top_issues`
  DROP COLUMN `main_document`,
  DROP COLUMN `supporting_document`;

ALTER TABLE `proposals`
  DROP COLUMN `proposal_file`,
  DROP COLUMN `assessment_file`;

ALTER TABLE `csr_projects`
  DROP COLUMN `documentation_image`,
  DROP COLUMN `document`;

ALTER TABLE `grievance`
  DROP COLUMN `supporting_files`;

ALTER TABLE `lrp`
  DROP COLUMN `sharepoint_link`;

ALTER TABLE `audit_logs`
  ADD COLUMN `actor_user_id` BIGINT NULL,
  ADD KEY `audit_logs_actor_user_id_idx` (`actor_user_id`),
  ADD CONSTRAINT `audit_logs_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE `sync_log`;
