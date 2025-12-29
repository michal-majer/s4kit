/**
 * Unit tests for API Key Service
 *
 * Tests the Stripe-like key generation, hashing, and permission checking.
 */

import { describe, test, expect } from 'bun:test';
import { apiKeyService } from '../../../src/services/api-key';

describe('apiKeyService', () => {
  describe('generateKey', () => {
    test('generates key with correct format', () => {
      const keyId = crypto.randomUUID();
      const result = apiKeyService.generateKey(keyId, 'live');

      // Full key format: s4k_live_{shortId}_{random}
      expect(result.key).toMatch(/^s4k_live_[a-zA-Z0-9]{6,8}_[a-zA-Z0-9]{32,}$/);
    });

    test('generates correct prefix', () => {
      const keyId = crypto.randomUUID();
      const result = apiKeyService.generateKey(keyId, 'live');

      // Prefix: s4k_live_{shortId}
      expect(result.keyPrefix).toMatch(/^s4k_live_[a-zA-Z0-9]{6,8}$/);
      expect(result.key.startsWith(result.keyPrefix)).toBe(true);
    });

    test('generates correct last 4 characters', () => {
      const keyId = crypto.randomUUID();
      const result = apiKeyService.generateKey(keyId, 'live');

      expect(result.keyLast4).toHaveLength(4);
      expect(result.key.endsWith(result.keyLast4)).toBe(true);
    });

    test('generates SHA-256 hash', () => {
      const keyId = crypto.randomUUID();
      const result = apiKeyService.generateKey(keyId, 'live');

      // SHA-256 produces 64 hex characters
      expect(result.keyHash).toHaveLength(64);
      expect(result.keyHash).toMatch(/^[0-9a-f]{64}$/);
    });

    test('generates correct display key', () => {
      const keyId = crypto.randomUUID();
      const result = apiKeyService.generateKey(keyId, 'live');

      // Display format: {prefix}...{last4}
      expect(result.displayKey).toBe(`${result.keyPrefix}...${result.keyLast4}`);
    });

    test('generates different keys for same UUID', () => {
      const keyId = crypto.randomUUID();
      const key1 = apiKeyService.generateKey(keyId, 'live');
      const key2 = apiKeyService.generateKey(keyId, 'live');

      // Different random parts mean different keys
      expect(key1.key).not.toBe(key2.key);
      expect(key1.keyHash).not.toBe(key2.keyHash);

      // But same prefix (derived from UUID)
      expect(key1.keyPrefix).toBe(key2.keyPrefix);
    });

    test('generates different keys for different UUIDs', () => {
      const key1 = apiKeyService.generateKey(crypto.randomUUID(), 'live');
      const key2 = apiKeyService.generateKey(crypto.randomUUID(), 'live');

      expect(key1.key).not.toBe(key2.key);
      expect(key1.keyPrefix).not.toBe(key2.keyPrefix);
    });

    test('supports different environments', () => {
      const keyId = crypto.randomUUID();
      const liveKey = apiKeyService.generateKey(keyId, 'live');
      const testKey = apiKeyService.generateKey(keyId, 'test');
      const devKey = apiKeyService.generateKey(keyId, 'dev');

      expect(liveKey.key).toMatch(/^s4k_live_/);
      expect(testKey.key).toMatch(/^s4k_test_/);
      expect(devKey.key).toMatch(/^s4k_dev_/);
    });
  });

  describe('hashKey', () => {
    test('produces consistent hash for same key', () => {
      const key = 's4k_live_abc12345_xY7kM9pL2nQ8rT4wV6zA3bC5dE7fG9hJ';
      const hash1 = apiKeyService.hashKey(key);
      const hash2 = apiKeyService.hashKey(key);

      expect(hash1).toBe(hash2);
    });

    test('produces different hashes for different keys', () => {
      const key1 = 's4k_live_abc12345_xY7kM9pL2nQ8rT4wV6zA3bC5dE7fG9hJ';
      const key2 = 's4k_live_abc12345_aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV';

      const hash1 = apiKeyService.hashKey(key1);
      const hash2 = apiKeyService.hashKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    test('produces 64-character hex hash', () => {
      const key = 's4k_live_abc12345_anyRandomContent12345678901234567890';
      const hash = apiKeyService.hashKey(key);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    test('hash matches generated key hash', () => {
      const keyId = crypto.randomUUID();
      const generated = apiKeyService.generateKey(keyId, 'live');

      const recomputed = apiKeyService.hashKey(generated.key);
      expect(recomputed).toBe(generated.keyHash);
    });
  });

  describe('checkScopes', () => {
    describe('specific entity permissions', () => {
      const permissions = {
        'A_BusinessPartner': ['read', 'create'],
        'A_SalesOrder': ['read', 'create', 'update', 'delete'],
      };

      test('allows granted permission on specific entity', () => {
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'read')).toBe(true);
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'create')).toBe(true);
      });

      test('denies non-granted permission on specific entity', () => {
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'update')).toBe(false);
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'delete')).toBe(false);
      });

      test('denies permission on unlisted entity', () => {
        expect(apiKeyService.checkScopes(permissions, 'A_Product', 'read')).toBe(false);
      });
    });

    describe('wildcard entity permissions', () => {
      const permissions = {
        'A_BusinessPartner': ['read', 'create'],
        '*': ['read'],
      };

      test('allows wildcard permission on any entity', () => {
        expect(apiKeyService.checkScopes(permissions, 'A_Product', 'read')).toBe(true);
        expect(apiKeyService.checkScopes(permissions, 'A_Anything', 'read')).toBe(true);
      });

      test('denies non-wildcard permission on unlisted entity', () => {
        expect(apiKeyService.checkScopes(permissions, 'A_Product', 'create')).toBe(false);
        expect(apiKeyService.checkScopes(permissions, 'A_Product', 'delete')).toBe(false);
      });

      test('specific entity overrides wildcard', () => {
        // A_BusinessPartner has specific create permission
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'create')).toBe(true);
      });
    });

    describe('wildcard method permissions', () => {
      const permissions = {
        'A_BusinessPartner': ['*'],
      };

      test('allows any method with wildcard method permission', () => {
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'read')).toBe(true);
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'create')).toBe(true);
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'update')).toBe(true);
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'delete')).toBe(true);
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'anyMethod')).toBe(true);
      });

      test('denies methods on other entities', () => {
        expect(apiKeyService.checkScopes(permissions, 'A_SalesOrder', 'read')).toBe(false);
      });
    });

    describe('full wildcard permissions', () => {
      const permissions = {
        '*': ['*'],
      };

      test('allows any method on any entity', () => {
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'read')).toBe(true);
        expect(apiKeyService.checkScopes(permissions, 'A_SalesOrder', 'delete')).toBe(true);
        expect(apiKeyService.checkScopes(permissions, 'AnyEntity', 'anyMethod')).toBe(true);
      });
    });

    describe('edge cases', () => {
      test('handles null permissions', () => {
        expect(apiKeyService.checkScopes(null, 'Entity', 'read')).toBe(false);
      });

      test('handles undefined permissions', () => {
        expect(apiKeyService.checkScopes(undefined, 'Entity', 'read')).toBe(false);
      });

      test('handles empty permissions object', () => {
        expect(apiKeyService.checkScopes({}, 'Entity', 'read')).toBe(false);
      });

      test('handles non-object permissions', () => {
        expect(apiKeyService.checkScopes('invalid' as any, 'Entity', 'read')).toBe(false);
        expect(apiKeyService.checkScopes(123 as any, 'Entity', 'read')).toBe(false);
        expect(apiKeyService.checkScopes([] as any, 'Entity', 'read')).toBe(false);
      });

      test('handles empty method array', () => {
        const permissions = {
          'A_BusinessPartner': [],
        };
        expect(apiKeyService.checkScopes(permissions, 'A_BusinessPartner', 'read')).toBe(false);
      });
    });
  });

  describe('getMaskedKey', () => {
    test('formats masked key correctly', () => {
      const masked = apiKeyService.getMaskedKey('s4k_live_abc12345', 'xY7k');
      expect(masked).toBe('s4k_live_abc12345...xY7k');
    });

    test('handles different prefix lengths', () => {
      const masked1 = apiKeyService.getMaskedKey('s4k_test_short', 'ABCD');
      const masked2 = apiKeyService.getMaskedKey('s4k_dev_verylongprefix', '1234');

      expect(masked1).toBe('s4k_test_short...ABCD');
      expect(masked2).toBe('s4k_dev_verylongprefix...1234');
    });
  });
});
