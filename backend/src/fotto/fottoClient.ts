import axios from 'axios';
import type { FastifyBaseLogger } from 'fastify';

export const FOTTO_API_BASE_URL = 'https://api.fotto.com.br';
export const FOTTO_SITE_BASE_URL = 'https://www.fotto.com.br';

const noopLogger: FastifyBaseLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => noopLogger,
  level: 'silent',
} as unknown as FastifyBaseLogger;

function preview(data: unknown, max = 500): string {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  if (text === undefined) return String(data);
  return text.length > max ? `${text.slice(0, max)}… (${text.length} bytes)` : text;
}

// API pública, sem cookies/sessão nem chave de API (confirmado manualmente: as mesmas chamadas que
// o site www.fotto.com.br faz no browser respondem igual via request avulsa). Por isso, ao
// contrário de fotop/focoRadical, não existe cookieSession.ts aqui.
const httpClient = axios.create({
  baseURL: FOTTO_API_BASE_URL,
  headers: { Accept: 'application/json' },
  validateStatus: () => true,
});

export interface FottoGalleryRaw {
  id: number;
  title: string;
  slug: string;
  eventStartDate: string | null;
  eventEndDate: string | null;
  category: { id: number; name: string; slug: string } | null;
  cover: { url: string | null };
  location: string | null;
  city: string | null;
  state: string | null;
}

export interface FottoGalleriesResponse {
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
  galleries: FottoGalleryRaw[];
}

export interface FetchGalleriesParams {
  page: number;
  perPage: number;
  categoryId?: string;
}

// GET /api/galleries valida a querystring com uma whitelist estrita (qualquer parâmetro fora dela,
// incluindo tentativas óbvias de filtro por data, responde 400 "property X should not exist") —
// confirmado manualmente que não existe filtro incremental por data; só order_dir/order_by/
// per_page/page/category_id/state são aceitos. syncEventos (fottoAdapter.ts) compensa isso paginando
// por categoria em ordem DESC (mais recentes primeiro) e parando cedo.
export async function fetchGalleries(
  params: FetchGalleriesParams,
  log: FastifyBaseLogger = noopLogger
): Promise<FottoGalleriesResponse> {
  const response = await httpClient.get<FottoGalleriesResponse>('/api/galleries', {
    params: {
      order_dir: 'DESC',
      per_page: params.perPage,
      page: params.page,
      category_id: params.categoryId,
    },
  });

  if (response.status !== 200) {
    log.warn({ status: response.status, body: preview(response.data) }, 'fotto: fetchGalleries returned an error status');
    throw new Error(`fotto: fetchGalleries falhou com status ${response.status}`);
  }

  return response.data;
}

export interface FottoCategoryRaw {
  id: number;
  categoryName: string;
  slug: string;
}

export async function fetchCategories(log: FastifyBaseLogger = noopLogger): Promise<FottoCategoryRaw[]> {
  const response = await httpClient.get<FottoCategoryRaw[]>('/api/categories');

  if (response.status !== 200) {
    log.warn({ status: response.status, body: preview(response.data) }, 'fotto: fetchCategories returned an error status');
    throw new Error(`fotto: fetchCategories falhou com status ${response.status}`);
  }

  return response.data;
}

export interface FottoMediaRaw {
  id: number;
  thumbnail: string;
  image: string;
  mediaType: 'image' | 'video';
  width: string;
  height: string;
}

export type FottoSearchResult =
  | { success: true; medias: FottoMediaRaw[]; searchResultHash: string }
  | { success: false; reason: 'no_faces_found' | 'unknown'; message: string };

// POST /api/galleries/:id/medias/search espera JSON `{ image: "data:<mime>;base64,<...>" }` —
// confirmado manualmente (multipart/form-data com o mesmo nome de campo dá 422 "Cannot read
// properties of undefined (reading 'image')", ou seja o body nem chega a ser parseado como
// multipart). Uma selfie sem rosto detectável responde 422 com `type: "no_faces_found"` em vez de
// um erro de transporte — tratado aqui como resultado de domínio, não exceção.
export async function searchBySelfie(
  galleryId: string,
  file: { buffer: Buffer; mimeType: string },
  log: FastifyBaseLogger = noopLogger
): Promise<FottoSearchResult> {
  const dataUri = `data:${file.mimeType};base64,${file.buffer.toString('base64')}`;

  const response = await httpClient.post(`/api/galleries/${galleryId}/medias/search`, { image: dataUri });

  log.info(
    { galleryId, status: response.status, success: response.data?.success, mediaCount: response.data?.data?.medias?.length },
    'fotto: selfie search response'
  );

  if (response.status === 200 && response.data?.success === true) {
    const medias = Array.isArray(response.data.data?.medias) ? (response.data.data.medias as FottoMediaRaw[]) : [];
    const searchResultHash = response.data.data?.searchResultHash ?? '';
    return { success: true, medias, searchResultHash };
  }

  if (response.data?.type === 'no_faces_found') {
    return { success: false, reason: 'no_faces_found', message: 'Não detectamos um rosto na selfie enviada.' };
  }

  log.warn({ galleryId, status: response.status, body: preview(response.data) }, 'fotto: selfie search failed');
  return {
    success: false,
    reason: 'unknown',
    message: typeof response.data?.message === 'string' ? response.data.message : 'Não foi possível processar a selfie enviada.',
  };
}
