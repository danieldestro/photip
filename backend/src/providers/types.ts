import type { Evento, Provedor } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import type { Photo } from '../fotop/photoParser';

export type EventoComProvedor = Evento & { provedor: Provedor };

export interface SelfieResult {
  success: boolean;
  raw?: unknown;
}

export interface FotosResult {
  photos: Photo[];
  message?: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  /** Total de páginas lidas da API do provedor durante a execução — ver SincronizacaoLog.paginasLidas. */
  pagesFetched: number;
  /** Total de registros brutos lidos da API do provedor (antes de filtrar/pular) — ver SincronizacaoLog.registrosLidos. */
  recordsRead: number;
}

export interface SyncOptions {
  /**
   * true: sweep the provider's whole catalog (first sync ever, or an explicit admin request).
   * false: sweep only the recent window (Configuracao.syncIncrementalDias) — cheap enough to run
   * on every scheduled tick without hammering the provider or tripping its rate limits.
   */
  full: boolean;
}

// Um provedor "próprio" (Provedor.proprio=true) não é um adapter — as rotas
// tratam esse caso direto via Prisma (galeria local de Foto), sem passar por
// aqui. Isso existe só para provedores externos com busca/scraping próprios
// (hoje Fotop e Foco Radical — este último só com syncEventos implementado
// até agora, sendSelfie/fetchPhotos ainda lançam "não suportado").
export interface ProviderAdapter {
  slug: string;
  sendSelfie(
    evento: EventoComProvedor,
    sessionId: string,
    file: { buffer: Buffer; filename: string; mimeType: string },
    log: FastifyBaseLogger
  ): Promise<SelfieResult>;
  fetchPhotos(evento: EventoComProvedor, sessionId: string, log: FastifyBaseLogger): Promise<FotosResult>;
  /** Opcional: nem todo provedor externo precisa suportar importar seu catálogo de eventos. */
  syncEventos?(provedor: Provedor, log: FastifyBaseLogger, options: SyncOptions): Promise<SyncResult>;
}
