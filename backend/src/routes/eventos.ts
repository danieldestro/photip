import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import type { Evento, Foto } from '@prisma/client';
import { prisma } from '../db/prisma';
import { getAdapter } from '../providers/registry';
import { buildBooleanExpression } from '../lib/fulltextQuery';
import { getOrSetPhotipSessionId } from '../lib/photipSession';
import type { Photo } from '../fotop/photoParser';

const EVENTOS_BUSCA_PAGE_SIZE = 40;
const AUTOCOMPLETE_LIMIT = 8;

// Índice FULLTEXT eventos_busca_fulltext (nome, local, cidade, uf, descricao) —
// ver prisma/migrations/*_eventos_fulltext. Reaproveitado tanto pela listagem
// (com relevância) quanto pelo autocomplete.
const FULLTEXT_MATCH = Prisma.sql`MATCH(nome, local, cidade, uf, descricao)`;

const EVENTO_SUMMARY_INCLUDE = {
  fotos: { where: { ativo: true }, take: 1, orderBy: { id: 'asc' as const } },
  _count: { select: { fotos: { where: { ativo: true } } } },
  provedor: { select: { slug: true } },
} satisfies Prisma.EventoInclude;

function mapEventoToSummary(
  evento: Evento & { fotos: Foto[]; _count: { fotos: number }; provedor: { slug: string } }
) {
  const primeiraFoto = evento.fotos[0];
  const coverUrl = evento.urlCapa ?? primeiraFoto?.urlThumb ?? primeiraFoto?.urlFoto ?? null;

  return {
    id: String(evento.id),
    name: evento.nome,
    city: evento.cidade ?? '',
    state: evento.uf ?? '',
    location: evento.local ?? '',
    date: evento.dataHora.toISOString().slice(0, 10),
    dateEnd: null,
    categoryId: String(evento.categoriaId),
    // Contagem de fotos locais ativas — legitimamente 0 pra eventos de provedor
    // externo (fotop), já que as fotos deles não são armazenadas aqui.
    photosCount: evento._count.fotos,
    hasEventPhoto: coverUrl != null,
    coverUrl,
    providerSlug: evento.provedor.slug,
  };
}

export async function eventosRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      pag?: string;
      estado?: string;
      cat?: string;
      dataInicio?: string;
      dataFim?: string;
      nome_evento?: string;
      provedor?: string;
    };
  }>('/api/eventos/busca', async (request, reply) => {
    const { pag, estado, cat, dataInicio, dataFim, nome_evento: nomeEvento, provedor } = request.query;
    const page = Math.max(1, Number.parseInt(pag ?? '1', 10) || 1);
    const log = request.log.child({
      route: 'eventos-busca',
      page,
      estado,
      cat,
      dataInicio,
      dataFim,
      nomeEvento,
      provedor,
    });

    const booleanExpr = nomeEvento ? buildBooleanExpression(nomeEvento) : null;

    try {
      let eventos: Array<Evento & { fotos: Foto[]; _count: { fotos: number }; provedor: { slug: string } }>;

      if (booleanExpr) {
        // Com busca por nome: passo 1 pega só os ids, já filtrados/paginados/
        // ordenados por relevância via SQL raw (Prisma não expõe boolean mode
        // nem ORDER BY relevância pela API de query normal).
        const conditions: Prisma.Sql[] = [Prisma.sql`ativo = 1`];
        if (estado) conditions.push(Prisma.sql`uf = ${estado}`);
        if (cat) conditions.push(Prisma.sql`categoria_id = ${Number.parseInt(cat, 10)}`);
        if (provedor) conditions.push(Prisma.sql`provedor_id = ${Number.parseInt(provedor, 10)}`);
        if (dataInicio) conditions.push(Prisma.sql`data_hora >= ${new Date(`${dataInicio}T00:00:00`)}`);
        if (dataFim) conditions.push(Prisma.sql`data_hora <= ${new Date(`${dataFim}T23:59:59`)}`);
        conditions.push(Prisma.sql`${FULLTEXT_MATCH} AGAINST(${booleanExpr} IN BOOLEAN MODE)`);

        const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
          SELECT id FROM eventos
          WHERE ${Prisma.join(conditions, ' AND ')}
          ORDER BY ${FULLTEXT_MATCH} AGAINST(${booleanExpr} IN BOOLEAN MODE) DESC
          LIMIT ${EVENTOS_BUSCA_PAGE_SIZE} OFFSET ${(page - 1) * EVENTOS_BUSCA_PAGE_SIZE}
        `);
        const ids = rows.map((r) => r.id);

        // Passo 2: reaproveita o include/mapeamento de sempre pra montar o
        // payload completo (capa, contagem de fotos) — sem duplicar essa
        // lógica em SQL raw. `id: { in: ids }` não preserva ordem, então
        // reordena em JS pra bater com a relevância do passo 1.
        const found = await prisma.evento.findMany({ where: { id: { in: ids } }, include: EVENTO_SUMMARY_INCLUDE });
        const byId = new Map(found.map((e) => [e.id, e]));
        eventos = ids.map((id) => byId.get(id)).filter((e): e is (typeof found)[number] => e != null);
      } else {
        const where: Prisma.EventoWhereInput = { ativo: true };
        if (estado) where.uf = estado;
        if (cat) where.categoriaId = Number.parseInt(cat, 10);
        if (provedor) where.provedorId = Number.parseInt(provedor, 10);
        if (dataInicio || dataFim) {
          where.dataHora = {
            ...(dataInicio ? { gte: new Date(`${dataInicio}T00:00:00`) } : {}),
            ...(dataFim ? { lte: new Date(`${dataFim}T23:59:59`) } : {}),
          };
        }

        eventos = await prisma.evento.findMany({
          where,
          include: EVENTO_SUMMARY_INCLUDE,
          orderBy: { dataHora: 'desc' },
          skip: (page - 1) * EVENTOS_BUSCA_PAGE_SIZE,
          take: EVENTOS_BUSCA_PAGE_SIZE,
        });
      }

      const events = eventos.map(mapEventoToSummary);
      log.info({ count: events.length, fulltext: booleanExpr != null }, 'eventos-busca finished');
      return reply.send({ page, events, hasMore: eventos.length >= EVENTOS_BUSCA_PAGE_SIZE });
    } catch (err) {
      log.error({ err }, 'failed to query local eventos');
      return reply.status(500).send({ error: 'Falha ao buscar eventos.' });
    }
  });

  app.get<{ Querystring: { nome?: string; estado?: string } }>(
    '/api/eventos/autocomplete',
    async (request, reply) => {
      const { nome, estado } = request.query;
      const log = request.log.child({ route: 'eventos-autocomplete', nome, estado });

      const booleanExpr = nome ? buildBooleanExpression(nome) : null;
      if (!booleanExpr) {
        return reply.send({ events: [] });
      }

      const conditions: Prisma.Sql[] = [
        Prisma.sql`ativo = 1`,
        Prisma.sql`${FULLTEXT_MATCH} AGAINST(${booleanExpr} IN BOOLEAN MODE)`,
      ];
      if (estado) conditions.push(Prisma.sql`uf = ${estado}`);

      try {
        const rows = await prisma.$queryRaw<
          Array<{ id: number; nome: string; data_hora: Date; cidade: string | null; uf: string | null; ativo: boolean }>
        >(Prisma.sql`
          SELECT id, nome, data_hora, cidade, uf, ativo FROM eventos
          WHERE ${Prisma.join(conditions, ' AND ')}
          ORDER BY ${FULLTEXT_MATCH} AGAINST(${booleanExpr} IN BOOLEAN MODE) DESC
          LIMIT ${AUTOCOMPLETE_LIMIT}
        `);

        const events = rows.map((e) => ({
          id: String(e.id),
          name: e.nome,
          date: e.data_hora.toISOString().slice(0, 10),
          location: [e.cidade, e.uf].filter(Boolean).join(', '),
          slug: '',
          status: e.ativo ? 'ativo' : 'inativo',
        }));

        return reply.send({ events });
      } catch (err) {
        log.error({ err }, 'failed to query local eventos for autocomplete');
        return reply.status(500).send({ error: 'Falha ao buscar eventos.' });
      }
    }
  );

  app.get<{ Params: { id: string } }>('/api/eventos/:id', async (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    const log = request.log.child({ eventoId: id, route: 'evento' });

    if (!Number.isFinite(id)) {
      return reply.status(404).send({ error: 'Evento não encontrado.' });
    }

    try {
      const evento = await prisma.evento.findUnique({ where: { id }, include: { provedor: true } });
      if (!evento || !evento.ativo) {
        return reply.status(404).send({ error: 'Evento não encontrado.' });
      }

      const photosCount = evento.provedor.proprio
        ? await prisma.foto.count({ where: { eventoId: id, ativo: true } })
        : null;

      return reply.send({
        eventId: String(evento.id),
        name: evento.nome,
        city: evento.cidade,
        state: evento.uf,
        location: evento.cidade && evento.uf ? `${evento.cidade}, ${evento.uf}` : (evento.cidade ?? evento.uf),
        date: evento.dataHora.toISOString().slice(0, 10),
        photosCount,
        categoryId: String(evento.categoriaId),
        proprio: evento.provedor.proprio,
        providerSlug: evento.provedor.slug,
      });
    } catch (err) {
      log.error({ err }, 'failed to fetch local evento info');
      return reply.status(500).send({ error: 'Falha ao buscar o evento.' });
    }
  });

  app.post<{ Params: { id: string } }>('/api/eventos/:id/selfie', async (request, reply) => {
    const sessionId = getOrSetPhotipSessionId(request, reply);
    const id = Number.parseInt(request.params.id, 10);
    const log = request.log.child({ photipSessionId: sessionId, eventoId: id, route: 'selfie' });

    const data = await request.file();
    if (!data) {
      log.warn('selfie upload rejected: no multipart file field found');
      return reply.status(400).send({ error: 'Nenhuma imagem enviada.' });
    }
    const buffer = await data.toBuffer();
    log.info({ filename: data.filename, mimeType: data.mimetype, sizeBytes: buffer.length }, 'received selfie upload');

    const evento = await prisma.evento.findUnique({ where: { id }, include: { provedor: true } });
    if (!evento || !evento.ativo) {
      return reply.status(404).send({ error: 'Evento não encontrado.' });
    }
    if (evento.provedor.proprio) {
      return reply.status(400).send({ error: 'Este evento não usa busca por selfie.' });
    }

    const adapter = getAdapter(evento.provedor);
    if (!adapter) {
      log.error({ provedorSlug: evento.provedor.slug }, 'no adapter registered for this provider');
      return reply.status(501).send({ error: 'Provedor sem suporte a busca por selfie.' });
    }

    try {
      const result = await adapter.sendSelfie(
        evento,
        sessionId,
        { buffer, filename: data.filename, mimeType: data.mimetype },
        log
      );

      if (!result.success) {
        log.warn({ raw: result.raw }, 'provider rejected the selfie search');
        return reply.status(502).send({
          success: false,
          error: 'O provedor não conseguiu processar a selfie enviada.',
          raw: result.raw,
        });
      }

      return reply.send(result);
    } catch (err) {
      log.error({ err }, 'failed to reach provider while sending selfie');
      return reply.status(502).send({ success: false, error: 'Falha ao comunicar com o provedor.' });
    }
  });

  app.get<{ Params: { id: string } }>('/api/eventos/:id/fotos', async (request, reply) => {
    const sessionId = getOrSetPhotipSessionId(request, reply);
    const id = Number.parseInt(request.params.id, 10);
    const log = request.log.child({ photipSessionId: sessionId, eventoId: id, route: 'fotos' });

    const evento = await prisma.evento.findUnique({ where: { id }, include: { provedor: true } });
    if (!evento || !evento.ativo) {
      return reply.status(404).send({ error: 'Evento não encontrado.' });
    }

    if (evento.provedor.proprio) {
      const fotos = await prisma.foto.findMany({ where: { eventoId: id, ativo: true }, orderBy: { id: 'asc' } });
      const photos: Photo[] = fotos.map((f) => ({
        id: String(f.id),
        productUrl: '',
        thumbs: { p: f.urlThumb ?? f.urlFoto, m: f.urlThumb ?? f.urlFoto, g: f.urlFoto },
      }));
      log.info({ total: photos.length }, 'local gallery photos returned');
      return reply.send({ eventId: String(id), total: photos.length, photos });
    }

    const adapter = getAdapter(evento.provedor);
    if (!adapter) {
      log.error({ provedorSlug: evento.provedor.slug }, 'no adapter registered for this provider');
      return reply.status(501).send({ error: 'Provedor sem suporte a busca de fotos.' });
    }

    try {
      const result = await adapter.fetchPhotos(evento, sessionId, log);
      return reply.send({
        eventId: String(id),
        total: result.photos.length,
        photos: result.photos,
        message: result.message,
      });
    } catch (err) {
      log.error({ err }, 'failed to reach provider while fetching photos');
      return reply.status(502).send({ error: 'Falha ao comunicar com o provedor.' });
    }
  });
}
