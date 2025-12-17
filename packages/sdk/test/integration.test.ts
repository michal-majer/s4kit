import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { S4Kit } from "../src";

// Platform backend URL (adjust if needed)
const PLATFORM_URL = process.env.PLATFORM_URL || 'http://localhost:3000';
// Test organization ID (using a fixed UUID for tests)
const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

// Northwind OData service details
const NORTHWIND_BASE_URL = 'https://services.odata.org';
const NORTHWIND_SERVICE_PATH = '/northwind/northwind.svc';

function extractList(response: any): any[] {
  if (Array.isArray(response)) return response;
  // Handle proxy response format: { data: [...] }
  if (response.data && Array.isArray(response.data)) return response.data;
  if (response.value && Array.isArray(response.value)) return response.value;
  if (response.d) {
    if (Array.isArray(response.d)) return response.d;
    if (response.d.results && Array.isArray(response.d.results)) return response.d.results;
  }
  return [];
}

function extractEntity(response: any): any {
  // Handle proxy response format: { data: {...} }
  if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }
  // Handle OData v2 format: { d: {...} }
  if (response.d && typeof response.d === 'object') {
    return response.d;
  }
  return response;
}

describe("S4Kit Integration Tests (Northwind via Platform)", () => {
  let client: S4Kit;
  let apiKey: string;
  let apiKeyId: string;
  let connectionId: string;
  let serviceId: string;
  let connectionServiceId: string;

  beforeAll(async () => {
    // Generate unique alias with timestamp to avoid conflicts
    const uniqueSuffix = Date.now().toString(36);
    const serviceAlias = `northwind-${uniqueSuffix}`;

    // Step 1: Create connection (Northwind)
    const connectionResponse = await fetch(`${PLATFORM_URL}/admin/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Northwind Test Connection',
        baseUrl: NORTHWIND_BASE_URL,
        authType: 'none',
        environment: 'dev',
        organizationId: TEST_ORG_ID
      })
    });
    
    if (!connectionResponse.ok) {
      const error = await connectionResponse.text();
      throw new Error(`Failed to create connection: ${connectionResponse.status} ${error}`);
    }
    
    const connection = await connectionResponse.json() as { id: string };
    connectionId = connection.id;
    console.log('Created connection:', connectionId);

    // Step 2: Create service (Northwind)
    const serviceResponse = await fetch(`${PLATFORM_URL}/admin/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Northwind OData Service',
        alias: serviceAlias,
        servicePath: NORTHWIND_SERVICE_PATH,
        description: 'Northwind public OData service for testing',
        organizationId: TEST_ORG_ID,
        entities: []
      })
    });
    
    if (!serviceResponse.ok) {
      const error = await serviceResponse.text();
      throw new Error(`Failed to create service: ${serviceResponse.status} ${error}`);
    }
    
    const service = await serviceResponse.json() as { id: string };
    serviceId = service.id;
    console.log('Created service:', serviceId);

    // Step 3: Create connection-service (link connection to service)
    const connectionServiceResponse = await fetch(`${PLATFORM_URL}/admin/connection-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionId,
        serviceId: serviceId
      })
    });
    
    if (!connectionServiceResponse.ok) {
      const error = await connectionServiceResponse.text();
      throw new Error(`Failed to create connection-service: ${connectionServiceResponse.status} ${error}`);
    }
    
    const connectionService = await connectionServiceResponse.json() as { id: string };
    connectionServiceId = connectionService.id;
    console.log('Created connection-service:', connectionServiceId);

    // Step 3.5: Sync entities from Northwind metadata (must be after connection-service is created)
    const syncResponse = await fetch(`${PLATFORM_URL}/admin/services/${serviceId}/sync-entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionId,
        merge: true
      })
    });
    
    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      throw new Error(`Failed to sync entities: ${syncResponse.status} ${errorText}`);
    }
    
    const syncData = await syncResponse.json() as { discovered: number; added: number };
    console.log(`Synced ${syncData.discovered} entities, added ${syncData.added} new ones`);

    // Step 4: Generate API key with access grants
    const apiKeyResponse = await fetch(`${PLATFORM_URL}/admin/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test API Key',
        description: 'API key for integration tests',
        organizationId: TEST_ORG_ID,
        environment: 'dev',
        rateLimitPerMinute: 1000,
        rateLimitPerDay: 100000,
        accessGrants: [{
          connectionServiceId: connectionServiceId,
          permissions: {
            '*': ['read'] // Allow read access to all entities
          }
        }]
      })
    });
    
    if (!apiKeyResponse.ok) {
      const error = await apiKeyResponse.text();
      throw new Error(`Failed to create API key: ${apiKeyResponse.status} ${error}`);
    }
    
    const apiKeyData = await apiKeyResponse.json() as { id: string; secretKey: string; displayKey: string };
    apiKey = apiKeyData.secretKey;
    apiKeyId = apiKeyData.id;
    console.log('Generated API key:', apiKeyData.displayKey);

    // Step 5: Initialize SDK client with platform URL and API key
    client = new S4Kit({
      baseUrl: `${PLATFORM_URL}/api/proxy`,
      apiKey: apiKey
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
    const response = await client.sap.Categories.get(3, {
      expand: ['Products']
    });

    const category = extractEntity(response);
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

  afterAll(async () => {
    // Clean up resources in reverse order of creation
    // Step 1: Delete API key
    if (apiKeyId) {
      try {
        const deleteResponse = await fetch(`${PLATFORM_URL}/admin/api-keys/${apiKeyId}`, {
          method: 'DELETE'
        });
        if (deleteResponse.ok) {
          console.log('Deleted API key:', apiKeyId);
        } else {
          console.warn('Failed to delete API key:', await deleteResponse.text());
        }
      } catch (error) {
        console.warn('Error deleting API key:', error);
      }
    }

    // Step 2: Delete connection-service
    if (connectionServiceId) {
      try {
        const deleteResponse = await fetch(`${PLATFORM_URL}/admin/connection-services/${connectionServiceId}`, {
          method: 'DELETE'
        });
        if (deleteResponse.ok) {
          console.log('Deleted connection-service:', connectionServiceId);
        } else {
          console.warn('Failed to delete connection-service:', await deleteResponse.text());
        }
      } catch (error) {
        console.warn('Error deleting connection-service:', error);
      }
    }

    // Step 3: Delete service
    if (serviceId) {
      try {
        const deleteResponse = await fetch(`${PLATFORM_URL}/admin/services/${serviceId}`, {
          method: 'DELETE'
        });
        if (deleteResponse.ok) {
          console.log('Deleted service:', serviceId);
        } else {
          console.warn('Failed to delete service:', await deleteResponse.text());
        }
      } catch (error) {
        console.warn('Error deleting service:', error);
      }
    }

    // Step 4: Delete connection
    if (connectionId) {
      try {
        const deleteResponse = await fetch(`${PLATFORM_URL}/admin/connections/${connectionId}`, {
          method: 'DELETE'
        });
        if (deleteResponse.ok) {
          console.log('Deleted connection:', connectionId);
        } else {
          console.warn('Failed to delete connection:', await deleteResponse.text());
        }
      } catch (error) {
        console.warn('Error deleting connection:', error);
      }
    }
  });
});
