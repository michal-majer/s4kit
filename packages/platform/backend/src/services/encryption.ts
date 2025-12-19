import libs from 'libsodium-wrappers';

// Initialize libsodium
await libs.ready;

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
 * @throws Error if key format is invalid or key length is incorrect
 */
function getEncryptionKey(): Uint8Array {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate a secure key with: openssl rand -hex 32'
    );
  }
  
  // Try hex first (64 hex characters = 32 bytes) - RECOMMENDED
  if (/^[0-9a-fA-F]{64}$/.test(keyString)) {
    return libs.from_hex(keyString);
  }
  
  // Try base64 (44 base64 characters = 32 bytes)
  // Base64 encoding of 32 bytes: 32 * 4/3 = 42.67, rounded up = 44 chars (with padding)
  if (/^[A-Za-z0-9+/]{43}=$/.test(keyString) || /^[A-Za-z0-9+/]{44}$/.test(keyString)) {
    try {
      const decoded = Buffer.from(keyString, 'base64');
      if (decoded.length === 32) {
        if (process.env.NODE_ENV === 'production') {
          console.warn('ENCRYPTION_KEY: Using base64 format. For production, prefer hex-encoded keys.');
        }
        return new Uint8Array(decoded);
      }
    } catch (e) {
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
      const nonce = libs.randombytes_buf(libs.crypto_secretbox_NONCEBYTES);
      const ciphertext = libs.crypto_secretbox_easy(text, nonce, SECRET_KEY);
      return JSON.stringify({
        nonce: libs.to_hex(nonce),
        ciphertext: libs.to_hex(ciphertext)
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
      const { nonce, ciphertext } = JSON.parse(encrypted);
      const decrypted = libs.crypto_secretbox_open_easy(
        libs.from_hex(ciphertext),
        libs.from_hex(nonce),
        SECRET_KEY
      );
      return libs.to_string(decrypted);
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


