// ============================================================================
// S4Kit Client - Stripe-Level Developer Experience
// ============================================================================

import { HttpClient, type HttpClientConfig } from './http-client';
import { createProxy, createEntityHandler } from './proxy';
import type {
  S4KitConfig,
  EntityHandler,
  BatchOperation,
  BatchResult,
  Changeset,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from './types';

// ============================================================================
// Client Interface for TypeScript
// ============================================================================

/**
 * S4Kit client methods (interceptors, batch operations)
 */
export interface S4KitMethods {
  onRequest(interceptor: RequestInterceptor): S4KitClient;
  onResponse(interceptor: ResponseInterceptor): S4KitClient;
  onError(interceptor: ErrorInterceptor): S4KitClient;
  batch<T = any>(operations: BatchOperation<T>[]): Promise<BatchResult<T>[]>;
  changeset<T = any>(changeset: Changeset): Promise<BatchResult<T>[]>;
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
  // Batch Operations
  // ==========================================================================

  /**
   * Execute multiple operations in a single batch request
   *
   * @example
   * ```ts
   * const results = await client.batch([
   *   { method: 'GET', entity: 'Products', id: 1 },
   *   { method: 'POST', entity: 'Products', data: { Name: 'New Product' } },
   *   { method: 'PATCH', entity: 'Products', id: 2, data: { Price: 29.99 } },
   *   { method: 'DELETE', entity: 'Products', id: 3 },
   * ]);
   *
   * // Check results
   * for (const result of results) {
   *   if (result.success) {
   *     console.log('Success:', result.data);
   *   } else {
   *     console.error('Failed:', result.error);
   *   }
   * }
   * ```
   */
  async batch<T = any>(operations: BatchOperation<T>[]): Promise<BatchResult<T>[]> {
    return this.httpClient.batch<T>(operations);
  }

  /**
   * Execute operations in an atomic changeset (all succeed or all fail)
   *
   * @example
   * ```ts
   * // All operations succeed or all fail together
   * const results = await client.changeset({
   *   operations: [
   *     { method: 'POST', entity: 'Orders', data: orderData },
   *     { method: 'POST', entity: 'OrderItems', data: item1Data },
   *     { method: 'POST', entity: 'OrderItems', data: item2Data },
   *   ]
   * });
   * ```
   */
  async changeset<T = any>(changeset: Changeset): Promise<BatchResult<T>[]> {
    return this.httpClient.changeset<T>(changeset);
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
  'batch',
  'changeset',
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
