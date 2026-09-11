/**
 * Lightweight & Secure Session Management for Dashboard Access
 * Uses Web Crypto API (SubtleCrypto) compatible with both Node.js runtime and Next.js Edge middleware.
 */

export const SESSION_COOKIE_NAME = 'threads_agent_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function stringToBufferSource(str: string): BufferSource {
  return new TextEncoder().encode(str) as unknown as BufferSource;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getSecret(): string {
  return (
    process.env.ADMIN_PASSWORD ||
    process.env.CRON_SECRET ||
    'threads_agent_admin_secure_key_2026'
  );
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    stringToBufferSource(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Creates an HMAC-SHA256 signed session token
 */
export async function createSessionToken(customSecret?: string): Promise<string> {
  const secret = customSecret || getSecret();
  const now = Date.now();
  const payload = JSON.stringify({
    role: 'admin',
    iat: now,
    exp: now + SESSION_MAX_AGE * 1000,
  });

  const payloadB64 = btoa(payload)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    stringToBufferSource(payloadB64)
  );
  const signatureHex = bufferToHex(signatureBuffer);

  return `${payloadB64}.${signatureHex}`;
}

/**
 * Verifies the validity and expiration of a session token
 */
export async function verifySessionToken(
  token: string | undefined | null,
  customSecret?: string
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signatureHex] = parts;
  const secret = customSecret || getSecret();

  try {
    const key = await getHmacKey(secret);
    const expectedBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      stringToBufferSource(payloadB64)
    );
    const expectedHex = bufferToHex(expectedBuffer);

    if (expectedHex !== signatureHex) return false;

    // Decode and verify expiration
    const rawPayload = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(rawPayload);

    if (!data.exp || Date.now() > data.exp) {
      return false; // Token expired
    }

    return true;
  } catch {
    return false;
  }
}
