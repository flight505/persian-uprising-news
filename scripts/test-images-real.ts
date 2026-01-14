
import dotenv from 'dotenv';
dotenv.config();

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const KEY_1 = process.env.CLOUDFLARE_API_KEY; // dUsg...
const KEY_2 = process.env.CLOUDFLARE_API_TOKEN; // KmLuX...

async function testImages(keyName: string, key: string | undefined) {
    if (!key || !ACCOUNT_ID) {
        console.log(`❌ Skipped ${keyName}: Key or Account ID missing.`);
        return;
    }

    console.log(`📡 Testing ${keyName} (${key.substring(0, 5)}...):`);
    try {
        // List Images Endpoint
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/images/v1?per_page=1`, {
            headers: { 'Authorization': `Bearer ${key}` }
        });

        const data = await res.json();

        if (data.success) {
            console.log(`   ✅ Success! Images access confirmed.`);
        } else {
            console.error(`   ❌ Failed. Error: ${data.errors?.[0]?.message}`);
        }
    } catch (e: any) {
        console.error(`   ❌ Network Error: ${e.message}`);
    }
    console.log('---');
}

async function run() {
    console.log('🔍 Debugging Cloudflare Images Access...\n');
    await testImages('CLOUDFLARE_API_KEY', KEY_1);
    await testImages('CLOUDFLARE_API_TOKEN', KEY_2);
}

run();
