import type { Provedor } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../db/prisma';
import {
  ensureEventSession,
  fetchCompetitions,
  searchByFace,
  uploadSelfie,
  FOCO_RADICAL_BASE_URL,
  type FocoRadicalCompetitionRaw,
  type FocoRadicalSearchByFaceResponse,
} from '../focoRadical/focoRadicalClient';
import { getImageId, setImageId } from '../focoRadical/faceSearchSession';
import type { Photo } from '../fotop/photoParser';
import { eventoDataChanged, requireIdEventoProvedor } from './providerUtils';
import { getSyncIncrementalDias } from './syncSettings';
import type { EventoComProvedor, FotosResult, ProviderAdapter, SelfieResult, SyncOptions, SyncResult } from './types';

async function sendSelfie(
  evento: EventoComProvedor,
  sessionId: string,
  file: { buffer: Buffer; filename: string; mimeType: string },
  log: FastifyBaseLogger
): Promise<SelfieResult> {
  const competitionId = requireIdEventoProvedor(evento, 'Foco Radical');
  const eventUrl = evento.urlSite ?? FOCO_RADICAL_BASE_URL;

  await ensureEventSession(sessionId, eventUrl, log);
  const result = await uploadSelfie(sessionId, competitionId, eventUrl, file, log);

  if (result.imageId) {
    setImageId(sessionId, competitionId, result.imageId);
  } else {
    log.warn({ competitionId, raw: result.raw }, 'foco radical: upload-selfie failed to produce an image_id');
  }

  return {
    success: result.imageId != null,
    raw: { imageId: result.imageId, noFaceMatch: result.noFaceMatch, reason: result.reason },
  };
}

// Foto-de-vídeo (isVideo=true) não tem equivalente hoje na UI (PhotoGrid/PhotoViewer só
// entendem foto estática) — mesma decisão que fotop/photoParser.ts toma ao pular cards de vídeo.
function mapToPhotos(data: FocoRadicalSearchByFaceResponse): Photo[] {
  const photos: Photo[] = [];
  for (const item of data.items) {
    for (const moment of item.moments) {
      for (const photo of moment.photos) {
        if (photo.isVideo) continue;
        photos.push({
          id: String(photo.id),
          // A API não traz um link de produto por foto (só thumbUrl/zoomUrl) — diferente do
          // fotop, que scrapa o href de button.foto-detalhes.
          productUrl: '',
          thumbs: { p: photo.thumbUrl, m: photo.thumbUrl, g: photo.zoomUrl || photo.thumbUrl },
        });
      }
    }
  }
  return photos;
}

// searchByFace já expõe os motivos de "sem resultado" como flags booleanas em vez de HTML pra
// scrapar (ver parseNoResultsMessage do fotop) — só precisa escolher a mensagem certa.
function buildEmptyResultMessage(data: FocoRadicalSearchByFaceResponse): string | undefined {
  if (data.error_message) return data.error_message;
  if (data.selfie_expired) return 'Sua selfie expirou. Envie uma nova selfie.';
  if (data.no_face_detected) return 'Não detectamos um rosto na selfie enviada.';
  if (data.rekognition_failed) return 'Não foi possível processar a selfie enviada.';
  if (data.invalid_image_format) return 'Formato de imagem não suportado.';
  return undefined;
}

async function fetchPhotos(evento: EventoComProvedor, sessionId: string, log: FastifyBaseLogger): Promise<FotosResult> {
  const competitionId = requireIdEventoProvedor(evento, 'Foco Radical');
  const imageId = getImageId(sessionId, competitionId);

  if (!imageId) {
    log.info({ competitionId }, 'foco radical: fetchPhotos sem image_id em cache (nenhuma selfie enviada ou expirada)');
    return { photos: [], message: 'Envie uma selfie para buscar suas fotos.' };
  }

  const data = await searchByFace(competitionId, imageId, log);
  const photos = mapToPhotos(data);
  const message = photos.length === 0 ? buildEmptyResultMessage(data) : undefined;

  log.info({ competitionId, total: photos.length }, 'foco radical: photo search finished');
  return { photos, message };
}

// Limite defensivo por chunk, no mesmo espírito do MAX_SYNC_PAGES do fotop — o retorno da API já
// traz _meta.pageCount, isso só evita um loop infinito se a API se comportar de forma inesperada.
// Precisa ser generoso: um único mês de alta temporada já passou de 100 páginas de 80 itens numa
// varredura manual (~8.400 eventos/mês, ver nota em CHUNK_SIZE_DAYS).
const MAX_PAGES_PER_CHUNK = 300;
const MONTHS_BACK = 12;
// Tamanho de cada chunk de dias por request de dates_multi (ver CHUNK_SIZE_DAYS abaixo) — mantém
// o tamanho de cada request comparável ao antigo sweep mês-a-mês, em vez de mandar meses inteiros
// (ou o histórico incremental inteiro) numa lista só.
const CHUNK_SIZE_DAYS = 31;
// Pausa entre requests pra não disparar o rate limit do Cloudflare na frente da API (ver
// comentário em focoRadicalClient.fetchCompetitions) — request-a-request é mais barato que
// deixar o 429 acontecer e pagar o backoff.
const REQUEST_PACING_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Todas as datas (yyyy-mm-dd) entre `from` e `to`, inclusive nas duas pontas.
function allDatesBetween(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// CompetitionSearch[dates_multi] NÃO é um filtro de intervalo — confirmado manualmente (replay
// direto na next-api) que o backend faz "date IN (...)": passar só duas datas (a mais antiga e a
// mais nova de um período) retorna só os eventos cravados exatamente nelas, descartando qualquer
// data entre as duas. Por isso o catálogo é varrido com a lista explícita de cada dia do período,
// em chunks de CHUNK_SIZE_DAYS pra manter cada request num tamanho parecido com o antigo sweep
// mês-a-mês (ver MAX_PAGES_PER_CHUNK).

// Últimos MONTHS_BACK meses (incluindo o mês corrente), do mais antigo pro mais recente.
function fullSyncDateChunks(monthsBack: number, now: Date): string[][] {
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return chunk(allDatesBetween(first, last), CHUNK_SIZE_DAYS);
}

// Últimos `dias` dias até hoje — usada no sync incremental. Cobre praticamente toda a mudança
// real (evento novo, foto de capa adicionada/trocada, correção de detalhe) porque competições
// ficam "paradas" pouco tempo depois de acontecer; eventos mais antigos que isso só são
// revisitados num sync completo.
function incrementalSyncDateChunks(dias: number, now: Date): string[][] {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dias));
  return chunk(allDatesBetween(from, now), CHUNK_SIZE_DAYS);
}

async function upsertCompetition(
  item: FocoRadicalCompetitionRaw,
  provedor: Provedor,
  log: FastifyBaseLogger
): Promise<'created' | 'updated' | 'skipped'> {
  if (!item.sport) {
    log.warn({ id: item.id, nome: item.name }, 'sync foco radical: evento sem esporte, pulado');
    return 'skipped';
  }

  const mapping = await prisma.categoriaProvedor.findUnique({
    where: {
      provedorId_idCategoriaProvedor: { provedorId: provedor.id, idCategoriaProvedor: String(item.sport.id) },
    },
  });
  if (!mapping) {
    log.warn(
      { idCategoriaProvedor: item.sport.id, esporte: item.sport.name, eventoNome: item.name },
      'sync foco radical: sem mapeamento de categoria (categorias_provedores), evento pulado'
    );
    return 'skipped';
  }

  const dataHora = item.date ? new Date(`${item.date}T00:00:00`) : null;
  if (!dataHora || Number.isNaN(dataHora.getTime())) {
    log.warn({ id: item.id, data: item.date }, 'sync foco radical: data inválida, evento pulado');
    return 'skipped';
  }

  const idEventoProvedor = String(item.id);
  const data = {
    nome: item.name.trim(),
    dataHora,
    cidade: item.place || null,
    uf: item.state?.abbreviation || null,
    categoriaId: mapping.categoriaId,
    urlSite: `${FOCO_RADICAL_BASE_URL}/evento/${item.path}`,
    urlCapa: item.coverPhotoOrIcon?.image || null,
  };

  const existing = await prisma.evento.findUnique({
    where: { provedorId_idEventoProvedor: { provedorId: provedor.id, idEventoProvedor } },
  });

  if (existing) {
    if (eventoDataChanged(existing, data)) {
      await prisma.evento.update({ where: { id: existing.id }, data });
    }
    return 'updated';
  }

  await prisma.evento.create({ data: { ...data, provedorId: provedor.id, idEventoProvedor } });
  return 'created';
}

interface RangeTotals {
  created: number;
  updated: number;
  skipped: number;
  pagesFetched: number;
  recordsRead: number;
}

// Varre um chunk de datas explícitas, paginando até acabar ou até MAX_PAGES_PER_CHUNK — usado
// tanto pelo sweep do sync completo quanto pela janela do sync incremental (ver
// fullSyncDateChunks/incrementalSyncDateChunks).
async function syncDates(dates: string[], provedor: Provedor, log: FastifyBaseLogger): Promise<RangeTotals> {
  const totals: RangeTotals = { created: 0, updated: 0, skipped: 0, pagesFetched: 0, recordsRead: 0 };
  let page = 1;
  let pageCount = 1;

  do {
    const { items, _meta } = await fetchCompetitions({ dates, page }, log);
    pageCount = _meta.pageCount || 1;
    totals.pagesFetched += 1;
    totals.recordsRead += items.length;

    for (const item of items) {
      try {
        const outcome = await upsertCompetition(item, provedor, log);
        if (outcome === 'created') totals.created += 1;
        else if (outcome === 'updated') totals.updated += 1;
        else totals.skipped += 1;
      } catch (err) {
        // Um registro ruim isolado (ex: URL do evento maior que o limite da coluna) não pode
        // derrubar o sweep inteiro — loga e segue, igual às outras validações acima.
        log.warn({ err, id: item.id, nome: item.name }, 'sync foco radical: falha ao salvar evento, pulado');
        totals.skipped += 1;
      }
    }

    page += 1;
    if (page <= pageCount && page <= MAX_PAGES_PER_CHUNK) await sleep(REQUEST_PACING_MS);
  } while (page <= pageCount && page <= MAX_PAGES_PER_CHUNK);

  log.info(
    { dataDe: dates[0], dataAte: dates[dates.length - 1], ...totals },
    'sync foco radical: chunk de datas concluído'
  );
  return totals;
}

// Importa/atualiza o catálogo de eventos do Foco Radical no BD local, sob demanda (disparado
// pelo admin) ou periodicamente (scheduler.ts).
//
// - full=true: varre os últimos MONTHS_BACK meses — usado no primeiro sync do provedor e sob
//   pedido explícito do admin ("Sincronizar completo"). Cobre o histórico inteiro que a Home
//   ainda expõe, mas é caro (centenas de requests, ~1 request/600ms pra não levar 429 do
//   Cloudflare — ver focoRadicalClient.fetchCompetitions).
// - full=false: varre só os últimos N dias (Configuracao.syncIncrementalDias — ver
//   syncSettings.ts). Suficiente pro que muda de verdade dia a dia (evento novo, foto de capa),
//   e barato o bastante pra rodar em todo ciclo do scheduler sem repetir o custo do sweep
//   completo.
async function syncEventos(provedor: Provedor, log: FastifyBaseLogger, options: SyncOptions): Promise<SyncResult> {
  const now = new Date();
  const chunks = options.full
    ? fullSyncDateChunks(MONTHS_BACK, now)
    : incrementalSyncDateChunks(await getSyncIncrementalDias(), now);

  const result: SyncResult = { created: 0, updated: 0, skipped: 0, pagesFetched: 0, recordsRead: 0 };
  for (const dates of chunks) {
    const totals = await syncDates(dates, provedor, log);
    result.created += totals.created;
    result.updated += totals.updated;
    result.skipped += totals.skipped;
    result.pagesFetched += totals.pagesFetched;
    result.recordsRead += totals.recordsRead;
  }

  log.info({ full: options.full, ...result }, 'sync foco radical finished');
  return result;
}

export const focoRadicalAdapter: ProviderAdapter = {
  slug: 'foco-radical',
  sendSelfie,
  fetchPhotos,
  syncEventos,
};
