/**
 * Test to verify SelectFields type works correctly
 * This file should compile without errors
 */

import type { A_BusinessPartnerType, SelectFields } from './types/s4kit-types';

// ✅ This should work - valid fields
const validSelect: SelectFields<A_BusinessPartnerType> = [
  'BusinessPartner',
  'BusinessPartnerFullName',
  'BusinessPartnerName',
];

// ❌ This should cause a TypeScript error - invalid field
// const invalidSelect: SelectFields<A_BusinessPartnerType> = [
//   'BusinessPartner',
//   'InvalidField', // TypeScript error: Property 'InvalidField' does not exist
// ];

// ✅ Usage in actual query (with type assertion)
const selectArray = [
  'BusinessPartner',
  'BusinessPartnerFullName',
] as SelectFields<A_BusinessPartnerType>;

// Verify the type
const test: SelectFields<A_BusinessPartnerType> = selectArray;

console.log('SelectFields type works correctly!');
