-- CRMS canonical MySQL schema v3.0
--
-- Source of truth for a fresh database. CRMS stores structured data and Daily
-- Activity photos in MySQL. SharePoint is an external manual handoff and has no
-- URL, credential, sync, or upload field in this schema.
--
-- Existing databases must be changed through Prisma migrations. Do not run
-- this file against a database that already contains user data.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `last_login_at` DATETIME(3) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  KEY `users_role_idx` (`role`),
  KEY `users_is_active_idx` (`is_active`),
  CONSTRAINT `users_role_check` CHECK (`role` IN ('USER', 'ADMIN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pics` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `pics_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sub_categories` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `category_id` BIGINT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sub_categories_category_id_name_key` (`category_id`, `name`),
  CONSTRAINT `sub_categories_category_id_fkey`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `daily_activities` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `activity_date` DATE NOT NULL,
  `activity` VARCHAR(255) NOT NULL,
  `institution_group` VARCHAR(255) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `focus` VARCHAR(255) DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `description_result` TEXT DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `hasil` TEXT DEFAULT NULL,
  `kesimpulan` TEXT DEFAULT NULL,
  `next_plan` TEXT DEFAULT NULL,
  `category_id` BIGINT NOT NULL,
  `sub_category_id` BIGINT NOT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `cost` DECIMAL(15,2) DEFAULT NULL,
  `sharepoint_links` JSON DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `daily_activities_activity_date_idx` (`activity_date`),
  KEY `daily_activities_is_deleted_idx` (`is_deleted`),
  KEY `daily_activities_is_archived_idx` (`is_archived`),
  KEY `daily_activities_category_id_fkey` (`category_id`),
  KEY `daily_activities_sub_category_id_fkey` (`sub_category_id`),
  CONSTRAINT `daily_activities_category_id_fkey`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `daily_activities_sub_category_id_fkey`
    FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `daily_activity_pics` (
  `activity_id` BIGINT NOT NULL,
  `pic_id` BIGINT NOT NULL,
  PRIMARY KEY (`activity_id`, `pic_id`),
  KEY `daily_activity_pics_pic_id_idx` (`pic_id`),
  CONSTRAINT `daily_activity_pics_activity_id_fkey`
    FOREIGN KEY (`activity_id`) REFERENCES `daily_activities` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `daily_activity_pics_pic_id_fkey`
    FOREIGN KEY (`pic_id`) REFERENCES `pics` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stakeholder_engagement` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `stakeholder` VARCHAR(255) DEFAULT NULL,
  `date` DATE DEFAULT NULL,
  `venue` VARCHAR(255) DEFAULT NULL,
  `concern_issue` TEXT DEFAULT NULL,
  `sharepoint_links` JSON DEFAULT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `stakeholder_engagement_is_deleted_idx` (`is_deleted`),
  KEY `stakeholder_engagement_is_archived_idx` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `top_issues` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `period` VARCHAR(50) NOT NULL,
  `year` INT NOT NULL DEFAULT 2026,
  `issue` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `follow_up` TEXT DEFAULT NULL,
  `next_plan` TEXT DEFAULT NULL,
  `sharepoint_links` JSON DEFAULT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `top_issues_is_deleted_idx` (`is_deleted`),
  KEY `top_issues_is_archived_idx` (`is_archived`),
  KEY `top_issues_year_idx` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `proposals` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `registration_no` VARCHAR(50) NOT NULL,
  `date_received` DATE NOT NULL,
  `institution` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `proposal_description` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL,
  `sharepoint_links` JSON DEFAULT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `proposals_registration_no_key` (`registration_no`),
  KEY `proposals_status_idx` (`status`),
  KEY `proposals_is_deleted_idx` (`is_deleted`),
  KEY `proposals_is_archived_idx` (`is_archived`),
  CONSTRAINT `proposals_status_check`
    CHECK (`status` IN ('Accept', 'Decline'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `csr_projects` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `project_year` YEAR NOT NULL,
  `program` VARCHAR(255) NOT NULL,
  `activity` VARCHAR(255) DEFAULT NULL,
  `type_of_activity` VARCHAR(100) DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `target_beneficiaries` VARCHAR(255) DEFAULT NULL,
  `objective` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Planning',
  `budget` DECIMAL(15,2) DEFAULT NULL,
  `implementation_period` VARCHAR(100) DEFAULT NULL,
  `sharepoint_links` JSON DEFAULT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `csr_projects_project_year_idx` (`project_year`),
  KEY `csr_projects_status_idx` (`status`),
  KEY `csr_projects_is_deleted_idx` (`is_deleted`),
  KEY `csr_projects_is_archived_idx` (`is_archived`),
  CONSTRAINT `csr_projects_status_check`
    CHECK (`status` IN ('Planning', 'On Going', 'Completed', 'Cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `grievance` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `register_no` VARCHAR(50) NOT NULL,
  `log_date` DATE NOT NULL,
  `complainant_name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `significance` VARCHAR(20) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `investigation` TEXT DEFAULT NULL,
  `resolution` TEXT DEFAULT NULL,
  `feedback` TEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Open',
  `completion_date` DATE DEFAULT NULL,
  `remarks` TEXT DEFAULT NULL,
  `sharepoint_links` JSON DEFAULT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `grievance_register_no_key` (`register_no`),
  KEY `grievance_status_idx` (`status`),
  KEY `grievance_significance_idx` (`significance`),
  KEY `grievance_is_deleted_idx` (`is_deleted`),
  KEY `grievance_is_archived_idx` (`is_archived`),
  CONSTRAINT `grievance_significance_check`
    CHECK (`significance` IN ('Low', 'Medium', 'High', 'Critical')),
  CONSTRAINT `grievance_status_check`
    CHECK (`status` IN ('Open', 'On Progress', 'Resolved', 'Closed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `grievance_photos` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `grievance_id` BIGINT NOT NULL,
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
  UNIQUE KEY `grievance_photos_grievance_sha256_key` (`grievance_id`, `sha256`),
  KEY `grievance_photos_grievance_order_idx` (`grievance_id`, `sort_order`),
  KEY `grievance_photos_is_deleted_idx` (`is_deleted`),
  CONSTRAINT `grievance_photos_grievance_id_fkey`
    FOREIGN KEY (`grievance_id`) REFERENCES `grievance` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `grievance_photos_size_check`
    CHECK (`size_bytes` > 0 AND `size_bytes` <= 5242880)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `lrp` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `program` VARCHAR(255) NOT NULL,
  `year` INT NOT NULL DEFAULT 2026,
  `sharepoint_links` JSON DEFAULT NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_archived` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lrp_is_deleted_idx` (`is_deleted`),
  KEY `lrp_is_archived_idx` (`is_archived`),
  KEY `lrp_year_idx` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `export_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `exported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `scope_year` INT DEFAULT NULL,
  `format` VARCHAR(10) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `error_message` TEXT DEFAULT NULL,
  `actor_user_id` BIGINT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `export_logs_exported_at_idx` (`exported_at`),
  KEY `export_logs_status_idx` (`status`),
  KEY `export_logs_actor_user_id_idx` (`actor_user_id`),
  CONSTRAINT `export_logs_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `export_logs_status_check`
    CHECK (`status` IN ('SUCCESS', 'FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` BIGINT NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `changes` JSON DEFAULT NULL,
  `actor_user_id` BIGINT DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_entity_type_entity_id_idx` (`entity_type`, `entity_id`),
  KEY `audit_logs_created_at_idx` (`created_at`),
  KEY `audit_logs_actor_user_id_idx` (`actor_user_id`),
  CONSTRAINT `audit_logs_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Canonical master data. The Prisma seed performs the same idempotent inserts.
INSERT IGNORE INTO `pics` (`name`, `is_active`) VALUES ('Ziya Ramadhani', TRUE);
INSERT IGNORE INTO `categories` (`name`)
  VALUES ('Stakeholder Engagement'), ('Paper Work');

INSERT IGNORE INTO `sub_categories` (`category_id`, `name`)
SELECT c.`id`, s.`name`
FROM `categories` c
JOIN (
  SELECT 'Stakeholder Engagement' AS category_name, 'Donasi' AS name UNION ALL
  SELECT 'Stakeholder Engagement', 'Internal Meeting' UNION ALL
  SELECT 'Stakeholder Engagement', 'Issue' UNION ALL
  SELECT 'Stakeholder Engagement', 'Issue & Grievance' UNION ALL
  SELECT 'Stakeholder Engagement', 'Kehumasan' UNION ALL
  SELECT 'Stakeholder Engagement', 'Project CSR' UNION ALL
  SELECT 'Stakeholder Engagement', 'Security' UNION ALL
  SELECT 'Stakeholder Engagement', 'Support Project' UNION ALL
  SELECT 'Paper Work', 'Data Processing (Olah Data)'
) s ON s.category_name = c.`name`;
