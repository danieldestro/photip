-- AlterTable
ALTER TABLE `sincronizacoes_log`
    ADD COLUMN `paginas_lidas` INTEGER NULL,
    ADD COLUMN `registros_lidos` INTEGER NULL,
    ADD COLUMN `registros_atualizados` INTEGER NULL;
