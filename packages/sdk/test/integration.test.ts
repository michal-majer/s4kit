import { describe, test, expect, beforeAll } from "bun:test";
import { S4Kit } from "../src";

// Using the Northwind public OData service
const BASE_URL = 'https://services.odata.org/northwind/northwind.svc';
// Fake API key as it's public
const API_KEY = 'sk_test_123';

function extractList(response: any): any[] {
  if (Array.isArray(response)) return response;
  if (response.value && Array.isArray(response.value)) return response.value;
  if (response.d) {
    if (Array.isArray(response.d)) return response.d;
    if (response.d.results && Array.isArray(response.d.results)) return response.d.results;
  }
  return [];
}

describe("S4Kit Integration Tests (Northwind)", () => {
  let client: S4Kit;

  beforeAll(() => {
    client = new S4Kit({
      baseUrl: BASE_URL,
      apiKey: API_KEY
    });
  });

  test("List Suppliers with Select and Top", async () => {
    const response = await client.sap.Suppliers.list({
      select: ['SupplierID', 'CompanyName', 'ContactName'],
      top: 5,
    });
    
    const suppliers = extractList(response);

    expect(Array.isArray(suppliers)).toBe(true);
    // Since we requested top 5, we should get 5 or fewer results
    expect(suppliers.length).toBeLessThanOrEqual(5);
    expect(suppliers.length).toBeGreaterThan(0);

    const firstSupplier = suppliers[0];
    expect(firstSupplier).toHaveProperty('SupplierID');
    expect(firstSupplier).toHaveProperty('CompanyName');
    expect(firstSupplier).toHaveProperty('ContactName');
  });

  test("Get Category with Expand Products", async () => {
    // Category 3 is usually Confections in Northwind
    const category = await client.sap.Categories.get(3, {
      expand: ['Products']
    });

    expect(category).toBeDefined();
    expect(category.CategoryID).toBe(3);
    expect(category.CategoryName).toBeDefined();

    // Check expansion
    // Products might be direct array or wrapped in results for V2
    const products = extractList(category.Products || []);
    
    expect(products).toBeDefined();
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
    
    const firstProduct = products[0];
    expect(firstProduct).toHaveProperty('ProductName');
  });

  test("Filter on Nested Entity (Orders where Customer/Country is Germany)", async () => {
    const response = await client.sap.Orders.list({
      filter: "Customer/Country eq 'Germany'",
      top: 5,
      expand: ['Customer'],
      select: ['OrderID', 'CustomerID', 'Customer']
    });

    const orders = extractList(response);
    
    expect(Array.isArray(orders)).toBe(true);
    
    if (orders.length > 0) {
      const order = orders[0];
      expect(order.Customer).toBeDefined();
      expect(order.Customer.Country).toBe('Germany');
    } else {
      console.warn("No orders found for Germany, skipping assertions on content");
    }
  });
});
