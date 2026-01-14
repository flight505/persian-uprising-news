
import { NextRequest, NextResponse } from 'next/server';
import { CloudflareRadarClient } from '@/lib/cloudflare-radar-client';

const radar = new CloudflareRadarClient();

export async function GET(request: NextRequest) {
    try {
        const [hijacks, leaks] = await Promise.all([
            radar.getBGPHijacks(),
            radar.getRouteLeaks()
        ]);

        return NextResponse.json({
            hijacks,
            leaks,
            updatedAt: Date.now()
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=300' // 5 min cache
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch BGP data' }, { status: 500 });
    }
}
