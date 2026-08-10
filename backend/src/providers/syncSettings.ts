import { prisma } from '../db/prisma';

export const DEFAULT_SYNC_INCREMENTAL_DIAS = 30;

// Configuracao é singleton (id=1); a migration dml_configuracao_default garante a linha em
// bancos novos, mas o fallback fica por segurança (ex: banco restaurado de um backup anterior
// a essa migration) — nesse caso cai no default em vez de falhar, então o sync incremental
// sempre tem uma janela válida pra usar.
export async function getSyncIncrementalDias(): Promise<number> {
  const config = await prisma.configuracao.findUnique({ where: { id: 1 } });
  return config?.syncIncrementalDias ?? DEFAULT_SYNC_INCREMENTAL_DIAS;
}
