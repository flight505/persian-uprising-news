
import { logger } from './logger';
import { MediaDeduplication } from './media-deduplication';

export interface Incident {
    id: string;
    latitude: number;
    longitude: number;
    timestamp: number; // Unix timestamp
    title?: string;
    description?: string;
    imageHash?: string;
    verified?: boolean;
}

export interface VerificationResult {
    confidenceScore: number; // 0-100
    similarReports: Incident[];
    duplicateMedia: Incident[];
    factors: {
        locationMatch: boolean;
        timeMatch: boolean;
        mediaMatch: boolean;
    };
}

export class VerificationEngine {
    private mediaDedup: MediaDeduplication;

    constructor() {
        this.mediaDedup = new MediaDeduplication();
    }

    /**
     * Corroborate an incident against a database of other reports
     */
    async corroborateIncident(
        target: Incident,
        others: Incident[]
    ): Promise<VerificationResult> {
        const similar: Incident[] = [];
        const duplicates: Incident[] = [];

        let timeScore = 0;
        let locScore = 0;
        let mediaScore = 0;

        // Constants
        const TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // +/- 2 hours
        const DISTANCE_THRESHOLD_KM = 1.0; // 1km radius

        for (const other of others) {
            if (other.id === target.id) continue;

            // 1. Check Time Proximity
            const timeDiff = Math.abs(target.timestamp - other.timestamp);
            const isTimeClose = timeDiff <= TIME_WINDOW_MS;

            // 2. Check Location Proximity (Haversine)
            const dist = this.haversineDistance(
                target.latitude, target.longitude,
                other.latitude, other.longitude
            );
            const isLocClose = dist <= DISTANCE_THRESHOLD_KM;

            if (isTimeClose && isLocClose) {
                similar.push(other);
                // Add to corroboration score
                // Each corroborating report adds confidence
                if (other.verified) {
                    timeScore += 20; // Verified reports weight more
                } else {
                    timeScore += 10;
                }
            }

            // 3. Check Media Duplication (if hashes differ, but visuals similar)
            // If hashes are IDENTICAL/CLOSE, it's a "Duplicate Media"
            // This could mean:
            // a) Repost (Spam) -> Negative indicator? 
            // b) Same event, different angle? (No, hash logic detects same image)
            // c) Same image, different user -> Corroboration of the *image* existence, but maybe not independent sighting.
            // Usually, exact image match from different users = Viral spread, not necessarily independent verification.
            // BUT if the same image appears in a *verified* report, this new report is likely true (repost).

            if (target.imageHash && other.imageHash) {
                const isDup = this.mediaDedup.isDuplicate(target.imageHash, other.imageHash);
                if (isDup) {
                    duplicates.push(other);
                    if (other.verified) mediaScore = 50; // High confidence if matches verified media
                }
            }
        }

        // Cap scores
        let finalScore = 0;

        // Base confidence from corroboration
        // 1 similar unverified = 10
        // 3 similar unverified = 30
        // 1 similar verified = 20
        finalScore += Math.min(timeScore, 60); // Cap crowd corroboration at 60%

        // Media match with verified source?
        finalScore = Math.max(finalScore, mediaScore);

        // If we have >3 similar reports, that's strong evidence
        if (similar.length > 3) finalScore += 20;

        return {
            confidenceScore: Math.min(finalScore, 100),
            similarReports: similar,
            duplicateMedia: duplicates,
            factors: {
                locationMatch: similar.length > 0,
                timeMatch: similar.length > 0,
                mediaMatch: duplicates.length > 0
            }
        };
    }

    // Haversine formula for km distance
    private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // km
        const dLat = this.toBk(lat2 - lat1);
        const dLon = this.toBk(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toBk(lat1)) * Math.cos(this.toBk(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toBk(deg: number): number {
        return deg * (Math.PI / 180);
    }
}
