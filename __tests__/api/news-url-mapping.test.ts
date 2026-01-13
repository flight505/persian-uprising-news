#!/usr/bin/env tsx
/**
 * Standalone test for /api/news URL mapping
 * Tests that sourceUrl is properly mapped to url field
 *
 * Run with: tsx __tests__/api/news-url-mapping.test.ts
 */

const NEWS_URL_API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002';

async function runNewsUrlMappingTests() {
  console.log('🧪 Testing /api/news URL mapping...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Articles have url field
  try {
    console.log('Test 1: Articles have valid url fields');
    const response = await fetch(`${NEWS_URL_API_URL}/api/news`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error('No articles array in response');
    }

    if (data.articles.length === 0) {
      console.log('  ⚠️  No articles to test (empty response)');
    } else {
      data.articles.forEach((article: any, index: number) => {
        if (!article.url) {
          throw new Error(`Article ${index} missing url field`);
        }
        if (article.url === null) {
          throw new Error(`Article ${index} has null url`);
        }
        if (typeof article.url !== 'string') {
          throw new Error(`Article ${index} url is not a string`);
        }
      });
      console.log(`  ✅ PASS: All ${data.articles.length} articles have valid url fields\n`);
    }
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 2: sourceUrl is mapped to url
  try {
    console.log('Test 2: sourceUrl correctly mapped to url');
    const response = await fetch(`${NEWS_URL_API_URL}/api/news`);
    const data = await response.json();

    if (data.articles.length > 0) {
      let mappedCount = 0;
      data.articles.forEach((article: any) => {
        if (article.sourceUrl && article.url === article.sourceUrl) {
          mappedCount++;
        }
      });
      console.log(`  ✅ PASS: ${mappedCount}/${data.articles.length} articles have url matching sourceUrl\n`);
    }
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 3: Telegram URLs are valid
  try {
    console.log('Test 3: Telegram articles have valid t.me URLs');
    const response = await fetch(`${NEWS_URL_API_URL}/api/news`);
    const data = await response.json();

    const telegramArticles = data.articles.filter((a: any) => a.source === 'telegram');
    if (telegramArticles.length === 0) {
      console.log('  ⚠️  No Telegram articles found');
    } else {
      telegramArticles.forEach((article: any, index: number) => {
        if (!article.url.startsWith('https://t.me/')) {
          throw new Error(`Telegram article ${index} has invalid URL: ${article.url}`);
        }
      });
      console.log(`  ✅ PASS: All ${telegramArticles.length} Telegram articles have valid t.me URLs\n`);
    }
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 4: Response structure is correct
  try {
    console.log('Test 4: Response has correct structure');
    const response = await fetch(`${NEWS_URL_API_URL}/api/news`);
    const data = await response.json();

    if (!data.articles) throw new Error('Missing articles field');
    if (!data.pagination) throw new Error('Missing pagination field');
    if (!data.lastUpdated) throw new Error('Missing lastUpdated field');

    if (typeof data.pagination.page !== 'number') throw new Error('pagination.page not a number');
    if (typeof data.pagination.limit !== 'number') throw new Error('pagination.limit not a number');
    if (typeof data.pagination.total !== 'number') throw new Error('pagination.total not a number');
    if (typeof data.pagination.hasMore !== 'boolean') throw new Error('pagination.hasMore not a boolean');

    console.log('  ✅ PASS: Response structure is correct\n');
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 5: Sample articles and their URLs
  try {
    console.log('Test 5: Display sample articles');
    const response = await fetch(`${NEWS_URL_API_URL}/api/news?limit=5`);
    const data = await response.json();

    if (data.articles.length > 0) {
      console.log('  Sample articles:');
      data.articles.slice(0, 3).forEach((article: any, index: number) => {
        console.log(`    ${index + 1}. ${article.title.substring(0, 50)}...`);
        console.log(`       Source: ${article.source}`);
        console.log(`       URL: ${article.url}`);
        console.log('');
      });
    }
    console.log('  ✅ PASS: Sample articles displayed\n');
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Summary
  console.log('═══════════════════════════════════════════');
  console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runNewsUrlMappingTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
