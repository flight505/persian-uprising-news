
import { NextRequest, NextResponse } from 'next/server';
import { IPFSDistributor } from '@/lib/ipfs-distributor';
import { getRecentArticles, saveIPFSSnapshot, getIPFSSnapshots } from '@/lib/firestore';
import { logger } from '@/lib/logger';

// Initialize with environment variables
const ipfs = new IPFSDistributor({
    gateway: 'pinata',
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretKey: process.env.PINATA_SECRET_KEY,
});

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Get last 24 hours of articles
        // getRecentArticles retrieves ~200 articles from last 24h
        const articles = await getRecentArticles(24);

        if (articles.length === 0) {
            return NextResponse.json(
                { error: 'No recent articles to snapshot' },
                { status: 400 }
            );
        }

        logger.info('ipfs_snapshot_creating', {
            article_count: articles.length,
        });

        // Upload to Pinata/IPFS
        const snapshot = await ipfs.createSnapshot(articles);

        // Save metadata to Firestore
        await saveIPFSSnapshot({
            cid: snapshot.cid,
            url: snapshot.url,
            timestamp: snapshot.timestamp,
            articleCount: articles.length,
            sizeBytes: snapshot.sizeBytes || 0
        });

        const duration = Date.now() - startTime;
        logger.http('POST', '/api/ipfs/snapshot', 200, duration, {
            cid: snapshot.cid,
            article_count: articles.length,
        });

        return NextResponse.json({
            success: true,
            snapshot,
        });
    } catch (error) {
        const duration = Date.now() - startTime;

        logger.error('ipfs_snapshot_failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            duration_ms: duration,
        });

        return NextResponse.json(
            { error: 'Failed to create IPFS snapshot' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get('cid');

    if (cid) {
        try {
            const snapshot = await ipfs.getSnapshot(cid);
            return NextResponse.json(snapshot);
        } catch (error) {
            return NextResponse.json(
                { error: 'Failed to retrieve snapshot' },
                { status: 404 }
            );
        }
    }

    // List all snapshots from Firestore
    try {
        const snapshots = await getIPFSSnapshots(20);
        return NextResponse.json({ snapshots });
    } catch (error) {
        logger.error('ipfs_list_failed', { error });
        return NextResponse.json(
            { error: 'Failed to list snapshots' },
            { status: 500 }
        );
    }
}
