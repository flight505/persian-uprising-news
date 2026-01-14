
import { Incident } from './firestore';
import { logger } from './logger';

export interface CoordinationGroup {
    id: string;
    incidentIds: string[];
    authorIds: string[]; // Or source names if IDs unavailable
    type: 'exact_text' | 'temporal_burst' | 'unknown';
    confidence: number;
    firstSeen: number;
    lastSeen: number;
    sharedContentSample: string;
}

export interface BotScore {
    authorId: string;
    score: number; // 0-100 (100 = definitely bot)
    reasons: string[];
}

export class DisinformationDetector {

    /**
     * Detect groups of incidents that appear to be coordinated.
     * 1. Exact Text Match Bursts: Same content posted by different users rapidly.
     */
    detectCoordination(incidents: Incident[]): CoordinationGroup[] {
        const groups: CoordinationGroup[] = [];
        const processed = new Set<string>();

        // 1. Group by exact text content (simple hash/string match)
        // In a real system, we'd use MinHash for near-duplicates. 
        // For MVP, we strip whitespace/punctuation and compare.
        const contentMap = new Map<string, Incident[]>();

        for (const inc of incidents) {
            const signature = this.normalizeText(inc.description || inc.title);
            if (signature.length < 20) continue; // Ignore short texts like "Help me"

            if (!contentMap.has(signature)) {
                contentMap.set(signature, []);
            }
            contentMap.get(signature)?.push(inc);
        }

        // Analyze clusters
        contentMap.forEach((cluster, signature) => {
            if (cluster.length < 3) return; // Ignore small coincidences

            // Check time window. If 10 posts happen in 1 hour -> suspicious.
            // If 10 posts happen over 1 year -> viral/copypasta (less likely "coordinated attack" vs just organic)
            const sorted = cluster.sort((a, b) => a.timestamp - b.timestamp);
            const burstWindow = 60 * 60 * 1000; // 1 hour

            // Simple sliding window check
            let maxBurst = 0;
            let currentWindowStart = 0;

            // Just take the whole cluster for now if densely packed
            const duration = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
            const avgTimeBetween = duration / cluster.length;

            if (avgTimeBetween < burstWindow) {
                // High frequency reposting
                groups.push({
                    id: `coord-${Date.now()}-${groups.length}`,
                    incidentIds: cluster.map(i => i.id),
                    authorIds: cluster.map(i => i.reportedBy || 'anon'), // In real app, use author ID
                    type: 'exact_text',
                    confidence: Math.min(cluster.length * 10, 95), // More posts = higher confidence
                    firstSeen: sorted[0].timestamp,
                    lastSeen: sorted[sorted.length - 1].timestamp,
                    sharedContentSample: cluster[0].description || cluster[0].title
                });
            }
        });

        return groups;
    }

    private normalizeText(text: string): string {
        return text.toLowerCase().replace(/[^\w\s\u0600-\u06FF]/g, '').replace(/\s+/g, ' ').trim();
    }
}
