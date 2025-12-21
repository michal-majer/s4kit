// ============================================================================
// S4Kit Query Builder - Complete OData Query Support
// ============================================================================

import type { QueryOptions, OrderByClause, ExpandOptions, FilterOperator } from './types';

/**
 * Build OData query parameters from QueryOptions
 */
export function buildQuery(options?: QueryOptions<any>): Record<string, string> {
  if (!options) return {};

  const params: Record<string, string> = {};

  // $select - field selection
  if (options.select?.length) {
    params['$select'] = (options.select as string[]).join(',');
  }

  // $filter - filtering
  if (options.filter) {
    params['$filter'] = options.filter;
  }

  // $top - limit results
  if (options.top !== undefined) {
    params['$top'] = String(options.top);
  }

  // $skip - pagination offset
  if (options.skip !== undefined) {
    params['$skip'] = String(options.skip);
  }

  // $orderby - sorting
  if (options.orderBy) {
    params['$orderby'] = buildOrderBy(options.orderBy);
  }

  // $expand - navigation properties
  if (options.expand?.length) {
    params['$expand'] = buildExpand(options.expand);
  }

  // $count - inline count
  if (options.count) {
    params['$count'] = 'true';
  }

  // $search - full-text search
  if (options.search) {
    params['$search'] = options.search;
  }

  return params;
}

/**
 * Build $orderby string from various formats
 */
function buildOrderBy(orderBy: string | OrderByClause<any> | Array<OrderByClause<any>>): string {
  if (typeof orderBy === 'string') {
    return orderBy;
  }

  if (Array.isArray(orderBy)) {
    return orderBy
      .map(clause => `${clause.field}${clause.direction ? ' ' + clause.direction : ''}`)
      .join(',');
  }

  // Single OrderByClause
  return `${orderBy.field}${orderBy.direction ? ' ' + orderBy.direction : ''}`;
}

/**
 * Build $expand string with nested options support
 */
function buildExpand(expand: string[] | ExpandOptions<any>[]): string {
  return expand
    .map(item => {
      if (typeof item === 'string') {
        return item;
      }

      // ExpandOptions with nested query
      let result = item.property;
      const nested: string[] = [];

      if (item.select?.length) {
        nested.push(`$select=${item.select.join(',')}`);
      }
      if (item.filter) {
        nested.push(`$filter=${item.filter}`);
      }
      if (item.top !== undefined) {
        nested.push(`$top=${item.top}`);
      }
      if (item.orderBy) {
        nested.push(`$orderby=${item.orderBy}`);
      }
      if (item.expand?.length) {
        nested.push(`$expand=${buildExpand(item.expand)}`);
      }

      if (nested.length > 0) {
        result += `(${nested.join(';')})`;
      }

      return result;
    })
    .join(',');
}

// ============================================================================
// Fluent Filter Builder - Type-Safe Filter Construction
// ============================================================================

/**
 * Create a fluent filter builder for type-safe filter construction
 *
 * @example
 * ```ts
 * const filter = createFilter<Product>()
 *   .where('Price', 'gt', 100)
 *   .and('Category', 'eq', 'Electronics')
 *   .or('Name', 'contains', 'Pro')
 *   .build();
 * // Returns: "Price gt 100 and Category eq 'Electronics' or contains(Name,'Pro')"
 * ```
 */
export function createFilter<T = any>(): FilterBuilder<T> {
  return new FilterBuilder<T>();
}

export class FilterBuilder<T = any> {
  private parts: string[] = [];

  /**
   * Add a filter condition
   */
  where<K extends keyof T>(field: K, operator: FilterOperator, value: any): this {
    this.parts.push(this.buildCondition(String(field), operator, value));
    return this;
  }

  /**
   * Add AND condition
   */
  and<K extends keyof T>(field: K, operator: FilterOperator, value: any): this {
    if (this.parts.length > 0) {
      this.parts.push('and');
    }
    this.parts.push(this.buildCondition(String(field), operator, value));
    return this;
  }

  /**
   * Add OR condition
   */
  or<K extends keyof T>(field: K, operator: FilterOperator, value: any): this {
    if (this.parts.length > 0) {
      this.parts.push('or');
    }
    this.parts.push(this.buildCondition(String(field), operator, value));
    return this;
  }

  /**
   * Add NOT condition
   */
  not<K extends keyof T>(field: K, operator: FilterOperator, value: any): this {
    this.parts.push(`not ${this.buildCondition(String(field), operator, value)}`);
    return this;
  }

  /**
   * Group conditions with parentheses
   */
  group(fn: (builder: FilterBuilder<T>) => FilterBuilder<T>): this {
    const nested = fn(new FilterBuilder<T>());
    const nestedFilter = nested.build();
    if (nestedFilter) {
      this.parts.push(`(${nestedFilter})`);
    }
    return this;
  }

  /**
   * Add raw filter expression
   */
  raw(expression: string): this {
    this.parts.push(expression);
    return this;
  }

  /**
   * Build the final filter string
   */
  build(): string {
    return this.parts.join(' ');
  }

  /**
   * Build a single condition
   */
  private buildCondition(field: string, operator: FilterOperator, value: any): string {
    const formattedValue = this.formatValue(value);

    switch (operator) {
      case 'eq':
      case 'ne':
      case 'gt':
      case 'ge':
      case 'lt':
      case 'le':
        return `${field} ${operator} ${formattedValue}`;

      case 'contains':
        return `contains(${field},${formattedValue})`;

      case 'startswith':
        return `startswith(${field},${formattedValue})`;

      case 'endswith':
        return `endswith(${field},${formattedValue})`;

      case 'in':
        if (!Array.isArray(value)) {
          throw new Error('Value for "in" operator must be an array');
        }
        const inValues = value.map(v => this.formatValue(v)).join(',');
        return `${field} in (${inValues})`;

      case 'has':
        return `${field} has ${formattedValue}`;

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Format a value for OData filter
   */
  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}

// ============================================================================
// Fluent Query Builder - Complete Query Construction
// ============================================================================

import type { ListResponse, EntityHandler, FluentQuery } from './types';

/**
 * Create a fluent query builder for an entity
 *
 * @example
 * ```ts
 * const products = await query(client.sap.Products)
 *   .select('Name', 'Price')
 *   .where('Price', 'gt', 100)
 *   .orderBy('Name', 'asc')
 *   .top(10)
 *   .execute();
 * ```
 */
export function query<T>(handler: EntityHandler<T>): QueryBuilder<T> {
  return new QueryBuilder<T>(handler);
}

export class QueryBuilder<T> implements FluentQuery<T> {
  private handler: EntityHandler<T>;
  private options: QueryOptions<T> = {};
  private filterParts: string[] = [];

  constructor(handler: EntityHandler<T>) {
    this.handler = handler;
  }

  /**
   * Select specific fields
   */
  select<K extends keyof T>(...fields: K[]): QueryBuilder<Pick<T, K>> {
    this.options.select = fields as any;
    return this as any;
  }

  /**
   * Add raw filter expression
   */
  filter(expression: string): this {
    this.filterParts.push(expression);
    return this;
  }

  /**
   * Add type-safe filter condition
   */
  where<K extends keyof T>(field: K, operator: FilterOperator, value: any): this {
    const condition = new FilterBuilder<T>().where(field, operator, value).build();
    this.filterParts.push(condition);
    return this;
  }

  /**
   * Add AND condition
   */
  and<K extends keyof T>(field: K, operator: FilterOperator, value: any): this {
    if (this.filterParts.length === 0) {
      return this.where(field, operator, value);
    }
    const condition = new FilterBuilder<T>().where(field, operator, value).build();
    const last = this.filterParts.pop();
    this.filterParts.push(`${last} and ${condition}`);
    return this;
  }

  /**
   * Add OR condition
   */
  or<K extends keyof T>(field: K, operator: FilterOperator, value: any): this {
    if (this.filterParts.length === 0) {
      return this.where(field, operator, value);
    }
    const condition = new FilterBuilder<T>().where(field, operator, value).build();
    const last = this.filterParts.pop();
    this.filterParts.push(`${last} or ${condition}`);
    return this;
  }

  /**
   * Order by field
   */
  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): this {
    const current = this.options.orderBy;
    if (typeof current === 'string' && current) {
      this.options.orderBy = `${current},${String(field)} ${direction}`;
    } else {
      this.options.orderBy = `${String(field)} ${direction}`;
    }
    return this;
  }

  /**
   * Expand navigation property with optional nested query
   */
  expand(property: string, nested?: (q: FluentQuery<any>) => FluentQuery<any>): this {
    if (!this.options.expand) {
      this.options.expand = [];
    }

    if (nested) {
      const nestedBuilder = new QueryBuilder<any>({ list: async () => [] } as any);
      nested(nestedBuilder);
      const nestedOptions = nestedBuilder.buildOptions();

      (this.options.expand as ExpandOptions<any>[]).push({
        property,
        select: nestedOptions.select as string[],
        filter: nestedOptions.filter,
        top: nestedOptions.top,
        orderBy: typeof nestedOptions.orderBy === 'string' ? nestedOptions.orderBy : undefined,
      });
    } else {
      (this.options.expand as string[]).push(property);
    }

    return this;
  }

  /**
   * Limit results
   */
  top(count: number): this {
    this.options.top = count;
    return this;
  }

  /**
   * Skip results (pagination)
   */
  skip(count: number): this {
    this.options.skip = count;
    return this;
  }

  /**
   * Full-text search
   */
  search(term: string): this {
    this.options.search = term;
    return this;
  }

  /**
   * Request inline count
   */
  count(): this {
    this.options.count = true;
    return this;
  }

  /**
   * Execute query and return results
   */
  async execute(): Promise<T[]> {
    return this.handler.list(this.buildOptions());
  }

  /**
   * Execute query with inline count
   */
  async executeWithCount(): Promise<ListResponse<T>> {
    return this.handler.listWithCount(this.buildOptions());
  }

  /**
   * Execute and return first result (or undefined)
   */
  async first(): Promise<T | undefined> {
    this.options.top = 1;
    const results = await this.execute();
    return results[0];
  }

  /**
   * Execute and return single result (throws if not exactly one)
   */
  async single(): Promise<T> {
    this.options.top = 2;
    const results = await this.execute();
    if (results.length === 0) {
      throw new Error('No results found');
    }
    if (results.length > 1) {
      throw new Error('Multiple results found, expected exactly one');
    }
    return results[0] as T;
  }

  /**
   * Build final query options
   */
  buildOptions(): QueryOptions<T> {
    if (this.filterParts.length > 0) {
      this.options.filter = this.filterParts.join(' and ');
    }
    return { ...this.options };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format entity key for URL path
 * Supports simple keys (string/number) and composite keys
 */
export function formatKey(key: string | number | Record<string, string | number>): string {
  if (typeof key === 'number') {
    return String(key);
  }
  if (typeof key === 'string') {
    // Check if it looks like a GUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
      return key; // GUIDs don't need quotes in most OData implementations
    }
    return `'${key.replace(/'/g, "''")}'`;
  }

  // Composite key: { OrderID: '001', ItemNo: 10 }
  const parts = Object.entries(key)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v}`)
    .join(',');
  return parts;
}

/**
 * Build function/action parameters for URL
 */
export function buildFunctionParams(params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const formatted = Object.entries(params)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}='${value.replace(/'/g, "''")}'`;
      }
      if (value === null) {
        return `${key}=null`;
      }
      if (typeof value === 'boolean') {
        return `${key}=${value}`;
      }
      if (value instanceof Date) {
        return `${key}=${value.toISOString()}`;
      }
      return `${key}=${value}`;
    })
    .join(',');

  return formatted;
}
