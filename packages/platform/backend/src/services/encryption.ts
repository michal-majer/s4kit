import libs from 'libsodium-wrappers';

// Initialize libsodium
await libs.ready;

const SECRET_KEY = process.env.ENCRYPTION_KEY || '00000000000000000000000000000000'; // 32-byte key

export const encryption = {
  encrypt: (text: string): string => {
    const nonce = libs.randombytes_buf(libs.crypto_secretbox_NONCEBYTES);
    const ciphertext = libs.crypto_secretbox_easy(text, nonce, libs.from_hex(SECRET_KEY));
    return JSON.stringify({
      nonce: libs.to_hex(nonce),
      ciphertext: libs.to_hex(ciphertext)
    });
  },

  decrypt: (encrypted: string): string => {
    const { nonce, ciphertext } = JSON.parse(encrypted);
    const decrypted = libs.crypto_secretbox_open_easy(
      libs.from_hex(ciphertext),
      libs.from_hex(nonce),
      libs.from_hex(SECRET_KEY)
    );
    return libs.to_string(decrypted);
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

