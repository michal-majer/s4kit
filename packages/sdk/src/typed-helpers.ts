/**
 * Typed helper functions for better Developer Experience
 * These functions provide type inference and better error messages
 */

import type { EntityHandler, QueryOptions } from './types';

/**
 * Type-safe list helper with automatic type inference
 * 
 * @example
 * ```typescript
 * import type { A_BusinessPartnerType } from './types/s4kit-types';
 * 
 * const entities = await typedList<A_BusinessPartnerType>(
 *   client.sap.A_BusinessPartnerType,
 *   {
 *     select: ['BusinessPartner', 'BusinessPartnerFullName'], // ✅ Autocomplete!
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
 * Type-safe get helper with automatic type inference
 * 
 * @example
 * ```typescript
 * const entity = await typedGet<A_BusinessPartnerType>(
 *   client.sap.A_BusinessPartnerType,
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
  id: string | number,
  options?: QueryOptions<T>
): Promise<T> {
  return handler.get(id, options);
}

/**
 * Type-safe create helper with automatic type inference
 * 
 * @example
 * ```typescript
 * import type { CreateA_BusinessPartnerTypeRequest } from './types/s4kit-types';
 * 
 * const created = await typedCreate<A_BusinessPartnerType>(
 *   client.sap.A_BusinessPartnerType,
 *   {
 *     BusinessPartnerFullName: 'Acme Corp',
 *     BusinessPartnerName: 'Acme'
 *   } as CreateA_BusinessPartnerTypeRequest
 * );
 * // created is automatically typed as A_BusinessPartnerType
 * ```
 */
export async function typedCreate<T>(
  handler: EntityHandler<T>,
  data: T,
  options?: QueryOptions<T>
): Promise<T> {
  return handler.create(data, options);
}

/**
 * Type-safe update helper with automatic type inference
 * 
 * @example
 * ```typescript
 * import type { UpdateA_BusinessPartnerTypeRequest } from './types/s4kit-types';
 * 
 * const updated = await typedUpdate<A_BusinessPartnerType>(
 *   client.sap.A_BusinessPartnerType,
 *   'BP001',
 *   {
 *     BusinessPartnerFullName: 'Updated Name'
 *   } as UpdateA_BusinessPartnerTypeRequest
 * );
 * // updated is automatically typed as A_BusinessPartnerType
 * ```
 */
export async function typedUpdate<T>(
  handler: EntityHandler<T>,
  id: string | number,
  data: Partial<T>,
  options?: QueryOptions<T>
): Promise<T> {
  return handler.update(id, data, options);
}

/**
 * Type-safe delete helper
 * 
 * @example
 * ```typescript
 * await typedDelete(client.sap.A_BusinessPartnerType, 'BP001');
 * ```
 */
export async function typedDelete<T>(
  handler: EntityHandler<T>,
  id: string | number,
  options?: QueryOptions<T>
): Promise<void> {
  return handler.delete(id, options);
}

/**
 * Create a typed entity handler wrapper for better DX
 * This provides a cleaner API with full type inference
 * 
 * @example
 * ```typescript
 * import type { A_BusinessPartnerType } from './types/s4kit-types';
 * 
 * const bp = useEntity<A_BusinessPartnerType>(client.sap.A_BusinessPartnerType);
 * 
 * // All methods are fully typed
 * const entities = await bp.list({ select: ['BusinessPartner'] });
 * const entity = await bp.get('BP001');
 * ```
 */
export function useEntity<T>(handler: EntityHandler<T>) {
  return {
    /**
     * List entities with type-safe select fields
     */
    list: (options?: QueryOptions<T>) => typedList(handler, options),
    
    /**
     * Get single entity by ID
     */
    get: (id: string | number, options?: QueryOptions<T>) => typedGet(handler, id, options),
    
    /**
     * Create new entity
     */
    create: (data: T, options?: QueryOptions<T>) => typedCreate(handler, data, options),
    
    /**
     * Update entity by ID
     */
    update: (id: string | number, data: Partial<T>, options?: QueryOptions<T>) => 
      typedUpdate(handler, id, data, options),
    
    /**
     * Delete entity by ID
     */
    delete: (id: string | number, options?: QueryOptions<T>) => 
      typedDelete(handler, id, options),
  };
}
