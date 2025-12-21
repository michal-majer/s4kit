// ============================================================================
// S4Kit Client - Stripe-Level Developer Experience
// ============================================================================

import { HttpClient, type HttpClientConfig } from './http-client';
import { createProxy } from './proxy';
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
// Main Client Class
// ============================================================================

/**
 * S4Kit - The simplest way to integrate with SAP S/4HANA
 *
 * @example
 * ```ts
 * import { S4Kit } from '@s4kit/sdk';
 *
 * const client = new S4Kit({
 *   apiKey: 'sk_live_xxx',
 *   connection: 'my-sap-system',
 * });
 *
 * // List business partners
 * const partners = await client.sap.A_BusinessPartner.list({
 *   top: 10,
 *   select: ['BusinessPartner', 'BusinessPartnerFullName'],
 * });
 *
 * // Get single partner
 * const partner = await client.sap.A_BusinessPartner.get('BP001');
 *
 * // Create partner
 * const created = await client.sap.A_BusinessPartner.create({
 *   BusinessPartnerFullName: 'Acme Corp',
 * });
 *
 * // Update partner
 * const updated = await client.sap.A_BusinessPartner.update('BP001', {
 *   BusinessPartnerFullName: 'Acme Corporation',
 * });
 *
 * // Delete partner
 * await client.sap.A_BusinessPartner.delete('BP001');
 * ```
 */
export class S4Kit {
  private httpClient: HttpClient;

  /**
   * Dynamic proxy for accessing SAP entities
   * Use `client.sap.EntityName` to access any entity
   */
  public readonly sap: Record<string, EntityHandler<any>>;

  constructor(config: S4KitConfig | HttpClientConfig) {
    this.httpClient = new HttpClient(config as HttpClientConfig);
    this.sap = createProxy(this.httpClient);
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
// Factory Function
// ============================================================================

/**
 * Create an S4Kit client instance
 *
 * @example
 * ```ts
 * import { createClient } from '@s4kit/sdk';
 *
 * const client = createClient({
 *   apiKey: 'sk_live_xxx',
 *   connection: 'my-sap-system',
 * });
 * ```
 */
export function createClient(config: S4KitConfig): S4Kit {
  return new S4Kit(config);
}
