import { request } from '../api/client';
import type {
  AdminSession,
  Categoria,
  Configuracoes,
  Evento,
  Foto,
  Fotografo,
  Provedor,
  SincronizacaoLog,
  Usuario,
} from './types';

export function adminLogin(email: string, senha: string): Promise<AdminSession> {
  return request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
}

export function adminLogout(): Promise<{ ok: boolean }> {
  return request('/api/admin/logout', { method: 'POST' });
}

export function adminMe(): Promise<AdminSession> {
  return request('/api/admin/me');
}

export interface PagedResult<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

export type ListParams = Record<string, string | number | boolean | undefined>;

function buildQuery(params: ListParams): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export interface CrudApi<T> {
  list: (params?: ListParams) => Promise<PagedResult<T>>;
  get: (id: number) => Promise<T>;
  create: (data: Record<string, unknown>) => Promise<T>;
  update: (id: number, data: Record<string, unknown>) => Promise<T>;
}

function createCrudApi<T>(basePath: string): CrudApi<T> {
  return {
    list: (params = {}) => request(`${basePath}${buildQuery(params)}`),
    get: (id) => request(`${basePath}/${id}`),
    create: (data) =>
      request(basePath, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    update: (id, data) =>
      request(`${basePath}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  };
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
}

export function syncProvedor(id: number, full: boolean): Promise<SyncResult> {
  return request(`/api/admin/provedores/${id}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full }),
  });
}

export function getConfiguracoes(): Promise<Configuracoes> {
  return request('/api/admin/configuracoes');
}

export function updateConfiguracoes(data: Configuracoes): Promise<Configuracoes> {
  return request('/api/admin/configuracoes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function fetchSincronizacoesLog(params?: ListParams): Promise<PagedResult<SincronizacaoLog>> {
  return request(`/api/admin/sincronizacoes-log${buildQuery(params ?? {})}`);
}

export const provedoresApi = createCrudApi<Provedor>('/api/admin/provedores');
export const categoriasApi = createCrudApi<Categoria>('/api/admin/categorias');
export const eventosApi = createCrudApi<Evento>('/api/admin/eventos');
export const usuariosApi = createCrudApi<Usuario>('/api/admin/usuarios');
export const fotografosApi = createCrudApi<Fotografo>('/api/admin/fotografos');
export const fotosApi = createCrudApi<Foto>('/api/admin/fotos');
