-- VARCHAR(200) estourou num sync de eventos do fotop (nome de evento vindo
-- do provedor não tem tamanho previsível, mesmo padrão de url_site).
-- Column faz parte do índice FULLTEXT eventos_busca_fulltext, que já
-- suporta TEXT (descricao já é TEXT nesse mesmo índice).
ALTER TABLE `eventos` MODIFY `nome` TEXT NOT NULL;

-- URL de capa não tem tamanho previsível (baseada no nome original do arquivo
-- enviado pelo organizador do evento). Já tinha estourado VARCHAR(191) antes
-- e depois VARCHAR(500) também — mesmo padrão de url_site e nome.
ALTER TABLE `eventos` MODIFY `url_capa` TEXT NULL;
