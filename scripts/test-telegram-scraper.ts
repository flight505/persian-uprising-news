/**
 * Test script for Telegram User API scraper
 *
 * This will:
 * 1. Connect using your saved session
 * 2. Fetch recent messages from Persian news channels
 * 3. Filter for uprising-related content
 * 4. Display sample articles
 *
 * Run with: npx tsx scripts/test-telegram-scraper.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { initTelegramClient, fetchRecentMessages } from '../lib/telegram-user-api';

async function test() {
  console.log('🧪 Testing Telegram User API scraper\n');

  try {
    // Initialize client
    console.log('1️⃣ Connecting to Telegram...');
    const client = await initTelegramClient();

    // Fetch recent messages (last 24 hours)
    console.log('\n2️⃣ Fetching recent messages from Persian news channels...');
    const articles = await fetchRecentMessages(client, 24);

    console.log(`\n✅ Found ${articles.length} uprising-related articles\n`);

    // Display first 5 articles
    articles.slice(0, 5).forEach((article, idx) => {
      console.log(`📰 Article ${idx + 1}:`);
      console.log(`   Channel: ${article.channelName} (${article.channelUsername})`);
      console.log(`   Title: ${article.title}`);
      console.log(`   Summary: ${article.summary.substring(0, 100)}...`);
      console.log(`   URL: ${article.sourceUrl}`);
      console.log(`   Published: ${new Date(article.publishedAt).toLocaleString()}`);
      console.log('');
    });

    console.log('🎉 Test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Integrate with /api/news endpoint for automatic aggregation');
    console.log('2. Add deduplication to avoid duplicate articles');
    console.log('3. Deploy to production with TELEGRAM_SESSION_STRING env variable');

    await client.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure you ran setup-telegram-user-api.ts first');
    console.log('2. Check that TELEGRAM_SESSION_STRING is in .env');
    console.log('3. Verify your API_ID and API_HASH are correct');
    process.exit(1);
  }
}

test();
