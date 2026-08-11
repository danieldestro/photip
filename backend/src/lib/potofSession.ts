import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const POTOF_SESSION_COOKIE = 'potof_sid';

export function getOrSetPotofSessionId(request: FastifyRequest, reply: FastifyReply): string {
  const existing = request.cookies[POTOF_SESSION_COOKIE];
  if (existing) return existing;

  const sessionId = randomUUID();
  reply.setCookie(POTOF_SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return sessionId;
}
