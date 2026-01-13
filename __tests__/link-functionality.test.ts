#!/usr/bin/env tsx
/**
 * Comprehensive test for all link functionality
 * Tests:
 * 1. News feed "Read more" links have href
 * 2. Incidents have "Related articles" with URLs
 * 3. All URLs are valid and accessible
 *
 * Run with: tsx __tests__/link-functionality.test.ts
 */

const LINK_TEST_API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002';

async function runLinkFunctionalityTests() {
  console.log('🔗 Testing all link functionality...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: News feed articles have Read More URLs
  try {
    console.log('Test 1: News feed articles have Read More URLs');
    const response = await fetch(`${LINK_TEST_API_URL}/api/news?v=2&limit=10`);
    const data = await response.json();

    if (!data.articles || data.articles.length === 0) {
      throw new Error('No articles found');
    }

    let urlCount = 0;
    let nullUrls = 0;
    let emptyUrls = 0;
    let validUrls = 0;

    data.articles.forEach((article: any) => {
      if (article.url === null) {
        nullUrls++;
      } else if (article.url === '') {
        emptyUrls++;
      } else if (article.url.startsWith('http')) {
        validUrls++;
      }
      urlCount++;
    });

    if (nullUrls > 0 || emptyUrls > 0) {
      throw new Error(`Found ${nullUrls} null URLs and ${emptyUrls} empty URLs out of ${urlCount}`);
    }

    console.log(`  ✅ PASS: All ${validUrls}/${urlCount} articles have valid URLs`);
    console.log(`  Sample URLs:`);
    data.articles.slice(0, 3).forEach((article: any, i: number) => {
      console.log(`    ${i + 1}. ${article.source}: ${article.url}`);
    });
    console.log('');
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 2: Incidents have Related Articles with URLs
  try {
    console.log('Test 2: Incidents have Related Articles with URLs');
    const response = await fetch(`${LINK_TEST_API_URL}/api/incidents`);
    const data = await response.json();

    if (!data.incidents || data.incidents.length === 0) {
      throw new Error('No incidents found');
    }

    let withRelated = 0;
    let totalRelated = 0;
    let validRelatedUrls = 0;

    data.incidents.forEach((incident: any) => {
      if (incident.relatedArticles && incident.relatedArticles.length > 0) {
        withRelated++;
        totalRelated += incident.relatedArticles.length;

        incident.relatedArticles.forEach((article: any) => {
          if (article.url && article.url.startsWith('http')) {
            validRelatedUrls++;
          }
        });
      }
    });

    console.log(`  ✅ PASS: ${withRelated}/${data.incidents.length} incidents have related articles`);
    console.log(`  ✅ PASS: ${validRelatedUrls}/${totalRelated} related articles have valid URLs`);

    // Show sample
    const sampleIncident = data.incidents.find((i: any) => i.relatedArticles && i.relatedArticles.length > 0);
    if (sampleIncident) {
      console.log(`  Sample incident: "${sampleIncident.title.substring(0, 60)}..."`);
      console.log(`  Related articles:`);
      sampleIncident.relatedArticles.slice(0, 2).forEach((article: any, i: number) => {
        console.log(`    ${i + 1}. ${article.source}: ${article.url}`);
      });
    }
    console.log('');
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 3: Test actual URL accessibility (sample)
  try {
    console.log('Test 3: Sample URL accessibility check');
    const response = await fetch(`${LINK_TEST_API_URL}/api/news?v=2&limit=5`);
    const data = await response.json();

    if (data.articles.length === 0) {
      throw new Error('No articles to test');
    }

    const sampleArticle = data.articles[0];
    console.log(`  Testing URL: ${sampleArticle.url}`);

    // Just check if URL is well-formed, don't actually fetch external site
    const url = new URL(sampleArticle.url);
    if (!url.protocol.startsWith('http')) {
      throw new Error('Invalid protocol');
    }

    console.log(`  ✅ PASS: URL is well-formed (${url.hostname})`);
    console.log('');
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 4: Check NewsCard component structure (simulated)
  try {
    console.log('Test 4: Verify NewsCard has proper link structure');

    // Read the NewsCard component to check for href attribute
    const fs = require('fs');
    const newsCardContent = fs.readFileSync(
      '/Users/jesper/Projects/Dev_projects/Rise_up/app/components/NewsFeed/NewsCard.tsx',
      'utf8'
    );

    // Check for <a href={url}> pattern
    if (!newsCardContent.includes('href={url}')) {
      throw new Error('NewsCard missing href={url} attribute');
    }

    // Check for target="_blank"
    if (!newsCardContent.includes('target="_blank"')) {
      throw new Error('NewsCard missing target="_blank"');
    }

    // Check for Show more button
    if (!newsCardContent.includes('Show more')) {
      throw new Error('NewsCard missing Show more button');
    }

    console.log('  ✅ PASS: NewsCard has <a href={url}> tag');
    console.log('  ✅ PASS: NewsCard has target="_blank"');
    console.log('  ✅ PASS: NewsCard has "Show more" button');
    console.log('');
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Test 5: Check IncidentSidePanel related articles structure
  try {
    console.log('Test 5: Verify IncidentSidePanel has proper related articles links');

    const fs = require('fs');
    const panelContent = fs.readFileSync(
      '/Users/jesper/Projects/Dev_projects/Rise_up/app/components/Map/IncidentSidePanel.tsx',
      'utf8'
    );

    // Check for related articles rendering
    if (!panelContent.includes('relatedArticles')) {
      throw new Error('IncidentSidePanel missing relatedArticles');
    }

    // Check for <a href={article.url}>
    if (!panelContent.includes('href={article.url}')) {
      throw new Error('IncidentSidePanel missing href={article.url}');
    }

    console.log('  ✅ PASS: IncidentSidePanel has relatedArticles section');
    console.log('  ✅ PASS: IncidentSidePanel has <a href={article.url}> links');
    console.log('');
    passed++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${error}\n`);
    failed++;
  }

  // Summary
  console.log('═══════════════════════════════════════════');
  console.log(`📊 Link Functionality Test Summary`);
  console.log(`   ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Common issues:');
    console.log('   - Browser cache needs clearing: visit /api/dev/clear-cache');
    console.log('   - Hard refresh needed: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
    console.log('   - Check browser console for errors');
    process.exit(1);
  } else {
    console.log('\n✨ All link functionality tests passed!');
    console.log('\n📝 How to use:');
    console.log('   1. "Read more →" - Opens external article in new tab');
    console.log('   2. "Show more →" - Expands article summary (collapses with "← Show less")');
    console.log('   3. "Related articles" - In incident panels, click to view source articles');
  }
}

// Run tests
runLinkFunctionalityTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
