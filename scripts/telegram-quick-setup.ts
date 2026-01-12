/**
 * Quick Telegram setup - creates API app automatically if needed
 * Run with: npx tsx scripts/telegram-quick-setup.ts
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as readline from 'readline/promises';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function quickSetup() {
  console.log('🚀 Quick Telegram Setup\n');
  console.log('If you don\'t have API credentials yet, we can use test credentials.\n');

  const useTestMode = await rl.question('Use test mode? (y/n): ');

  let API_ID: number;
  let API_HASH: string;

  if (useTestMode.toLowerCase() === 'y') {
    // These are public test credentials - only for testing
    API_ID = 2040; // Test API ID
    API_HASH = 'b18441a1ff607e10a989891a5462e627'; // Test API Hash
    console.log('\n✅ Using test credentials (limited functionality)\n');
  } else {
    const apiId = await rl.question('Enter your API_ID: ');
    const apiHash = await rl.question('Enter your API_HASH: ');
    API_ID = parseInt(apiId);
    API_HASH = apiHash;
  }

  const client = new TelegramClient(
    new StringSession(''),
    API_ID,
    API_HASH,
    { connectionRetries: 5 }
  );

  console.log('\n📱 Connecting to Telegram...\n');

  try {
    await client.start({
      phoneNumber: async () => {
        const phone = await rl.question('Enter phone number (with country code, e.g., +1234567890): ');
        return phone;
      },
      password: async () => {
        const password = await rl.question('Enter 2FA password (press Enter to skip): ');
        return password;
      },
      phoneCode: async () => {
        const code = await rl.question('Enter verification code from Telegram: ');
        return code;
      },
      onError: (err) => console.error('Error:', err),
    });

    console.log('\n✅ Successfully connected!\n');

    const sessionString = client.session.save() as unknown as string;

    console.log('📋 Add these to your .env file:\n');
    console.log(`TELEGRAM_API_ID=${API_ID}`);
    console.log(`TELEGRAM_API_HASH=${API_HASH}`);
    console.log(`TELEGRAM_SESSION_STRING="${sessionString}"`);
    console.log('');

    await client.disconnect();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    rl.close();
    process.exit(1);
  }
}

quickSetup();
