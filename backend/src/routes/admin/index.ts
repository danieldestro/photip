import type { FastifyInstance } from 'fastify';
import { adminAuthRoutes } from './auth';
import { adminProvedoresRoutes } from './provedores';
import { adminCategoriasRoutes } from './categorias';
import { adminEventosRoutes } from './eventos';
import { adminUsuariosRoutes } from './usuarios';
import { adminFotografosRoutes } from './fotografos';
import { adminFotosRoutes } from './fotos';
import { adminConfiguracoesRoutes } from './configuracoes';
import { adminSincronizacoesLogRoutes } from './sincronizacoesLog';

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  await app.register(adminAuthRoutes);
  await app.register(adminProvedoresRoutes);
  await app.register(adminCategoriasRoutes);
  await app.register(adminEventosRoutes);
  await app.register(adminUsuariosRoutes);
  await app.register(adminFotografosRoutes);
  await app.register(adminFotosRoutes);
  await app.register(adminConfiguracoesRoutes);
  await app.register(adminSincronizacoesLogRoutes);
}
