import type { Provedor } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../db/prisma';
import { fetchGalleries, searchBySelfie, FOTTO_SITE_BASE_URL, type FottoMediaRaw } from '../fotto/fottoClient';
import { getSearchResult, setSearchResult } from '../fotto/selfieSearchSession';
import type { Photo } from '../fotop/photoParser';
import { eventoDataChanged, requireIdEventoProvedor } from './providerUtils';
import type { EventoComProvedor, FotosResult, ProviderAdapter, SelfieResult, SyncOptions, SyncResult } from './types';

const FOTTO_LIST_PAGE_SIZE = 100;
// /api/galleries não filtra por data (ver comentário em fottoClient.fetchGalleries) e o catálogo do
// fotto é enorme (centenas de milhares de galerias, de todos os anos) — sem paginar por categoria
// mapeada e parar cedo, um sync varreria o histórico inteiro a cada ciclo. Full varre bem mais
// fundo (primeiro sync do provedor); incremental confia que uma página inteira sem novidade
// significa "alcançamos o que já foi sincronizado" (ver early-stop no loop abaixo).
const MAX_SYNC_PAGES_FULL = 100;
const MAX_SYNC_PAGES_INCREMENTAL = 5;

function mapMedia(media: FottoMediaRaw): Photo | null {
  // Vídeos não têm equivalente hoje na UI (PhotoGrid/PhotoViewer só entendem foto estática) —
  // mesma decisão que fotop/photoParser.ts e focoRadicalAdapter.ts tomam ao pular esses itens.
  if (media.mediaType !== 'image') return null;
  return {
    id: String(media.id),
    productUrl: '',
    thumbs: { p: media.thumbnail, m: media.thumbnail, g: media.image },
  };
}

async function sendSelfie(
  evento: EventoComProvedor,
  sessionId: string,
  file: { buffer: Buffer; filename: string; mimeType: string },
  log: FastifyBaseLogger
): Promise<SelfieResult> {
  const galleryId = requireIdEventoProvedor(evento, 'Fotto');
  const result = await searchBySelfie(galleryId, file, log);

  if (!result.success) {
    setSearchResult(sessionId, galleryId, { photos: [], message: result.message });
    log.info({ galleryId, reason: result.reason }, 'fotto: selfie search did not produce a usable result');
    return { success: false, raw: { reason: result.reason, message: result.message } };
  }

  const photos = result.medias.map(mapMedia).filter((p): p is Photo => p !== null);
  const message = photos.length === 0 ? 'Nenhuma foto encontrada com essa selfie.' : undefined;
  setSearchResult(sessionId, galleryId, { photos, message });

  log.info({ galleryId, total: photos.length }, 'fotto: selfie search finished');
  return { success: true, raw: { searchResultHash: result.searchResultHash, total: photos.length } };
}

// O resultado já vem pronto da busca por selfie (ver selfieSearchSession.ts) — ao contrário de
// fotop/focoRadical, o fotto não expõe uma segunda chamada "liste as fotos dessa busca" separada
// do envio da imagem.
async function fetchPhotos(evento: EventoComProvedor, sessionId: string, log: FastifyBaseLogger): Promise<FotosResult> {
  const galleryId = requireIdEventoProvedor(evento, 'Fotto');
  const cached = getSearchResult(sessionId, galleryId);

  if (!cached) {
    log.info({ galleryId }, 'fotto: fetchPhotos sem resultado em cache (nenhuma selfie enviada ou expirada)');
    return { photos: [], message: 'Envie uma selfie para buscar suas fotos.' };
  }

  return cached;
}

async function syncEventos(provedor: Provedor, log: FastifyBaseLogger, options: SyncOptions): Promise<SyncResult> {
  const mappings = await prisma.categoriaProvedor.findMany({ where: { provedorId: provedor.id } });
  const maxPages = options.full ? MAX_SYNC_PAGES_FULL : MAX_SYNC_PAGES_INCREMENTAL;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const mapping of mappings) {
    let page = 1;

    while (page <= maxPages) {
      const response = await fetchGalleries(
        { page, perPage: FOTTO_LIST_PAGE_SIZE, categoryId: mapping.idCategoriaProvedor },
        log
      );
      if (response.galleries.length === 0) break;

      let pageCreated = 0;
      let pageUpdated = 0;

      for (const g of response.galleries) {
        if (!g.eventStartDate) {
          log.warn({ galleryId: g.id, title: g.title }, 'sync fotto: sem eventStartDate, evento pulado');
          skipped += 1;
          continue;
        }

        const data = {
          nome: g.title.trim(),
          dataHora: new Date(g.eventStartDate),
          cidade: g.city || null,
          uf: g.state || null,
          local: g.location || null,
          categoriaId: mapping.categoriaId,
          urlCapa: g.cover?.url ?? null,
          urlSite: `${FOTTO_SITE_BASE_URL}/${g.slug}/e/${g.id}`,
        };

        const existing = await prisma.evento.findUnique({
          where: { provedorId_idEventoProvedor: { provedorId: provedor.id, idEventoProvedor: String(g.id) } },
        });

        if (existing) {
          if (eventoDataChanged(existing, data)) {
            await prisma.evento.update({ where: { id: existing.id }, data });
            pageUpdated += 1;
          }
        } else {
          await prisma.evento.create({
            data: { ...data, provedorId: provedor.id, idEventoProvedor: String(g.id) },
          });
          pageCreated += 1;
        }
      }

      created += pageCreated;
      updated += pageUpdated;

      // Ver comentário no topo do arquivo: sem filtro de data, a listagem DESC por categoria é o
      // único jeito barato de saber "já vimos isso" — uma página inteira sem criação/atualização
      // é o sinal de que o resto é catálogo antigo já sincronizado.
      if (!options.full && pageCreated === 0 && pageUpdated === 0) break;

      if (page >= response.pages) break;
      page += 1;
    }
  }

  log.info({ created, updated, skipped, categorias: mappings.length, full: options.full }, 'sync fotto finished');
  return { created, updated, skipped };
}

export const fottoAdapter: ProviderAdapter = {
  slug: 'fotto',
  sendSelfie,
  fetchPhotos,
  syncEventos,
};
