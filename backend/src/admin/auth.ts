import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const ADMIN_SESSION_COOKIE = 'photip_admin_sid';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
