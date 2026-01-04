/**
 * Test batch operations (transaction and bulk operations)
 *
 * Usage:
 *   API_KEY=your_api_key bun run examples/test-batch.ts
 *
 * Or with custom base URL:
 *   API_KEY=your_api_key BASE_URL=http://localhost:3002/api/proxy bun run examples/test-batch.ts
 */

import { S4Kit } from '../src/index.ts';

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error('Error: API_KEY environment variable is required');
  process.exit(1);
}

const client = new S4Kit({
  apiKey,
  baseUrl: process.env.BASE_URL,
  connection: process.env.CONNECTION || 'sandbox',
});

async function main() {
  console.log('=== Testing Transaction ===\n');

  try {
    // Test transaction (atomic batch)
    const results = await client.transaction(tx => [
      tx.Books.create({ title: 'Transaction Book 1', author_ID: 101, stock: 10 }),
      tx.Books.create({ title: 'Transaction Book 2', author_ID: 101, stock: 20 }),
    ]);

    console.log('Transaction results:');
    console.log(JSON.stringify(results, null, 2));

    // Clean up - delete the created books
    if (results[0]?.ID && results[1]?.ID) {
      console.log('\nCleaning up created books...');
      await client.sap.Books.delete(results[0].ID);
      await client.sap.Books.delete(results[1].ID);
      console.log('Cleanup complete');
    } else {
      console.log('\nCould not clean up - results are undefined');
    }
  } catch (error) {
    console.error('Transaction error:', error);
  }
}

main().catch(console.error);
