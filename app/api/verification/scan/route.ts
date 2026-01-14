
import { NextRequest, NextResponse } from 'next/server';
import { getRecentArticles, getDb } from '@/lib/firestore'; // Assuming we can use this
import { VerificationEngine, Incident } from '@/lib/verification-engine';
import { logger } from '@/lib/logger';

const engine = new VerificationEngine();

export async function POST(request: NextRequest) {
    try {
        const { articleId } = await request.json();

        // In a real implementation, we would fetch the specific article.
        // Here we'll just scan recent articles for demonstration/prototype.
        const articles = await getRecentArticles(24);

        // Find the target if ID provided, or just pick the first unverified one
        const targetArticle = articleId
            ? articles.find(a => a.id === articleId)
            : articles.find(a => !a.verified && a.verificationScore === undefined);

        if (!targetArticle) {
            return NextResponse.json({ message: 'No suitable articles found to verify' });
        }

        // Convert Article to Incident format expected by engine
        const targetIncident: Incident = {
            id: targetArticle.id,
            latitude: 35.6892, // Mock: would come from extracted location metadata
            longitude: 51.3890,
            timestamp: typeof targetArticle.publishedAt === 'number'
                ? targetArticle.publishedAt
                : Date.parse(targetArticle.publishedAt as string),
            title: targetArticle.title,
            imageHash: targetArticle.imageHash,
            verified: targetArticle.verified
        };

        // Convert others
        const otherIncidents: Incident[] = articles
            .filter(a => a.id !== targetArticle.id)
            .map(a => ({
                id: a.id,
                latitude: 35.6892 + (Math.random() * 0.1 - 0.05), // Mock: small variations
                longitude: 51.3890 + (Math.random() * 0.1 - 0.05),
                timestamp: typeof a.publishedAt === 'number' ? a.publishedAt : Date.parse(a.publishedAt as string),
                title: a.title,
                imageHash: a.imageHash,
                verified: a.verified
            }));

        const result = await engine.corroborateIncident(targetIncident, otherIncidents);

        // Update Firestore with results (mocked)
        const db = getDb();
        if (db) {
            await db.collection('articles').doc(targetArticle.id).update({
                verificationScore: result.confidenceScore,
                corroboratedBy: result.similarReports.map(r => r.id),
                // Auto-verify if very high confidence?
                verified: result.confidenceScore > 80
            });
        }

        logger.info('verification_scan_complete', {
            articleId: targetArticle.id,
            score: result.confidenceScore
        });

        return NextResponse.json({
            success: true,
            articleId: targetArticle.id,
            result
        });

    } catch (error) {
        logger.error('verification_scan_failed', { error });
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
