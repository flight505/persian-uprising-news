import {
  saveIncident,
  getIncidents,
  updateIncident,
  isFirestoreAvailable,
  Incident,
} from '@/lib/firestore';
import { IncidentDeduplicator } from './incident-deduplicator';
import { logger } from '@/lib/logger';

export class IncidentService {
  private deduplicator = new IncidentDeduplicator();
  async getAll(filters?: {
    type?: string;
    bounds?: { north: number; south: number; east: number; west: number };
  }): Promise<Incident[]> {
    if (!isFirestoreAvailable()) {
      logger.warn('firestore_unavailable', {
        operation: 'get_incidents',
        returning_empty: true,
      });
      return [];
    }

    try {
      let incidents = await getIncidents();

      // Remove exact duplicates (same ID appearing multiple times)
      incidents = this.deduplicator.removeExactDuplicates(incidents);

      if (filters?.bounds) {
        const { north, south, east, west } = filters.bounds;
        incidents = incidents.filter(incident =>
          incident.location.lat <= north &&
          incident.location.lat >= south &&
          incident.location.lon <= east &&
          incident.location.lon >= west
        );
      }

      if (filters?.type) {
        incidents = incidents.filter(incident => incident.type === filters.type);
      }

      // Group similar incidents (optional - returns with duplicateCount)
      // Uncomment if you want to show duplicate counts in UI
      // incidents = this.deduplicator.groupSimilarIncidents(incidents);

      return incidents;
    } catch (error) {
      logger.error('incidents_fetch_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        filters: filters,
      });
      return [];
    }
  }

  async create(data: Omit<Incident, 'id' | 'createdAt'>): Promise<string> {
    if (!isFirestoreAvailable()) {
      throw new Error('Database unavailable');
    }

    this.validateIncident(data);

    // Check for duplicates before saving
    const existingIncidents = await getIncidents();
    const deduplicationResult = this.deduplicator.checkDuplicate(data, existingIncidents);

    if (deduplicationResult.isDuplicate) {
      logger.warn('duplicate_incident_detected', {
        reason: deduplicationResult.reason,
        similarity: deduplicationResult.similarity,
        incident_type: data.type,
        title: data.title.substring(0, 50),
      });
      throw new Error(
        `This incident may already be reported. ${deduplicationResult.reason}. ` +
        `Please check existing reports or provide more specific details.`
      );
    }

    const incidentId = await saveIncident(data);
    logger.info('incident_created', {
      incident_id: incidentId,
      type: data.type,
      title: data.title,
      reported_by: data.reportedBy,
      verified: data.verified,
    });

    return incidentId;
  }

  async upvote(id: string): Promise<void> {
    if (!isFirestoreAvailable()) {
      throw new Error('Database unavailable');
    }

    await updateIncident(id, {
      upvotes: 1,
    } as any);
  }

  private validateIncident(data: Omit<Incident, 'id' | 'createdAt'>): void {
    if (!data.type || !data.title || !data.description || !data.location) {
      throw new Error('Missing required fields: type, title, description, location');
    }

    if (!['protest', 'arrest', 'injury', 'death', 'other'].includes(data.type)) {
      throw new Error('Invalid incident type');
    }

    if (!data.location.lat || !data.location.lon) {
      throw new Error('Invalid location coordinates');
    }

    if (data.title.length > 200) {
      throw new Error('Title too long (max 200 characters)');
    }

    if (data.description.length > 500) {
      throw new Error('Description too long (max 500 characters)');
    }
  }
}
