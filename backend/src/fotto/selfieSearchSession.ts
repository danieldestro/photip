import type { FotosResult } from '../providers/types';

// Ao contrário de fotop/focoRadical (que guardam só um id de sessão/imagem e refazem a busca
// depois), a busca por selfie do fotto é uma chamada única e stateless que já devolve as fotos —
// não existe um "image_id" pra reconsultar depois. Por isso cacheia aqui o próprio FotosResult já
// pronto, keyed por (photipSessionId, galleryId), pra fetchPhotos (que a interface ProviderAdapter
// não dá acesso à selfie de novo) devolver o mesmo resultado do sendSelfie. Mesmo formato
// TTL-map-com-sweep de focoRadical/faceSearchSession.ts.
interface Entry {
  result: FotosResult;
  storedAt: number;
}

const TTL_MS = 30 * 60 * 1000;

const store = new Map<string, Entry>();

function key(photipSessionId: string, galleryId: string): string {
  return `${photipSessionId}:${galleryId}`;
}

export function setSearchResult(photipSessionId: string, galleryId: string, result: FotosResult): void {
  store.set(key(photipSessionId, galleryId), { result, storedAt: Date.now() });
}

export function getSearchResult(photipSessionId: string, galleryId: string): FotosResult | null {
  const k = key(photipSessionId, galleryId);
  const entry = store.get(k);
  if (!entry) return null;

  if (Date.now() - entry.storedAt > TTL_MS) {
    store.delete(k);
    return null;
  }

  return entry.result;
}

function sweepExpired(): void {
  const now = Date.now();
  for (const [k, entry] of store) {
    if (now - entry.storedAt > TTL_MS) store.delete(k);
  }
}

setInterval(sweepExpired, TTL_MS).unref();
