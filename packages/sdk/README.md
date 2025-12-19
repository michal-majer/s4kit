# S4Kit SDK

TypeScript/JavaScript SDK for interacting with S4Kit Platform API.

## Installation

```bash
npm install @s4kit/sdk
# or
bun add @s4kit/sdk
```

## Basic Usage

```typescript
import { S4Kit } from '@s4kit/sdk';

const client = new S4Kit({
  baseUrl: 'https://api.s4kit.com/api/proxy',
  apiKey: 'your-api-key-here'
});

// List entities
const suppliers = await client.sap.Suppliers.list({
  select: ['SupplierID', 'CompanyName'],
  top: 10
});

// Get single entity
const supplier = await client.sap.Suppliers.get(1);

// Create entity
const newSupplier = await client.sap.Suppliers.create({
  CompanyName: 'New Company',
  ContactName: 'John Doe'
});

// Update entity
const updated = await client.sap.Suppliers.update(1, {
  ContactName: 'Jane Doe'
});

// Delete entity
await client.sap.Suppliers.delete(1);
```

## TypeScript Type Generation

For full type safety, generate TypeScript types from your API key:

### 1. Generate Types

```bash
# Download types for your API key
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.s4kit.com/admin/api-keys/YOUR_API_KEY_ID/types \
  -o types/s4kit-types.d.ts
```

### 2. Use Types in Your Code

```typescript
import { S4Kit } from '@s4kit/sdk';
import type { 
  Suppliers, 
  CreateSuppliersRequest,
  UpdateSuppliersRequest 
} from './types/s4kit-types';

const client = new S4Kit({
  baseUrl: 'https://api.s4kit.com/api/proxy',
  apiKey: process.env.S4KIT_API_KEY!
});

// ✅ Type-safe response
const suppliers: Suppliers[] = await client.sap.Suppliers.list();

// ✅ TypeScript knows all properties
suppliers.forEach(s => {
  console.log(s.SupplierID);    // ✅ number
  console.log(s.CompanyName);   // ✅ string | undefined
});

// ✅ Type-safe create (key fields excluded, all optional)
const newSupplier: CreateSuppliersRequest = {
  CompanyName: 'New Company',
  ContactName: 'John Doe'
  // SupplierID is excluded (it's a key field)
};
await client.sap.Suppliers.create(newSupplier);

// ✅ Type-safe update (all fields optional)
const updates: UpdateSuppliersRequest = {
  ContactName: 'Jane Doe'
};
await client.sap.Suppliers.update(1, updates);
```

### Benefits of Generated Types

- ✅ **Type Safety**: Catch errors at compile time
- ✅ **Autocomplete**: IDE suggests available properties
- ✅ **Documentation**: JSDoc comments show OData types and constraints
- ✅ **Request Types**: Separate types for Create/Update operations

See [TYPE_GENERATION_ANALYSIS.md](../../TYPE_GENERATION_ANALYSIS.md) for detailed analysis.

## Query Options

```typescript
await client.sap.Suppliers.list({
  select: ['SupplierID', 'CompanyName'],  // Select specific fields
  filter: "Country eq 'USA'",              // OData filter
  top: 10,                                 // Limit results
  skip: 20,                                // Pagination
  orderBy: 'CompanyName desc',            // Sorting
  expand: ['Products']                     // Expand navigation properties
});
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test
```

This project was created using `bun init` in bun v1.3.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
