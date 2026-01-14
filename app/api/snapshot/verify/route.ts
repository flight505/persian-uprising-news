
import { NextRequest, NextResponse } from 'next/server';
import { SnapshotSigner } from '@/lib/snapshot-signer';
import { logger } from '@/lib/logger';

const signer = new SnapshotSigner();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { snapshot, signature, publicKey } = body;

        if (!snapshot || !signature || !publicKey) {
            return NextResponse.json(
                { error: 'Missing snapshot, signature, or publicKey' },
                { status: 400 }
            );
        }

        const verified = signer.verifySnapshot(snapshot, signature, publicKey);

        // Log verification attempt (security monitoring)
        logger.info('snapshot_verification_attempt', {
            verified,
            timestamp: snapshot.timestamp,
            articleCount: snapshot.articles?.length
        });

        return NextResponse.json({
            verified,
            timestamp: Date.now()
        });
    } catch (error) {
        logger.error('verification_api_error', { error });
        return NextResponse.json(
            { error: 'Verification process failed' },
            { status: 500 }
        );
    }
}
