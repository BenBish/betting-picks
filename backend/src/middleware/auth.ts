import { Context, Next } from 'hono';
import * as crypto from 'crypto';

// Simple scrypt-based password hash for admin password
export function hashPassword(password: string): string {
  const salt = 'betting-picks-admin-salt-v1';
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Map of session tokens to username - exported for use in login route
export const sessions = new Map<string, string>();

export const sessionAuthMiddleware = async (c: Context, next: Next) => {
  const cookie = c.req.raw.headers.get('Cookie') || '';
  const sessionCookie = cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('session='));

  if (!sessionCookie) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = sessionCookie.split('=')[1];
  if (!token || !sessions.has(token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', sessions.get(token)!);
  await next();
};
