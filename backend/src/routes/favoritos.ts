import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { getOrSetPotofSessionId } from '../lib/potofSession';

async function findEventoAtivo(id: number) {
  if (!Number.isFinite(id)) return null;
  const evento = await prisma.evento.findUnique({ where: { id } });
  return evento && evento.ativo ? evento : null;
}

export async function favoritosRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/api/eventos/:id/favoritos', async (request, reply) => {
    const sessionId = getOrSetPotofSessionId(request, reply);
    const id = Number.parseInt(request.params.id, 10);
    const log = request.log.child({ potofSessionId: sessionId, eventoId: id, route: 'favoritos-listar' });

    const evento = await findEventoAtivo(id);
    if (!evento) {
      return reply.status(404).send({ error: 'Evento não encontrado.' });
    }

    try {
      const favoritos = await prisma.favorito.findMany({
        where: { potofSessionId: sessionId, eventoId: id },
        select: { fotoId: true },
      });
      return reply.send({ eventId: String(id), fotoIds: favoritos.map((f) => f.fotoId) });
    } catch (err) {
      log.error({ err }, 'failed to list favoritos');
      return reply.status(500).send({ error: 'Falha ao buscar favoritos.' });
    }
  });

  app.put<{ Params: { id: string; fotoId: string } }>(
    '/api/eventos/:id/favoritos/:fotoId',
    async (request, reply) => {
      const sessionId = getOrSetPotofSessionId(request, reply);
      const id = Number.parseInt(request.params.id, 10);
      const fotoId = request.params.fotoId.trim();
      const log = request.log.child({ potofSessionId: sessionId, eventoId: id, fotoId, route: 'favoritos-add' });

      if (!fotoId) {
        return reply.status(400).send({ error: 'fotoId inválido.' });
      }

      const evento = await findEventoAtivo(id);
      if (!evento) {
        return reply.status(404).send({ error: 'Evento não encontrado.' });
      }

      try {
        await prisma.favorito.upsert({
          where: { potofSessionId_eventoId_fotoId: { potofSessionId: sessionId, eventoId: id, fotoId } },
          create: { potofSessionId: sessionId, eventoId: id, fotoId },
          update: {},
        });
        return reply.send({ ok: true });
      } catch (err) {
        log.error({ err }, 'failed to add favorito');
        return reply.status(500).send({ error: 'Falha ao favoritar a foto.' });
      }
    }
  );

  app.delete<{ Params: { id: string; fotoId: string } }>(
    '/api/eventos/:id/favoritos/:fotoId',
    async (request, reply) => {
      const sessionId = getOrSetPotofSessionId(request, reply);
      const id = Number.parseInt(request.params.id, 10);
      const fotoId = request.params.fotoId.trim();
      const log = request.log.child({ potofSessionId: sessionId, eventoId: id, fotoId, route: 'favoritos-remover' });

      const evento = await findEventoAtivo(id);
      if (!evento) {
        return reply.status(404).send({ error: 'Evento não encontrado.' });
      }

      try {
        await prisma.favorito.deleteMany({ where: { potofSessionId: sessionId, eventoId: id, fotoId } });
        return reply.send({ ok: true });
      } catch (err) {
        log.error({ err }, 'failed to remove favorito');
        return reply.status(500).send({ error: 'Falha ao remover o favorito.' });
      }
    }
  );

  app.delete<{ Params: { id: string } }>('/api/eventos/:id/favoritos', async (request, reply) => {
    const sessionId = getOrSetPotofSessionId(request, reply);
    const id = Number.parseInt(request.params.id, 10);
    const log = request.log.child({ potofSessionId: sessionId, eventoId: id, route: 'favoritos-limpar' });

    const evento = await findEventoAtivo(id);
    if (!evento) {
      return reply.status(404).send({ error: 'Evento não encontrado.' });
    }

    try {
      await prisma.favorito.deleteMany({ where: { potofSessionId: sessionId, eventoId: id } });
      return reply.send({ ok: true });
    } catch (err) {
      log.error({ err }, 'failed to clear favoritos');
      return reply.status(500).send({ error: 'Falha ao limpar os favoritos.' });
    }
  });

  app.get('/api/favoritos/contagem', async (request, reply) => {
    const sessionId = getOrSetPotofSessionId(request, reply);
    const log = request.log.child({ potofSessionId: sessionId, route: 'favoritos-contagem' });

    try {
      const total = await prisma.favorito.count({ where: { potofSessionId: sessionId } });
      return reply.send({ total });
    } catch (err) {
      log.error({ err }, 'failed to count favoritos');
      return reply.status(500).send({ error: 'Falha ao contar favoritos.' });
    }
  });
}
