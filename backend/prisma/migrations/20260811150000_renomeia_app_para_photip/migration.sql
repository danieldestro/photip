-- Rename do app de "potof" para "photip". A migration adiciona_favoritos já foi
-- aplicada em produção, então o rename da coluna/índices entra como ALTER, não
-- como edição da migration antiga (ver prisma/schema.prisma).
ALTER TABLE `favoritos` RENAME COLUMN `potof_session_id` TO `photip_session_id`;
ALTER TABLE `favoritos` RENAME INDEX `favoritos_potof_session_id_evento_id_idx` TO `favoritos_photip_session_id_evento_id_idx`;
ALTER TABLE `favoritos` RENAME INDEX `favoritos_potof_session_id_evento_id_foto_id_key` TO `favoritos_photip_session_id_evento_id_foto_id_key`;

-- O provedor "próprio" (o próprio app, seedado em dml_dados_referencia) segue com
-- slug/nome/descricao 'potof' — atualiza pra 'photip' em vez de deixar o seed criar
-- uma linha nova via upsert por slug.
UPDATE `provedores` SET `slug` = 'photip', `nome` = 'Photip', `descricao` = 'Photip' WHERE `slug` = 'potof' AND `proprio` = 1;
