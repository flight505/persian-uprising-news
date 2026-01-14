
import { NextRequest, NextResponse } from 'next/server';
import { OONIClient } from '@/lib/ooni-client';

const ooniClient = new OONIClient();

export async function GET(request: NextRequest) {
    try {
        const summary = await ooniClient.getCensorshipSummary('IR');

        return NextResponse.json({
            summary,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch OONI data' },
            { status: 500 }
        );
    }
}
