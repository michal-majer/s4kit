// ============================================================================
// S4Kit SDK Types - Complete OData Support
// ============================================================================

/**
 * SDK configuration options
 */
export interface S4KitConfig {
  apiKey: string;
  baseUrl?: string;           // Platform URL (default: https://api.s4kit.com)
  connection?: string;        // Default connection alias (e.g., "erp-dev") - REQUIRED for requests
  service?: string;           // Default service alias - OPTIONAL (auto-resolved from entity)
  timeout?: number;           // Request timeout in milliseconds (default: 30000)
  retries?: number;           // Number of retries on failure (default: 0)
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

  /** OData filter expression (e.g., "Name eq 'John'") */
  filter?: string;

  /** Maximum number of results to return */
  top?: number;

  /** Number of results to skip (for pagination) */
  skip?: number;

  /** Sort expression (e.g., "Name desc" or "Name asc, Date desc") */
  orderBy?: string | OrderByClause<T> | Array<OrderByClause<T>>;

  /** Navigation properties to expand */
  expand?: string[] | ExpandOptions<T>[];

  /** Request inline count of total matching entities */
  count?: boolean;

  /** Full-text search query */
  search?: string;

  /** Override connection for this request */
  connection?: string;

  /** Override service for this request */
  service?: string;

  /** Get raw OData response with metadata (default: false) */
  raw?: boolean;
}

/**
 * Type-safe orderBy clause
 */
export type OrderByClause<T = any> = {
  field: keyof T & string;
  direction?: 'asc' | 'desc';
};

/**
 * Expand options with nested query support
 */
export interface ExpandOptions<T = any> {
  property: string;
  select?: string[];
  filter?: string;
  top?: number;
  orderBy?: string;
  expand?: ExpandOptions<any>[];
}

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
   * Create with related entities (deep insert)
   * @example
   * ```ts
   * const order = await client.sap.Orders.createDeep({
   *   OrderID: '001',
   *   Items: [{ Product: 'A', Quantity: 10 }]
   * });
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
 * Deep insert data type
 */
export type DeepInsertData<T> = T & {
  [K in string]?: any[] | any;
};

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch operation types
 */
export type BatchOperation<T = any> =
  | BatchGet<T>
  | BatchCreate<T>
  | BatchUpdate<T>
  | BatchDelete;

export interface BatchGet<T = any> {
  method: 'GET';
  entity: string;
  id?: EntityKey;
  options?: QueryOptions<T>;
}

export interface BatchCreate<T = any> {
  method: 'POST';
  entity: string;
  data: Partial<T>;
}

export interface BatchUpdate<T = any> {
  method: 'PATCH' | 'PUT';
  entity: string;
  id: EntityKey;
  data: Partial<T>;
}

export interface BatchDelete {
  method: 'DELETE';
  entity: string;
  id: EntityKey;
}

export interface BatchResult<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: ODataError;
}

// ============================================================================
// Changeset (Atomic Transactions)
// ============================================================================

export interface Changeset {
  operations: Array<BatchCreate<any> | BatchUpdate<any> | BatchDelete>;
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
  (error: S4KitError): S4KitError | Promise<S4KitError>;
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
  status?: number;
  code?: string;
  odataError?: ODataError;
  request?: InterceptedRequest;
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
