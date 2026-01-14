
import { NextRequest, NextResponse } from 'next/server';
import { IODAClient } from '@/lib/ioda-client';
import { logger } from '@/lib/logger';

// Instantiate client (could be singleton)
const ioda = new IODAClient();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'IR';

    // Optional time range
    const from = searchParams.get('from') ? parseInt(searchParams.get('from')!) : undefined;
    const until = searchParams.get('until') ? parseInt(searchParams.get('until')!) : undefined;

    const startTime = Date.now();

    try {
        const signals = await ioda.getCountrySignals(country, from, until);
        const outages = await ioda.detectOutages(country);

        const duration = Date.now() - startTime;
        logger.http('GET', '/api/connectivity/ioda', 200, duration, { country });

        return NextResponse.json({
            signals,
            outages,
            cachedAt: Date.now()
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' // Cache for 5min
            }
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('ioda_api_failed', { error, duration_ms: duration });

        return NextResponse.json(
            { error: 'Failed to fetch IODA connectivity data' },
            { status: 502 }
        );
    }
}
