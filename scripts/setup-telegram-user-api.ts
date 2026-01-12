/**
 * One-time setup script for Telegram User API authentication
 *
 * This script will:
 * 1. Prompt for your phone number
 * 2. Send you a verification code via Telegram
 * 3. Authenticate and generate a session string
 * 4. Save the session string to .env for future use
 *
 * Prerequisites:
 * 1. Create a Telegram app at https://my.telegram.org/apps
 * 2. Add API_ID and API_HASH to your .env file
 *
 * Run with: npx tsx scripts/setup-telegram-user-api.ts
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as readline from 'readline/promises';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function setup() {
  console.log('🔐 Telegram User API Setup\n');

  // Check for API credentials
  const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
  const API_HASH = process.env.TELEGRAM_API_HASH || '';

  if (!API_ID || !API_HASH) {
    console.error('❌ Missing Telegram API credentials!');
    console.log('\n📝 Please follow these steps:');
    console.log('1. Go to https://my.telegram.org/apps');
    console.log('2. Create a new application');
    console.log('3. Add to .env file:');
    console.log('   TELEGRAM_API_ID=your_api_id');
    console.log('   TELEGRAM_API_HASH=your_api_hash');
    process.exit(1);
  }

  console.log('✅ Found Telegram API credentials');
  console.log(`   API ID: ${API_ID}`);
  console.log(`   API Hash: ${API_HASH.substring(0, 10)}...\n`);

  // Initialize client
  const client = new TelegramClient(
    new StringSession(''),
    API_ID,
    API_HASH,
    {
      connectionRetries: 5,
    }
  );

  console.log('📱 Connecting to Telegram...\n');

  await client.start({
    phoneNumber: async () => {
      const phone = await rl.question('Enter your phone number (with country code, e.g., +1234567890): ');
      return phone;
    },
    password: async () => {
      const password = await rl.question('Enter your 2FA password (if enabled): ');
      return password;
    },
    phoneCode: async () => {
      const code = await rl.question('Enter the verification code sent to your Telegram app: ');
      return code;
    },
    onError: (err) => console.error('Authentication error:', err),
  });

  console.log('\n✅ Successfully authenticated!');

  // Get session string
  const sessionString = client.session.save() as unknown as string;

  // Save to .env file
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Update or add SESSION_STRING
  if (envContent.includes('TELEGRAM_SESSION_STRING=')) {
    envContent = envContent.replace(
      /TELEGRAM_SESSION_STRING=.*/,
      `TELEGRAM_SESSION_STRING="${sessionString}"`
    );
  } else {
    envContent += `\nTELEGRAM_SESSION_STRING="${sessionString}"\n`;
  }

  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Session string saved to .env');
  console.log('\n📋 Next steps:');
  console.log('1. Test the connection: npx tsx scripts/test-telegram-scraper.ts');
  console.log('2. Deploy to Vercel with the session string as an environment variable');
  console.log('3. The scraper will now automatically fetch news from Persian channels');

  rl.close();
  process.exit(0);
}

setup().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
