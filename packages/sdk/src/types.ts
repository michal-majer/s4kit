// ============================================================================
// S4Kit SDK Types - Complete OData Support
// ============================================================================

/**
 * Instance environment levels (ordered by priority: production highest)
 */
export type InstanceEnvironment = 'sandbox' | 'dev' | 'quality' | 'preprod' | 'production';

/**
 * SDK configuration options
 */
export interface S4KitConfig {
  apiKey: string;
  baseUrl?: string;           // Platform URL (default: https://api.s4kit.com)
  connection?: InstanceEnvironment;  // Target instance environment
  service?: string;           // Default service alias - OPTIONAL (auto-resolved from entity)
  timeout?: number;           // Request timeout in milliseconds (default: 30000)
  retries?: number;           // Number of retries on failure (default: 0)
  debug?: boolean;            // Enable debug logging (default: false)
}

// ============================================================================
// Query Options
// ============================================================================

/**
 * Complete OData query options with full type safety
 * @template T - Entity type for type-safe field selection
 */
export interface QueryOptions<T = any> {
  /** Select specific fields - type-safe when T is provided */
  select?: Array<keyof T & string>;

  /**
   * Filter expression - supports multiple formats:
   * - String: `"Name eq 'John'"` (raw OData)
   * - Object: `{ Name: 'John' }` (eq implied) or `{ Price: { gt: 100 } }`
   * - Array: `[{ Category: 'A' }, { Price: { gt: 100 } }]` (AND)
   */
  filter?: Filter<T>;

  /** Maximum number of results to return */
  top?: number;

  /** Number of results to skip (for pagination) */
  skip?: number;

  /**
   * Sort expression - supports multiple formats:
   * - String: `"Name desc"` or `"Price asc, Name desc"`
   * - Object: `{ Name: 'desc' }` (type-safe)
   * - Array: `[{ Price: 'desc' }, { Name: 'asc' }]`
   */
  orderBy?: OrderBy<T>;

  /**
   * Expand navigation properties - supports multiple formats:
   * - Array: `['Products', 'Category']`
   * - Object: `{ Products: true }` or `{ Products: { select: ['Name'], top: 5 } }`
   */
  expand?: Expand<T>;

  /** Request inline count of total matching entities */
  count?: boolean;

  /** Full-text search query */
  search?: string;

  /** Override instance environment for this request */
  connection?: InstanceEnvironment;

  /** Override service for this request */
  service?: string;

  /** Get raw OData response with metadata (default: false) */
  raw?: boolean;
}

/**
 * Sort direction
 */
export type OrderDirection = 'asc' | 'desc';

/**
 * Type-safe orderBy object
 * @example { Name: 'desc' } or { Price: 'asc', Name: 'desc' }
 */
export type OrderByObject<T = any> = {
  [K in keyof T & string]?: OrderDirection;
};

/**
 * All supported orderBy formats
 * @example
 * ```ts
 * // String (simple)
 * orderBy: 'Name desc'
 * orderBy: 'Price asc, Name desc'
 *
 * // Object (type-safe, recommended)
 * orderBy: { Name: 'desc' }
 * orderBy: { Price: 'asc' }
 *
 * // Array of objects (multiple sort criteria)
 * orderBy: [{ Price: 'desc' }, { Name: 'asc' }]
 * ```
 */
export type OrderBy<T = any> =
  | string
  | OrderByObject<T>
  | Array<OrderByObject<T>>;

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filter comparison operators
 */
export type FilterComparisonOperator = 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';

/**
 * Filter string operators
 */
export type FilterStringOperator = 'contains' | 'startswith' | 'endswith';

/**
 * Filter condition with operator
 * @example { gt: 100 } or { contains: 'Pro' }
 */
export type FilterCondition =
  | { [K in FilterComparisonOperator]?: string | number | boolean | null | Date }
  | { [K in FilterStringOperator]?: string }
  | { in?: (string | number)[] }
  | { between?: [number, number] | [Date, Date] };

/**
 * Filter value - either direct value (eq implied) or condition object
 * @example 'John' (equals 'John') or { gt: 100 } (greater than 100)
 */
export type FilterValue = string | number | boolean | null | Date | FilterCondition;

/**
 * Type-safe filter object
 * @example
 * ```ts
 * // Simple equality (eq implied)
 * filter: { Name: 'John' }
 * filter: { Active: true, Category: 'Electronics' }
 *
 * // With operators
 * filter: { Price: { gt: 100 } }
 * filter: { Name: { contains: 'Pro' } }
 * filter: { Status: { in: ['active', 'pending'] } }
 *
 * // Combined
 * filter: { Category: 'Electronics', Price: { gt: 100, lt: 500 } }
 * ```
 */
export type FilterObject<T = any> = {
  [K in keyof T & string]?: FilterValue;
};

/**
 * Logical operators for complex filters
 * @example
 * ```ts
 * // OR conditions
 * filter: { $or: [{ Status: 'active' }, { Role: 'admin' }] }
 *
 * // NOT condition
 * filter: { $not: { Status: 'deleted' } }
 *
 * // Combined
 * filter: {
 *   Category: 'Electronics',
 *   $or: [{ Price: { lt: 100 } }, { OnSale: true }]
 * }
 * ```
 */
export interface FilterLogical<T = any> {
  /** OR - any condition matches */
  $or?: FilterExpression<T>[];
  /** AND - all conditions match (explicit, fields are implicitly ANDed) */
  $and?: FilterExpression<T>[];
  /** NOT - negate the condition */
  $not?: FilterExpression<T>;
}

/**
 * Complete filter expression (fields + logical operators)
 */
export type FilterExpression<T = any> = FilterObject<T> & FilterLogical<T>;

/**
 * All supported filter formats
 * @example
 * ```ts
 * // String (OData syntax)
 * filter: "Name eq 'John' and Price gt 100"
 *
 * // Object (type-safe, recommended)
 * filter: { Name: 'John' }                    // eq implied
 * filter: { Price: { gt: 100 } }              // with operator
 * filter: { Category: 'A', Price: { lt: 50 }} // multiple (AND)
 *
 * // Array (multiple conditions, AND implied)
 * filter: [
 *   { Category: 'Electronics' },
 *   { Price: { gt: 100 } }
 * ]
 *
 * // OR conditions
 * filter: { $or: [{ Status: 'active' }, { Role: 'admin' }] }
 *
 * // NOT condition
 * filter: { $not: { Status: 'deleted' } }
 *
 * // Complex nested
 * filter: {
 *   Category: 'Electronics',
 *   $or: [
 *     { Price: { lt: 100 } },
 *     { $and: [{ OnSale: true }, { Stock: { gt: 0 } }] }
 *   ]
 * }
 * ```
 */
export type Filter<T = any> =
  | string
  | FilterExpression<T>
  | FilterExpression<T>[];

/**
 * Expand nested options (for object syntax)
 * @example { select: ['Name'], filter: { Active: true }, top: 10 }
 */
export interface ExpandNestedOptions {
  /** Select specific fields from expanded entity */
  select?: string[];
  /** Filter expanded entities */
  filter?: Filter<any>;
  /** Limit expanded results */
  top?: number;
  /** Skip expanded results */
  skip?: number;
  /** Order expanded results */
  orderBy?: OrderBy<any>;
  /** Nested expand */
  expand?: Expand<any>;
}

/**
 * Expand value - true for simple include, or options object
 */
export type ExpandValue = true | ExpandNestedOptions;

/**
 * Extract navigation property names from entity type
 * Uses the __navigationProps phantom property generated by type generator
 */
export type NavigationPropsOf<T> = T extends { readonly __navigationProps?: infer N }
  ? N extends string ? N : string
  : string;

/**
 * Object-style expand with type-safe keys (Prisma-like)
 * @example { Products: true } or { Products: { select: ['Name'], top: 5 } }
 */
export type ExpandObject<T = any> = {
  [K in NavigationPropsOf<T>]?: ExpandValue;
};

/**
 * All supported expand formats
 * @example
 * ```ts
 * // Simple array (type-safe with generated types)
 * expand: ['Products', 'Category']
 *
 * // Object with boolean (simple include)
 * expand: { Products: true, Category: true }
 *
 * // Object with options
 * expand: {
 *   Products: {
 *     select: ['Name', 'Price'],
 *     filter: { Active: true },
 *     top: 10,
 *     orderBy: { Name: 'asc' }
 *   }
 * }
 *
 * // Nested expand
 * expand: {
 *   Products: {
 *     select: ['Name'],
 *     expand: { Supplier: true }
 *   }
 * }
 * ```
 */
export type Expand<T = any> = NavigationPropsOf<T>[] | ExpandObject<T>;

// ============================================================================
// Response Types
// ============================================================================

/**
 * List response with optional count
 */
export interface ListResponse<T> {
  /** The data items */
  value: T[];
  /** Total count (when count: true is requested) */
  count?: number;
}

/**
 * Response with both data and metadata
 */
export interface ODataResponse<T> {
  value: T;
  '@odata.context'?: string;
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
}

// ============================================================================
// Entity Handler Interface
// ============================================================================

/**
 * Complete entity handler with all OData operations
 */
export interface EntityHandler<T = any> {
  // ==================== READ Operations ====================

  /**
   * List entities with optional query options
   * @example
   * ```ts
   * const items = await client.sap.Products.list({ top: 10 });
   * ```
   */
  list(options?: QueryOptions<T>): Promise<T[]>;

  /**
   * List entities with count
   * @example
   * ```ts
   * const { value, count } = await client.sap.Products.listWithCount({ top: 10 });
   * console.log(`Showing ${value.length} of ${count} total`);
   * ```
   */
  listWithCount(options?: QueryOptions<T>): Promise<ListResponse<T>>;

  /**
   * Get single entity by key
   * @example
   * ```ts
   * const product = await client.sap.Products.get(1);
   * const partner = await client.sap.A_BusinessPartner.get('BP001');
   * ```
   */
  get(id: EntityKey, options?: QueryOptions<T>): Promise<T>;

  /**
   * Count matching entities
   * @example
   * ```ts
   * const total = await client.sap.Products.count({ filter: "Price gt 100" });
   * ```
   */
  count(options?: Omit<QueryOptions<T>, 'top' | 'skip' | 'select'>): Promise<number>;

  // ==================== CREATE Operations ====================

  /**
   * Create a new entity (POST)
   * @example
   * ```ts
   * const created = await client.sap.Products.create({ Name: 'Widget', Price: 9.99 });
   * ```
   */
  create(data: Partial<T> | T, options?: QueryOptions<T>): Promise<T>;

  /**
   * Create entity with nested related entities (OData deep insert)
   *
   * **Important:** Deep insert only works with **Composition** relationships.
   * For Association relationships, nested data is silently ignored by OData.
   *
   * **Composition** (deep insert works):
   * - Parent "owns" children (e.g., Order owns OrderItems)
   * - Deleting parent cascades to children
   *
   * **Association** (deep insert does NOT work):
   * - Entities are independent (e.g., Book references Author)
   * - Use separate create calls or transactions instead
   *
   * @example Composition relationship (works)
   * ```ts
   * const order = await client.sap.Orders.createDeep({
   *   OrderID: '001',
   *   Items: [{ Product: 'A', Quantity: 10 }]  // Created with order
   * });
   * ```
   *
   * @example Association relationship (use separate calls instead)
   * ```ts
   * // DON'T: This won't create the books - they'll be ignored
   * await client.sap.Authors.createDeep({ name: 'Author', books: [{...}] });
   *
   * // DO: Create separately with FK reference
   * const author = await client.sap.Authors.create({ name: 'Author' });
   * await client.sap.Books.createMany([
   *   { title: 'Book 1', author_ID: author.ID }
   * ]);
   * ```
   */
  createDeep(data: DeepInsertData<T>, options?: QueryOptions<T>): Promise<T>;

  // ==================== UPDATE Operations ====================

  /**
   * Partial update (PATCH) - only updates specified fields
   * @example
   * ```ts
   * const updated = await client.sap.Products.update(1, { Price: 12.99 });
   * ```
   */
  update(id: EntityKey, data: Partial<T>, options?: QueryOptions<T>): Promise<T>;

  /**
   * Full replacement (PUT) - replaces entire entity
   * @example
   * ```ts
   * const replaced = await client.sap.Products.replace(1, fullProductData);
   * ```
   */
  replace(id: EntityKey, data: T, options?: QueryOptions<T>): Promise<T>;

  /**
   * Upsert - create or update based on key
   * @example
   * ```ts
   * const result = await client.sap.Products.upsert({ ID: 1, Name: 'Widget', Price: 9.99 });
   * ```
   */
  upsert(data: T, options?: QueryOptions<T>): Promise<T>;

  // ==================== DELETE Operations ====================

  /**
   * Delete entity by key
   * @example
   * ```ts
   * await client.sap.Products.delete(1);
   * ```
   */
  delete(id: EntityKey, options?: QueryOptions<T>): Promise<void>;

  // ==================== Bulk Operations ====================

  /**
   * Create multiple entities in a single batch request
   * @example
   * ```ts
   * const books = await client.Books.createMany([
   *   { title: 'Book 1', price: 9.99 },
   *   { title: 'Book 2', price: 10.99 },
   * ]);
   * ```
   */
  createMany(items: Array<Partial<T>>, options?: QueryOptions<T>): Promise<T[]>;

  /**
   * Update multiple entities in a single batch request
   * @example
   * ```ts
   * const updated = await client.Books.updateMany([
   *   { id: 1, data: { price: 19.99 } },
   *   { id: 2, data: { price: 29.99 } },
   * ]);
   * ```
   */
  updateMany(
    items: Array<{ id: EntityKey; data: Partial<T> }>,
    options?: QueryOptions<T>
  ): Promise<T[]>;

  /**
   * Delete multiple entities in a single batch request
   * @example
   * ```ts
   * await client.Books.deleteMany([1, 2, 3]);
   * ```
   */
  deleteMany(ids: EntityKey[], options?: QueryOptions<T>): Promise<void>;

  // ==================== Navigation Properties ====================

  /**
   * Access navigation property (related entities)
   * @example
   * ```ts
   * const items = await client.sap.Orders.nav(1, 'Items').list();
   * ```
   */
  nav<R = any>(id: EntityKey, property: string): EntityHandler<R>;

  // ==================== OData Functions & Actions ====================

  /**
   * Call an OData function (GET operation)
   * @example
   * ```ts
   * const result = await client.sap.Products.func('GetTopSelling', { count: 10 });
   * ```
   */
  func<R = any>(name: string, params?: Record<string, any>): Promise<R>;

  /**
   * Call an OData action (POST operation)
   * @example
   * ```ts
   * await client.sap.Orders.action('Approve', { orderId: '001' });
   * ```
   */
  action<R = any>(name: string, params?: Record<string, any>): Promise<R>;

  /**
   * Call bound function on specific entity
   * @example
   * ```ts
   * const total = await client.sap.Orders.boundFunc(1, 'CalculateTotal');
   * ```
   */
  boundFunc<R = any>(id: EntityKey, name: string, params?: Record<string, any>): Promise<R>;

  /**
   * Call bound action on specific entity
   * @example
   * ```ts
   * await client.sap.Orders.boundAction('001', 'Submit');
   * ```
   */
  boundAction<R = any>(id: EntityKey, name: string, params?: Record<string, any>): Promise<R>;

  // ==================== Pagination ====================

  /**
   * Paginate through all entities with automatic page handling
   * @example
   * ```ts
   * // Iterate through all pages
   * for await (const page of client.sap.Products.paginate({ top: 100 })) {
   *   console.log(`Processing ${page.value.length} items`);
   *   for (const product of page.value) {
   *     // process product
   *   }
   * }
   *
   * // Or collect all items
   * const all = await client.sap.Products.all({ filter: "Active eq true" });
   * ```
   */
  paginate(options?: PaginateOptions<T>): AsyncIterable<ListResponse<T>>;

  /**
   * Get all entities (automatically handles pagination)
   * @example
   * ```ts
   * const allProducts = await client.sap.Products.all({ filter: "Active eq true" });
   * ```
   */
  all(options?: PaginateOptions<T>): Promise<T[]>;
}

/**
 * Pagination options (extends QueryOptions)
 */
export interface PaginateOptions<T = any> extends Omit<QueryOptions<T>, 'skip'> {
  /** Page size (default: 100) */
  pageSize?: number;
  /** Maximum number of items to retrieve (default: unlimited) */
  maxItems?: number;
}

/**
 * Entity key type - supports string, number, or composite keys
 */
export type EntityKey = string | number | CompositeKey;

/**
 * Composite key for entities with multiple key fields
 * @example
 * ```ts
 * const item = await client.sap.OrderItems.get({ OrderID: '001', ItemNo: 10 });
 * ```
 */
export type CompositeKey = Record<string, string | number>;

/**
 * Deep insert data type - extends entity with navigation properties
 *
 * Allows nested objects/arrays for Composition relationships.
 * Note: TypeScript cannot validate at compile time whether a relationship
 * is Composition or Association. Use `createDeep()` only when you know
 * the target entity has Composition relationships.
 *
 * @see {@link EntityHandler.createDeep} for usage examples and limitations
 */
export type DeepInsertData<T> = T & {
  [K in string]?: unknown[] | Record<string, unknown>;
};

// ============================================================================
// Batch Operations (JSON format)
// ============================================================================

/**
 * Batch operation - supports POST, PATCH, PUT, DELETE
 * @example
 * ```ts
 * // Create
 * { method: 'POST', entity: 'Books', data: { title: 'New Book' } }
 *
 * // Update
 * { method: 'PATCH', entity: 'Books', id: 123, data: { price: 9.99 } }
 *
 * // Delete
 * { method: 'DELETE', entity: 'Books', id: 123 }
 * ```
 */
export type BatchOperation =
  | { method: 'POST'; entity: string; data: Record<string, unknown> }
  | { method: 'PATCH' | 'PUT'; entity: string; id: EntityKey; data: Record<string, unknown> }
  | { method: 'DELETE'; entity: string; id: EntityKey };

/**
 * Result of a batch operation
 */
export interface BatchResult<T = unknown> {
  success: boolean;
  status: number;
  data?: T;
  error?: { code: string; message: string };
}

// ============================================================================
// Error Types
// ============================================================================

export interface ODataError {
  code: string;
  message: string;
  target?: string;
  details?: ODataErrorDetail[];
  innererror?: {
    message?: string;
    type?: string;
    stacktrace?: string;
  };
}

export interface ODataErrorDetail {
  code: string;
  message: string;
  target?: string;
}

// ============================================================================
// Interceptors
// ============================================================================

export interface RequestInterceptor {
  (request: InterceptedRequest): InterceptedRequest | Promise<InterceptedRequest>;
}

export interface ResponseInterceptor {
  (response: InterceptedResponse): InterceptedResponse | Promise<InterceptedResponse>;
}

export interface ErrorInterceptor {
  (error: IS4KitError): IS4KitError | Promise<IS4KitError>;
}

export interface InterceptedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  searchParams?: Record<string, string>;
}

export interface InterceptedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
}

export interface IS4KitError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly odataError?: ODataError;
  readonly request?: InterceptedRequest;
  readonly suggestion?: string;
  readonly friendlyMessage: string;
  readonly help: string;
  readonly details: ODataErrorDetail[];
  hasCode(code: string): boolean;
  toJSON(): Record<string, any>;
}

// ============================================================================
// Filter Builder Types (for fluent API)
// ============================================================================

export type FilterOperator =
  | 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le'
  | 'contains' | 'startswith' | 'endswith'
  | 'in' | 'has';

export type LogicalOperator = 'and' | 'or' | 'not';

// ============================================================================
// Fluent Query Builder Types
// ============================================================================

export interface FluentQuery<T> {
  select<K extends keyof T>(...fields: K[]): FluentQuery<Pick<T, K>>;
  filter(expression: string): FluentQuery<T>;
  where<K extends keyof T>(field: K, operator: FilterOperator, value: any): FluentQuery<T>;
  and<K extends keyof T>(field: K, operator: FilterOperator, value: any): FluentQuery<T>;
  or<K extends keyof T>(field: K, operator: FilterOperator, value: any): FluentQuery<T>;
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): FluentQuery<T>;
  expand(property: string, nested?: (q: FluentQuery<any>) => FluentQuery<any>): FluentQuery<T>;
  top(count: number): FluentQuery<T>;
  skip(count: number): FluentQuery<T>;
  search(term: string): FluentQuery<T>;
  count(): FluentQuery<T>;

  // Terminal operations
  execute(): Promise<T[]>;
  executeWithCount(): Promise<ListResponse<T>>;
  first(): Promise<T | undefined>;
  single(): Promise<T>;
}
