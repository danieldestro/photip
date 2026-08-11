import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import FormData from 'form-data';
import type { FastifyBaseLogger } from 'fastify';
import { getOrCreateJar } from './cookieSession';

export const FOTOP_BASE_URL = 'https://fotop.com.br';
export const FOTOP_PHOTOS_BASE_URL = 'https://photos.fotop.com';

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
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

function buildClient(jar: CookieJar): AxiosInstance {
  return wrapper(
    axios.create({
      baseURL: FOTOP_BASE_URL,
      jar,
      withCredentials: true,
      headers: BROWSER_HEADERS,
      maxRedirects: 5,
      validateStatus: () => true,
    })
  );
}

export async function ensureEventSession(
  photipSessionId: string,
  eventId: string,
  logger: FastifyBaseLogger = noopLogger
): Promise<string> {
  const jar = getOrCreateJar(photipSessionId);
  const client = buildClient(jar);
  const res = await client.get('/fotos/eventos', { params: { evento: eventId } });
  const html = typeof res.data === 'string' ? res.data : '';

  logger.info(
    {
      photipSessionId,
      eventId,
      status: res.status,
      finalUrl: res.request?.res?.responseUrl,
      setCookieCount: res.headers['set-cookie']?.length ?? 0,
      cookiesInJar: (await jar.getCookies(FOTOP_BASE_URL)).map((c) => c.key),
    },
    'fotop: ensureEventSession response'
  );

  if (res.status >= 400) {
    logger.warn({ eventId, status: res.status, body: preview(res.data) }, 'fotop: ensureEventSession returned an error status');
  }

  return html;
}

export async function fetchSearchResultsHtml(
  photipSessionId: string,
  eventId: string,
  page: number,
  logger: FastifyBaseLogger = noopLogger
): Promise<string> {
  const jar = getOrCreateJar(photipSessionId);
  const client = buildClient(jar);
  const url = `/fotos/eventos/busca/evento/${eventId}/rc/${page}`;
  const res = await client.get(url);
  const html = typeof res.data === 'string' ? res.data : '';

  logger.info(
    {
      photipSessionId,
      eventId,
      page,
      status: res.status,
      htmlLength: html.length,
      hasFotoItemMarkup: html.includes('foto-item'),
    },
    'fotop: fetchSearchResultsHtml response'
  );

  if (res.status >= 400 || !html) {
    logger.warn({ url, status: res.status, body: preview(res.data) }, 'fotop: fetchSearchResultsHtml returned no usable HTML');
  }

  return html;
}

// Raw shape returned by GET /fotos/eventos/busca-eventos/ — a plain JSON array, no
// wrapper/pagination metadata. `id_estacoes` is the event's category id (matches the ids in
// frontend/src/data/eventTypes.ts); `estado` matches frontend/src/data/estados.ts ids.
export interface FotopEventoRaw {
  id_produtos_eventos: string;
  nome: string;
  data: string | null;
  data_fim: string | null;
  cidade: string;
  estado: string;
  local: string;
  tem_foto_evento: string | null;
  id_estacoes: string;
  senha: boolean;
  qtd_fotos: string;
  data_inicio: string | null;
}

// This endpoint is public and stateless (confirmed: works with no cookies at all), unlike the
// rest of fotopClient which threads a per-photip-session cookie jar through an event's own
// face-search flow — so it uses a plain one-off request instead of buildClient/getOrCreateJar.
export interface FetchEventosBuscaParams {
  page: number;
  estado?: string;
  cat?: string;
  dataInicio?: string;
  dataFim?: string;
  nomeEvento?: string;
}

export async function fetchEventosBusca(
  params: FetchEventosBuscaParams,
  logger: FastifyBaseLogger = noopLogger
): Promise<FotopEventoRaw[]> {
  const res = await axios.get(`${FOTOP_BASE_URL}/fotos/eventos/busca-eventos/`, {
    headers: BROWSER_HEADERS,
    validateStatus: () => true,
    params: {
      pag: params.page,
      estado: params.estado ?? '',
      cat: params.cat ?? '',
      pais: 'BR',
      status: 'ativo',
      dataInicio: params.dataInicio ?? '',
      dataFim: params.dataFim ?? '',
      nome_evento: params.nomeEvento ?? '',
    },
  });

  const events = Array.isArray(res.data) ? (res.data as FotopEventoRaw[]) : [];

  logger.info(
    {
      page: params.page,
      estado: params.estado,
      cat: params.cat,
      dataInicio: params.dataInicio,
      dataFim: params.dataFim,
      nomeEvento: params.nomeEvento,
      status: res.status,
      count: events.length,
    },
    'fotop: fetchEventosBusca response'
  );

  if (res.status >= 400) {
    logger.warn({ status: res.status, body: preview(res.data) }, 'fotop: fetchEventosBusca returned an error status');
  }

  return events;
}

export interface SelfieSearchResult {
  success: boolean;
  raw: unknown;
}

export async function sendSelfie(
  photipSessionId: string,
  eventId: string,
  file: { buffer: Buffer; filename: string; mimeType: string },
  logger: FastifyBaseLogger = noopLogger
): Promise<SelfieSearchResult> {
  const jar = getOrCreateJar(photipSessionId);
  const client = buildClient(jar);

  // Field names and empty crop values mirror the real #formReconhecimento markup on
  // fotos/eventos?evento={id}: cropx/y/w/h and wresponsive/hresponsive stay blank whenever
  // the user doesn't manually crop (e.g. picking straight from gallery/camera).
  const form = new FormData();
  form.append('cropx', '');
  form.append('cropy', '');
  form.append('cropw', '');
  form.append('croph', '');
  form.append('wresponsive', '');
  form.append('hresponsive', '');
  form.append('evento', eventId);
  form.append('order', '');
  form.append('selfie', file.buffer, {
    filename: file.filename,
    contentType: file.mimeType,
  });

  logger.info(
    { photipSessionId, eventId, filename: file.filename, mimeType: file.mimeType, sizeBytes: file.buffer.length },
    'fotop: sending selfie to salva-face'
  );

  const res = await client.post('/fotos/eventos/salva-face', form, {
    headers: form.getHeaders(),
  });

  const success = res.status >= 200 && res.status < 300;

  logger.info(
    { photipSessionId, eventId, status: res.status, success, contentType: res.headers['content-type'], body: preview(res.data) },
    'fotop: salva-face response'
  );

  if (!success) {
    logger.warn({ eventId, status: res.status, body: preview(res.data) }, 'fotop: salva-face request failed');
  }

  return {
    success,
    raw: res.data,
  };
}
