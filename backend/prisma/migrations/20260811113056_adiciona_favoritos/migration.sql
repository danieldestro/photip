-- CreateTable
CREATE TABLE `favoritos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `potof_session_id` VARCHAR(36) NOT NULL,
    `evento_id` INTEGER NOT NULL,
    `foto_id` VARCHAR(200) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favoritos_potof_session_id_evento_id_idx`(`potof_session_id`, `evento_id`),
    UNIQUE INDEX `favoritos_potof_session_id_evento_id_foto_id_key`(`potof_session_id`, `evento_id`, `foto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `favoritos` ADD CONSTRAINT `favoritos_evento_id_fkey` FOREIGN KEY (`evento_id`) REFERENCES `eventos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
