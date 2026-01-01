/**
 * API Key Core - Shared utilities for API key management
 *
 * Key Format: s4k_{env}_{keyId}_{random}
 * Example: s4k_live_abc12345_xY7kM9pL2nQ8rT4wV6zA3bC5dE7fG9hJ
 *
 * Components:
 * - s4k: s4kit identifier (prevents key confusion with other services)
 * - env: environment prefix (always 'live' - instance environment determines actual env)
 * - keyId: first 8 chars of UUID (base62) - enables O(1) lookup
 * - random: 32 bytes of cryptographic random (base62 encoded)
 */

import { createHash } from 'crypto';

// Base62 alphabet (URL-safe, no ambiguous chars like 0/O, 1/l)
export const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export type KeyEnvironment = 'live' | 'test' | 'dev';

export interface ParsedApiKey {
  valid: boolean;
  env?: KeyEnvironment;
  keyId?: string;
  secret?: string;
  prefix?: string;
}

/**
 * Encode bytes to base62 string
 */
export function encodeBase62(buffer: Buffer): string {
  let result = '';
  let num = BigInt('0x' + buffer.toString('hex'));

  while (num > 0n) {
    const remainder = Number(num % 62n);
    result = BASE62_ALPHABET[remainder] + result;
    num = num / 62n;
  }

  return result || '0';
}

/**
 * Generate a short ID from UUID for embedding in key
 */
export function uuidToShortId(uuid: string): string {
  // Take first 8 chars of UUID (without hyphens) and encode
  const hex = uuid.replace(/-/g, '').substring(0, 8);
  const buffer = Buffer.from(hex, 'hex');
  return encodeBase62(buffer).padStart(6, '0').substring(0, 8);
}

/**
 * Parse an API key and extract its components
 */
export function parseApiKey(key: string): ParsedApiKey {
  // Format: s4k_{env}_{keyId}_{random}
  const match = key.match(/^s4k_(live|test|dev)_([a-zA-Z0-9]{6,8})_([a-zA-Z0-9]{32,})$/);

  if (!match) {
    return { valid: false };
  }

  return {
    valid: true,
    env: match[1] as KeyEnvironment,
    keyId: match[2],
    secret: match[3],
    prefix: `s4k_${match[1]}_${match[2]}`
  };
}

/**
 * Hash an API key using SHA-256
 * Used for storage and verification
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Get masked display format for a key
 * Used in API responses and UI to show key reference
 */
export function getMaskedKey(keyPrefix: string, keyLast4: string): string {
  return `${keyPrefix}...${keyLast4}`;
}
