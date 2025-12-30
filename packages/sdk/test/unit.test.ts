import { describe, test, expect } from "bun:test";
import {
  // Query building
  buildQuery,
  createFilter,
  FilterBuilder,
  formatKey,
  buildFunctionParams,

  // Errors
  S4KitError,
  NetworkError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  parseHttpError,
  parseODataError,
  isRetryable,
  isS4KitError,
} from "../src";

// ============================================================================
// Query Builder Tests
// ============================================================================

describe("buildQuery", () => {
  test("returns empty object for undefined options", () => {
    expect(buildQuery(undefined)).toEqual({});
  });

  test("returns empty object for empty options", () => {
    expect(buildQuery({})).toEqual({});
  });

  test("builds $select correctly", () => {
    const result = buildQuery({ select: ['Name', 'Price'] as any });
    expect(result).toEqual({ '$select': 'Name,Price' });
  });

  test("builds $filter correctly", () => {
    const result = buildQuery({ filter: "Name eq 'Test'" });
    expect(result).toEqual({ '$filter': "Name eq 'Test'" });
  });

  test("builds $top correctly", () => {
    const result = buildQuery({ top: 10 });
    expect(result).toEqual({ '$top': '10' });
  });

  test("builds $skip correctly", () => {
    const result = buildQuery({ skip: 20 });
    expect(result).toEqual({ '$skip': '20' });
  });

  test("builds $orderby correctly from string", () => {
    const result = buildQuery({ orderBy: 'Name desc' });
    expect(result).toEqual({ '$orderby': 'Name desc' });
  });

  test("builds $orderby correctly from object", () => {
    const result = buildQuery({ orderBy: { Name: 'asc' } });
    expect(result).toEqual({ '$orderby': 'Name asc' });
  });

  test("builds $orderby correctly from array", () => {
    const result = buildQuery({
      orderBy: [
        { Name: 'asc' },
        { Price: 'desc' }
      ]
    });
    expect(result).toEqual({ '$orderby': 'Name asc,Price desc' });
  });

  test("builds $expand correctly from array", () => {
    const result = buildQuery({ expand: ['Products', 'Supplier'] });
    expect(result).toEqual({ '$expand': 'Products,Supplier' });
  });

  test("builds $expand from object with true (simple)", () => {
    const result = buildQuery({ expand: { Products: true, Category: true } });
    expect(result['$expand']).toBe('Products,Category');
  });

  test("builds $expand from object with nested options", () => {
    const result = buildQuery({
      select: ['ID'],  // Need a main select to merge expand paths into
      expand: {
        Products: {
          select: ['Name', 'Price'],
          top: 10,
          orderBy: { Price: 'desc' }
        }
      }
    } as any);
    expect(result['$expand']).toContain('Products');
    // Note: $select is handled via path-qualified fields in main $select, not nested
    expect(result['$expand']).toContain('$top=10');
    expect(result['$expand']).toContain('$orderby=Price desc');
    // Check that select fields are added to main $select
    expect(result['$select']).toContain('Products/Name');
    expect(result['$select']).toContain('Products/Price');
  });

  test("builds $expand from object with filter object", () => {
    const result = buildQuery({
      expand: {
        Products: {
          filter: { Price: { gt: 100 } }
        }
      }
    } as any);
    expect(result['$expand']).toContain('Products');
    expect(result['$expand']).toContain('$filter=Price gt 100');
  });

  test("builds $expand with deep nesting", () => {
    const result = buildQuery({
      expand: {
        Category: {
          expand: { Products: true }
        }
      }
    } as any);
    expect(result['$expand']).toContain('Category');
    expect(result['$expand']).toContain('$expand=Products');
  });

  test("builds $expand with multiple properties", () => {
    const result = buildQuery({
      select: ['ID'],  // Need a main select to merge expand paths into
      expand: { Products: true, Category: { select: ['Name'] } }
    } as any);
    expect(result['$expand']).toContain('Products');
    expect(result['$expand']).toContain('Category');
    // Category/Name should be in select
    expect(result['$select']).toContain('Category/Name');
  });

  test("builds $count correctly", () => {
    const result = buildQuery({ count: true });
    expect(result).toEqual({ '$count': 'true' });
  });

  test("builds $search correctly", () => {
    const result = buildQuery({ search: 'laptop' });
    expect(result).toEqual({ '$search': 'laptop' });
  });

  test("builds complex query with all options", () => {
    const result = buildQuery({
      select: ['Name', 'Price'] as any,
      filter: "Category eq 'Electronics'",
      top: 10,
      skip: 0,
      orderBy: 'Name asc',
      expand: ['Supplier'],
      count: true,
      search: 'laptop'
    });

    // When using expand with select, navigation property paths are auto-added
    expect(result['$select']).toBe('Name,Price,Supplier');
    expect(result['$filter']).toBe("Category eq 'Electronics'");
    expect(result['$top']).toBe('10');
    expect(result['$skip']).toBe('0');
    expect(result['$orderby']).toBe('Name asc');
    expect(result['$expand']).toBe('Supplier');
    expect(result['$count']).toBe('true');
    expect(result['$search']).toBe('laptop');
  });
});

// ============================================================================
// Filter Builder Tests
// ============================================================================

describe("FilterBuilder", () => {
  test("builds simple equality filter", () => {
    const filter = createFilter().where('Name', 'eq', 'Test').build();
    expect(filter).toBe("Name eq 'Test'");
  });

  test("builds numeric equality filter", () => {
    const filter = createFilter().where('Price', 'eq', 100).build();
    expect(filter).toBe("Price eq 100");
  });

  test("builds boolean filter", () => {
    const filter = createFilter().where('Active', 'eq', true).build();
    expect(filter).toBe("Active eq true");
  });

  test("builds null filter", () => {
    const filter = createFilter().where('DeletedAt', 'eq', null).build();
    expect(filter).toBe("DeletedAt eq null");
  });

  test("builds greater than filter", () => {
    const filter = createFilter().where('Price', 'gt', 100).build();
    expect(filter).toBe("Price gt 100");
  });

  test("builds contains filter", () => {
    const filter = createFilter().where('Name', 'contains', 'Pro').build();
    expect(filter).toBe("contains(Name,'Pro')");
  });

  test("builds startswith filter", () => {
    const filter = createFilter().where('Name', 'startswith', 'Acme').build();
    expect(filter).toBe("startswith(Name,'Acme')");
  });

  test("builds endswith filter", () => {
    const filter = createFilter().where('Email', 'endswith', '@example.com').build();
    expect(filter).toBe("endswith(Email,'@example.com')");
  });

  test("builds in filter", () => {
    const filter = createFilter().where('Status', 'in', ['active', 'pending']).build();
    expect(filter).toBe("Status in ('active','pending')");
  });

  test("chains filters with AND", () => {
    const filter = createFilter()
      .where('Price', 'gt', 100)
      .and('Category', 'eq', 'Electronics')
      .build();
    expect(filter).toBe("Price gt 100 and Category eq 'Electronics'");
  });

  test("chains filters with OR", () => {
    const filter = createFilter()
      .where('Category', 'eq', 'Electronics')
      .or('Category', 'eq', 'Computers')
      .build();
    expect(filter).toBe("Category eq 'Electronics' or Category eq 'Computers'");
  });

  test("builds NOT filter", () => {
    const filter = createFilter()
      .not('Deleted', 'eq', true)
      .build();
    expect(filter).toBe("not Deleted eq true");
  });

  test("groups conditions", () => {
    const filter = createFilter()
      .where('Category', 'eq', 'Electronics')
      .group(b => b.where('Price', 'gt', 100).or('Featured', 'eq', true))
      .build();
    expect(filter).toContain('(');
    expect(filter).toContain(')');
  });

  test("handles raw expressions", () => {
    const filter = createFilter()
      .raw("year(CreatedAt) eq 2024")
      .build();
    expect(filter).toBe("year(CreatedAt) eq 2024");
  });

  test("escapes single quotes in strings", () => {
    const filter = createFilter().where('Name', 'eq', "O'Reilly").build();
    expect(filter).toBe("Name eq 'O''Reilly'");
  });
});

// ============================================================================
// Key Formatting Tests
// ============================================================================

describe("formatKey", () => {
  test("formats number keys", () => {
    expect(formatKey(123)).toBe('123');
  });

  test("formats string keys with quotes", () => {
    expect(formatKey('ABC')).toBe("'ABC'");
  });

  test("formats GUID keys without quotes", () => {
    expect(formatKey('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  test("formats composite keys", () => {
    const key = formatKey({ OrderID: 'ORD001', ItemNo: 10 });
    expect(key).toContain("OrderID='ORD001'");
    expect(key).toContain("ItemNo=10");
    expect(key).toContain(',');
  });

  test("escapes single quotes in keys", () => {
    expect(formatKey("O'Brien")).toBe("'O''Brien'");
  });
});

// ============================================================================
// Function Parameters Tests
// ============================================================================

describe("buildFunctionParams", () => {
  test("returns empty string for undefined params", () => {
    expect(buildFunctionParams(undefined)).toBe('');
  });

  test("returns empty string for empty params", () => {
    expect(buildFunctionParams({})).toBe('');
  });

  test("formats string parameters", () => {
    expect(buildFunctionParams({ name: 'Test' })).toBe("name='Test'");
  });

  test("formats numeric parameters", () => {
    expect(buildFunctionParams({ count: 10 })).toBe("count=10");
  });

  test("formats boolean parameters", () => {
    expect(buildFunctionParams({ active: true })).toBe("active=true");
  });

  test("formats null parameters", () => {
    expect(buildFunctionParams({ value: null })).toBe("value=null");
  });

  test("formats multiple parameters", () => {
    const params = buildFunctionParams({ name: 'Test', count: 10 });
    expect(params).toContain("name='Test'");
    expect(params).toContain("count=10");
    expect(params).toContain(',');
  });
});

// ============================================================================
// Error Classes Tests
// ============================================================================

describe("S4KitError", () => {
  test("creates error with message", () => {
    const error = new S4KitError("Something went wrong");
    expect(error.message).toBe("Something went wrong");
    expect(error.name).toBe("S4KitError");
  });

  test("includes status code", () => {
    const error = new S4KitError("Not found", { status: 404 });
    expect(error.status).toBe(404);
  });

  test("includes error code", () => {
    const error = new S4KitError("Error", { code: 'VALIDATION_ERROR' });
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  test("includes OData error details", () => {
    const odataError = { code: 'SY/123', message: 'Field is required' };
    const error = new S4KitError("Validation failed", { odataError });
    expect(error.odataError).toEqual(odataError);
  });

  test("friendlyMessage returns OData message when available", () => {
    const error = new S4KitError("Error", {
      odataError: { code: 'ERR', message: 'Friendly message' }
    });
    expect(error.friendlyMessage).toBe('Friendly message');
  });

  test("hasCode checks both code and odataError.code", () => {
    const error = new S4KitError("Error", {
      code: 'CODE1',
      odataError: { code: 'CODE2', message: 'Message' }
    });
    expect(error.hasCode('CODE1')).toBe(true);
    expect(error.hasCode('CODE2')).toBe(true);
    expect(error.hasCode('CODE3')).toBe(false);
  });

  test("toJSON returns serializable object", () => {
    const error = new S4KitError("Error", { status: 400, code: 'BAD_REQUEST' });
    const json = error.toJSON();
    expect(json.name).toBe('S4KitError');
    expect(json.message).toBe('Error');
    expect(json.status).toBe(400);
    expect(json.code).toBe('BAD_REQUEST');
  });
});

describe("Specialized error classes", () => {
  test("NetworkError has correct name and code", () => {
    const error = new NetworkError("Connection failed");
    expect(error.name).toBe("NetworkError");
    expect(error.code).toBe("NETWORK_ERROR");
  });

  test("AuthenticationError has status 401", () => {
    const error = new AuthenticationError();
    expect(error.name).toBe("AuthenticationError");
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
  });

  test("NotFoundError formats entity and id", () => {
    const error = new NotFoundError("Product", "123");
    expect(error.message).toBe("Product(123) not found");
    expect(error.status).toBe(404);
  });

  test("NotFoundError handles entity only", () => {
    const error = new NotFoundError("Product");
    expect(error.message).toBe("Product not found");
  });

  test("ValidationError parses field errors", () => {
    const error = new ValidationError("Validation failed", {
      odataError: {
        code: 'VALIDATION',
        message: 'Validation failed',
        details: [
          { code: 'REQUIRED', message: 'Name is required', target: 'Name' },
          { code: 'INVALID', message: 'Price must be positive', target: 'Price' }
        ]
      }
    });
    expect(error.getFieldError('Name')).toBe('Name is required');
    expect(error.getFieldError('Price')).toBe('Price must be positive');
    expect(error.hasFieldError('Name')).toBe(true);
    expect(error.hasFieldError('Unknown')).toBe(false);
  });

  test("RateLimitError includes retry after", () => {
    const error = new RateLimitError(60);
    expect(error.retryAfter).toBe(60);
    expect(error.message).toContain('60 seconds');
  });
});

// ============================================================================
// Error Parsing Tests
// ============================================================================

describe("parseHttpError", () => {
  test("returns ValidationError for 400", () => {
    const error = parseHttpError(400, { error: { code: 'BAD_REQUEST', message: 'Invalid data' } });
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.status).toBe(400);
  });

  test("returns AuthenticationError for 401", () => {
    const error = parseHttpError(401, {});
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.status).toBe(401);
  });

  test("returns NotFoundError for 404", () => {
    const error = parseHttpError(404, {});
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.status).toBe(404);
  });

  test("returns RateLimitError for 429", () => {
    const error = parseHttpError(429, {});
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.status).toBe(429);
  });
});

describe("parseODataError", () => {
  test("parses OData v4 format", () => {
    const result = parseODataError({
      error: { code: 'ERR001', message: 'Something failed' }
    });
    expect(result?.code).toBe('ERR001');
    expect(result?.message).toBe('Something failed');
  });

  test("parses OData v2 format", () => {
    const result = parseODataError({
      error: { code: 'ERR001', message: { value: 'Something failed' } }
    });
    expect(result?.message).toBe('Something failed');
  });

  test("returns undefined for non-OData body", () => {
    expect(parseODataError(null)).toBeUndefined();
    expect(parseODataError({})).toBeUndefined();
  });
});

describe("isRetryable", () => {
  test("NetworkError is retryable", () => {
    expect(isRetryable(new NetworkError("Connection failed"))).toBe(true);
  });

  test("RateLimitError is retryable", () => {
    expect(isRetryable(new RateLimitError())).toBe(true);
  });

  test("AuthenticationError is not retryable", () => {
    expect(isRetryable(new AuthenticationError())).toBe(false);
  });

  test("ValidationError is not retryable", () => {
    expect(isRetryable(new ValidationError("Invalid"))).toBe(false);
  });
});

describe("isS4KitError", () => {
  test("returns true for S4KitError", () => {
    expect(isS4KitError(new S4KitError("Error"))).toBe(true);
  });

  test("returns true for subclasses", () => {
    expect(isS4KitError(new NetworkError("Error"))).toBe(true);
    expect(isS4KitError(new ValidationError("Error"))).toBe(true);
  });

  test("returns false for regular Error", () => {
    expect(isS4KitError(new Error("Error"))).toBe(false);
  });

  test("returns false for non-errors", () => {
    expect(isS4KitError("error")).toBe(false);
    expect(isS4KitError(null)).toBe(false);
    expect(isS4KitError(undefined)).toBe(false);
  });
});
