-- CreateTable
CREATE TABLE `sincronizacoes_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `processo` VARCHAR(50) NOT NULL,
    `provedor_id` INTEGER NOT NULL,
    `iniciado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finalizado_em` DATETIME(3) NULL,
    `status` ENUM('em_andamento', 'sucesso', 'erro') NOT NULL DEFAULT 'em_andamento',
    `mensagem_erro` TEXT NULL,

    INDEX `sincronizacoes_log_provedor_id_idx`(`provedor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sincronizacoes_log` ADD CONSTRAINT `sincronizacoes_log_provedor_id_fkey` FOREIGN KEY (`provedor_id`) REFERENCES `provedores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
