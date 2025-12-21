// ============================================================================
// S4Kit Typed Helpers - Stripe-Level Type Safety
// ============================================================================

import type {
  EntityHandler,
  QueryOptions,
  ListResponse,
  EntityKey,
  DeepInsertData,
} from './types';

// ============================================================================
// Individual Typed Helper Functions
// ============================================================================

/**
 * Type-safe list helper with automatic type inference
 *
 * @example
 * ```typescript
 * import type { A_BusinessPartnerType } from './types/s4kit-types';
 *
 * const entities = await typedList<A_BusinessPartnerType>(
 *   client.sap.A_BusinessPartner,
 *   {
 *     select: ['BusinessPartner', 'BusinessPartnerFullName'], // Autocomplete!
 *     top: 10
 *   }
 * );
 * // entities is automatically typed as A_BusinessPartnerType[]
 * ```
 */
export async function typedList<T>(
  handler: EntityHandler<T>,
  options?: QueryOptions<T>
): Promise<T[]> {
  return handler.list(options);
}

/**
 * Type-safe list with count helper
 *
 * @example
 * ```typescript
 * const { value, count } = await typedListWithCount<Product>(
 *   client.sap.Products,
 *   { filter: "Price gt 100" }
 * );
 * console.log(`Found ${count} products, showing ${value.length}`);
 * ```
 */
export async function typedListWithCount<T>(
  handler: EntityHandler<T>,
  options?: QueryOptions<T>
): Promise<ListResponse<T>> {
  return handler.listWithCount(options);
}

/**
 * Type-safe get helper with automatic type inference
 *
 * @example
 * ```typescript
 * const entity = await typedGet<A_BusinessPartnerType>(
 *   client.sap.A_BusinessPartner,
 *   'BP001',
 *   {
 *     select: ['BusinessPartner', 'BusinessPartnerFullName']
 *   }
 * );
 * // entity is automatically typed as A_BusinessPartnerType
 * ```
 */
export async function typedGet<T>(
  handler: EntityHandler<T>,
  id: EntityKey,
  options?: QueryOptions<T>
): Promise<T> {
  return handler.get(id, options);
}

/**
 * Type-safe count helper
 *
 * @example
 * ```typescript
 * const count = await typedCount<Product>(
 *   client.sap.Products,
 *   { filter: "Category eq 'Electronics'" }
 * );
 * console.log(`Found ${count} electronics products`);
 * ```
 */
export async function typedCount<T>(
  handler: EntityHandler<T>,
  options?: Omit<QueryOptions<T>, 'top' | 'skip' | 'select'>
): Promise<number> {
  return handler.count(options);
}

/**
 * Type-safe create helper with automatic type inference
 *
 * @example
 * ```typescript
 * import type { CreateA_BusinessPartnerRequest } from './types/s4kit-types';
 *
 * const created = await typedCreate<A_BusinessPartnerType>(
 *   client.sap.A_BusinessPartner,
 *   {
 *     BusinessPartnerFullName: 'Acme Corp',
 *     BusinessPartnerName: 'Acme'
 *   } as CreateA_BusinessPartnerRequest
 * );
 * // created is automatically typed as A_BusinessPartnerType
 * ```
 */
export async function typedCreate<T>(
  handler: EntityHandler<T>,
  data: Partial<T>,
  options?: QueryOptions<T>
): Promise<T> {
  return handler.create(data, options);
}

/**
 * Type-safe deep create helper
 *
 * @example
 * ```typescript
 * const order = await typedCreateDeep<Order>(
 *   client.sap.Orders,
 *   {
 *     OrderID: '001',
 *     Customer: 'ACME',
 *     Items: [
 *       { Product: 'Widget', Quantity: 10 }
 *     ]
 *   }
 * );
 * ```
 */
export async function typedCreateDeep<T>(
  handler: EntityHandler<T>,
  data: DeepInsertData<T>,
  options?: QueryOptions<T>
): Promise<T> {
  return handler.createDeep(data, options);
}

/**
 * Type-safe update (PATCH) helper with automatic type inference
 *
 * @example
 * ```typescript
 * import type { UpdateA_BusinessPartnerRequest } from './types/s4kit-types';
 *
 * const updated = await typedUpdate<A_BusinessPartnerType>(
 *   client.sap.A_BusinessPartner,
 *   'BP001',
 *   {
 *     BusinessPartnerFullName: 'Updated Name'
 *   } as UpdateA_BusinessPartnerRequest
 * );
 * // updated is automatically typed as A_BusinessPartnerType
 * ```
 */
export async function typedUpdate<T>(
  handler: EntityHandler<T>,
  id: EntityKey,
  data: Partial<T>,
  options?: QueryOptions<T>
): Promise<T> {
  return handler.update(id, data, options);
}

/**
 * Type-safe replace (PUT) helper - replaces entire entity
 *
 * @example
 * ```typescript
 * const replaced = await typedReplace<Product>(
 *   client.sap.Products,
 *   1,
 *   { ID: 1, Name: 'Widget', Price: 29.99, Stock: 100 }
 * );
 * ```
 */
export async function typedReplace<T>(
  handler: EntityHandler<T>,
  id: EntityKey,
  data: T,
  options?: QueryOptions<T>
): Promise<T> {
  return handler.replace(id, data, options);
}

/**
 * Type-safe delete helper
 *
 * @example
 * ```typescript
 * await typedDelete(client.sap.A_BusinessPartner, 'BP001');
 * ```
 */
export async function typedDelete<T>(
  handler: EntityHandler<T>,
  id: EntityKey,
  options?: QueryOptions<T>
): Promise<void> {
  return handler.delete(id, options);
}

// ============================================================================
// Typed Entity Wrapper
// ============================================================================

/**
 * Create a typed entity handler wrapper for better DX
 * This provides a cleaner API with full type inference
 *
 * @example
 * ```typescript
 * import type { A_BusinessPartnerType } from './types/s4kit-types';
 *
 * const bp = useEntity<A_BusinessPartnerType>(client.sap.A_BusinessPartner);
 *
 * // All methods are fully typed
 * const entities = await bp.list({ select: ['BusinessPartner'] });
 * const entity = await bp.get('BP001');
 * const created = await bp.create({ BusinessPartnerFullName: 'New' });
 * const updated = await bp.update('BP001', { BusinessPartnerFullName: 'Updated' });
 * await bp.delete('BP001');
 *
 * // With count
 * const { value, count } = await bp.listWithCount({ top: 10 });
 *
 * // Navigation
 * const addresses = await bp.nav('BP001', 'to_BusinessPartnerAddress').list();
 * ```
 */
export function useEntity<T>(handler: EntityHandler<T>) {
  return {
    /**
     * List entities with type-safe select fields
     */
    list: (options?: QueryOptions<T>) => typedList(handler, options),

    /**
     * List entities with count
     */
    listWithCount: (options?: QueryOptions<T>) => typedListWithCount(handler, options),

    /**
     * Get single entity by ID
     */
    get: (id: EntityKey, options?: QueryOptions<T>) => typedGet(handler, id, options),

    /**
     * Count matching entities
     */
    count: (options?: Omit<QueryOptions<T>, 'top' | 'skip' | 'select'>) =>
      typedCount(handler, options),

    /**
     * Create new entity
     */
    create: (data: Partial<T>, options?: QueryOptions<T>) =>
      typedCreate(handler, data, options),

    /**
     * Create with related entities (deep insert)
     */
    createDeep: (data: DeepInsertData<T>, options?: QueryOptions<T>) =>
      typedCreateDeep(handler, data, options),

    /**
     * Partial update (PATCH)
     */
    update: (id: EntityKey, data: Partial<T>, options?: QueryOptions<T>) =>
      typedUpdate(handler, id, data, options),

    /**
     * Full replacement (PUT)
     */
    replace: (id: EntityKey, data: T, options?: QueryOptions<T>) =>
      typedReplace(handler, id, data, options),

    /**
     * Delete entity by ID
     */
    delete: (id: EntityKey, options?: QueryOptions<T>) =>
      typedDelete(handler, id, options),

    /**
     * Access navigation property
     */
    nav: <R = any>(id: EntityKey, property: string) => handler.nav<R>(id, property),

    /**
     * Call OData function
     */
    func: <R = any>(name: string, params?: Record<string, any>) =>
      handler.func<R>(name, params),

    /**
     * Call OData action
     */
    action: <R = any>(name: string, params?: Record<string, any>) =>
      handler.action<R>(name, params),

    /**
     * Call bound function on entity
     */
    boundFunc: <R = any>(id: EntityKey, name: string, params?: Record<string, any>) =>
      handler.boundFunc<R>(id, name, params),

    /**
     * Call bound action on entity
     */
    boundAction: <R = any>(id: EntityKey, name: string, params?: Record<string, any>) =>
      handler.boundAction<R>(id, name, params),
  };
}

// ============================================================================
// Repository Pattern
// ============================================================================

/**
 * Create a repository-style wrapper for an entity
 * Provides a more traditional ORM-like interface
 *
 * @example
 * ```typescript
 * import type { Product } from './types/s4kit-types';
 *
 * const products = createRepository<Product>(client.sap.Products);
 *
 * // Find methods
 * const all = await products.findAll();
 * const byId = await products.findById(1);
 * const filtered = await products.findWhere({ filter: "Price gt 100" });
 * const first = await products.findFirst({ filter: "Category eq 'Electronics'" });
 *
 * // Count
 * const total = await products.count();
 *
 * // Mutations
 * const created = await products.save({ Name: 'New Product' });
 * const updated = await products.save({ ID: 1, Name: 'Updated' }); // Upsert
 * await products.remove(1);
 * ```
 */
export function createRepository<T>(handler: EntityHandler<T>) {
  return {
    /**
     * Find all entities
     */
    findAll: (options?: QueryOptions<T>) => handler.list(options),

    /**
     * Find entity by ID
     */
    findById: (id: EntityKey, options?: QueryOptions<T>) => handler.get(id, options),

    /**
     * Find entities matching criteria
     */
    findWhere: (options: QueryOptions<T>) => handler.list(options),

    /**
     * Find first entity matching criteria
     */
    findFirst: async (options?: QueryOptions<T>): Promise<T | undefined> => {
      const results = await handler.list({ ...options, top: 1 });
      return results[0];
    },

    /**
     * Find single entity (throws if not exactly one)
     */
    findOne: async (options?: QueryOptions<T>): Promise<T> => {
      const results = await handler.list({ ...options, top: 2 });
      if (results.length === 0) throw new Error('No entity found');
      if (results.length > 1) throw new Error('Multiple entities found');
      return results[0] as T;
    },

    /**
     * Count matching entities
     */
    count: (options?: Omit<QueryOptions<T>, 'top' | 'skip' | 'select'>) =>
      handler.count(options),

    /**
     * Check if entity exists
     */
    exists: async (id: EntityKey): Promise<boolean> => {
      try {
        await handler.get(id, { select: [] as any });
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Save entity (create or update based on ID presence)
     */
    save: async (data: Partial<T>, options?: QueryOptions<T>): Promise<T> => {
      const id = (data as any).ID ?? (data as any).id ?? (data as any).Id;
      if (id) {
        return handler.update(id, data, options);
      }
      return handler.create(data, options);
    },

    /**
     * Remove entity by ID
     */
    remove: (id: EntityKey, options?: QueryOptions<T>) => handler.delete(id, options),

    /**
     * Remove all matching entities
     */
    removeWhere: async (options: QueryOptions<T>): Promise<number> => {
      const entities = await handler.list(options);
      let removed = 0;
      for (const entity of entities) {
        const id = (entity as any).ID ?? (entity as any).id ?? (entity as any).Id;
        if (id) {
          await handler.delete(id);
          removed++;
        }
      }
      return removed;
    },
  };
}
