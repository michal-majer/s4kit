/**
 * Example: Using generated TypeScript types with S4Kit SDK
 * 
 * After generating types from your API key:
 * 1. Download: GET /admin/api-keys/:id/types
 * 2. Save as: ./types/s4kit-types.d.ts
 * 3. Import and use as shown below
 * 
 * Note: Replace EntityName, CreateEntityNameRequest, UpdateEntityNameRequest
 * with actual types from your generated s4kit-types.d.ts file
 */

import { S4Kit } from '../src';
// Import your generated types - replace with actual entity names from your API key
import type { 
  A_BusinessPartnerType, 
  CreateA_BusinessPartnerTypeRequest,
  UpdateA_BusinessPartnerTypeRequest
  // Note: SelectFields is no longer needed with Generic QueryOptions!
} from './types/s4kit-types';

async function example() {
  const client = new S4Kit({
    baseUrl: 'https://api.s4kit.com/api/proxy',
    apiKey: 'your-api-key-here'
  });

  // ✅ Type-safe list query with autocomplete for select fields
  // Now with Generic QueryOptions - no need for `as SelectFields<T>`!
  const entities: A_BusinessPartnerType[] = await client.A_BusinessPartnerType.list({
    select: [
      'BusinessPartner',
      'BusinessPartnerFullName',
      'BusinessPartnerName',
      // ✅ TypeScript automatically provides autocomplete here!
      // Just start typing and IDE will suggest field names
      // No need for `as SelectFields<A_BusinessPartnerType>` anymore
    ],
    top: 5,
  });

  // ✅ TypeScript knows the properties
  // entities.forEach(entity => {
  //   console.log(entity.Field1);      // ✅ Typed correctly
  //   console.log(entity.Field2);      // ✅ Typed correctly
  //   // console.log(entity.InvalidProp);  // ❌ TypeScript error!
  // });

  // ✅ Type-safe get by ID
  const entity: A_BusinessPartnerType = await client.A_BusinessPartnerType.get('BP001');
  console.log('Retrieved entity:', entity.BusinessPartnerFullName);

  // ✅ Type-safe create (POST)
  // CreateA_BusinessPartnerTypeRequest automatically excludes key fields (BusinessPartner)
  // and makes all fields optional - perfect for POST requests
  const newEntity: CreateA_BusinessPartnerTypeRequest = {
    BusinessPartnerFullName: 'Acme Corporation',
    BusinessPartnerName: 'Acme Corp',
    BusinessPartnerCategory: '1', // Customer category
    FirstName: 'John',
    LastName: 'Doe',
    // BusinessPartner is NOT in this type (it's a key field, auto-generated)
    // All other fields are optional
  };
  
  const created: A_BusinessPartnerType = await client.A_BusinessPartnerType.create(newEntity);
  console.log('Created entity:', created.BusinessPartner, created.BusinessPartnerFullName);

  // ✅ Type-safe update (PATCH)
  // UpdateA_BusinessPartnerTypeRequest has all fields optional
  const updates: UpdateA_BusinessPartnerTypeRequest = {
    BusinessPartnerFullName: 'Acme Corporation Updated',
    // Only include fields you want to update
  };
  
  const updated: A_BusinessPartnerType = await client.A_BusinessPartnerType.update(
    created.BusinessPartner, 
    updates
  );
  console.log('Updated entity:', updated.BusinessPartnerFullName);
}

// Run the example
example().catch(console.error);




