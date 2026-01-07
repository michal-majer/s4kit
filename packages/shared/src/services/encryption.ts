import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getSecret } from './cf-env-parser.ts';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

/**
 * Convert encryption key to 32-byte buffer
 *
 * SECURITY: Only accepts properly formatted keys to ensure cryptographic security.
 * Supports:
 * - Hex-encoded (64 hex characters = 32 bytes) - RECOMMENDED
 * - Base64-encoded (44 base64 characters = 32 bytes) - ACCEPTABLE
 *
 * Rejects raw strings to prevent weak keys from padding/truncation.
 *
 * Key is loaded from (in order):
 * 1. ENCRYPTION_KEY environment variable
 * 2. VCAP_SERVICES user-provided service (Cloud Foundry)
 *
 * @throws Error if key format is invalid or key length is incorrect
 */
function getEncryptionKey(): Buffer {
  const keyString = getSecret('ENCRYPTION_KEY');

  if (!keyString) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate a secure key with: openssl rand -hex 32'
    );
  }

  // Try hex first (64 hex characters = 32 bytes) - RECOMMENDED
  if (/^[0-9a-fA-F]{64}$/.test(keyString)) {
    return Buffer.from(keyString, 'hex');
  }

  // Try base64 (44 base64 characters = 32 bytes)
  if (/^[A-Za-z0-9+/]{43}=$/.test(keyString) || /^[A-Za-z0-9+/]{44}$/.test(keyString)) {
    try {
      const decoded = Buffer.from(keyString, 'base64');
      if (decoded.length === 32) {
        if (process.env.NODE_ENV === 'production') {
          console.warn('ENCRYPTION_KEY: Using base64 format. For production, prefer hex-encoded keys.');
        }
        return decoded;
      }
    } catch {
      // Not valid base64, continue to error
    }
  }

  // Reject invalid formats - do NOT accept raw strings
  throw new Error(
    'ENCRYPTION_KEY must be either:\n' +
    '  - 64 hex characters (recommended): openssl rand -hex 32\n' +
    '  - 44 base64 characters: openssl rand -base64 32\n' +
    `Current key length: ${keyString.length} characters\n` +
    'Raw strings are not accepted for security reasons.'
  );
}

const SECRET_KEY = getEncryptionKey();

export const encryption = {
  encrypt: (text: string): string => {
    if (!text) {
      throw new Error('Cannot encrypt empty string');
    }
    try {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, SECRET_KEY, iv);
      const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return JSON.stringify({
        iv: iv.toString('hex'),
        ciphertext: encrypted.toString('hex'),
        tag: authTag.toString('hex')
      });
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  },

  decrypt: (encrypted: string): string => {
    if (!encrypted) {
      throw new Error('Cannot decrypt empty string');
    }
    try {
      const { iv, ciphertext, tag, nonce } = JSON.parse(encrypted);

      // Support legacy libsodium format (nonce instead of iv, no tag)
      if (nonce && !iv) {
        throw new Error('Legacy libsodium format detected. Re-encryption required.');
      }

      const decipher = createDecipheriv(ALGORITHM, SECRET_KEY, Buffer.from(iv, 'hex'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'hex')),
        decipher.final()
      ]);
      return decrypted.toString('utf8');
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  },

  /**
   * Encrypt a JSON object
   */
  encryptJson: (obj: Record<string, any>): string => {
    return encryption.encrypt(JSON.stringify(obj));
  },

  /**
   * Decrypt a JSON object
   */
  decryptJson: <T = Record<string, any>>(encrypted: string): T => {
    return JSON.parse(encryption.decrypt(encrypted));
  }
};
