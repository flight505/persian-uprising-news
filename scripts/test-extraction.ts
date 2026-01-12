#!/usr/bin/env tsx
/**
 * Test Incident Extraction Pipeline
 * Tests the full pipeline: extraction -> geocoding -> saving
 */

import { extractIncidentsFromArticles } from '../lib/incident-extractor';
import { geocodeLocations } from '../lib/geocoder';

// Mock Telegram articles with various incident types
const mockArticles = [
  {
    id: 'test-1',
    title: '🔴 BREAKING: Heavy security presence reported in central Tehran',
    content: '🔴 BREAKING: Heavy security presence reported in central Tehran tonight as students gather near university campuses. Internet disruptions confirmed in multiple districts. Reports of arrests near Tehran University. #MahsaAmini اعتراض تهران دانشگاه بازداشت',
    url: 'https://t.me/iranintl/test1',
    source: 'telegram',
    publishedAt: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'test-2',
    title: 'Protesters chant "freedom" in Mashhad',
    content: 'Large protests in Mashhad with chants of "آزادی" (freedom). Security forces present. Several people injured by tear gas. مشهد تظاهرات زخمی',
    url: 'https://t.me/iranintl/test2',
    source: 'telegram',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'test-3',
    title: 'Reports of casualties in Shiraz clashes',
    content: 'Unconfirmed reports of fatalities during confrontations with security forces in Shiraz. Multiple injured protesters being treated. شیراز کشته درگیری',
    url: 'https://t.me/iranintl/test3',
    source: 'telegram',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'test-4',
    title: 'Weather update for Tehran',
    content: 'Sunny weather expected in Tehran tomorrow with temperatures reaching 25°C. No rain forecast for the weekend.',
    url: 'https://t.me/weather/test4',
    source: 'telegram',
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'test-5',
    title: 'Arrests at Isfahan demonstration',
    content: 'Multiple arrests reported at demonstrations in Isfahan today. Security forces detained at least 20 protesters. اصفهان بازداشت اعتراض',
    url: 'https://t.me/iranintl/test5',
    source: 'telegram',
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
  },
];

async function testExtraction() {
  console.log('🧪 Testing Incident Extraction Pipeline\n');
  console.log('=' .repeat(60));

  // Step 1: Extract incidents
  console.log('\n📊 Step 1: Extracting incidents from articles...\n');
  const extractedIncidents = extractIncidentsFromArticles(mockArticles);

  console.log(`✅ Extracted ${extractedIncidents.length} incidents:\n`);
  extractedIncidents.forEach((incident, idx) => {
    console.log(`${idx + 1}. ${incident.type.toUpperCase()} - ${incident.title}`);
    console.log(`   Location: ${incident.location}`);
    console.log(`   Confidence: ${incident.confidence}%`);
    console.log(`   Keywords: ${incident.keywords.join(', ')}`);
    console.log(`   Source: ${incident.extractedFrom.source}`);
    console.log('');
  });

  if (extractedIncidents.length === 0) {
    console.log('⚠️  No incidents extracted. Check extraction patterns.');
    return;
  }

  // Step 2: Geocode locations
  console.log('=' .repeat(60));
  console.log('\n🗺️  Step 2: Geocoding locations...\n');

  const uniqueLocations = [...new Set(extractedIncidents.map(i => i.location))];
  console.log(`📍 Unique locations: ${uniqueLocations.join(', ')}\n`);

  const geocodedLocations = await geocodeLocations(uniqueLocations);

  console.log(`✅ Geocoded ${geocodedLocations.size}/${uniqueLocations.length} locations:\n`);
  geocodedLocations.forEach((geocoded, location) => {
    console.log(`  ${location}:`);
    console.log(`    Coordinates: ${geocoded.lat.toFixed(4)}, ${geocoded.lon.toFixed(4)}`);
    console.log(`    Address: ${geocoded.address}`);
    console.log(`    Confidence: ${geocoded.confidence}`);
    console.log('');
  });

  // Step 3: Build final incidents
  console.log('=' .repeat(60));
  console.log('\n💾 Step 3: Building final incidents for storage...\n');

  const finalIncidents = [];
  for (const extracted of extractedIncidents) {
    const geocoded = geocodedLocations.get(extracted.location);

    if (!geocoded) {
      console.log(`❌ Skipping (no geocoding): ${extracted.title}`);
      continue;
    }

    if (extracted.confidence < 40) {
      console.log(`❌ Skipping (low confidence ${extracted.confidence}%): ${extracted.title}`);
      continue;
    }

    finalIncidents.push({
      type: extracted.type,
      title: extracted.title,
      description: extracted.description,
      location: {
        lat: geocoded.lat,
        lon: geocoded.lon,
        address: geocoded.address,
      },
      confidence: extracted.confidence,
      verified: false,
      sourceArticle: {
        id: extracted.extractedFrom.articleId,
        title: extracted.extractedFrom.articleTitle,
        url: extracted.extractedFrom.articleUrl,
        source: extracted.extractedFrom.source,
      },
    });

    console.log(`✅ ${extracted.type.toUpperCase()}: ${extracted.title.substring(0, 60)}...`);
  }

  console.log(`\n✅ ${finalIncidents.length}/${extractedIncidents.length} incidents ready for storage`);

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📈 Summary:\n');
  console.log(`  Articles processed: ${mockArticles.length}`);
  console.log(`  Incidents extracted: ${extractedIncidents.length}`);
  console.log(`  Locations geocoded: ${geocodedLocations.size}`);
  console.log(`  Final incidents: ${finalIncidents.length}`);

  const typeBreakdown = finalIncidents.reduce((acc, inc) => {
    acc[inc.type] = (acc[inc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n  Type breakdown:');
  Object.entries(typeBreakdown).forEach(([type, count]) => {
    console.log(`    ${type}: ${count}`);
  });

  console.log('\n✅ Test completed successfully!\n');
}

testExtraction().catch(console.error);
