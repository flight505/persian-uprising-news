/**
 * Test search functionality and performance
 * Usage: tsx scripts/test-search.ts
 */

async function testSearch() {
  console.log('🔍 Testing Search Functionality\n');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  // Test 1: Basic search
  console.log('1. Testing basic search...');
  try {
    const start = Date.now();
    const response = await fetch(`${baseUrl}/api/search?q=protest&limit=5`);
    const data = await response.json();
    const time = Date.now() - start;

    console.log(`   ✅ Found ${data.nbHits} results in ${time}ms`);
    console.log(`   Mode: ${data.mode}`);
    console.log(`   Processing time: ${data.processingTimeMS}ms`);
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 2: Search with filters
  console.log('\n2. Testing search with filters...');
  try {
    const start = Date.now();
    const response = await fetch(
      `${baseUrl}/api/search?q=protest&source=telegram&topics=iran.now&limit=5`
    );
    const data = await response.json();
    const time = Date.now() - start;

    console.log(`   ✅ Found ${data.nbHits} results in ${time}ms`);
    console.log(`   Filters applied: source, topics`);
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 3: Date range filter
  console.log('\n3. Testing date range filter...');
  try {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const start = Date.now();
    const response = await fetch(
      `${baseUrl}/api/search?q=protest&dateFrom=${weekAgo}&dateTo=${now}&limit=5`
    );
    const data = await response.json();
    const time = Date.now() - start;

    console.log(`   ✅ Found ${data.nbHits} results in ${time}ms`);
    console.log(`   Date range: Last 7 days`);
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 4: Facets
  console.log('\n4. Testing facets endpoint...');
  try {
    const start = Date.now();
    const response = await fetch(`${baseUrl}/api/search/facets`);
    const data = await response.json();
    const time = Date.now() - start;

    console.log(`   ✅ Loaded facets in ${time}ms`);
    console.log(`   Sources: ${data.facets.sources.length}`);
    console.log(`   Topics: ${data.facets.topics.length}`);
    console.log(`   Channels: ${data.facets.channels.length}`);
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 5: Cache performance
  console.log('\n5. Testing cache performance...');
  try {
    // First request (cache miss)
    const start1 = Date.now();
    await fetch(`${baseUrl}/api/news?page=0&limit=20`);
    const time1 = Date.now() - start1;

    // Second request (cache hit)
    const start2 = Date.now();
    await fetch(`${baseUrl}/api/news?page=0&limit=20`);
    const time2 = Date.now() - start2;

    const improvement = Math.round(((time1 - time2) / time1) * 100);

    console.log(`   First request: ${time1}ms`);
    console.log(`   Second request: ${time2}ms`);
    console.log(`   ✅ ${improvement}% faster with cache`);
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('\n✅ All tests completed!');
}

// Run tests
testSearch().catch(console.error);
