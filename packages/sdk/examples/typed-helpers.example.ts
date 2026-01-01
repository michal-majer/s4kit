/**
 * Example: Using typed helper functions for better Developer Experience
 * 
 * Helper functions provide:
 * - Automatic type inference (no need to manually type responses)
 * - Better autocomplete for select fields
 * - Cleaner, more readable code
 */

import { S4Kit, typedList, typedGet, typedCreate, typedUpdate, useEntity } from '../src';
import type { 
  A_BusinessPartnerType, 
  CreateA_BusinessPartnerTypeRequest,
  UpdateA_BusinessPartnerTypeRequest
} from './types/s4kit-types';

async function exampleWithHelpers() {
  const client = new S4Kit({
    baseUrl: 'https://api.s4kit.com/api/proxy',
    apiKey: 'your-api-key-here'
  });

  // ============================================
  // Method 1: Individual helper functions
  // ============================================

  // ✅ List with automatic type inference
  const entities = await typedList<A_BusinessPartnerType>(
    client.sap.A_BusinessPartnerType,
    {
      select: [
        'BusinessPartner',
        'BusinessPartnerFullName',
        'BusinessPartnerName',
        // ✅ Full autocomplete - no need for `as SelectFields<T>`
      ],
      top: 10,
    }
  );
  // entities is automatically typed as A_BusinessPartnerType[]
  console.log('Found entities:', entities.length);

  // ✅ Get with automatic type inference
  const entity = await typedGet<A_BusinessPartnerType>(
    client.sap.A_BusinessPartnerType,
    'BP001',
    {
      select: ['BusinessPartner', 'BusinessPartnerFullName'],
    }
  );
  // entity is automatically typed as A_BusinessPartnerType
  console.log('Entity:', entity.BusinessPartnerFullName);

  // ✅ Create with automatic type inference
  const created = await typedCreate<A_BusinessPartnerType>(
    client.sap.A_BusinessPartnerType,
    {
      BusinessPartnerFullName: 'New Company',
      BusinessPartnerName: 'New Corp',
      BusinessPartnerCategory: '1',
    } as CreateA_BusinessPartnerTypeRequest
  );
  // created is automatically typed as A_BusinessPartnerType
  console.log('Created:', created.BusinessPartner);

  // ✅ Update with automatic type inference
  const updated = await typedUpdate<A_BusinessPartnerType>(
    client.sap.A_BusinessPartnerType,
    created.BusinessPartner,
    {
      BusinessPartnerFullName: 'Updated Company Name',
    } as UpdateA_BusinessPartnerTypeRequest
  );
  // updated is automatically typed as A_BusinessPartnerType
  console.log('Updated:', updated.BusinessPartnerFullName);

  // ============================================
  // Method 2: useEntity wrapper (cleanest API)
  // ============================================

  // ✅ Create a typed wrapper for cleaner code
  const bp = useEntity<A_BusinessPartnerType>(client.sap.A_BusinessPartnerType);

  // All methods are fully typed with autocomplete
  const allEntities = await bp.list({
    select: ['BusinessPartner', 'BusinessPartnerFullName'], // ✅ Autocomplete!
    top: 5,
  });

  const singleEntity = await bp.get('BP001', {
    select: ['BusinessPartner', 'BusinessPartnerName'],
  });

  const newEntity = await bp.create({
    BusinessPartnerFullName: 'Another Company',
    BusinessPartnerName: 'Another Corp',
  } as CreateA_BusinessPartnerTypeRequest);

  await bp.update(newEntity.BusinessPartner, {
    BusinessPartnerFullName: 'Updated Name',
  } as UpdateA_BusinessPartnerTypeRequest);

  await bp.delete(newEntity.BusinessPartner);
}

// Run the example
exampleWithHelpers().catch(console.error);



