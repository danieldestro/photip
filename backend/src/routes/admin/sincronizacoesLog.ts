import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma';
import { requireAdmin } from '../../admin/requireAdmin';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;

// Histórico de execuções do sync de eventos (ver providers/syncRunner.ts) — somente leitura,
// por isso não passa por registerCrudRoutes (que sempre registra POST/PUT também).
export async function adminSincronizacoesLogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/admin/sincronizacoes-log', { preHandler: requireAdmin }, async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(query.pageSize ?? '', 10) || DEFAULT_PAGE_SIZE)
    );

    const where: Record<string, unknown> = {};
    if (query.provedorId) where.provedorId = Number.parseInt(query.provedorId, 10);
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      prisma.sincronizacaoLog.findMany({
        where,
        include: { provedor: true },
        orderBy: { iniciadoEm: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sincronizacaoLog.count({ where }),
    ]);

    return reply.send({ page, pageSize, total, items });
  });
}
