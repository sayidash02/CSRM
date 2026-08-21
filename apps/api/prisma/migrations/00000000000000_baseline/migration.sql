-- Baseline for databases that predate Prisma Migrate.
-- The two historical migrations that follow add the four Daily Activities
-- text fields intentionally kept out of this base snapshot.

-- CreateTable
CREATE TABLE `pics` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pics_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_categories` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `sub_categories_category_id_name_key`(`category_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_activities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `activity_date` DATE NOT NULL,
    `activity` VARCHAR(255) NOT NULL,
    `institution_group` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `focus` VARCHAR(255) NULL,
    `location` VARCHAR(255) NULL,
    `description_result` TEXT NULL,
    `category_id` BIGINT NOT NULL,
    `sub_category_id` BIGINT NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `cost` DECIMAL(15, 2) NULL,
    `document_link` TEXT NULL,

    INDEX `daily_activities_activity_date_idx`(`activity_date`),
    INDEX `daily_activities_is_deleted_idx`(`is_deleted`),
    INDEX `daily_activities_is_archived_idx`(`is_archived`),
    INDEX `daily_activities_category_id_fkey`(`category_id`),
    INDEX `daily_activities_sub_category_id_fkey`(`sub_category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_activity_pics` (
    `activity_id` BIGINT NOT NULL,
    `pic_id` BIGINT NOT NULL,

    INDEX `daily_activity_pics_pic_id_idx`(`pic_id`),
    PRIMARY KEY (`activity_id`, `pic_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stakeholder_engagement` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `stakeholder` VARCHAR(255) NULL,
    `date` DATE NULL,
    `venue` VARCHAR(255) NULL,
    `concern_issue` TEXT NULL,
    `document_link` TEXT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `stakeholder_engagement_is_deleted_idx`(`is_deleted`),
    INDEX `stakeholder_engagement_is_archived_idx`(`is_archived`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `top_issues` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `period` VARCHAR(50) NOT NULL,
    `year` INTEGER NOT NULL DEFAULT 2026,
    `issue` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `follow_up` TEXT NULL,
    `next_plan` TEXT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `main_document` TEXT NULL,
    `supporting_document` TEXT NULL,

    INDEX `top_issues_is_deleted_idx`(`is_deleted`),
    INDEX `top_issues_is_archived_idx`(`is_archived`),
    INDEX `top_issues_year_idx`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `proposals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `registration_no` VARCHAR(50) NOT NULL,
    `date_received` DATE NOT NULL,
    `institution` VARCHAR(255) NOT NULL,
    `address` VARCHAR(255) NULL,
    `proposal_description` TEXT NULL,
    `proposal_file` TEXT NULL,
    `assessment_file` TEXT NULL,
    `status` VARCHAR(20) NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `proposals_registration_no_key`(`registration_no`),
    INDEX `proposals_status_idx`(`status`),
    INDEX `proposals_is_deleted_idx`(`is_deleted`),
    INDEX `proposals_is_archived_idx`(`is_archived`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `csr_projects` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_year` YEAR NOT NULL,
    `program` VARCHAR(255) NOT NULL,
    `activity` VARCHAR(255) NULL,
    `type_of_activity` VARCHAR(100) NULL,
    `location` VARCHAR(255) NULL,
    `target_beneficiaries` VARCHAR(255) NULL,
    `objective` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Planning',
    `budget` DECIMAL(15, 2) NULL,
    `implementation_period` VARCHAR(100) NULL,
    `documentation_image` TEXT NULL,
    `document` TEXT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `csr_projects_project_year_idx`(`project_year`),
    INDEX `csr_projects_status_idx`(`status`),
    INDEX `csr_projects_is_deleted_idx`(`is_deleted`),
    INDEX `csr_projects_is_archived_idx`(`is_archived`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grievance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `register_no` VARCHAR(50) NOT NULL,
    `log_date` DATE NOT NULL,
    `complainant_name` VARCHAR(255) NOT NULL,
    `address` VARCHAR(255) NULL,
    `phone` VARCHAR(30) NULL,
    `category` VARCHAR(100) NULL,
    `significance` VARCHAR(20) NOT NULL,
    `description` TEXT NULL,
    `location` VARCHAR(255) NULL,
    `investigation` TEXT NULL,
    `resolution` TEXT NULL,
    `feedback` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Open',
    `completion_date` DATE NULL,
    `remarks` TEXT NULL,
    `supporting_files` TEXT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `grievance_register_no_key`(`register_no`),
    INDEX `grievance_status_idx`(`status`),
    INDEX `grievance_significance_idx`(`significance`),
    INDEX `grievance_is_deleted_idx`(`is_deleted`),
    INDEX `grievance_is_archived_idx`(`is_archived`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lrp` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `program` VARCHAR(255) NOT NULL,
    `year` INTEGER NOT NULL DEFAULT 2026,
    `sharepoint_link` TEXT NOT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lrp_is_deleted_idx`(`is_deleted`),
    INDEX `lrp_is_archived_idx`(`is_archived`),
    INDEX `lrp_year_idx`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `synced_at` TIMESTAMP(0) NOT NULL,
    `synced_year` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL,
    `error_message` TEXT NULL,
    `file_url` VARCHAR(500) NULL,
    `triggered_by` VARCHAR(100) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `changes` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sub_categories` ADD CONSTRAINT `sub_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_activities` ADD CONSTRAINT `daily_activities_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_activities` ADD CONSTRAINT `daily_activities_sub_category_id_fkey` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_activity_pics` ADD CONSTRAINT `daily_activity_pics_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `daily_activities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_activity_pics` ADD CONSTRAINT `daily_activity_pics_pic_id_fkey` FOREIGN KEY (`pic_id`) REFERENCES `pics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
