// ============================================================================
// S4Kit Query Builder - Complete OData Query Support
// ============================================================================

import type {
  QueryOptions,
  OrderByObject,
  OrderBy,
  ExpandNestedOptions,
  ExpandObject,
  Expand,
  FilterOperator,
  Filter,
  FilterValue,
  FilterCondition,
  FilterExpression,
} from './types';

/**
 * Extract navigation property select paths from expand options
 * Returns paths like ['Products', 'Category'] or ['Products/ProductID', 'Products/ProductName']
 */
function getExpandSelectPaths(expand: Expand<any>): string[] {
  const paths: string[] = [];

  // String array: ['Products', 'Category']
  if (Array.isArray(expand)) {
    for (const item of expand) {
      paths.push(item);
    }
    return paths;
  }

  // Object format: { Products: true } or { Products: { select: [...] } }
  for (const [property, value] of Object.entries(expand)) {
    if (value === true) {
      // Simple include: { Products: true }
      paths.push(property);
    } else if (isExpandNestedOptions(value)) {
      // Nested options: { Products: { select: ['ProductID'] } }
      if (value.select?.length) {
        for (const field of value.select) {
          paths.push(`${property}/${field}`);
        }
      } else {
        paths.push(property);
      }
    }
  }

  return paths;
}

/**
 * Build OData query parameters from QueryOptions
 */
export function buildQuery(options?: QueryOptions<any>): Record<string, string> {
  if (!options) return {};

  const params: Record<string, string> = {};

  // Collect select fields
  let selectFields: string[] = options.select ? [...(options.select as string[])] : [];

  // $expand - navigation properties (supports string[], object, or legacy array)
  // Process expand first to merge navigation properties into select
  if (options.expand) {
    const isArrayWithLength = Array.isArray(options.expand) && options.expand.length > 0;
    const isObjectWithKeys = !Array.isArray(options.expand) && typeof options.expand === 'object' && Object.keys(options.expand).length > 0;
    if (isArrayWithLength || isObjectWithKeys) {
      params['$expand'] = buildExpand(options.expand);

      // If select is being used, ensure navigation properties are included
      // This is required for OData v2 compatibility
      if (selectFields.length > 0) {
        const expandPaths = getExpandSelectPaths(options.expand);
        for (const path of expandPaths) {
          if (!selectFields.includes(path)) {
            selectFields.push(path);
          }
        }
      }
    }
  }

  // $select - field selection (with merged expand paths)
  if (selectFields.length > 0) {
    params['$select'] = selectFields.join(',');
  }

  // $filter - filtering (supports string, object, or array)
  if (options.filter !== undefined && options.filter !== null) {
    const filterStr = buildFilter(options.filter);
    if (filterStr) {
      params['$filter'] = filterStr;
    }
  }

  // $top - limit results
  if (options.top !== undefined) {
    params['$top'] = String(options.top);
  }

  // $skip - pagination offset
  if (options.skip !== undefined) {
    params['$skip'] = String(options.skip);
  }

  // $orderby - sorting (supports string, object, or array)
  if (options.orderBy) {
    params['$orderby'] = buildOrderBy(options.orderBy);
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
 * @example
 * - String: "Name desc" → "Name desc"
 * - Object: { Name: 'desc' } → "Name desc"
 * - Object: { Price: 'asc', Name: 'desc' } → "Price asc,Name desc"
 * - Array: [{ Name: 'desc' }, { Price: 'asc' }] → "Name desc,Price asc"
 */
function buildOrderBy(orderBy: OrderBy<any>): string {
  // String passthrough
  if (typeof orderBy === 'string') {
    return orderBy;
  }

  // Array of objects
  if (Array.isArray(orderBy)) {
    return orderBy.map(obj => buildOrderByObject(obj)).join(',');
  }

  // Single object
  return buildOrderByObject(orderBy);
}

/**
 * Build orderBy from object format: { Name: 'desc', Price: 'asc' }
 */
function buildOrderByObject(obj: OrderByObject<any>): string {
  return Object.entries(obj)
    .map(([field, direction]) => `${field}${direction ? ' ' + direction : ''}`)
    .join(',');
}

// ============================================================================
// Filter Builder - Multi-format Support
// ============================================================================

/**
 * Format a value for OData filter expression
 */
function formatFilterValue(value: any): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Check if a value is a filter condition object (has operator keys)
 */
function isFilterCondition(value: any): value is FilterCondition {
  if (value === null || typeof value !== 'object' || value instanceof Date) {
    return false;
  }
  const operators = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'contains', 'startswith', 'endswith', 'in', 'between'];
  return Object.keys(value).some(key => operators.includes(key));
}

/**
 * Build filter conditions for a single field
 */
function buildFieldConditions(field: string, value: FilterValue): string[] {
  // Direct value = equality
  if (!isFilterCondition(value)) {
    return [`${field} eq ${formatFilterValue(value)}`];
  }

  // Condition object with operators
  const conditions: string[] = [];
  const condition = value as Record<string, any>;

  for (const [op, val] of Object.entries(condition)) {
    if (val === undefined) continue;

    switch (op) {
      case 'eq':
      case 'ne':
      case 'gt':
      case 'ge':
      case 'lt':
      case 'le':
        conditions.push(`${field} ${op} ${formatFilterValue(val)}`);
        break;

      case 'contains':
        conditions.push(`contains(${field},${formatFilterValue(val)})`);
        break;

      case 'startswith':
        conditions.push(`startswith(${field},${formatFilterValue(val)})`);
        break;

      case 'endswith':
        conditions.push(`endswith(${field},${formatFilterValue(val)})`);
        break;

      case 'in':
        if (Array.isArray(val)) {
          const inValues = val.map(v => formatFilterValue(v)).join(',');
          conditions.push(`${field} in (${inValues})`);
        }
        break;

      case 'between':
        if (Array.isArray(val) && val.length === 2) {
          conditions.push(`${field} ge ${formatFilterValue(val[0])} and ${field} le ${formatFilterValue(val[1])}`);
        }
        break;
    }
  }

  return conditions;
}

/** Logical operator keys */
const LOGICAL_OPERATORS = ['$or', '$and', '$not'] as const;

/**
 * Check if a key is a logical operator
 */
function isLogicalOperator(key: string): key is '$or' | '$and' | '$not' {
  return LOGICAL_OPERATORS.includes(key as any);
}

/**
 * Build filter from a FilterExpression (fields + logical operators)
 */
function buildFilterExpression(filter: FilterExpression<any>): string {
  const parts: string[] = [];

  // Process field conditions (non-logical keys)
  const fieldConditions: string[] = [];
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) continue;
    if (isLogicalOperator(key)) continue; // Skip logical operators for now

    fieldConditions.push(...buildFieldConditions(key, value as FilterValue));
  }

  if (fieldConditions.length > 0) {
    // Multiple field conditions are ANDed together
    if (fieldConditions.length === 1) {
      parts.push(fieldConditions[0]!);
    } else {
      parts.push(fieldConditions.join(' and '));
    }
  }

  // Process $and - explicit AND
  if (filter.$and && Array.isArray(filter.$and)) {
    const andParts = filter.$and
      .map(expr => buildFilterExpression(expr))
      .filter((s): s is string => Boolean(s));
    if (andParts.length > 0) {
      const andStr = andParts.length === 1
        ? andParts[0]!
        : `(${andParts.join(' and ')})`;
      parts.push(andStr);
    }
  }

  // Process $or - OR conditions
  if (filter.$or && Array.isArray(filter.$or)) {
    const orParts = filter.$or
      .map(expr => buildFilterExpression(expr))
      .filter((s): s is string => Boolean(s));
    if (orParts.length > 0) {
      const orStr = orParts.length === 1
        ? orParts[0]!
        : `(${orParts.join(' or ')})`;
      parts.push(orStr);
    }
  }

  // Process $not - negation
  if (filter.$not) {
    const notExpr = buildFilterExpression(filter.$not);
    if (notExpr) {
      parts.push(`not (${notExpr})`);
    }
  }

  // Combine all parts with AND
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  return parts.join(' and ');
}

/**
 * Build $filter string from various formats
 * @example
 * - String: "Name eq 'John'" → "Name eq 'John'"
 * - Object: { Name: 'John' } → "Name eq 'John'"
 * - Object: { Price: { gt: 100 } } → "Price gt 100"
 * - Object: { Name: 'John', Active: true } → "Name eq 'John' and Active eq true"
 * - Array: [{ Name: 'John' }, { Age: { gt: 18 } }] → "Name eq 'John' and Age gt 18"
 * - OR: { $or: [{ A: 1 }, { B: 2 }] } → "(A eq 1 or B eq 2)"
 * - NOT: { $not: { Status: 'deleted' } } → "not (Status eq 'deleted')"
 * - Complex: { A: 1, $or: [{ B: 2 }, { C: 3 }] } → "A eq 1 and (B eq 2 or C eq 3)"
 */
export function buildFilter(filter: Filter<any>): string {
  // String passthrough
  if (typeof filter === 'string') {
    return filter;
  }

  // Array of filter expressions (AND them together)
  if (Array.isArray(filter)) {
    const parts = filter
      .map(f => buildFilterExpression(f))
      .filter((s): s is string => Boolean(s));
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0]!;
    return parts.join(' and ');
  }

  // Single filter expression
  return buildFilterExpression(filter);
}

/**
 * Check if value is an ExpandNestedOptions object (has query options)
 */
function isExpandNestedOptions(value: any): value is ExpandNestedOptions {
  if (value === true || value === null || typeof value !== 'object') {
    return false;
  }
  const optionKeys = ['select', 'filter', 'top', 'skip', 'orderBy', 'expand'];
  return Object.keys(value).some(key => optionKeys.includes(key));
}

/**
 * Build nested options string for an expanded property
 * Note: We skip $select here because it's handled via path-qualified fields in the main $select
 * (e.g., Products/ProductID) for OData v2 compatibility
 */
function buildNestedExpandOptions(options: ExpandNestedOptions): string {
  const parts: string[] = [];

  // Note: $select is intentionally NOT included here - we use path-qualified fields
  // in the main $select clause (e.g., Products/ProductID) for OData v2 compatibility.
  // This approach works on both OData v2 and v4.

  if (options.filter !== undefined && options.filter !== null) {
    const filterStr = typeof options.filter === 'string'
      ? options.filter
      : buildFilter(options.filter);
    if (filterStr) {
      parts.push(`$filter=${filterStr}`);
    }
  }
  if (options.top !== undefined) {
    parts.push(`$top=${options.top}`);
  }
  if (options.skip !== undefined) {
    parts.push(`$skip=${options.skip}`);
  }
  if (options.orderBy) {
    const orderByStr = typeof options.orderBy === 'string'
      ? options.orderBy
      : buildOrderBy(options.orderBy);
    parts.push(`$orderby=${orderByStr}`);
  }
  if (options.expand) {
    parts.push(`$expand=${buildExpand(options.expand)}`);
  }

  return parts.length > 0 ? `(${parts.join(';')})` : '';
}

/**
 * Build $expand string with nested options support
 *
 * @example
 * - String array: ['Products', 'Category'] → "Products,Category"
 * - Object (simple): { Products: true } → "Products"
 * - Object (nested): { Products: { select: ['Name'], top: 5 } } → "Products($top=5)"
 * - Object (deep): { Category: { expand: { Products: true } } } → "Category($expand=Products)"
 */
function buildExpand(expand: Expand<any>): string {
  // String array: ['Products', 'Category']
  if (Array.isArray(expand)) {
    return expand.join(',');
  }

  // Object format: { Products: true } or { Products: { select: [...] } }
  return Object.entries(expand)
    .map(([property, value]) => {
      // Simple include: { Products: true }
      if (value === true) {
        return property;
      }

      // Nested options: { Products: { select: [...], top: 5 } }
      if (isExpandNestedOptions(value)) {
        return property + buildNestedExpandOptions(value);
      }

      // Just property name if value is falsy
      return property;
    })
    .filter(Boolean)
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
    // Initialize as ExpandObject if not set
    if (!this.options.expand || Array.isArray(this.options.expand)) {
      // Convert string array to object if needed
      const existing = this.options.expand as string[] | undefined;
      this.options.expand = {} as ExpandObject;
      if (existing) {
        for (const prop of existing) {
          (this.options.expand as ExpandObject)[prop] = true;
        }
      }
    }

    if (nested) {
      const nestedBuilder = new QueryBuilder<any>({ list: async () => [] } as any);
      nested(nestedBuilder);
      const nestedOptions = nestedBuilder.buildOptions();

      // Build ExpandNestedOptions
      (this.options.expand as ExpandObject)[property] = {
        select: nestedOptions.select as string[],
        filter: nestedOptions.filter,
        top: nestedOptions.top,
        orderBy: nestedOptions.orderBy,
      };
    } else {
      (this.options.expand as ExpandObject)[property] = true;
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
