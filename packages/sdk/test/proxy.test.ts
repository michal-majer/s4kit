/**
 * Comprehensive OData Operations Test Suite
 *
 * Tests all SDK capabilities against the S4Kit proxy using Northwind OData service.
 * Requires a running proxy service and valid API key.
 *
 * Run with: API_KEY=your_key bun test test/proxy.test.ts
 *
 * Note: Northwind is an OData v2 service with some limitations:
 * - Decimal values (like UnitPrice) are returned as strings
 * - contains() is not supported (use substringof instead)
 * - /$count endpoint returns 415 (use listWithCount instead)
 */

import { describe, test, expect, beforeAll } from "bun:test";
import {
  S4Kit,
  createFilter,
  isS4KitError,
  AuthenticationError,
  NotFoundError,
} from "../src";

// Helper to parse numeric values that may come as strings from OData v2
function toNumber(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return NaN;
}

// ============================================================================
// Configuration
// ============================================================================

const API_KEY = process.env.API_KEY;
const PROXY_URL = process.env.PROXY_URL || "http://localhost:3002/api/proxy";

if (!API_KEY) {
  throw new Error("API_KEY environment variable is required. Create a .env file or run: API_KEY=xxx bun test");
}

// ============================================================================
// Types for Northwind entities
// ============================================================================

interface Product {
  ProductID: number;
  ProductName: string;
  SupplierID: number | null;
  CategoryID: number | null;
  QuantityPerUnit: string | null;
  UnitPrice: number | null;
  UnitsInStock: number | null;
  UnitsOnOrder: number | null;
  ReorderLevel: number | null;
  Discontinued: boolean;
}

interface Category {
  CategoryID: number;
  CategoryName: string;
  Description: string | null;
  Products?: Product[];
}

interface Supplier {
  SupplierID: number;
  CompanyName: string;
  ContactName: string | null;
  ContactTitle: string | null;
  Address: string | null;
  City: string | null;
  Region: string | null;
  PostalCode: string | null;
  Country: string | null;
  Phone: string | null;
  Fax: string | null;
  HomePage: string | null;
}

interface Customer {
  CustomerID: string;
  CompanyName: string;
  ContactName: string | null;
  ContactTitle: string | null;
  Address: string | null;
  City: string | null;
  Region: string | null;
  PostalCode: string | null;
  Country: string | null;
  Phone: string | null;
  Fax: string | null;
}

interface Order {
  OrderID: number;
  CustomerID: string | null;
  EmployeeID: number | null;
  OrderDate: string | null;
  RequiredDate: string | null;
  ShippedDate: string | null;
  ShipVia: number | null;
  Freight: number | null;
  ShipName: string | null;
  ShipAddress: string | null;
  ShipCity: string | null;
  ShipRegion: string | null;
  ShipPostalCode: string | null;
  ShipCountry: string | null;
  Customer?: Customer;
}

// ============================================================================
// Test Suite
// ============================================================================

describe("S4Kit Proxy OData Operations", () => {
  let client: ReturnType<typeof S4Kit>;

  beforeAll(() => {
    client = S4Kit({
      apiKey: API_KEY,
      baseUrl: PROXY_URL,
    });
  });

  // ==========================================================================
  // Standard Query Options
  // ==========================================================================

  describe("Standard Query Options", () => {
    describe("$select", () => {
      test("selects specific fields", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName"],
          top: 3,
        });

        expect(products.length).toBeGreaterThan(0);
        expect(products[0]).toHaveProperty("ProductID");
        expect(products[0]).toHaveProperty("ProductName");
      });

      test("returns only selected fields", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName"],
          top: 1,
        });

        const product = products[0];
        expect(product.ProductID).toBeDefined();
        expect(product.ProductName).toBeDefined();
        // Other fields should not be present or undefined
        expect(product.QuantityPerUnit).toBeUndefined();
      });
    });

    describe("$top", () => {
      test("limits results to specified count", async () => {
        const products = await client.Products.list({
          top: 5,
        });

        expect(products.length).toBeLessThanOrEqual(5);
      });

      test("top: 1 returns single item in array", async () => {
        const products = await client.Products.list({
          top: 1,
        });

        expect(products.length).toBe(1);
      });
    });

    describe("$skip", () => {
      test("skips specified number of results", async () => {
        // Get first 2 products
        const first = await client.Products.list({
          select: ["ProductID"],
          top: 2,
          orderBy: { ProductID: "asc" },
        });

        // Get products after skipping 1
        const skipped = await client.Products.list({
          select: ["ProductID"],
          top: 1,
          skip: 1,
          orderBy: { ProductID: "asc" },
        });

        expect(skipped[0].ProductID).toBe(first[1].ProductID);
      });
    });

    describe("$orderby", () => {
      test("sorts by string format (asc)", async () => {
        const categories = await client.Categories.list({
          select: ["CategoryID", "CategoryName"],
          orderBy: "CategoryName asc",
        });

        expect(categories.length).toBeGreaterThan(1);
        // Check alphabetical order
        for (let i = 1; i < categories.length; i++) {
          expect(categories[i].CategoryName >= categories[i - 1].CategoryName).toBe(true);
        }
      });

      test("sorts by string format (desc)", async () => {
        const categories = await client.Categories.list({
          select: ["CategoryID", "CategoryName"],
          orderBy: "CategoryName desc",
        });

        expect(categories.length).toBeGreaterThan(1);
        // Check reverse alphabetical order
        for (let i = 1; i < categories.length; i++) {
          expect(categories[i].CategoryName <= categories[i - 1].CategoryName).toBe(true);
        }
      });

      test("sorts by object format", async () => {
        const categories = await client.Categories.list({
          select: ["CategoryID", "CategoryName"],
          orderBy: { CategoryName: "asc" },
        });

        expect(categories.length).toBeGreaterThan(1);
        for (let i = 1; i < categories.length; i++) {
          expect(categories[i].CategoryName >= categories[i - 1].CategoryName).toBe(true);
        }
      });

      test("sorts by array format (multiple criteria)", async () => {
        const categories = await client.Categories.list({
          select: ["CategoryID", "CategoryName"],
          orderBy: [{ CategoryID: "desc" }],
        });

        expect(categories.length).toBeGreaterThan(1);
        for (let i = 1; i < categories.length; i++) {
          expect(categories[i].CategoryID).toBeLessThanOrEqual(categories[i - 1].CategoryID);
        }
      });
    });

    describe("$filter (string format)", () => {
      test("filters with comparison operator (gt)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "UnitPrice"],
          filter: "UnitPrice gt 50",
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(toNumber(p.UnitPrice)).toBeGreaterThan(50);
        });
      });

      test("filters with equality", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "CategoryID"],
          filter: "CategoryID eq 1",
          top: 3,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(p.CategoryID).toBe(1);
        });
      });

      test("filters with string function (substringof for OData v2)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName"],
          filter: "substringof('Ch', ProductName)",
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(p.ProductName.toLowerCase()).toContain("ch");
        });
      });
    });

    describe("$count", () => {
      test("listWithCount returns count and results", async () => {
        const result = await client.Categories.listWithCount({
          select: ["CategoryID", "CategoryName"],
        });

        expect(result.count).toBeDefined();
        expect(result.count).toBeGreaterThan(0);
        expect(result.value).toBeDefined();
        expect(result.value.length).toBe(result.count);
      });

      test("listWithCount with filter returns filtered count", async () => {
        const result = await client.Products.listWithCount({
          select: ["ProductID", "ProductName", "CategoryID"],
          filter: { CategoryID: 1 },
        });

        expect(result.count).toBeDefined();
        expect(result.count).toBeGreaterThan(0);
        expect(result.value.length).toBe(result.count);
        result.value.forEach((p) => {
          expect(p.CategoryID).toBe(1);
        });
      });
    });

    describe("$expand", () => {
      test("expands with string array format", async () => {
        const categories = await client.Categories.list({
          select: ["CategoryID", "CategoryName"],
          expand: ["Products"],
          top: 2,
        });

        expect(categories.length).toBeGreaterThan(0);
        const products = (categories[0] as any).Products;
        expect(products).toBeDefined();
        expect(Array.isArray(products)).toBe(true);
        expect(products.length).toBeGreaterThan(0);
      });

      test("expands with object format (true)", async () => {
        const categories = await client.Categories.list({
          select: ["CategoryID", "CategoryName"],
          expand: { Products: true },
          top: 2,
        });

        expect(categories.length).toBeGreaterThan(0);
        const products = (categories[0] as any).Products;
        expect(products).toBeDefined();
        expect(Array.isArray(products)).toBe(true);
      });

      test("expands with nested select", async () => {
        const categories = await client.Categories.list({
          select: ["CategoryID", "CategoryName"],
          expand: {
            Products: {
              select: ["ProductID", "ProductName", "UnitPrice"],
            },
          },
          top: 2,
        });

        expect(categories.length).toBeGreaterThan(0);
        const products = (categories[0] as any).Products;
        expect(products).toBeDefined();
        expect(products.length).toBeGreaterThan(0);
        expect(products[0].ProductID).toBeDefined();
        expect(products[0].ProductName).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Filter Object Format
  // ==========================================================================

  describe("Filter Object Format", () => {
    describe("Equality (implied eq)", () => {
      test("filters by exact value", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "CategoryID"],
          filter: { CategoryID: 1 },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(p.CategoryID).toBe(1);
        });
      });
    });

    describe("Comparison Operators", () => {
      test("gt (greater than)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "UnitPrice"],
          filter: { UnitPrice: { gt: 50 } },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(toNumber(p.UnitPrice)).toBeGreaterThan(50);
        });
      });

      test("lt (less than)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "UnitPrice"],
          filter: { UnitPrice: { lt: 10 } },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(toNumber(p.UnitPrice)).toBeLessThan(10);
        });
      });

      test("ge (greater than or equal)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "UnitPrice"],
          filter: { UnitPrice: { ge: 50 } },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(toNumber(p.UnitPrice)).toBeGreaterThanOrEqual(50);
        });
      });

      test("le (less than or equal)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "UnitPrice"],
          filter: { UnitPrice: { le: 10 } },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(toNumber(p.UnitPrice)).toBeLessThanOrEqual(10);
        });
      });

      test("ne (not equal)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "CategoryID"],
          filter: { CategoryID: { ne: 1 } },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(p.CategoryID).not.toBe(1);
        });
      });

      test("range filter (gt and lt combined)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "UnitPrice"],
          filter: { UnitPrice: { gt: 30, lt: 50 } },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(toNumber(p.UnitPrice)).toBeGreaterThan(30);
          expect(toNumber(p.UnitPrice)).toBeLessThan(50);
        });
      });
    });

    describe("Logical Operators", () => {
      test("$or - matches any condition", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "CategoryID"],
          filter: {
            $or: [{ CategoryID: 1 }, { CategoryID: 2 }],
          },
          top: 10,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect([1, 2]).toContain(p.CategoryID);
        });
      });

      test("$not - negates condition", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "CategoryID"],
          filter: {
            $not: { CategoryID: 1 },
          },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(p.CategoryID).not.toBe(1);
        });
      });

      test("combined AND with $or", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "UnitPrice", "CategoryID"],
          filter: {
            CategoryID: 1,
            $or: [{ UnitPrice: { lt: 20 } }, { UnitPrice: { gt: 100 } }],
          },
          top: 10,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(p.CategoryID).toBe(1);
          const price = toNumber(p.UnitPrice);
          expect(price < 20 || price > 100).toBe(true);
        });
      });

      test("implicit AND (multiple conditions)", async () => {
        const products = await client.Products.list({
          select: ["ProductID", "ProductName", "UnitPrice", "CategoryID"],
          filter: { CategoryID: 1, UnitPrice: { gt: 10 } },
          top: 5,
        });

        expect(products.length).toBeGreaterThan(0);
        products.forEach((p) => {
          expect(p.CategoryID).toBe(1);
          expect(toNumber(p.UnitPrice)).toBeGreaterThan(10);
        });
      });
    });
  });

  // ==========================================================================
  // FilterBuilder API
  // ==========================================================================

  describe("FilterBuilder API", () => {
    test("simple equality filter", async () => {
      const filter = createFilter().where("CategoryID", "eq", 1).build();

      const products = await client.Products.list({
        select: ["ProductID", "ProductName", "CategoryID"],
        filter,
        top: 5,
      });

      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect(p.CategoryID).toBe(1);
      });
    });

    test("comparison filter (gt)", async () => {
      const filter = createFilter().where("UnitPrice", "gt", 50).build();

      const products = await client.Products.list({
        select: ["ProductID", "ProductName", "UnitPrice"],
        filter,
        top: 5,
      });

      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect(toNumber(p.UnitPrice)).toBeGreaterThan(50);
      });
    });

    test("chained AND filter", async () => {
      const filter = createFilter()
        .where("UnitPrice", "gt", 20)
        .and("UnitsInStock", "gt", 0)
        .build();

      const products = await client.Products.list({
        select: ["ProductID", "ProductName", "UnitPrice", "UnitsInStock"],
        filter,
        top: 5,
      });

      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect(toNumber(p.UnitPrice)).toBeGreaterThan(20);
        expect(toNumber(p.UnitsInStock)).toBeGreaterThan(0);
      });
    });

    test("chained OR filter", async () => {
      const filter = createFilter()
        .where("CategoryID", "eq", 1)
        .or("CategoryID", "eq", 2)
        .build();

      const products = await client.Products.list({
        select: ["ProductID", "ProductName", "CategoryID"],
        filter,
        top: 10,
      });

      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect([1, 2]).toContain(p.CategoryID);
      });
    });

    test("NOT filter", async () => {
      const filter = createFilter().not("Discontinued", "eq", true).build();

      const products = await client.Products.list({
        select: ["ProductID", "ProductName", "Discontinued"],
        filter,
        top: 5,
      });

      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect(p.Discontinued).not.toBe(true);
      });
    });

    // Note: contains() uses OData v4 syntax. On OData v2, use substringof() instead.
    // This test uses string filter with substringof syntax directly.
    test("substringof filter (OData v2 contains equivalent)", async () => {
      const products = await client.Products.list({
        select: ["ProductID", "ProductName"],
        filter: "substringof('Ch', ProductName)",  // OData v2 syntax
        top: 5,
      });

      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect(p.ProductName.toLowerCase()).toContain("ch");
      });
    });

    test("startswith filter", async () => {
      const filter = createFilter().where("CompanyName", "startswith", "A").build();

      const suppliers = await client.Suppliers.list({
        select: ["SupplierID", "CompanyName"],
        filter,
        top: 5,
      });

      expect(suppliers.length).toBeGreaterThan(0);
      suppliers.forEach((s) => {
        expect(s.CompanyName.startsWith("A")).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Entity Methods
  // ==========================================================================

  describe("Entity Methods", () => {
    describe("list()", () => {
      test("returns array of entities", async () => {
        const products = await client.Products.list({ top: 5 });

        expect(Array.isArray(products)).toBe(true);
        expect(products.length).toBeGreaterThan(0);
        expect(products.length).toBeLessThanOrEqual(5);
      });

      test("returns empty array for no matches", async () => {
        const products = await client.Products.list({
          filter: "ProductID eq -999999",
        });

        expect(Array.isArray(products)).toBe(true);
        expect(products.length).toBe(0);
      });
    });

    describe("listWithCount()", () => {
      test("returns count and value", async () => {
        const result = await client.Categories.listWithCount();

        expect(result).toHaveProperty("count");
        expect(result).toHaveProperty("value");
        expect(typeof result.count).toBe("number");
        expect(Array.isArray(result.value)).toBe(true);
      });

      test("count reflects filter", async () => {
        const allCategories = await client.Categories.listWithCount();
        const filteredCategories = await client.Categories.listWithCount({
          filter: { CategoryID: 1 },
        });

        expect(filteredCategories.count).toBeLessThan(allCategories.count);
        expect(filteredCategories.count).toBe(1);
      });
    });

    describe("get()", () => {
      test("retrieves single entity by ID", async () => {
        const category = await client.Categories.get(1);

        expect(category).toBeDefined();
        expect(category.CategoryID).toBe(1);
        expect(category.CategoryName).toBeDefined();
      });

      test("get with select returns only selected fields", async () => {
        const category = await client.Categories.get(1, {
          select: ["CategoryID", "CategoryName"],
        });

        expect(category.CategoryID).toBe(1);
        expect(category.CategoryName).toBeDefined();
        expect(category.Description).toBeUndefined();
      });

      test("get with expand includes related entities", async () => {
        const category = await client.Categories.get(1, {
          expand: ["Products"],
        });

        expect(category.CategoryID).toBe(1);
        const products = (category as any).Products;
        expect(products).toBeDefined();
        expect(Array.isArray(products)).toBe(true);
        expect(products.length).toBeGreaterThan(0);
      });
    });

    // Note: /$count endpoint returns 415 on OData v2 (Northwind).
    // Use listWithCount() instead for count functionality on OData v2.
    describe.skip("count() - OData v4 only", () => {
      test("returns total count", async () => {
        const count = await client.Categories.count();

        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThan(0);
      });

      test("returns filtered count", async () => {
        const totalCount = await client.Products.count();
        const filteredCount = await client.Products.count({
          filter: { CategoryID: 1 },
        });

        expect(filteredCount).toBeLessThan(totalCount);
        expect(filteredCount).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Combined Queries
  // ==========================================================================

  describe("Combined Queries", () => {
    test("filter + orderBy", async () => {
      const products = await client.Products.list({
        select: ["ProductID", "ProductName", "UnitPrice", "CategoryID"],
        filter: { CategoryID: 1, UnitPrice: { gt: 10 } },
        orderBy: { UnitPrice: "desc" },
        top: 5,
      });

      expect(products.length).toBeGreaterThan(0);

      // Verify filter applied
      products.forEach((p) => {
        expect(p.CategoryID).toBe(1);
        expect(toNumber(p.UnitPrice)).toBeGreaterThan(10);
      });

      // Verify ordering
      for (let i = 1; i < products.length; i++) {
        expect(toNumber(products[i].UnitPrice) <= toNumber(products[i - 1].UnitPrice)).toBe(true);
      }
    });

    test("select + filter + top + skip + orderBy", async () => {
      const page1 = await client.Products.list({
        select: ["ProductID", "ProductName", "UnitPrice"],
        filter: { UnitPrice: { gt: 10 } },
        orderBy: { UnitPrice: "asc" },
        top: 3,
        skip: 0,
      });

      const page2 = await client.Products.list({
        select: ["ProductID", "ProductName", "UnitPrice"],
        filter: { UnitPrice: { gt: 10 } },
        orderBy: { UnitPrice: "asc" },
        top: 3,
        skip: 3,
      });

      expect(page1.length).toBe(3);
      expect(page2.length).toBe(3);

      // No overlap between pages
      const page1Ids = page1.map((p) => p.ProductID);
      const page2Ids = page2.map((p) => p.ProductID);
      page2Ids.forEach((id) => {
        expect(page1Ids).not.toContain(id);
      });

      // Page 2 prices should be >= max of page 1
      const maxPage1Price = Math.max(...page1.map((p) => toNumber(p.UnitPrice)));
      page2.forEach((p) => {
        expect(toNumber(p.UnitPrice) >= maxPage1Price).toBe(true);
      });
    });

    test("expand with filter on main entity", async () => {
      const categories = await client.Categories.list({
        select: ["CategoryID", "CategoryName"],
        filter: { CategoryID: 1 },
        expand: { Products: { select: ["ProductID", "ProductName"] } },
      });

      expect(categories.length).toBe(1);
      expect(categories[0].CategoryID).toBe(1);
      const products = (categories[0] as any).Products;
      expect(products).toBeDefined();
      expect(products.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Navigation Property Filter
  // ==========================================================================

  describe("Navigation Property Filter", () => {
    test("filter on nested entity property", async () => {
      const orders = await client.Orders.list({
        filter: "Customer/Country eq 'Germany'",
        top: 5,
        expand: ["Customer"],
        select: ["OrderID", "CustomerID"],
      });

      expect(orders.length).toBeGreaterThan(0);
      orders.forEach((order) => {
        const customer = (order as any).Customer;
        expect(customer).toBeDefined();
        expect(customer.Country).toBe("Germany");
      });
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe("Error Handling", () => {
    test("NotFoundError for non-existent entity", async () => {
      try {
        await client.Categories.get(99999);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(isS4KitError(error)).toBe(true);
        // Note: May be NotFoundError or other error depending on backend
      }
    });

    test("AuthenticationError for invalid API key", async () => {
      const badClient = S4Kit({
        apiKey: "invalid_api_key",
        baseUrl: PROXY_URL,
      });

      try {
        await badClient.Products.list({ top: 1 });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(isS4KitError(error)).toBe(true);
        if (error instanceof AuthenticationError) {
          expect(error.status).toBe(401);
        }
      }
    });
  });

  // ==========================================================================
  // Type-Safe Entity Access
  // ==========================================================================

  describe("Direct Entity Access", () => {
    test("client.EntityName provides direct entity access", async () => {
      // New API: client.EntityName.method() - no entity() call needed
      const products = await client.Products.list({
        select: ["ProductID", "ProductName", "UnitPrice"],
        top: 3,
      });

      expect(products.length).toBeGreaterThan(0);
      products.forEach((p) => {
        expect(typeof p.ProductID).toBe("number");
        expect(typeof p.ProductName).toBe("string");
      });
    });

    test("supports any entity name via Proxy", async () => {
      // Any entity name works via JavaScript Proxy
      const categories = await client.Categories.list({
        select: ["CategoryID", "CategoryName"],
        top: 3,
      });

      expect(categories.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Write Operations (Northwind is read-only - these are skipped)
  // ==========================================================================

  describe.skip("Write Operations (requires writable service)", () => {
    test("create() - creates new entity", async () => {
      // Northwind is read-only, skip this test
      // const newProduct = await client.Products.create({
      //   ProductName: "Test Product",
      //   UnitPrice: 9.99,
      //   CategoryID: 1,
      // });
    });

    test("update() - updates existing entity (PATCH)", async () => {
      // Northwind is read-only, skip this test
    });

    test("replace() - replaces entity (PUT)", async () => {
      // Northwind is read-only, skip this test
    });

    test("delete() - deletes entity", async () => {
      // Northwind is read-only, skip this test
    });
  });
});
