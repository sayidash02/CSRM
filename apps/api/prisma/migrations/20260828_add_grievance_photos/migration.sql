-- CreateTable
CREATE TABLE `grievance_photos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `grievance_id` BIGINT NOT NULL,
    `photo_data` MEDIUMBLOB NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `size_bytes` INT NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `is_deleted` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `grievance_photos_grievance_sha256_key`(`grievance_id`, `sha256`),
    INDEX `grievance_photos_grievance_id_sort_order_idx`(`grievance_id`, `sort_order`),
    INDEX `grievance_photos_is_deleted_idx`(`is_deleted`),
    PRIMARY KEY (`id`),
    CONSTRAINT `grievance_photos_grievance_id_fkey` FOREIGN KEY (`grievance_id`) REFERENCES `grievance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `grievance_photos_size_check` CHECK (`size_bytes` > 0 AND `size_bytes` <= 5242880)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
