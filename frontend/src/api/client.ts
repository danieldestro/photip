import type { Categoria, EventHeaderInfo, EventNameSuggestion, EventSummary, Photo, Provedor } from '../types';

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body && typeof body.error === 'string' ? body.error : `Erro na requisição ${path}: ${res.status}`;
    console.error(`[api] ${path} failed with ${res.status}`, body);
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function fetchEventInfo(eventId: string): Promise<Omit<EventHeaderInfo, 'id'> & { eventId: string }> {
  return request(`/api/eventos/${eventId}`);
}

export interface FetchEventosParams {
  page: number;
  estado?: string;
  cat?: string;
  dataInicio?: string;
  dataFim?: string;
  nomeEvento?: string;
  provedor?: string;
}

export function fetchEventos({
  page,
  estado,
  cat,
  dataInicio,
  dataFim,
  nomeEvento,
  provedor,
}: FetchEventosParams): Promise<{ page: number; events: EventSummary[]; hasMore: boolean }> {
  const params = new URLSearchParams({ pag: String(page) });
  if (estado) params.set('estado', estado);
  if (cat) params.set('cat', cat);
  if (dataInicio) params.set('dataInicio', dataInicio);
  if (dataFim) params.set('dataFim', dataFim);
  if (nomeEvento) params.set('nome_evento', nomeEvento);
  if (provedor) params.set('provedor', provedor);
  return request(`/api/eventos/busca?${params.toString()}`);
}

export interface SearchEventosPorNomeParams {
  nome: string;
  estado?: string;
}

export function searchEventosPorNome({
  nome,
  estado,
}: SearchEventosPorNomeParams): Promise<{ events: EventNameSuggestion[] }> {
  const params = new URLSearchParams({ nome });
  if (estado) params.set('estado', estado);
  return request(`/api/eventos/autocomplete?${params.toString()}`);
}

export function sendSelfie(eventId: string, file: File): Promise<{ success: boolean; error?: string }> {
  const formData = new FormData();
  formData.append('selfie', file);
  return request(`/api/eventos/${eventId}/selfie`, {
    method: 'POST',
    body: formData,
  });
}

export function fetchEventPhotos(
  eventId: string
): Promise<{ eventId: string; total: number; photos: Photo[]; message?: string }> {
  return request(`/api/eventos/${eventId}/fotos`);
}

export function fetchEventFavorites(eventId: string): Promise<{ eventId: string; fotoIds: string[] }> {
  return request(`/api/eventos/${eventId}/favoritos`);
}

export function addFavorite(eventId: string, photoId: string): Promise<{ ok: boolean }> {
  return request(`/api/eventos/${eventId}/favoritos/${encodeURIComponent(photoId)}`, { method: 'PUT' });
}

export function removeFavorite(eventId: string, photoId: string): Promise<{ ok: boolean }> {
  return request(`/api/eventos/${eventId}/favoritos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
}

export function clearEventFavorites(eventId: string): Promise<{ ok: boolean }> {
  return request(`/api/eventos/${eventId}/favoritos`, { method: 'DELETE' });
}

export function fetchTotalFavoritesCount(): Promise<{ total: number }> {
  return request('/api/favoritos/contagem');
}

export function fetchAppConfig(): Promise<{ features: { aiPhotoEdit: boolean } }> {
  return request('/api/config');
}

export function fetchCategorias(): Promise<{ categorias: Categoria[] }> {
  return request('/api/categorias');
}

export function fetchProvedores(): Promise<{ provedores: Provedor[] }> {
  return request('/api/provedores');
}

export type AiEffect = 'remove_people' | 'superhero' | 'artistic' | 'fantasy' | 'military';

export function generatePhotoAiEffect(
  photoUrl: string,
  effect: AiEffect
): Promise<{ mimeType: string; base64: string }> {
  return request('/api/ai/photo-effect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoUrl, effect }),
  });
}
