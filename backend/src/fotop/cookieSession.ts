import { CookieJar } from 'tough-cookie';

interface SessionEntry {
  jar: CookieJar;
  lastUsed: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000;

const sessions = new Map<string, SessionEntry>();

export function getOrCreateJar(photipSessionId: string): CookieJar {
  const existing = sessions.get(photipSessionId);
  if (existing) {
    existing.lastUsed = Date.now();
    return existing.jar;
  }

  const jar = new CookieJar();
  sessions.set(photipSessionId, { jar, lastUsed: Date.now() });
  return jar;
}

export function sweepExpiredSessions(): void {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.lastUsed > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(sweepExpiredSessions, SESSION_TTL_MS).unref();
