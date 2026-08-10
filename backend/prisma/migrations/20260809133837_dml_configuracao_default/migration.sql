-- Linha default do singleton `configuracoes` (id=1). Sem isso, um ambiente novo
-- criado só com "prisma migrate deploy" sobe sem essa linha até alguém salvar
-- algo em /admin → Configurações; o código já cai num default (30 dias) nesse
-- meio tempo (ver backend/src/providers/syncSettings.ts), então isso não é uma
-- correção de bug, só alinha o dado de referência ao mesmo padrão usado para
-- provedores/categorias (ver migration dml_dados_referencia). INSERT IGNORE
-- torna isso seguro mesmo em bancos que já têm a linha (via /admin ou seed manual).
INSERT IGNORE INTO configuracoes (id, sync_incremental_dias, updated_at) VALUES
  (1, 30, NOW());
