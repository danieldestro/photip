-- Reestrutura favoritos em duas tabelas: favoritos (vínculo sessão↔evento, com
-- usuario_id nullable e expirou) e favoritos_fotos (uma linha por foto favoritada).
-- Tabela `favoritos` anterior está vazia em todos os ambientes até agora — recriada
-- do zero em vez de migrada coluna a coluna.

-- DropForeignKey
ALTER TABLE `favoritos` DROP FOREIGN KEY `favoritos_evento_id_fkey`;

-- DropTable
DROP TABLE `favoritos`;

-- CreateTable
CREATE TABLE `favoritos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` VARCHAR(36) NOT NULL,
    `evento_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NULL,
    `expirou` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favoritos_usuario_id_idx`(`usuario_id`),
    UNIQUE INDEX `favoritos_session_id_evento_id_key`(`session_id`, `evento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favoritos_fotos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `favorito_id` INTEGER NOT NULL,
    `foto_id` VARCHAR(200) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `favoritos_fotos_favorito_id_foto_id_key`(`favorito_id`, `foto_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `favoritos` ADD CONSTRAINT `favoritos_evento_id_fkey` FOREIGN KEY (`evento_id`) REFERENCES `eventos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favoritos` ADD CONSTRAINT `favoritos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favoritos_fotos` ADD CONSTRAINT `favoritos_fotos_favorito_id_fkey` FOREIGN KEY (`favorito_id`) REFERENCES `favoritos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
