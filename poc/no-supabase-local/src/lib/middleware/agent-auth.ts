export function verifyAgentAuth(
  authHeader: string | null | undefined
): boolean {
  if (!authHeader) return false;

  const expectedKey = process.env.AGENT_API_KEY;
  if (!expectedKey) return false;

  // Support "Bearer <key>" format
  const parts = authHeader.split(' ');
  const providedKey = parts.length === 2 ? parts[1] : authHeader;

  return providedKey === expectedKey;
}

export function getAgentIdentity(): string {
  return 'agent';
}
