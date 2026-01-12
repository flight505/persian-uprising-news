import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  saveIncident,
  getIncidents as getFirestoreIncidents,
  isFirestoreAvailable,
  Incident as FirestoreIncident,
} from '@/lib/firestore';

export interface Incident {
  id: string;
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  images?: string[];
  verified: boolean;
  reportedBy: 'crowdsource' | 'official';
  timestamp: number;
  upvotes: number;
  createdAt: number;
}

// Mock data for seeding Firestore on first load
const mockIncidents: Omit<Incident, 'id' | 'createdAt'>[] = [
  {
    type: 'protest',
    title: 'Large demonstration in Tehran',
    description: 'Thousands gathered in central Tehran demanding political reform. Heavy police presence reported.',
    location: { lat: 35.6892, lon: 51.3890, address: 'Azadi Square, Tehran' },
    images: [],
    verified: true,
    reportedBy: 'official',
    timestamp: Date.now() - 3600000,
    upvotes: 47,
  },
  {
    type: 'arrest',
    title: 'Multiple arrests reported near University',
    description: 'Security forces detained at least 15 protesters near Tehran University campus.',
    location: { lat: 35.7019, lon: 51.4010, address: 'Tehran University' },
    images: [],
    verified: true,
    reportedBy: 'official',
    timestamp: Date.now() - 7200000,
    upvotes: 23,
  },
  {
    type: 'protest',
    title: 'Solidarity protest in Isfahan',
    description: 'Citizens in Isfahan joined nationwide protests. Chants of freedom heard throughout the city.',
    location: { lat: 32.6546, lon: 51.6680, address: 'Naqsh-e Jahan Square, Isfahan' },
    images: [],
    verified: true,
    reportedBy: 'official',
    timestamp: Date.now() - 10800000,
    upvotes: 31,
  },
  {
    type: 'injury',
    title: 'Injured protesters treated at makeshift clinics',
    description: 'Medical volunteers report treating dozens of injured protesters. Rubber bullets and tear gas used.',
    location: { lat: 35.6850, lon: 51.3820, address: 'Valiasr Street, Tehran' },
    images: [],
    verified: false,
    reportedBy: 'crowdsource',
    timestamp: Date.now() - 5400000,
    upvotes: 18,
  },
  {
    type: 'protest',
    title: 'Student demonstration at Sharif University',
    description: 'Engineering students walked out of classes in solidarity. University surrounded by security forces.',
    location: { lat: 35.7026, lon: 51.3511, address: 'Sharif University of Technology' },
    images: [],
    verified: true,
    reportedBy: 'official',
    timestamp: Date.now() - 14400000,
    upvotes: 56,
  },
  {
    type: 'other',
    title: 'Internet disruption in multiple cities',
    description: 'Widespread internet outages reported. Mobile networks heavily throttled. VPN usage at all-time high.',
    location: { lat: 35.6892, lon: 51.3890, address: 'Tehran' },
    images: [],
    verified: true,
    reportedBy: 'official',
    timestamp: Date.now() - 1800000,
    upvotes: 92,
  },
  {
    type: 'protest',
    title: 'Protests spread to Mashhad',
    description: 'Second largest city joins protests. Demonstrations at Imam Reza shrine area.',
    location: { lat: 36.2974, lon: 59.6059, address: 'Mashhad' },
    images: [],
    verified: true,
    reportedBy: 'official',
    timestamp: Date.now() - 18000000,
    upvotes: 41,
  },
  {
    type: 'death',
    title: 'Casualties reported in clashes',
    description: 'Unconfirmed reports of fatalities during confrontations with security forces. Exact numbers unclear.',
    location: { lat: 35.6950, lon: 51.4115, address: 'Eastern Tehran' },
    images: [],
    verified: false,
    reportedBy: 'crowdsource',
    timestamp: Date.now() - 21600000,
    upvotes: 134,
  },
];

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 3600000 }); // 1 hour window
    return true;
  }

  if (limit.count >= 5) {
    return false; // Max 5 reports per hour
  }

  limit.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Optional filtering by map bounds
    const northLat = searchParams.get('northLat');
    const southLat = searchParams.get('southLat');
    const eastLon = searchParams.get('eastLon');
    const westLon = searchParams.get('westLon');
    const type = searchParams.get('type');

    let incidents: FirestoreIncident[] = [];

    if (isFirestoreAvailable()) {
      incidents = await getFirestoreIncidents();

      // Filter by bounds if provided (in-memory filtering for now)
      if (northLat && southLat && eastLon && westLon) {
        const north = parseFloat(northLat);
        const south = parseFloat(southLat);
        const east = parseFloat(eastLon);
        const west = parseFloat(westLon);

        incidents = incidents.filter(incident =>
          incident.location.lat <= north &&
          incident.location.lat >= south &&
          incident.location.lon <= east &&
          incident.location.lon >= west
        );
      }

      // Filter by type if provided
      if (type) {
        incidents = incidents.filter(incident => incident.type === type);
      }
    } else {
      console.warn('⚠️ Firestore not available, returning empty array');
    }

    return NextResponse.json({
      incidents,
      total: incidents.length,
    });
  } catch (error) {
    console.error('Error in /api/incidents GET:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isFirestoreAvailable()) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 5 reports per hour.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.title || !body.description || !body.location) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, description, location' },
        { status: 400 }
      );
    }

    if (!['protest', 'arrest', 'injury', 'death', 'other'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid incident type' },
        { status: 400 }
      );
    }

    // Create new incident (without id and createdAt - Firestore will handle)
    const newIncident: Omit<Incident, 'id' | 'createdAt'> = {
      type: body.type,
      title: body.title.trim(),
      description: body.description.trim(),
      location: {
        lat: parseFloat(body.location.lat),
        lon: parseFloat(body.location.lon),
        address: body.location.address?.trim(),
      },
      images: body.images || [],
      verified: false, // Crowdsourced reports start unverified
      reportedBy: 'crowdsource',
      timestamp: body.timestamp || Date.now(),
      upvotes: 0,
    };

    // Save to Firestore
    const incidentId = await saveIncident(newIncident);

    console.log(`📍 New incident reported: ${newIncident.type} - ${newIncident.title} (ID: ${incidentId})`);

    // TODO: Trigger AI moderation in production
    // await triggerModeration(incidentId);

    return NextResponse.json({
      success: true,
      incident: {
        ...newIncident,
        id: incidentId,
        createdAt: Date.now(),
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error in /api/incidents POST:', error);
    return NextResponse.json(
      { error: 'Failed to create incident' },
      { status: 500 }
    );
  }
}
