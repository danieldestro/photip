-- AlterTable
ALTER TABLE `provedores`
    ADD COLUMN `sync_max_paginas` INTEGER NULL,
    ADD COLUMN `sync_janela_incremental_dias` INTEGER NULL,
    ADD COLUMN `sync_janela_completa_dias` INTEGER NULL;
