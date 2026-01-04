// ============================================================================
// S4Kit Client - Stripe-Level Developer Experience
// ============================================================================

import { HttpClient, type HttpClientConfig } from './http-client';
import { createProxy, createEntityHandler } from './proxy';
import type {
  S4KitConfig,
  EntityHandler,
  EntityKey,
  BatchOperation,
  BatchResult,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from './types';

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Deferred operation - collected during transaction callback
 */
export interface DeferredOperation<T = unknown> {
  __deferred: true;
  operation: BatchOperation;
  _resultType?: T;
}

/**
 * Transaction entity handler - collects operations instead of executing them
 */
export interface TransactionEntityHandler<T = unknown> {
  create(data: Partial<T>): DeferredOperation<T>;
  update(id: EntityKey, data: Partial<T>): DeferredOperation<T>;
  delete(id: EntityKey): DeferredOperation<void>;
}

/**
 * Transaction context passed to transaction callback
 */
export type TransactionContext = {
  [entityName: string]: TransactionEntityHandler<any>;
};

// ============================================================================
// Client Interface for TypeScript
// ============================================================================

/**
 * S4Kit client methods (interceptors, transactions)
 */
export interface S4KitMethods {
  onRequest(interceptor: RequestInterceptor): S4KitClient;
  onResponse(interceptor: ResponseInterceptor): S4KitClient;
  onError(interceptor: ErrorInterceptor): S4KitClient;
  transaction<T extends DeferredOperation<any>[]>(
    fn: (tx: TransactionContext) => T
  ): Promise<{ [K in keyof T]: T[K] extends DeferredOperation<infer R> ? R : unknown }>;
}

/**
 * Augmentable interface for typed entity access.
 * Generated type files augment this interface to provide type-safe entity properties.
 *
 * @example
 * ```ts
 * // In generated types file:
 * declare module 's4kit' {
 *   interface S4KitClient {
 *     Customers: EntityHandler<Customer>;
 *   }
 * }
 * // Now client.Customers.list() returns Customer[]
 * ```
 */
export interface S4KitClient extends S4KitMethods {
  // This interface is augmented by generated type files.
  // Properties are added via module augmentation.
}

/**
 * S4Kit client type with dynamic entity access.
 * Combines the augmentable interface with an index signature for runtime flexibility.
 *
 * @example client.Products.list() or client.A_BusinessPartner.get('123')
 */
export type S4KitClientWithDynamicAccess = S4KitClient & {
  /** Access any entity by name (fallback for non-augmented entities) */
  [entityName: string]: EntityHandler<any>;
};

// ============================================================================
// Main Client Class
// ============================================================================

/**
 * S4Kit - The simplest way to integrate with SAP S/4HANA
 *
 * @example
 * ```ts
 * import { S4Kit } from 's4kit';
 *
 * const client = new S4Kit({
 *   apiKey: 'sk_live_xxx',
 * });
 *
 * // List entities - clean, simple API
 * const partners = await client.A_BusinessPartner.list({
 *   top: 10,
 *   select: ['BusinessPartner', 'BusinessPartnerFullName'],
 * });
 *
 * // Get single entity
 * const partner = await client.A_BusinessPartner.get('BP001');
 *
 * // Create entity
 * const created = await client.A_BusinessPartner.create({
 *   BusinessPartnerFullName: 'Acme Corp',
 * });
 *
 * // Update entity
 * const updated = await client.A_BusinessPartner.update('BP001', {
 *   BusinessPartnerFullName: 'Acme Corporation',
 * });
 *
 * // Delete entity
 * await client.A_BusinessPartner.delete('BP001');
 * ```
 */
class S4KitBase {
  protected httpClient: HttpClient;

  constructor(config: S4KitConfig | HttpClientConfig) {
    this.httpClient = new HttpClient(config as HttpClientConfig);
  }

  // ==========================================================================
  // Interceptors
  // ==========================================================================

  /**
   * Add a request interceptor
   * @example
   * ```ts
   * client.onRequest((req) => {
   *   console.log(`${req.method} ${req.url}`);
   *   return req;
   * });
   * ```
   */
  onRequest(interceptor: RequestInterceptor): this {
    this.httpClient.onRequest(interceptor);
    return this;
  }

  /**
   * Add a response interceptor
   * @example
   * ```ts
   * client.onResponse((res) => {
   *   console.log(`Response: ${res.status}`);
   *   return res;
   * });
   * ```
   */
  onResponse(interceptor: ResponseInterceptor): this {
    this.httpClient.onResponse(interceptor);
    return this;
  }

  /**
   * Add an error interceptor
   * @example
   * ```ts
   * client.onError((err) => {
   *   console.error(`Error: ${err.message}`);
   *   return err;
   * });
   * ```
   */
  onError(interceptor: ErrorInterceptor): this {
    this.httpClient.onError(interceptor);
    return this;
  }

  // ==========================================================================
  // Transactions
  // ==========================================================================

  /**
   * Execute operations atomically (all succeed or all fail)
   *
   * @example
   * ```ts
   * // All operations succeed or all fail together
   * const [book1, book2] = await client.transaction(tx => [
   *   tx.Books.create({ title: 'Book 1', price: 9.99 }),
   *   tx.Books.create({ title: 'Book 2', price: 10.99 }),
   *   tx.Authors.update(1, { bookCount: 5 }),
   * ]);
   * ```
   */
  async transaction<T extends DeferredOperation<any>[]>(
    fn: (tx: TransactionContext) => T
  ): Promise<{ [K in keyof T]: T[K] extends DeferredOperation<infer R> ? R : unknown }> {
    // Create transaction context that collects operations
    const txContext: TransactionContext = new Proxy({} as TransactionContext, {
      get: (_target, entityName: string) => {
        return {
          create: (data: Record<string, unknown>): DeferredOperation => ({
            __deferred: true,
            operation: { method: 'POST', entity: entityName, data },
          }),
          update: (id: EntityKey, data: Record<string, unknown>): DeferredOperation => ({
            __deferred: true,
            operation: { method: 'PATCH', entity: entityName, id, data },
          }),
          delete: (id: EntityKey): DeferredOperation<void> => ({
            __deferred: true,
            operation: { method: 'DELETE', entity: entityName, id },
          }),
        };
      },
    });

    // Collect operations from callback
    const deferredOps = fn(txContext);

    // Extract operations
    const operations = deferredOps.map(d => d.operation);

    // Execute atomically
    const results = await this.httpClient.batchRequest(operations, { atomic: true });

    // Check for failures
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      const errors = failed.map((f, i) => `Operation ${i + 1}: ${f.error?.message || 'Unknown error'}`);
      throw new Error(`Transaction failed: ${errors.join('; ')}`);
    }

    // Return results mapped to operations
    return results.map(r => r.data) as any;
  }
}

// ============================================================================
// Proxied S4Kit Class
// ============================================================================

// Methods that should NOT be proxied to entity handlers
const RESERVED_METHODS = new Set([
  'onRequest',
  'onResponse',
  'onError',
  'transaction',
  'constructor',
  'httpClient',
  // Internal properties
  'then',
  'catch',
  'finally',
]);

/**
 * Create S4Kit client with dynamic entity access
 * Allows: client.Products.list() instead of client.sap.Products.list()
 *
 * Returns S4KitClientWithDynamicAccess which:
 * - Without generated types: allows any entity access (returns EntityHandler<any>)
 * - With generated types: provides full type inference for known entities
 */
export function S4Kit(config: S4KitConfig | HttpClientConfig): S4KitClientWithDynamicAccess {
  const base = new S4KitBase(config);

  return new Proxy(base, {
    get(target, prop: string | symbol) {
      // Handle symbols (like Symbol.toStringTag)
      if (typeof prop === 'symbol') {
        return (target as any)[prop];
      }

      // Return base class methods/properties
      if (RESERVED_METHODS.has(prop) || prop in target) {
        const value = (target as any)[prop];
        // Bind methods to preserve 'this' context
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }

      // Everything else is an entity name - create handler dynamically
      return createEntityHandler(target['httpClient'], prop);
    },
  }) as unknown as S4KitClientWithDynamicAccess;
}

// Make S4Kit look like a class for instanceof checks and typing
S4Kit.prototype = S4KitBase.prototype;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an S4Kit client instance
 *
 * @example
 * ```ts
 * import { createClient } from 's4kit';
 *
 * const client = createClient({
 *   apiKey: 'sk_live_xxx',
 * });
 *
 * const products = await client.Products.list({ top: 10 });
 * ```
 */
export function createClient(config: S4KitConfig): S4KitClientWithDynamicAccess {
  return S4Kit(config);
}
