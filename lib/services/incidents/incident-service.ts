import {
  saveIncident,
  getIncidents,
  updateIncident,
  isFirestoreAvailable,
  Incident,
} from '@/lib/firestore';

export class IncidentService {
  async getAll(filters?: {
    type?: string;
    bounds?: { north: number; south: number; east: number; west: number };
  }): Promise<Incident[]> {
    if (!isFirestoreAvailable()) {
      console.warn('⚠️ Firestore not available, returning empty array');
      return [];
    }

    try {
      let incidents = await getIncidents();

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

      return incidents;
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return [];
    }
  }

  async create(data: Omit<Incident, 'id' | 'createdAt'>): Promise<string> {
    if (!isFirestoreAvailable()) {
      throw new Error('Database unavailable');
    }

    this.validateIncident(data);

    const incidentId = await saveIncident(data);
    console.log(`📍 New incident reported: ${data.type} - ${data.title} (ID: ${incidentId})`);

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
