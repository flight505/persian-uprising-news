#!/usr/bin/env tsx
/**
 * Diagnose UI issues with Show more button and Related articles
 */

const DIAGNOSE_API_URL = 'http://localhost:3002';

async function runDiagnoseUI() {
  console.log('🔍 Diagnosing UI Issues...\n');

  // Check 1: Show more button condition
  console.log('═══ Show More Button Analysis ═══');
  const newsResponse = await fetch(`${DIAGNOSE_API_URL}/api/news?v=2&limit=10`);
  const newsData = await newsResponse.json();

  let withShowMore = 0;
  let withoutShowMore = 0;

  newsData.articles.forEach((article: any, idx: number) => {
    const summaryLength = article.summary.length;
    const shouldShowButton = summaryLength > 200;

    if (shouldShowButton) {
      withShowMore++;
      if (idx < 3) {
        console.log(`  Article ${idx + 1}: ${article.title.substring(0, 40)}...`);
        console.log(`    Summary length: ${summaryLength} chars`);
        console.log(`    Show more button: YES (length > 200)`);
      }
    } else {
      withoutShowMore++;
      if (idx < 3 && summaryLength > 150) {
        console.log(`  Article ${idx + 1}: ${article.title.substring(0, 40)}...`);
        console.log(`    Summary length: ${summaryLength} chars`);
        console.log(`    Show more button: NO (length <= 200) ⚠️`);
        console.log(`    ^ This article is clamped but has no expand button`);
      }
    }
  });

  console.log(`\n  Summary: ${withShowMore} articles show button, ${withoutShowMore} don't`);
  console.log(`  Issue: Threshold is 200 chars, but line-clamp-3 (~150 chars) might hide text without button\n`);

  // Check 2: Related articles in incidents
  console.log('═══ Related Articles Analysis ═══');
  const incidentsResponse = await fetch(`${DIAGNOSE_API_URL}/api/incidents`);
  const incidentsData = await incidentsResponse.json();

  const withRelated = incidentsData.incidents.filter((i: any) =>
    i.relatedArticles && i.relatedArticles.length > 0
  );

  console.log(`  Total incidents: ${incidentsData.incidents.length}`);
  console.log(`  With related articles: ${withRelated.length}`);
  console.log(`  Without related articles: ${incidentsData.incidents.length - withRelated.length}\n`);

  if (withRelated.length > 0) {
    console.log('  Sample incident with related articles:');
    const sample = withRelated[0];
    console.log(`    Title: ${sample.title.substring(0, 60)}...`);
    console.log(`    Location: ${sample.location.address}`);
    console.log(`    Related articles count: ${sample.relatedArticles.length}`);
    sample.relatedArticles.forEach((article: any, idx: number) => {
      console.log(`      ${idx + 1}. ${article.title.substring(0, 50)}...`);
      console.log(`         URL: ${article.url}`);
    });
  }

  console.log('\n═══ Recommendations ═══');
  console.log('1. Show more button:');
  console.log('   - Lower threshold from 200 to 150 characters');
  console.log('   - Or calculate if text would be clamped based on line count\n');

  console.log('2. Related articles:');
  console.log('   - Should appear in IncidentSidePanel when clicking map markers');
  console.log('   - Check if map markers are clickable');
  console.log('   - Check if IncidentSidePanel is rendering\n');

  console.log('3. Testing steps:');
  console.log('   a. Clear browser cache: http://localhost:3002/api/dev/clear-cache');
  console.log('   b. Open home page (news feed)');
  console.log('   c. Look for "Show more →" button on long articles');
  console.log('   d. Click button - text should expand to show full summary');
  console.log('   e. Open /map page');
  console.log('   f. Click any map marker');
  console.log('   g. Incident panel should slide in from right');
  console.log('   h. Scroll down in panel to see "Related News" section');
}

runDiagnoseUI().catch(console.error);
