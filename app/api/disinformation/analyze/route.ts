
import { NextRequest, NextResponse } from 'next/server';
import { getIncidents } from '@/lib/firestore';
import { DisinformationDetector } from '@/lib/disinformation-detector';

const detector = new DisinformationDetector();

export async function GET(request: NextRequest) {
    try {
        // In real implementation, this runs async background jobs.
        // Here we fetch recent incidents and analyze on-the-fly.
        const incidents = await getIncidents();

        // Filter to last 24h for relevant "campaigns"
        const now = Date.now();
        const recent = incidents.filter(i => (now - i.timestamp) < 24 * 60 * 60 * 1000);

        const coordinationGroups = detector.detectCoordination(recent);

        return NextResponse.json({
            analyzedCount: recent.length,
            coordinationGroups
        });
    } catch (error) {
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
