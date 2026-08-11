import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const PHOTIP_SESSION_COOKIE = 'photip_sid';

export function getOrSetPhotipSessionId(request: FastifyRequest, reply: FastifyReply): string {
  const existing = request.cookies[PHOTIP_SESSION_COOKIE];
  if (existing) return existing;

  const sessionId = randomUUID();
  reply.setCookie(PHOTIP_SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return sessionId;
}
