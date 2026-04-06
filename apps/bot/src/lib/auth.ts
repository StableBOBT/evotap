/**
 * Bot authentication for API calls
 *
 * Signs requests with bot token using HMAC-SHA256 (Web Crypto API)
 * Compatible with Cloudflare Workers edge runtime
 */

/**
 * Auth payload for API requests
 */
export interface BotAuthPayload {
  authorization: string;
  signature: string;
  timestamp: string;
}

/**
 * Create HMAC-SHA256 signature using Web Crypto API
 */
async function createHmacSignature(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create authentication headers for bot API requests
 *
 * Uses HMAC-SHA256 with Web Crypto API for secure request signing.
 * The API verifies the signature using the shared bot token.
 *
 * @param botToken - Telegram bot token
 * @param telegramId - Optional telegram user ID
 * @param telegramUser - Optional telegram user data
 * @returns Auth headers for API request
 */
export async function createBotAuth(
  botToken: string,
  telegramId?: number,
  telegramUser?: {
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
    languageCode?: string;
    isPremium?: boolean;
  }
): Promise<BotAuthPayload> {
  const timestamp = String(Math.floor(Date.now() / 1000));

  // Create data string to sign
  const dataToSign = [
    `timestamp=${timestamp}`,
    telegramId ? `user_id=${telegramId}` : '',
    telegramUser ? `user_data=${JSON.stringify(telegramUser)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Create HMAC-SHA256 signature using Web Crypto API
  const signature = await createHmacSignature(botToken, dataToSign);

  return {
    authorization: `Bot ${botToken.split(':')[0]}`, // Only send bot ID, not full token
    signature,
    timestamp,
  };
}

/**
 * Verify bot signature on the API side
 * Used in API middleware to validate incoming bot requests
 */
export async function verifyBotSignature(
  botToken: string,
  signature: string,
  timestamp: string,
  telegramId?: number,
  telegramUser?: unknown
): Promise<boolean> {
  // Check timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime) || Math.abs(now - requestTime) > 300) {
    return false;
  }

  // Recreate the data string
  const dataToSign = [
    `timestamp=${timestamp}`,
    telegramId ? `user_id=${telegramId}` : '',
    telegramUser ? `user_data=${JSON.stringify(telegramUser)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Create HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(botToken);
  const messageData = encoder.encode(dataToSign);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const expectedSignature = Array.from(new Uint8Array(expectedBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}
