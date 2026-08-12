import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma';
import { getOrSetPhotipSessionId } from '../lib/photipSession';
import { EVENTO_SUMMARY_INCLUDE, mapEventoToSummary } from './eventos';

async function findEventoAtivo(id: number) {
  if (!Number.isFinite(id)) return null;
  const evento = await prisma.evento.findUnique({ where: { id } });
  return evento && evento.ativo ? evento : null;
}

function findFavorito(sessionId: string, eventoId: number) {
  return prisma.favorito.findUnique({ where: { sessionId_eventoId: { sessionId, eventoId } } });
}

export async function favoritosRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/api/eventos/:id/favoritos', async (request, reply) => {
    const sessionId = getOrSetPhotipSessionId(request, reply);
    const id = Number.parseInt(request.params.id, 10);
    const log = request.log.child({ sessionId, eventoId: id, route: 'favoritos-listar' });

    const evento = await findEventoAtivo(id);
    if (!evento) {
      return reply.status(404).send({ error: 'Evento não encontrado.' });
    }

    try {
      const favorito = await prisma.favorito.findUnique({
        where: { sessionId_eventoId: { sessionId, eventoId: id } },
        include: { fotos: { select: { fotoId: true } } },
      });
      const fotoIds = favorito && !favorito.expirou ? favorito.fotos.map((f) => f.fotoId) : [];
      return reply.send({ eventId: String(id), fotoIds });
    } catch (err) {
      log.error({ err }, 'failed to list favoritos');
      return reply.status(500).send({ error: 'Falha ao buscar favoritos.' });
    }
  });

  app.put<{ Params: { id: string; fotoId: string } }>(
    '/api/eventos/:id/favoritos/:fotoId',
    async (request, reply) => {
      const sessionId = getOrSetPhotipSessionId(request, reply);
      const id = Number.parseInt(request.params.id, 10);
      const fotoId = request.params.fotoId.trim();
      const log = request.log.child({ sessionId, eventoId: id, fotoId, route: 'favoritos-add' });

      if (!fotoId) {
        return reply.status(400).send({ error: 'fotoId inválido.' });
      }

      const evento = await findEventoAtivo(id);
      if (!evento) {
        return reply.status(404).send({ error: 'Evento não encontrado.' });
      }

      try {
        const favorito = await prisma.favorito.upsert({
          where: { sessionId_eventoId: { sessionId, eventoId: id } },
          create: { sessionId, eventoId: id },
          update: {},
        });
        await prisma.favoritoFoto.upsert({
          where: { favoritoId_fotoId: { favoritoId: favorito.id, fotoId } },
          create: { favoritoId: favorito.id, fotoId },
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
      const sessionId = getOrSetPhotipSessionId(request, reply);
      const id = Number.parseInt(request.params.id, 10);
      const fotoId = request.params.fotoId.trim();
      const log = request.log.child({ sessionId, eventoId: id, fotoId, route: 'favoritos-remover' });

      const evento = await findEventoAtivo(id);
      if (!evento) {
        return reply.status(404).send({ error: 'Evento não encontrado.' });
      }

      try {
        const favorito = await findFavorito(sessionId, id);
        if (favorito) {
          await prisma.favoritoFoto.deleteMany({ where: { favoritoId: favorito.id, fotoId } });
        }
        return reply.send({ ok: true });
      } catch (err) {
        log.error({ err }, 'failed to remove favorito');
        return reply.status(500).send({ error: 'Falha ao remover o favorito.' });
      }
    }
  );

  app.delete<{ Params: { id: string } }>('/api/eventos/:id/favoritos', async (request, reply) => {
    const sessionId = getOrSetPhotipSessionId(request, reply);
    const id = Number.parseInt(request.params.id, 10);
    const log = request.log.child({ sessionId, eventoId: id, route: 'favoritos-limpar' });

    const evento = await findEventoAtivo(id);
    if (!evento) {
      return reply.status(404).send({ error: 'Evento não encontrado.' });
    }

    try {
      const favorito = await findFavorito(sessionId, id);
      if (favorito) {
        await prisma.favoritoFoto.deleteMany({ where: { favoritoId: favorito.id } });
      }
      return reply.send({ ok: true });
    } catch (err) {
      log.error({ err }, 'failed to clear favoritos');
      return reply.status(500).send({ error: 'Falha ao limpar os favoritos.' });
    }
  });

  app.get('/api/favoritos/eventos', async (request, reply) => {
    const sessionId = getOrSetPhotipSessionId(request, reply);
    const log = request.log.child({ sessionId, route: 'favoritos-eventos' });

    try {
      const favoritos = await prisma.favorito.findMany({
        where: { sessionId, expirou: false, fotos: { some: {} }, evento: { ativo: true } },
        include: {
          evento: { include: EVENTO_SUMMARY_INCLUDE },
          _count: { select: { fotos: true } },
        },
        orderBy: { evento: { dataHora: 'desc' } },
      });

      return reply.send({
        events: favoritos.map((f) => ({
          ...mapEventoToSummary(f.evento),
          favoritesCount: f._count.fotos,
        })),
      });
    } catch (err) {
      log.error({ err }, 'failed to list favorited events');
      return reply.status(500).send({ error: 'Falha ao buscar eventos com favoritos.' });
    }
  });

  app.get('/api/favoritos/contagem', async (request, reply) => {
    const sessionId = getOrSetPhotipSessionId(request, reply);
    const log = request.log.child({ sessionId, route: 'favoritos-contagem' });

    try {
      const total = await prisma.favoritoFoto.count({ where: { favorito: { sessionId, expirou: false } } });
      return reply.send({ total });
    } catch (err) {
      log.error({ err }, 'failed to count favoritos');
      return reply.status(500).send({ error: 'Falha ao contar favoritos.' });
    }
  });
}
