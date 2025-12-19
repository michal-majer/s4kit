export interface S4KitConfig {
  apiKey: string;
  baseUrl?: string;           // Platform URL (default: https://api.s4kit.com)
  connection?: string;        // Default connection alias (e.g., "erp-dev") - REQUIRED for requests
  service?: string;           // Default service alias - OPTIONAL (auto-resolved from entity)
}

/**
 * Query options for OData requests
 * @template T - Entity type for type-safe field selection
 */
export interface QueryOptions<T = any> {
  /** Select specific fields - type-safe when T is provided */
  select?: Array<keyof T>;
  filter?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
  expand?: string[];
  connection?: string;        // Override connection for this request
  service?: string;           // Override service (optional - auto-resolved if not provided)
}

export interface EntityHandler<T = any> {
  list(options?: QueryOptions<T>): Promise<T[]>;
  get(id: string | number, options?: QueryOptions<T>): Promise<T>;
  create(data: T, options?: QueryOptions<T>): Promise<T>;
  update(id: string | number, data: Partial<T>, options?: QueryOptions<T>): Promise<T>;
  delete(id: string | number, options?: QueryOptions<T>): Promise<void>;
}
