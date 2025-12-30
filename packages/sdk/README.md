# S4Kit

The simplest way to integrate with SAP S/4HANA.

```typescript
const customers = await client.Customers.list({ top: 10 });
```

## Install

```bash
npm install s4kit
```

## Quick Start

```typescript
import { S4Kit } from 's4kit';

const client = S4Kit({
  apiKey: 'sk_live_...',
  baseUrl: 'https://api.s4kit.com/api/proxy'
});

// List
const customers = await client.Customers.list({ top: 10 });

// Get
const customer = await client.Customers.get('ALFKI');

// Create
const created = await client.Customers.create({
  CustomerID: 'NEWCO',
  CompanyName: 'New Company'
});

// Update
await client.Customers.update('NEWCO', { CompanyName: 'Updated Name' });

// Delete
await client.Customers.delete('NEWCO');
```

## Type Safety

Generate types for full autocomplete and type checking:

```bash
npx s4kit generate-types --api-key sk_live_... --output ./types
```

```typescript
import { S4Kit } from 's4kit';
import './types';  // Enable type inference

const client = S4Kit({ apiKey: 'sk_live_...' });

// Full autocomplete on entity names
const customers = await client.Customers.list({
  select: ['CustomerID', 'CompanyName', 'City'],  // Type-safe fields
  filter: { City: 'Berlin' },
  top: 10
});

// customers is Customer[], not any[]
customers.forEach(c => {
  console.log(c.CompanyName);  // Autocomplete works!
});
```

## Query Options

```typescript
await client.Products.list({
  // Select fields
  select: ['ProductID', 'ProductName', 'UnitPrice'],

  // Filter - multiple formats
  filter: { Category: 'Beverages' },                    // Simple equality
  filter: { UnitPrice: { gt: 20 } },                    // Operators: gt, lt, ge, le, ne
  filter: { ProductName: { contains: 'Ch' } },          // String: contains, startswith, endswith
  filter: "UnitPrice gt 20 and Category eq 'Beverages'", // Raw OData

  // Pagination
  top: 10,
  skip: 20,

  // Sorting
  orderBy: { UnitPrice: 'desc' },
  orderBy: [{ Category: 'asc' }, { ProductName: 'asc' }],

  // Expand relations
  expand: ['Category', 'Supplier'],
  expand: {
    Category: true,
    Supplier: { select: ['CompanyName'] }
  }
});
```

## Count & Pagination

```typescript
// Get count
const total = await client.Products.count();
const filtered = await client.Products.count({ filter: { Discontinued: false } });

// List with count
const { value, count } = await client.Products.listWithCount({ top: 10 });
console.log(`Showing ${value.length} of ${count}`);

// Iterate all pages
for await (const page of client.Products.paginate({ pageSize: 100 })) {
  console.log(`Processing ${page.value.length} items`);
}

// Get all (auto-pagination)
const all = await client.Products.all();
```

## Navigation Properties

```typescript
// Access related entities
const orderItems = await client.Orders.nav(10248, 'Order_Details').list();
```

## Batch Operations

```typescript
// Multiple operations in one request
const results = await client.batch([
  { method: 'GET', entity: 'Products', id: 1 },
  { method: 'POST', entity: 'Products', data: { ProductName: 'New' } },
  { method: 'PATCH', entity: 'Products', id: 2, data: { UnitPrice: 29.99 } },
  { method: 'DELETE', entity: 'Products', id: 3 },
]);

// Atomic transaction (all succeed or all fail)
await client.changeset({
  operations: [
    { method: 'POST', entity: 'Orders', data: orderData },
    { method: 'POST', entity: 'Order_Details', data: item1 },
    { method: 'POST', entity: 'Order_Details', data: item2 },
  ]
});
```

## Error Handling

```typescript
import { S4KitError, NotFoundError, ValidationError } from 's4kit';

try {
  await client.Products.get(99999);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Product not found');
  } else if (error instanceof ValidationError) {
    console.log('Invalid data:', error.details);
  } else if (error instanceof S4KitError) {
    console.log(error.friendlyMessage);
    console.log(error.help);
  }
}
```

## Configuration

```typescript
const client = S4Kit({
  apiKey: 'sk_live_...',           // Required
  baseUrl: 'https://...',          // Platform URL
  connection: 'prod',              // Default SAP instance
  timeout: 30000,                  // Request timeout (ms)
  retries: 3,                      // Retry on failure
});

// Override per request
await client.Products.list({
  connection: 'sandbox',  // Use different instance
  service: 'API_PRODUCT'  // Specify service
});
```

## License

MIT
