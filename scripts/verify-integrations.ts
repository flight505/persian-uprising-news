
import dotenv from 'dotenv';
import Pinata from '@pinata/sdk';
import algoliasearch from 'algoliasearch';

// Load .env explicitly
dotenv.config();

async function verifyIntegrations() {
    console.log('🔐 Verifying External Integrations...\n');

    // 1. Verify Algolia
    console.log('🔹 ALGOLIA SEARCH:');
    const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
    const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
    const writeKey = process.env.ALGOLIA_WRITE_KEY;

    if (!appId || !writeKey) {
        console.warn('   ⚠️ Algolia keys missing.');
    } else {
        try {
            const client = algoliasearch(appId, writeKey);
            // Try to list indices (requires write/admin key usually, or at least valid creds)
            const { items } = await client.listIndices();
            console.log(`   ✅ Authenticated. Found ${items?.length || 0} indices.`);
        } catch (e: any) {
            console.error(`   ❌ Algolia Connection Failed: ${e.message}`);
        }
    }
    console.log('');

    // 2. Verify Cloudflare
    console.log('🔹 CLOUDFLARE:');
    const cfToken = process.env.CLOUDFLARE_RADAR_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    if (!cfToken) {
        console.warn('   ⚠️ Cloudflare Token missing.');
    } else {
        try {
            const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
                headers: { 'Authorization': `Bearer ${cfToken}` }
            });
            const data = await res.json();
            if (data.success) {
                console.log('   ✅ Token Verified (Status: Active).');
            } else {
                console.error('   ❌ Token Verification Failed:', data.errors?.[0]?.message);
            }
        } catch (e: any) {
            console.error(`   ❌ Network Error: ${e.message}`);
        }
    }
    console.log('');

    // 3. Verify Pinata
    console.log('🔹 PINATA IPFS:');
    const pinataKey = process.env.PINATA_API_KEY;
    const pinataSecret = process.env.PINATA_SECRET_KEY;

    if (!pinataKey || !pinataSecret) {
        console.warn('   ⚠️ Pinata keys missing.');
    } else {
        try {
            const pinata = new Pinata(pinataKey, pinataSecret);
            const auth = await pinata.testAuthentication();
            if (auth.authenticated) {
                console.log('   ✅ Authentication Successful.');
            } else {
                console.error('   ❌ Authentication Failed.');
            }
        } catch (e: any) {
            // Pinata SDK throws nicely
            console.error(`   ❌ Connection Failed: ${e.message}`);
        }
    }
    console.log('\n🏁 Verification Complete.');
}

verifyIntegrations().catch(console.error);
