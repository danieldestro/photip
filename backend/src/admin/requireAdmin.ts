import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/prisma';
import { ADMIN_SESSION_COOKIE } from './auth';

export interface AdminSessionInfo {
  id: number;
  nome: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    admin?: AdminSessionInfo;
  }
}

// preHandler shared by every /api/admin/* route (except login) — reads the
// signed photip_admin_sid cookie, resolves the usuario (perfil=admin) and
// attaches it to the request, or rejects with 401.
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const raw = request.cookies[ADMIN_SESSION_COOKIE];
  if (!raw) {
    return reply.status(401).send({ error: 'Não autenticado.' });
  }

  const unsigned = request.unsignCookie(raw);
  const usuarioId = unsigned.valid && unsigned.value ? Number.parseInt(unsigned.value, 10) : NaN;
  if (!Number.isFinite(usuarioId)) {
    return reply.status(401).send({ error: 'Sessão inválida.' });
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !usuario.ativo || usuario.perfil !== 'admin') {
    return reply.status(401).send({ error: 'Sessão inválida.' });
  }

  request.admin = { id: usuario.id, nome: usuario.nome, email: usuario.email };
}
