import { db } from '../db';
import { apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Stripe-like API Key Service
 * 
 * Key Format: s4k_{env}_{keyId}_{random}
 * Example: s4k_live_abc12345_xY7kM9pL2nQ8rT4wV6zA3bC5dE7fG9hJ
 * 
 * Components:
 * - s4k: s4kit identifier (prevents key confusion with other services)
 * - env: environment prefix (always 'live' - instance environment determines actual env)
 * - keyId: first 8 chars of UUID (base62) - enables O(1) lookup
 * - random: 32 bytes of cryptographic random (base62 encoded)
 * 
 * Security:
 * - Full key shown only once at creation
 * - Only SHA-256 hash stored in database
 * - Timing-safe comparison to prevent timing attacks
 */

// Base62 alphabet (URL-safe, no ambiguous chars like 0/O, 1/l)
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

type KeyEnvironment = 'live' | 'test' | 'dev';

/**
 * Encode bytes to base62 string
 */
function encodeBase62(buffer: Buffer): string {
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
function uuidToShortId(uuid: string): string {
  // Take first 8 chars of UUID (without hyphens) and encode
  const hex = uuid.replace(/-/g, '').substring(0, 8);
  const buffer = Buffer.from(hex, 'hex');
  return encodeBase62(buffer).padStart(6, '0').substring(0, 8);
}

/**
 * Parse an API key and extract its components
 */
function parseApiKey(key: string): { 
  valid: boolean; 
  env?: KeyEnvironment; 
  keyId?: string; 
  secret?: string;
  prefix?: string;
} {
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

export interface GeneratedApiKey {
  /** Full key - ONLY shown once at creation */
  key: string;
  /** Visible prefix for display: "s4k_live_abc12345" */
  keyPrefix: string;
  /** Last 4 characters for identification */
  keyLast4: string;
  /** SHA-256 hash to store in database */
  keyHash: string;
  /** Display format for UI: "s4k_live_abc12345...xY7k" */
  displayKey: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: typeof apiKeys.$inferSelect;
  error?: string;
}

export const apiKeyService = {
  /**
   * Generate a new Stripe-like API key
   * 
   * @param apiKeyId - The UUID of the API key record (must be created first)
   * @param envPrefix - The environment prefix (live/test/dev) - defaults to 'live'
   * @returns Generated key components for storage and display
   */
  generateKey: (apiKeyId: string, envPrefix: KeyEnvironment = 'live'): GeneratedApiKey => {
    // Generate 32 bytes of cryptographic random data
    const randomBuffer = randomBytes(32);
    const randomPart = encodeBase62(randomBuffer);
    
    // Create short ID from the API key UUID
    const keyId = uuidToShortId(apiKeyId);
    
    // Construct the full key
    const fullKey = `s4k_${envPrefix}_${keyId}_${randomPart}`;
    const keyPrefix = `s4k_${envPrefix}_${keyId}`;
    const keyLast4 = randomPart.slice(-4);
    
    // Hash the full key for storage
    const keyHash = createHash('sha256').update(fullKey).digest('hex');
    
    return {
      key: fullKey,
      keyPrefix,
      keyLast4,
      keyHash,
      displayKey: `${keyPrefix}...${keyLast4}`
    };
  },

  /**
   * Hash an API key using SHA-256
   * Used for verification against stored hash
   */
  hashKey: (key: string): string => {
    return createHash('sha256').update(key).digest('hex');
  },

  /**
   * Validate an API key and return associated data
   * 
   * Uses O(1) lookup by parsing the key ID from the key itself,
   * then verifies with timing-safe hash comparison
   */
  validateKey: async (key: string, clientIp?: string): Promise<ApiKeyValidationResult> => {
    // Parse the key to extract components
    const parsed = parseApiKey(key);
    
    if (!parsed.valid || !parsed.prefix) {
      return { valid: false, error: 'Invalid key format' };
    }
    
    // Look up by prefix (O(1) lookup using index)
    // The prefix contains the keyId which maps to a specific API key
    const result = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.keyPrefix, parsed.prefix),
    });

    if (!result) {
      return { valid: false, error: 'Key not found' };
    }
    
    // Timing-safe comparison of hashes to prevent timing attacks
    const providedHash = apiKeyService.hashKey(key);
    const storedHashBuffer = Buffer.from(result.keyHash, 'hex');
    const providedHashBuffer = Buffer.from(providedHash, 'hex');
    
    if (!timingSafeEqual(storedHashBuffer, providedHashBuffer)) {
      return { valid: false, error: 'Invalid key' };
    }
    
    // Check if key is revoked
    if (result.revoked) {
      return { valid: false, error: 'Key has been revoked' };
    }
    
    // Check if key has expired
    if (result.expiresAt && result.expiresAt < new Date()) {
      return { valid: false, error: 'Key has expired' };
    }
    
    // Update last used timestamp and IP (fire and forget)
    db.update(apiKeys)
      .set({ 
        lastUsedAt: new Date(),
        lastUsedIp: clientIp,
        usageCount: result.usageCount + 1
      })
      .where(eq(apiKeys.id, result.id))
      .execute()
      .catch(err => console.error('Failed to update key usage:', err));

    return { 
      valid: true, 
      apiKey: result
    };
  },

  /**
   * Check if an API key has permission for a specific entity/method
   */
  checkScopes: (permissions: Record<string, string[]> | unknown, entity: string, method: string): boolean => {
    if (!permissions || typeof permissions !== 'object') return false;
    
    const perms = permissions as Record<string, string[]>;
    
    // Check specific entity permissions
    const entityPermissions = perms[entity];
    if (entityPermissions && (entityPermissions.includes(method) || entityPermissions.includes('*'))) {
      return true;
    }
    
    // Check wildcard entity permissions
    const wildcardPermissions = perms['*'];
    if (wildcardPermissions && (wildcardPermissions.includes(method) || wildcardPermissions.includes('*'))) {
      return true;
    }

    return false;
  },

  /**
   * Revoke an API key
   */
  revokeKey: async (keyId: string, reason?: string): Promise<boolean> => {
    const result = await db.update(apiKeys)
      .set({ 
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason
      })
      .where(eq(apiKeys.id, keyId))
      .returning();
    
    return result.length > 0;
  },

  /**
   * Get masked display format for a key
   * Used in API responses and UI to show key reference
   */
  getMaskedKey: (keyPrefix: string, keyLast4: string): string => {
    return `${keyPrefix}...${keyLast4}`;
  },

  /**
   * Rotate an API key - creates a new key with the same settings and revokes the old one
   *
   * @param oldKeyId - The UUID of the existing API key to rotate
   * @param options - Optional settings for the rotation
   * @returns The new key details and info about the revoked key
   */
  rotateKey: async (
    oldKeyId: string,
    options: {
      revokeReason?: string;
      newName?: string;
    } = {}
  ): Promise<{
    newKey: GeneratedApiKey & {
      id: string;
      name: string;
      description: string | null;
      organizationId: string;
      rateLimitPerMinute: number;
      rateLimitPerDay: number;
      expiresAt: Date | null;
      createdAt: Date;
    };
    revokedKeyId: string;
    revokedKeyDisplayKey: string;
  }> => {
    // Fetch the old key
    const oldKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, oldKeyId)
    });

    if (!oldKey) {
      throw new Error('API key not found');
    }

    if (oldKey.revoked) {
      throw new Error('Cannot rotate a revoked key');
    }

    // Generate new key
    const { randomUUID } = await import('crypto');
    const newKeyId = randomUUID();
    const generatedKey = apiKeyService.generateKey(newKeyId, 'live');

    // Determine new name
    const newName = options.newName || `${oldKey.name} (Rotated)`;

    // Create the new key record with same settings
    const [newKeyRecord] = await db.insert(apiKeys).values({
      id: newKeyId,
      name: newName,
      description: oldKey.description,
      organizationId: oldKey.organizationId,
      rateLimitPerMinute: oldKey.rateLimitPerMinute,
      rateLimitPerDay: oldKey.rateLimitPerDay,
      expiresAt: oldKey.expiresAt,
      keyHash: generatedKey.keyHash,
      keyPrefix: generatedKey.keyPrefix,
      keyLast4: generatedKey.keyLast4,
      createdBy: oldKey.createdBy,
    }).returning();

    if (!newKeyRecord) {
      throw new Error('Failed to create new API key');
    }

    // Copy all access grants from old key to new key
    const { apiKeyAccess } = await import('../db/schema');
    const oldGrants = await db.query.apiKeyAccess.findMany({
      where: eq(apiKeyAccess.apiKeyId, oldKeyId)
    });

    if (oldGrants.length > 0) {
      await db.insert(apiKeyAccess).values(
        oldGrants.map(grant => ({
          apiKeyId: newKeyId,
          instanceServiceId: grant.instanceServiceId,
          permissions: grant.permissions
        }))
      );
    }

    // Revoke the old key
    const revokeReason = options.revokeReason || `Rotated to key ${generatedKey.keyPrefix}`;
    await apiKeyService.revokeKey(oldKeyId, revokeReason);

    return {
      newKey: {
        ...generatedKey,
        id: newKeyRecord.id,
        name: newKeyRecord.name,
        description: newKeyRecord.description,
        organizationId: newKeyRecord.organizationId,
        rateLimitPerMinute: newKeyRecord.rateLimitPerMinute,
        rateLimitPerDay: newKeyRecord.rateLimitPerDay,
        expiresAt: newKeyRecord.expiresAt,
        createdAt: newKeyRecord.createdAt,
      },
      revokedKeyId: oldKeyId,
      revokedKeyDisplayKey: apiKeyService.getMaskedKey(oldKey.keyPrefix, oldKey.keyLast4)
    };
  }
};
