
import dotenv from 'dotenv';
import { CloudflareRadarClient } from '../lib/cloudflare-radar-client';

dotenv.config();

async function testRadar() {
    console.log('📡 Testing Cloudflare Radar API Connectivity...');

    const token = process.env.CLOUDFLARE_RADAR_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    console.log(`   Using Token: ${token ? token.substring(0, 5) + '...' : 'NONE'}`);

    if (!token) {
        console.error('   ❌ No Token Found.');
        return;
    }

    const client = new CloudflareRadarClient(token);

    try {
        console.log('   - Fetching recent BGP Leaks (Global/Iran)...');
        // ASN 12880 is TIC (Telecommunication Company of Iran)
        const leaks = await client.getRouteLeaks([12880]);

        console.log(`   ✅ Successful Request! Found ${leaks.length} leaks.`);
        if (leaks.length > 0) {
            console.log('   Sample Leak:', JSON.stringify(leaks[0], null, 2));
        }

    } catch (e: any) {
        console.error(`   ❌ API Request Failed: ${e.message}`);
        // Log full error if possible
        console.error(e);
    }
}

testRadar().catch(console.error);
