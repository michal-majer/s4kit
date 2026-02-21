/**
 * S4Kit Complete Demo
 *
 * This demo showcases all S4Kit features using the CAP Bookshop sample service.
 *
 * Run with:
 *   bun run examples/demo.ts
 *
 * Or with environment variable:
 *   S4KIT_API_KEY=your_key bun run examples/demo.ts
 */

import { S4Kit, NotFoundError, ValidationError, S4KitError } from '../src';

const client = S4Kit({
  apiKey: process.env.S4KIT_API_KEY || 's4k_live_xxx',
  baseUrl: process.env.S4KIT_BASE_URL || 'https://api.s4kit.com/api/proxy',
});

console.log('S4Kit Demo\n');
console.log('='.repeat(50));

// ============================================================================
// LIST - Filtering & Sorting
// ============================================================================
console.log('\n1. LIST - Books under $15, sorted by price...');
const cheapBooks = await client.ListOfBooks.list({
  filter: { price: { lt: 15 } },
  orderBy: { price: 'asc' },
  select: ['title', 'author', 'price'],
});
cheapBooks.forEach((b) =>
  console.log(`   $${b.price} - "${b.title}" by ${b.author}`)
);

// ============================================================================
// EXPAND - Nested Data
// ============================================================================
console.log('\n\n2. EXPAND - Authors with their Books...');
const authorsWithBooks = await client.Authors.list({
  top: 2,
  expand: {
    books: {
      select: ['title', 'price'],
      top: 3,
    },
  },
});
authorsWithBooks.forEach((a) => {
  console.log(`\n   ${a.name} (born ${a.dateOfBirth})`);
  a.books?.forEach((b: { title?: string; price?: number }) =>
    console.log(`     - ${b.title} - $${b.price}`)
  );
});

// ============================================================================
// CRUD - Create, Read, Update, Delete
// ============================================================================
console.log('\n\n3. CRUD - Full lifecycle...');

// Create
console.log('   Creating author...');
const newAuthor = await client.Authors.create({
  name: 'Ada Lovelace',
  dateOfBirth: '1815-12-10',
  placeOfBirth: 'London',
});
console.log(`   Created: [${newAuthor.ID}] ${newAuthor.name}`);

// Update
console.log('   Updating author...');
const updated = await client.Authors.update(newAuthor.ID, {
  dateOfDeath: '1852-11-27',
  placeOfDeath: 'London',
});
console.log(
  `   Updated: ${updated.name} (${updated.dateOfBirth} - ${updated.dateOfDeath})`
);

// Get with expand
console.log('   Fetching with expand...');
const author = await client.Authors.get(newAuthor.ID, {
  expand: { books: true },
});
console.log(`   ${author.name} has ${author.books?.length || 0} books`);

// Delete
console.log('   Deleting author...');
await client.Authors.delete(newAuthor.ID);
console.log(`   Deleted: ${newAuthor.ID}`);

// Verify deletion
try {
  await client.Authors.get(newAuthor.ID);
  console.log('   ERROR: Still exists!');
} catch {
  console.log('   Verified: Successfully deleted');
}

// ============================================================================
// DEEP INSERT - Composition Relationships
// ============================================================================
console.log('\n\n4. DEEP INSERT - Book with localized texts (Composition)...');
try {
  const fictionGenre = '11aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const bookWithTexts = await client.Books.createDeep({
    ID: 8888,
    title: "The Hitchhiker's Guide",
    author_ID: 101,
    genre_ID: fictionGenre,
    price: 42.0,
    texts: [
      {
        locale: 'de',
        title: 'Per Anhalter durch die Galaxis',
        descr: 'Deutsche Ausgabe',
      },
      {
        locale: 'fr',
        title: 'Le Guide du voyageur galactique',
        descr: 'Edition francaise',
      },
    ],
  } as any);
  console.log(
    `   Created: "${bookWithTexts.title}" with ${bookWithTexts.texts?.length || 0} translations`
  );

  // Cleanup
  await client.Books.delete(8888);
  console.log('   Cleaned up');
} catch (e: any) {
  console.log(`   Note: ${e.message?.slice(0, 60)}...`);
}

// ============================================================================
// BATCH - createMany
// ============================================================================
console.log('\n\n5. BATCH - Create 5 books with createMany...');
try {
  const fictionGenre = '11aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const books = await client.Books.createMany([
    { title: 'Batch Book 1', author_ID: 101, genre_ID: fictionGenre, price: 9.99 },
    { title: 'Batch Book 2', author_ID: 101, genre_ID: fictionGenre, price: 10.99 },
    { title: 'Batch Book 3', author_ID: 101, genre_ID: fictionGenre, price: 11.99 },
    { title: 'Batch Book 4', author_ID: 101, genre_ID: fictionGenre, price: 12.99 },
    { title: 'Batch Book 5', author_ID: 101, genre_ID: fictionGenre, price: 13.99 },
  ] as any);

  console.log('   Created:');
  books.forEach((b) => console.log(`     ${b.title} (ID: ${b.ID}) - $${b.price}`));

  // Cleanup
  await client.Books.deleteMany(books.map((b) => b.ID));
  console.log(`   Deleted ${books.length} books`);
} catch (e: any) {
  console.log(`   Note: ${e.code || e.message}`);
}

// ============================================================================
// TRANSACTION - Atomic Operations
// ============================================================================
console.log('\n\n6. TRANSACTION - Atomic operations (all-or-nothing)...');
try {
  const txGenre = '11aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const base = Math.floor(Math.random() * 100000) + 10000;

  const [book1, book2, book3] = await client.transaction((tx) => [
    tx.Books.create({
      ID: base,
      title: 'Transaction Book 1',
      author_ID: 101,
      genre_ID: txGenre,
      price: 19.99,
    } as any),
    tx.Books.create({
      ID: base + 1,
      title: 'Transaction Book 2',
      author_ID: 101,
      genre_ID: txGenre,
      price: 29.99,
    } as any),
    tx.Books.create({
      ID: base + 2,
      title: 'Transaction Book 3',
      author_ID: 101,
      genre_ID: txGenre,
      price: 39.99,
    } as any),
  ]);

  console.log('   Created atomically:');
  console.log(`     ${book1.title} (ID: ${book1.ID})`);
  console.log(`     ${book2.title} (ID: ${book2.ID})`);
  console.log(`     ${book3.title} (ID: ${book3.ID})`);

  // Cleanup
  await client.Books.deleteMany([base, base + 1, base + 2]);
  console.log('   Cleaned up');
} catch (e: any) {
  console.log(`   Note: ${e.code || e.message}`);
}

// ============================================================================
// TRANSACTION ROLLBACK - Verify atomic failure
// ============================================================================
console.log('\n\n7. TRANSACTION ROLLBACK - Testing atomic failure...');
const countBefore = await client.Books.count();
console.log(`   Books before: ${countBefore}`);

try {
  const txGenre = '11aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const rbBase = Math.floor(Math.random() * 100000) + 50000;

  await client.transaction((tx) => [
    tx.Books.create({
      ID: rbBase,
      title: 'Should Rollback 1',
      author_ID: 101,
      genre_ID: txGenre,
      price: 9.99,
    } as any),
    tx.Books.create({
      ID: rbBase + 1,
      title: 'Should Rollback 2',
      author_ID: 101,
      genre_ID: txGenre,
      price: 19.99,
    } as any),
    // This one will FAIL - missing required genre_ID
    tx.Books.create({
      ID: rbBase + 2,
      title: 'FAIL - Missing genre_ID',
      author_ID: 101,
      price: 29.99,
    } as any),
  ]);
  console.log('   ERROR: Transaction should have failed!');
} catch (e: any) {
  console.log(`   Transaction failed as expected: ${e.message?.slice(0, 50)}...`);
}

const countAfter = await client.Books.count();
console.log(`   Books after: ${countAfter}`);

if (countBefore === countAfter) {
  console.log('   ROLLBACK CONFIRMED - No books were created!');
} else {
  console.log(`   ROLLBACK FAILED - ${countAfter - countBefore} books leaked!`);
}

// ============================================================================
// PAGINATION - listWithCount, paginate, all
// ============================================================================
console.log('\n\n8. PAGINATION - Various methods...');

// listWithCount
try {
  const { value: booksPage, count: totalBooks } = await client.Books.listWithCount({
    top: 3,
  });
  console.log(`   listWithCount: ${booksPage.length} of ${totalBooks} total`);
} catch (e: any) {
  console.log(`   listWithCount: ${e.message}`);
}

// paginate
try {
  let pageNum = 0;
  for await (const page of client.Books.paginate({ pageSize: 3 }) as AsyncIterable<
    any[]
  >) {
    pageNum++;
    console.log(`   Page ${pageNum}: ${page.length} books`);
    if (pageNum >= 2) {
      console.log('   (stopping after 2 pages)');
      break;
    }
  }
} catch (e: any) {
  console.log(`   paginate: ${e.message}`);
}

// all
try {
  const allBooks = await client.Books.all();
  console.log(`   all(): Fetched all ${allBooks.length} books`);
} catch (e: any) {
  console.log(`   all(): ${e.message}`);
}

// ============================================================================
// NAVIGATION - Related entities via nav()
// ============================================================================
console.log('\n\n9. NAV - Navigate to related entities...');
try {
  const authorBooks = await client.Authors.nav(101, 'books').list({ top: 3 });
  console.log(`   Author 101's books:`);
  authorBooks.forEach((b) => console.log(`     - ${b.title} ($${b.price})`));
} catch (e: any) {
  console.log(`   nav(): ${e.message}`);
}

// ============================================================================
// ERROR HANDLING - Typed errors
// ============================================================================
console.log('\n\n10. ERROR HANDLING - Typed error classes...');

// NotFoundError
console.log('   Testing NotFoundError...');
try {
  await client.Books.get(999999);
  console.log('     ERROR: Should have thrown NotFoundError');
} catch (e: any) {
  if (e instanceof NotFoundError) {
    console.log(`     NotFoundError: ${e.message}`);
  } else if (e instanceof S4KitError) {
    console.log(`     S4KitError (${e.code}): ${e.message}`);
  } else {
    console.log(`     Generic error: ${e.message}`);
  }
}

// ValidationError
console.log('   Testing ValidationError...');
try {
  await client.Books.create({ title: 'No Author or Genre' } as any);
  console.log('     ERROR: Should have thrown ValidationError');
} catch (e: any) {
  if (e instanceof ValidationError) {
    console.log(`     ValidationError: ${e.message}`);
  } else if (e instanceof S4KitError) {
    console.log(`     S4KitError (${e.code}): ${e.message?.slice(0, 50)}...`);
  } else {
    console.log(`     Generic error: ${e.message?.slice(0, 50)}...`);
  }
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(50));
const bookCount = await client.Books.count();
const authorCount = await client.Authors.count();
console.log(`\nDatabase: ${bookCount} books, ${authorCount} authors`);
console.log('\nS4Kit - SAP made simple.\n');
