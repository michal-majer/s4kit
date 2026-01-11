/**
 * Type-Safe S4Kit Usage Example
 *
 * This example shows how TypeScript developers can use generated types
 * for full type safety when working with SAP entities.
 *
 * WORKFLOW:
 * 1. Generate types: `npx s4kit generate-types --api-key YOUR_KEY --output ./types`
 * 2. Import the types in your code
 * 3. Use them with the SDK for autocomplete and type checking
 */

import { S4Kit, createFilter } from '../src';

// ============================================================================
// STEP 1: Import your generated types
// ============================================================================
//
// After running: npx s4kit generate-types --api-key sk_live_xxx --output ./types
// You'll have a file like ./types/index.d.ts with interfaces like these:

// Example of what the generated types look like:
interface Product {
  /** OData type: Edm.Int32 */
  ProductID: number;
  /** OData type: Edm.String (maxLength: 40) */
  ProductName: string;
  /** OData type: Edm.Int32 */
  SupplierID?: number;
  /** OData type: Edm.Int32 */
  CategoryID?: number;
  /** OData type: Edm.String (maxLength: 20) */
  QuantityPerUnit?: string;
  /** OData type: Edm.Decimal (precision: 19, scale: 4) */
  UnitPrice?: number;
  /** OData type: Edm.Int16 */
  UnitsInStock?: number;
  /** OData type: Edm.Int16 */
  UnitsOnOrder?: number;
  /** OData type: Edm.Int16 */
  ReorderLevel?: number;
  /** OData type: Edm.Boolean */
  Discontinued: boolean;
}

interface Category {
  /** OData type: Edm.Int32 */
  CategoryID: number;
  /** OData type: Edm.String (maxLength: 15) */
  CategoryName: string;
  /** OData type: Edm.String */
  Description?: string;
  /** OData type: Edm.Binary */
  Picture?: string;
}

interface Supplier {
  /** OData type: Edm.Int32 */
  SupplierID: number;
  /** OData type: Edm.String (maxLength: 40) */
  CompanyName: string;
  /** OData type: Edm.String (maxLength: 30) */
  ContactName?: string;
  /** OData type: Edm.String (maxLength: 30) */
  ContactTitle?: string;
  /** OData type: Edm.String (maxLength: 60) */
  Address?: string;
  /** OData type: Edm.String (maxLength: 15) */
  City?: string;
  /** OData type: Edm.String (maxLength: 15) */
  Region?: string;
  /** OData type: Edm.String (maxLength: 10) */
  PostalCode?: string;
  /** OData type: Edm.String (maxLength: 15) */
  Country?: string;
  /** OData type: Edm.String (maxLength: 24) */
  Phone?: string;
  /** OData type: Edm.String (maxLength: 24) */
  Fax?: string;
  /** OData type: Edm.String */
  HomePage?: string;
}

// For SAP S/4HANA entities (example):
interface A_BusinessPartner {
  /** OData type: Edm.String (maxLength: 10) */
  BusinessPartner: string;
  /** OData type: Edm.String (maxLength: 81) */
  BusinessPartnerFullName?: string;
  /** OData type: Edm.String (maxLength: 1) */
  BusinessPartnerCategory?: string;
  /** OData type: Edm.Boolean */
  BusinessPartnerIsBlocked?: boolean;
  /** OData type: Edm.DateTimeOffset */
  CreationDate?: string;
}

// ============================================================================
// STEP 2: Initialize the SDK
// ============================================================================

const client = new S4Kit({
  apiKey: process.env.S4KIT_API_KEY || 'your-api-key',
  baseUrl: process.env.S4KIT_URL || 'http://localhost:3002/api/proxy',
});

// ============================================================================
// STEP 3: Use types with the SDK
// ============================================================================

async function typedExamples() {
  // -----------------------------------------------------------------
  // EXAMPLE 1: Type-safe list with select
  // -----------------------------------------------------------------
  // TypeScript will autocomplete field names!
  const products = await client.Products.list<Product>({
    select: ['ProductID', 'ProductName', 'UnitPrice', 'UnitsInStock'],
    //        ^ autocomplete works here!
    top: 10,
  });

  // TypeScript knows the shape of each product
  for (const product of products) {
    console.log(`${product.ProductName}: $${product.UnitPrice}`);
    //                   ^ TypeScript knows this is string
    //                                         ^ TypeScript knows this is number | undefined
  }

  // -----------------------------------------------------------------
  // EXAMPLE 2: Type-safe filtering with createFilter
  // -----------------------------------------------------------------
  const filter = createFilter<Product>()
    .where('UnitPrice', 'gt', 50)
    //      ^ autocomplete for Product fields
    .and('UnitsInStock', 'gt', 0)
    .build();

  const expensiveProducts = await client.Products.list<Product>({
    filter,
    select: ['ProductName', 'UnitPrice'],
  });

  // -----------------------------------------------------------------
  // EXAMPLE 3: Type-safe get by ID
  // -----------------------------------------------------------------
  const product = await client.Products.get<Product>(1);

  if (product) {
    // Full type safety - TypeScript knows all available fields
    console.log(`Product: ${product.ProductName}`);
    console.log(`Price: $${product.UnitPrice}`);
    console.log(`In Stock: ${product.UnitsInStock}`);
    console.log(`Discontinued: ${product.Discontinued}`);
  }

  // -----------------------------------------------------------------
  // EXAMPLE 4: Type-safe create (if you have write access)
  // -----------------------------------------------------------------
  /*
  const newProduct = await client.Products.create<Product>({
    ProductName: 'New Widget',      // Required
    UnitPrice: 29.99,               // Optional
    UnitsInStock: 100,              // Optional
    Discontinued: false,            // Required
    // TypeScript ensures you don't miss required fields!
  });
  */

  // -----------------------------------------------------------------
  // EXAMPLE 5: Type-safe update
  // -----------------------------------------------------------------
  /*
  await client.Products.update<Product>(1, {
    UnitPrice: 34.99,
    UnitsInStock: 150,
    // Only update what you need - all fields are optional
  });
  */

  // -----------------------------------------------------------------
  // EXAMPLE 6: Working with SAP S/4HANA entities
  // -----------------------------------------------------------------
  /*
  const partners = await client.A_BusinessPartner.list<A_BusinessPartner>({
    select: ['BusinessPartner', 'BusinessPartnerFullName', 'BusinessPartnerCategory'],
    filter: "BusinessPartnerCategory eq '1'",
    top: 10,
  });

  for (const partner of partners) {
    console.log(`${partner.BusinessPartner}: ${partner.BusinessPartnerFullName}`);
  }
  */

  // -----------------------------------------------------------------
  // EXAMPLE 7: Type-safe expand (relations)
  // -----------------------------------------------------------------
  interface CategoryWithProducts extends Category {
    Products?: Product[];
  }

  const categoryWithProducts = await client.Categories.get<CategoryWithProducts>(1, {
    expand: ['Products'],
  });

  if (categoryWithProducts?.Products) {
    console.log(`Category "${categoryWithProducts.CategoryName}" has ${categoryWithProducts.Products.length} products:`);
    for (const p of categoryWithProducts.Products) {
      console.log(`  - ${p.ProductName}`);
    }
  }
}

// ============================================================================
// BONUS: Helper type for type-safe select arrays
// ============================================================================

// This is included in generated types
type SelectFields<T> = Array<keyof T>;

// Usage:
const productFields: SelectFields<Product> = ['ProductID', 'ProductName', 'UnitPrice'];
//                                             ^ TypeScript ensures these are valid Product fields

async function withSelectHelper() {
  const products = await client.Products.list<Product>({
    select: productFields,
  });
}

// ============================================================================
// Run examples
// ============================================================================

typedExamples().catch(console.error);
