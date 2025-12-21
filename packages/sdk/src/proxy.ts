// ============================================================================
// S4Kit Entity Proxy - Stripe-Level Developer Experience
// ============================================================================

import { HttpClient, type RequestOptions } from './http-client';
import { buildQuery, formatKey, buildFunctionParams } from './query-builder';
import type {
  EntityHandler,
  QueryOptions,
  EntityKey,
  ListResponse,
  DeepInsertData,
} from './types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract connection/service/raw options from QueryOptions for passing to HttpClient
 */
function extractRequestOptions(options?: QueryOptions<any>): RequestOptions | undefined {
  if (!options) return undefined;
  const { connection, service, raw } = options;
  if (!connection && !service && !raw) return undefined;
  return { connection, service, raw };
}

/**
 * Format entity key for URL path
 */
function formatId(id: EntityKey): string {
  return formatKey(id);
}

/**
 * Extract data array from OData response
 */
function extractData<T>(response: any): T[] {
  if (Array.isArray(response)) return response;
  if (response?.value && Array.isArray(response.value)) return response.value;
  if (response?.d?.results && Array.isArray(response.d.results)) return response.d.results; // OData v2
  return [];
}

/**
 * Extract single entity from OData response
 */
function extractSingle<T>(response: any): T {
  if (response?.d) return response.d; // OData v2
  return response;
}

/**
 * Extract count from OData response
 */
function extractCount(response: any): number | undefined {
  if (response?.['@odata.count'] !== undefined) return response['@odata.count'];
  if (response?.['odata.count'] !== undefined) return parseInt(response['odata.count'], 10);
  if (response?.__count !== undefined) return parseInt(response.__count, 10); // OData v2
  return undefined;
}

// ============================================================================
// Entity Handler Implementation
// ============================================================================

function createEntityHandler<T = any>(
  client: HttpClient,
  entityName: string
): EntityHandler<T> {
  const basePath = entityName;

  return {
    // ==========================================================================
    // READ Operations
    // ==========================================================================

    /**
     * List entities with optional query options
     */
    async list(options?: QueryOptions<T>): Promise<T[]> {
      const response = await client.get<any>(
        basePath,
        buildQuery(options),
        extractRequestOptions(options)
      );
      return extractData<T>(response);
    },

    /**
     * List entities with count
     */
    async listWithCount(options?: QueryOptions<T>): Promise<ListResponse<T>> {
      const queryOptions = { ...options, count: true };
      const response = await client.get<any>(
        basePath,
        buildQuery(queryOptions),
        extractRequestOptions(options)
      );
      return {
        value: extractData<T>(response),
        count: extractCount(response),
      };
    },

    /**
     * Get single entity by key
     */
    async get(id: EntityKey, options?: QueryOptions<T>): Promise<T> {
      const response = await client.get<any>(
        `${basePath}(${formatId(id)})`,
        buildQuery(options),
        extractRequestOptions(options)
      );
      return extractSingle<T>(response);
    },

    /**
     * Count matching entities
     */
    async count(options?: Omit<QueryOptions<T>, 'top' | 'skip' | 'select'>): Promise<number> {
      const response = await client.get<any>(
        `${basePath}/$count`,
        buildQuery(options as QueryOptions<T>),
        extractRequestOptions(options as QueryOptions<T>)
      );
      return typeof response === 'number' ? response : parseInt(String(response), 10);
    },

    // ==========================================================================
    // CREATE Operations
    // ==========================================================================

    /**
     * Create a new entity (POST)
     */
    async create(data: Partial<T> | T, options?: QueryOptions<T>): Promise<T> {
      const response = await client.post<any>(
        basePath,
        data,
        extractRequestOptions(options)
      );
      return extractSingle<T>(response);
    },

    /**
     * Create with related entities (deep insert)
     */
    async createDeep(data: DeepInsertData<T>, options?: QueryOptions<T>): Promise<T> {
      const response = await client.post<any>(
        basePath,
        data,
        extractRequestOptions(options)
      );
      return extractSingle<T>(response);
    },

    // ==========================================================================
    // UPDATE Operations
    // ==========================================================================

    /**
     * Partial update (PATCH) - only updates specified fields
     */
    async update(id: EntityKey, data: Partial<T>, options?: QueryOptions<T>): Promise<T> {
      const response = await client.patch<any>(
        `${basePath}(${formatId(id)})`,
        data,
        extractRequestOptions(options)
      );
      return extractSingle<T>(response);
    },

    /**
     * Full replacement (PUT) - replaces entire entity
     */
    async replace(id: EntityKey, data: T, options?: QueryOptions<T>): Promise<T> {
      const response = await client.put<any>(
        `${basePath}(${formatId(id)})`,
        data,
        extractRequestOptions(options)
      );
      return extractSingle<T>(response);
    },

    /**
     * Upsert - create or update based on key
     * Uses PUT to create or replace
     */
    async upsert(data: T, options?: QueryOptions<T>): Promise<T> {
      // Extract key from data - this is a simplified version
      // In practice, you'd need entity metadata to know the key fields
      const key = (data as any).ID ?? (data as any).id ?? (data as any).Id;
      if (!key) {
        throw new Error('Upsert requires an ID field in the data');
      }
      return this.replace(key, data, options);
    },

    // ==========================================================================
    // DELETE Operations
    // ==========================================================================

    /**
     * Delete entity by key
     */
    async delete(id: EntityKey, options?: QueryOptions<T>): Promise<void> {
      await client.delete(
        `${basePath}(${formatId(id)})`,
        extractRequestOptions(options)
      );
    },

    // ==========================================================================
    // Navigation Properties
    // ==========================================================================

    /**
     * Access navigation property (related entities)
     */
    nav<R = any>(id: EntityKey, property: string): EntityHandler<R> {
      const navPath = `${basePath}(${formatId(id)})/${property}`;
      return createEntityHandler<R>(client, navPath);
    },

    // ==========================================================================
    // OData Functions & Actions
    // ==========================================================================

    /**
     * Call an OData function (GET operation)
     * Unbound function on the entity set
     */
    async func<R = any>(name: string, params?: Record<string, any>): Promise<R> {
      const paramStr = buildFunctionParams(params);
      const path = paramStr ? `${basePath}/${name}(${paramStr})` : `${basePath}/${name}()`;
      return client.get<R>(path);
    },

    /**
     * Call an OData action (POST operation)
     * Unbound action on the entity set
     */
    async action<R = any>(name: string, params?: Record<string, any>): Promise<R> {
      return client.post<R>(`${basePath}/${name}`, params ?? {});
    },

    /**
     * Call bound function on specific entity
     */
    async boundFunc<R = any>(
      id: EntityKey,
      name: string,
      params?: Record<string, any>
    ): Promise<R> {
      const paramStr = buildFunctionParams(params);
      const path = paramStr
        ? `${basePath}(${formatId(id)})/${name}(${paramStr})`
        : `${basePath}(${formatId(id)})/${name}()`;
      return client.get<R>(path);
    },

    /**
     * Call bound action on specific entity
     */
    async boundAction<R = any>(
      id: EntityKey,
      name: string,
      params?: Record<string, any>
    ): Promise<R> {
      return client.post<R>(`${basePath}(${formatId(id)})/${name}`, params ?? {});
    },
  };
}

// ============================================================================
// Main Proxy Factory
// ============================================================================

/**
 * Create a dynamic proxy that generates entity handlers on the fly
 */
export function createProxy(client: HttpClient): Record<string, EntityHandler<any>> {
  return new Proxy({} as Record<string, EntityHandler<any>>, {
    get: (_target, entityName: string) => {
      // Special handling for symbols and internal properties
      if (typeof entityName === 'symbol' || entityName.startsWith('_')) {
        return undefined;
      }

      return createEntityHandler(client, entityName);
    },
  });
}
