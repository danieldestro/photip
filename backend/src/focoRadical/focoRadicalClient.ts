import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import FormData from 'form-data';
import type { FastifyBaseLogger } from 'fastify';
import { getOrCreateJar } from './cookieSession';

export const FOCO_RADICAL_BASE_URL = 'https://www.focoradical.com.br';

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

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

// Shape of GET /next-api/home/competitions — público e sem estado (confirmado: funciona sem
// cookies), então usa uma request avulsa como fetchEventosBusca do fotop, em vez de um client
// com cookie jar por sessão.
export interface FocoRadicalCompetitionRaw {
  id: number;
  name: string;
  path: string;
  date: string | null;
  place: string | null;
  sport?: { id: number; name: string } | null;
  state?: { abbreviation: string } | null;
  coverPhotoOrIcon?: { image: string } | null;
}

export interface FocoRadicalCompetitionsResponse {
  items: FocoRadicalCompetitionRaw[];
  _meta: { currentPage: number; pageCount: number; perPage: number; totalCount: number };
}

export interface FetchCompetitionsParams {
  // dates_multi NÃO é um filtro de intervalo, apesar do nome dataDe/dataAte sugerir isso em quem
  // chama fetchCompetitions — confirmado manualmente (replay direto na next-api) que o backend
  // faz "date IN (...)": passar só duas datas retorna só eventos cravados exatamente nelas, e
  // qualquer data entre as duas é descartada. Por isso aqui o parâmetro já é a lista completa de
  // yyyy-mm-dd a consultar, uma por dia, montada por quem chama.
  dates: string[];
  page: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// O site coloca uma regra de rate limit do Cloudflare na frente das APIs next-api/* (responde 429
// com uma página de "Just a moment..." em vez de JSON) depois de uma rajada de requests sem pausa —
// confirmado manualmente que ela libera de novo sozinha após alguns segundos, sem exigir resolver
// nenhum desafio JS. Por isso o retry aqui é só backoff simples, não um bypass de bot-protection.
const MAX_RATE_LIMIT_RETRIES = 6;
const RATE_LIMIT_BACKOFF_MS = 8_000;

// GET com retry-com-backoff em 429, compartilhado por fetchCompetitions e searchByFace (as duas
// chamadas next-api públicas/sem cookie por trás dessa mesma regra de rate limit).
async function getWithRateLimitRetry(
  url: string,
  params: Record<string, string | number>,
  logger: FastifyBaseLogger,
  attempt = 0
): Promise<AxiosResponse> {
  const res = await axios.get(url, { headers: BROWSER_HEADERS, validateStatus: () => true, params });

  if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
    const delayMs = RATE_LIMIT_BACKOFF_MS * (attempt + 1);
    logger.warn({ url, params, attempt, delayMs }, 'foco radical: rate limited (429), aguardando antes de tentar de novo');
    await sleep(delayMs);
    return getWithRateLimitRetry(url, params, logger, attempt + 1);
  }

  return res;
}

export async function fetchCompetitions(
  params: FetchCompetitionsParams,
  logger: FastifyBaseLogger = noopLogger
): Promise<FocoRadicalCompetitionsResponse> {
  const res = await getWithRateLimitRetry(
    `${FOCO_RADICAL_BASE_URL}/next-api/home/competitions`,
    {
      'CompetitionSearch[dates_multi]': params.dates.join(','),
      filters_override: 1,
      page: params.page,
    },
    logger
  );

  const items = Array.isArray(res.data?.items) ? (res.data.items as FocoRadicalCompetitionRaw[]) : [];
  const meta = res.data?._meta ?? { currentPage: params.page, pageCount: params.page, perPage: 0, totalCount: 0 };

  logger.info(
    {
      dataDe: params.dates[0],
      dataAte: params.dates[params.dates.length - 1],
      dateCount: params.dates.length,
      page: params.page,
      status: res.status,
      count: items.length,
      meta,
    },
    'foco radical: fetchCompetitions response'
  );

  if (res.status >= 400) {
    logger.warn({ status: res.status, body: preview(res.data) }, 'foco radical: fetchCompetitions returned an error status');
  }

  return { items, _meta: meta };
}

// --- Busca por selfie -------------------------------------------------------------------------
//
// Ao contrário de fetchCompetitions (público/sem estado), o fluxo de selfie do foco radical usa
// cookies de sessão (FFSESSID, fot_fp, _csrf, params) coletados de uma navegação normal no site.
// Confirmado manualmente (browser real + replay com axios/tough-cookie puro, ver notas do PR):
//
// - O botão "Estou ciente" do modal de termos de uso NÃO faz nenhuma request — ele só grava, via
//   JS do lado do cliente, um cookie `search_by_face_terms_accepted_competition_{id}=true`
//   (Path=/, não-HttpOnly, ~7 dias). O servidor confere esse cookie no upload; sem ele, POST
//   /competition/upload-selfie responde 400 "O usuário deve concordar com os termos de uso do
//   reconhecimento facial." Como é só um cookie, dá pra simular o clique sem fazer o browser fazer
//   nada: basta gravar esse cookie no jar antes do upload.
// - POST /competition/upload-selfie?competition_id={id}, multipart com um único campo `selfie`
//   (arquivo) — sem campo de CSRF, sem competition_id no corpo. Não é uma resposta JSON: é uma
//   ação Yii2 clássica que responde 302, com o resultado (image_id e, se aplicável,
//   facial_no_match=1&reason=no_face) codificado na query string do header Location.
// - GET /competition/upload-selfie (a mesma URL, mas GET direto/navegação) é bloqueado pelo WAF do
//   Cloudflare independente de headers — mas isso não afeta a gente, porque só usamos POST nesse
//   path.
function buildSessionClient(jar: CookieJar): AxiosInstance {
  return wrapper(
    axios.create({
      baseURL: FOCO_RADICAL_BASE_URL,
      jar,
      withCredentials: true,
      headers: BROWSER_HEADERS,
      validateStatus: () => true,
    })
  );
}

// GET de qualquer página do site pra coletar os cookies de sessão (FFSESSID, fot_fp, _csrf,
// params) que o upload-selfie espera encontrar no jar. `eventUrl` é a página do evento
// (evento.urlSite) quando disponível — não é estritamente necessário que seja essa página
// específica, mas mantém o Referer do upload consistente com uma navegação real.
export async function ensureEventSession(
  photipSessionId: string,
  eventUrl: string,
  logger: FastifyBaseLogger = noopLogger
): Promise<void> {
  const jar = getOrCreateJar(photipSessionId);
  const client = buildSessionClient(jar);
  const res = await client.get(eventUrl, { maxRedirects: 5 });

  logger.info(
    {
      photipSessionId,
      eventUrl,
      status: res.status,
      cookiesInJar: (await jar.getCookies(FOCO_RADICAL_BASE_URL)).map((c) => c.key),
    },
    'foco radical: ensureEventSession response'
  );

  if (res.status >= 400) {
    logger.warn({ eventUrl, status: res.status, body: preview(res.data) }, 'foco radical: ensureEventSession returned an error status');
  }
}

export interface UploadSelfieResult {
  /** null quando a resposta não veio no formato esperado (sem redirect utilizável). */
  imageId: string | null;
  /** true quando o próprio redirect do upload já sinalizou "rosto não encontrado". */
  noFaceMatch: boolean;
  reason: string | null;
  raw: unknown;
}

export async function uploadSelfie(
  photipSessionId: string,
  competitionId: string,
  eventUrl: string,
  file: { buffer: Buffer; filename: string; mimeType: string },
  logger: FastifyBaseLogger = noopLogger
): Promise<UploadSelfieResult> {
  const jar = getOrCreateJar(photipSessionId);

  // Simula o clique em "Estou ciente" — ver nota acima, isso não corresponde a nenhuma request.
  await jar.setCookie(`search_by_face_terms_accepted_competition_${competitionId}=true; Path=/`, FOCO_RADICAL_BASE_URL);

  const client = buildSessionClient(jar);
  const form = new FormData();
  form.append('selfie', file.buffer, { filename: file.filename, contentType: file.mimeType });

  logger.info(
    { photipSessionId, competitionId, filename: file.filename, mimeType: file.mimeType, sizeBytes: file.buffer.length },
    'foco radical: sending selfie to upload-selfie'
  );

  const res = await client.post('/competition/upload-selfie', form, {
    params: { competition_id: competitionId },
    headers: { ...form.getHeaders(), Referer: eventUrl, Origin: FOCO_RADICAL_BASE_URL, Accept: '*/*' },
    maxRedirects: 0,
  });

  const location = res.headers['location'];

  logger.info(
    { photipSessionId, competitionId, status: res.status, location },
    'foco radical: upload-selfie response'
  );

  if (!location || res.status < 300 || res.status >= 400) {
    logger.warn(
      { photipSessionId, competitionId, status: res.status, body: preview(res.data) },
      'foco radical: upload-selfie did not redirect as expected'
    );
    return { imageId: null, noFaceMatch: false, reason: null, raw: res.data };
  }

  const redirectUrl = new URL(location, FOCO_RADICAL_BASE_URL);
  const imageId = redirectUrl.searchParams.get('image_id');
  const noFaceMatch = redirectUrl.searchParams.get('facial_no_match') === '1';
  const reason = redirectUrl.searchParams.get('reason');

  return { imageId, noFaceMatch, reason, raw: { location } };
}

// Shape of GET /next-api/search-results/list-by-face — público e sem estado (confirmado: funciona
// sem cookies, só precisa de competition_id + image_id), igual fetchCompetitions.
export interface FocoRadicalSearchPhoto {
  id: number;
  code: string;
  thumbUrl: string;
  zoomUrl: string;
  isVideo: boolean;
  takenAt: string;
}

export interface FocoRadicalSearchMoment {
  momentId: string;
  type: string;
  timestamp: number;
  photos: FocoRadicalSearchPhoto[];
}

export interface FocoRadicalSearchItem {
  photographer: { id: number; name: string; initials: string; storeUrl: string; avatarUrl: string };
  moments: FocoRadicalSearchMoment[];
}

export interface FocoRadicalSearchByFaceResponse {
  items: FocoRadicalSearchItem[];
  total_count: number;
  has_more: boolean;
  selfie_expired: boolean;
  rekognition_failed: boolean;
  no_face_detected: boolean;
  invalid_image_format: boolean;
  error_message: string | null;
}

const EMPTY_SEARCH_BY_FACE_RESPONSE: FocoRadicalSearchByFaceResponse = {
  items: [],
  total_count: 0,
  has_more: false,
  selfie_expired: false,
  rekognition_failed: false,
  no_face_detected: false,
  invalid_image_format: false,
  error_message: null,
};

export async function searchByFace(
  competitionId: string,
  imageId: string,
  logger: FastifyBaseLogger = noopLogger
): Promise<FocoRadicalSearchByFaceResponse> {
  const res = await getWithRateLimitRetry(
    `${FOCO_RADICAL_BASE_URL}/next-api/search-results/list-by-face`,
    { competition_id: competitionId, image_id: imageId },
    logger
  );

  const data: Partial<FocoRadicalSearchByFaceResponse> =
    res.data && typeof res.data === 'object' ? res.data : {};

  logger.info(
    {
      competitionId,
      imageId,
      status: res.status,
      totalCount: data.total_count,
      itemCount: data.items?.length,
      selfieExpired: data.selfie_expired,
      noFaceDetected: data.no_face_detected,
    },
    'foco radical: searchByFace response'
  );

  if (res.status >= 400) {
    logger.warn({ competitionId, imageId, status: res.status, body: preview(res.data) }, 'foco radical: searchByFace returned an error status');
  }

  return { ...EMPTY_SEARCH_BY_FACE_RESPONSE, ...data };
}
