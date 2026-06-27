import type { Context, Next } from 'hono';
import { getAgentByKey } from '../lib/agent-service';
import type { Agent } from '../lib/agent-service';

// Simple in-memory sliding window rate limiter
const rateLimitStore = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100;

function checkRateLimit(agentId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(agentId) || [];
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Filter out old timestamps
  const validTimestamps = timestamps.filter((t) => t > windowStart);

  if (validTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitStore.set(agentId, validTimestamps);
  return true;
}

// Periodic cleanup of old entries
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter((t) => t > windowStart);
    if (valid.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, valid);
    }
  }
}, 300_000); // Every 5 minutes

export const agentAuthMiddleware = async (c: Context<any, string, {}>, next: Next) => {
  const authHeader = c.req.raw.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const key = authHeader.substring(7);
  const agent = getAgentByKey(key);

  if (!agent) {
    return c.json({ error: 'Invalid agent key' }, 401);
  }

  if (!agent.is_active) {
    return c.json({ error: 'Agent is deactivated' }, 403);
  }

  // Rate limiting
  if (!checkRateLimit(agent.id)) {
    return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429);
  }

  c.set('agent', agent);
  await next();
};
