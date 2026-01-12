/**
 * Incidents API Route
 * SEC-001 & SEC-002: Redis rate limiting + Zod validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ServiceContainer } from '@/lib/services/container';
import { createRateLimitHeaders } from '@/lib/services/rate-limit/i-rate-limiter';
import { getClientIP, generateIdentifier } from '@/lib/services/rate-limit/redis-rate-limiter';
import {
  validateCreateIncident,
  validateIncidentQuery,
  formatZodErrors,
  type CreateIncidentInput,
} from '@/lib/validators/incident-validator';

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
  relatedArticles?: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract and validate query parameters
    const queryParams: Record<string, string | null> = {
      type: searchParams.get('type'),
      northLat: searchParams.get('northLat'),
      southLat: searchParams.get('southLat'),
      eastLon: searchParams.get('eastLon'),
      westLon: searchParams.get('westLon'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = validateIncidentQuery(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { type, northLat, southLat, eastLon, westLon } = validation.data;

    const filters: any = {};

    if (northLat !== undefined && southLat !== undefined && eastLon !== undefined && westLon !== undefined) {
      filters.bounds = {
        north: northLat,
        south: southLat,
        east: eastLon,
        west: westLon,
      };
    }

    if (type) {
      filters.type = type;
    }

    const incidentService = ServiceContainer.getIncidentService();
    const incidents = await incidentService.getAll(filters);

    return NextResponse.json({
      incidents,
      total: incidents.length,
    });
  } catch (error) {
    console.error('Error in /api/incidents GET:', error);
    return NextResponse.json({
      incidents: [],
      total: 0,
      warning: 'Temporary issue loading incidents. Please refresh.',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request.headers);
  const userAgent = request.headers.get('user-agent');
  const identifier = generateIdentifier(ip, userAgent);

  // Get rate limiter with detailed result
  const rateLimiter = ServiceContainer.getIncidentRateLimiter();
  const rateLimitResult = await rateLimiter.checkLimitWithResult(identifier);
  const config = rateLimiter.getConfig();

  if (!rateLimitResult.allowed) {
    const headers = createRateLimitHeaders(rateLimitResult, config);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Maximum ${config.maxRequests} reports per hour. Please try again later.`,
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // Validate input with Zod (SEC-002)
    const validation = validateCreateIncident(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const validatedData: CreateIncidentInput = validation.data;

    // Build incident object from validated data
    const newIncident: Omit<Incident, 'id' | 'createdAt'> = {
      type: validatedData.type,
      title: validatedData.title.trim(),
      description: validatedData.description.trim(),
      location: {
        lat: validatedData.location.lat,
        lon: validatedData.location.lon,
        address: validatedData.location.address?.trim(),
      },
      images: validatedData.images || [],
      verified: false,
      reportedBy: 'crowdsource',
      timestamp: validatedData.timestamp || Date.now(),
      upvotes: 0,
    };

    const incidentService = ServiceContainer.getIncidentService();
    const incidentId = await incidentService.create(newIncident);

    console.log(`[Incidents] New incident: ${newIncident.type} - "${newIncident.title}" (ID: ${incidentId})`);

    const headers = createRateLimitHeaders(rateLimitResult, config);
    return NextResponse.json(
      {
        success: true,
        incident: {
          ...newIncident,
          id: incidentId,
          createdAt: Date.now(),
        },
      },
      { status: 201, headers }
    );
  } catch (error) {
    console.error('Error in /api/incidents POST:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit incident report',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please check your connection and try again.',
      },
      { status: 500 }
    );
  }
}
