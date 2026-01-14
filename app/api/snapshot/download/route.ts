
import { NextRequest, NextResponse } from 'next/server';
import { getRecentArticles } from '@/lib/firestore';
import { SnapshotSigner } from '@/lib/snapshot-signer';
import { logger } from '@/lib/logger';
import JSZip from 'jszip';

const signer = new SnapshotSigner();

export async function GET(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Get last 7 days of articles
        const articles = await getRecentArticles(24 * 7); // 7 days

        if (articles.length === 0) {
            return NextResponse.json(
                { error: 'No recent articles found' },
                { status: 404 }
            );
        }

        // Create signed snapshot
        const signedSnapshot = await signer.signSnapshot({
            timestamp: Date.now(),
            version: '1.0',
            articles: articles.map(a => ({
                id: a.id,
                title: a.title,
                summary: a.summary,
                publishedAt: a.publishedAt,
                source: a.source,
                url: a.sourceUrl,
                content: a.content, // Include content for offline reading
            })),
            metadata: {
                articleCount: articles.length,
                generatedAt: new Date().toISOString(),
            }
        });

        // Create ZIP archive with snapshot + signature
        const zip = new JSZip();
        zip.file('snapshot.json', JSON.stringify(signedSnapshot.snapshot, null, 2));
        zip.file('signature.txt', signedSnapshot.signature);
        zip.file('public_key.pem', signedSnapshot.publicKey);
        zip.file('README.txt', `
Persian Uprising News - Offline Snapshot Pack

This archive contains news articles from the last 7 days.

Files:
- snapshot.json: News articles in JSON format
- signature.txt: Cryptographic signature (RSA-SHA256)
- public_key.pem: Public key for signature verification

Verification:
To verify the snapshot has not been tampered with, use the signature and public key.

Generated: ${new Date().toISOString()}
Articles: ${articles.length}
    `.trim());

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        const duration = Date.now() - startTime;
        logger.http('GET', '/api/snapshot/download', 200, duration, {
            article_count: articles.length,
            zip_size_bytes: zipBuffer.length,
        });

        return new NextResponse(new Blob([new Uint8Array(zipBuffer)]), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="persian-uprising-news-${Date.now()}.zip"`,
                'Content-Length': zipBuffer.length.toString(),
            },
        });
    } catch (error) {
        const duration = Date.now() - startTime;

        logger.error('snapshot_download_failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            duration_ms: duration,
        });

        return NextResponse.json(
            { error: 'Failed to generate snapshot' },
            { status: 500 }
        );
    }
}
