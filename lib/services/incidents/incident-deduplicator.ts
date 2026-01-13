/**
 * Incident Deduplication Service
 * Prevents duplicate incident reports based on location, type, and time
 */

import { Incident } from '@/lib/firestore';
import { logger } from '@/lib/logger';

interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateId?: string;
  reason?: string;
  similarity?: number;
}

export class IncidentDeduplicator {
  // Location threshold: ~100 meters (approximately 0.001 degrees)
  private readonly LOCATION_THRESHOLD_KM = 0.1; // 100 meters

  // Time threshold: incidents within 24 hours
  private readonly TIME_THRESHOLD_MS = 24 * 60 * 60 * 1000;

  // Title similarity threshold (Levenshtein distance ratio)
  private readonly TITLE_SIMILARITY_THRESHOLD = 0.7;

  /**
   * Check if a new incident is a duplicate of existing incidents
   */
  checkDuplicate(
    newIncident: Omit<Incident, 'id' | 'createdAt'>,
    existingIncidents: Incident[]
  ): DeduplicationResult {
    const now = Date.now();

    for (const existing of existingIncidents) {
      // 1. Check if same type
      if (existing.type !== newIncident.type) {
        continue;
      }

      // 2. Check if within time threshold (last 24 hours)
      const timeDiff = now - existing.timestamp;
      if (timeDiff > this.TIME_THRESHOLD_MS) {
        continue;
      }

      // 3. Check if within location threshold (~100 meters)
      const distance = this.calculateDistance(
        newIncident.location.lat,
        newIncident.location.lon,
        existing.location.lat,
        existing.location.lon
      );

      if (distance <= this.LOCATION_THRESHOLD_KM) {
        // 4. Check title similarity
        const similarity = this.calculateSimilarity(
          newIncident.title.toLowerCase(),
          existing.title.toLowerCase()
        );

        if (similarity >= this.TITLE_SIMILARITY_THRESHOLD) {
          return {
            isDuplicate: true,
            duplicateId: existing.id,
            reason: `Similar incident already exists within ${Math.round(distance * 1000)}m`,
            similarity,
          };
        }
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns value between 0 (completely different) and 1 (identical)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    if (maxLength === 0) return 1.0;

    return 1 - distance / maxLength;
  }

  /**
   * Levenshtein distance algorithm
   * Measures the minimum number of single-character edits needed to change one word into another
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Remove exact duplicates from incident list
   * (same id appearing multiple times)
   */
  removeExactDuplicates(incidents: Incident[]): Incident[] {
    const seen = new Set<string>();
    return incidents.filter(incident => {
      if (seen.has(incident.id)) {
        logger.debug('incident_exact_duplicate_filtered', { incident_id: incident.id });
        return false;
      }
      seen.add(incident.id);
      return true;
    });
  }

  /**
   * Group similar incidents (within location + time threshold)
   * Returns deduplicated list with duplicate count
   */
  groupSimilarIncidents(incidents: Incident[]): Array<Incident & { duplicateCount?: number }> {
    const groups: Map<string, Incident & { duplicateCount: number }> = new Map();

    for (const incident of incidents) {
      let foundGroup = false;

      for (const [groupId, groupIncident] of groups.entries()) {
        // Check if incidents are similar
        if (
          incident.type === groupIncident.type &&
          Math.abs(incident.timestamp - groupIncident.timestamp) <= this.TIME_THRESHOLD_MS
        ) {
          const distance = this.calculateDistance(
            incident.location.lat,
            incident.location.lon,
            groupIncident.location.lat,
            groupIncident.location.lon
          );

          if (distance <= this.LOCATION_THRESHOLD_KM) {
            // This is a duplicate, increment count
            groupIncident.duplicateCount++;
            foundGroup = true;
            logger.debug('incident_grouped_as_duplicate', {
              new_title: incident.title,
              existing_title: groupIncident.title,
              distance_km: distance,
            });
            break;
          }
        }
      }

      if (!foundGroup) {
        // Start new group
        groups.set(incident.id, { ...incident, duplicateCount: 1 });
      }
    }

    return Array.from(groups.values());
  }
}
