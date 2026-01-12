import { NextRequest, NextResponse } from 'next/server';
import { extractIncidentsFromArticles } from '@/lib/incident-extractor';
import { geocodeLocations } from '@/lib/geocoder';
import { saveIncident, isFirestoreAvailable } from '@/lib/firestore';

export interface ExtractionRequest {
  articles: Array<{
    id: string;
    title: string;
    content: string;
    url: string;
    source: string;
    publishedAt: string;
  }>;
  autoSave?: boolean; // If true, automatically save to Firestore
}

export interface ExtractionResponse {
  success: boolean;
  extractedCount: number;
  savedCount: number;
  incidents: Array<{
    id?: string;
    type: string;
    title: string;
    description: string;
    location: {
      lat: number;
      lon: number;
      address: string;
    };
    confidence: number;
    verified: boolean;
    sourceArticle: {
      id: string;
      title: string;
      url: string;
      source: string;
    };
    timestamp: number;
    keywords: string[];
  }>;
  errors?: string[];
}

/**
 * POST /api/incidents/extract
 * Extracts incidents from news articles using NLP pattern matching
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExtractionRequest = await request.json();

    if (!body.articles || !Array.isArray(body.articles) || body.articles.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid articles array' },
        { status: 400 }
      );
    }

    console.log(`🔍 Extracting incidents from ${body.articles.length} articles...`);

    // Step 1: Extract incidents using NLP pattern matching
    const extractedIncidents = extractIncidentsFromArticles(body.articles);
    console.log(`📊 Extracted ${extractedIncidents.length} potential incidents`);

    if (extractedIncidents.length === 0) {
      return NextResponse.json({
        success: true,
        extractedCount: 0,
        savedCount: 0,
        incidents: [],
      });
    }

    // Step 2: Geocode all unique locations
    const uniqueLocations = [...new Set(extractedIncidents.map((i) => i.location))];
    console.log(`🗺️ Geocoding ${uniqueLocations.length} unique locations...`);

    const geocodedLocations = await geocodeLocations(uniqueLocations);
    console.log(`✅ Geocoded ${geocodedLocations.size} locations`);

    // Step 3: Build incidents with geocoded coordinates
    const incidents = [];
    const errors = [];

    for (const extracted of extractedIncidents) {
      const geocoded = geocodedLocations.get(extracted.location);

      if (!geocoded) {
        errors.push(`Failed to geocode location: ${extracted.location}`);
        continue;
      }

      // Only include incidents with sufficient confidence
      if (extracted.confidence < 40) {
        console.log(`⚠️ Skipping low-confidence incident (${extracted.confidence}): ${extracted.title}`);
        continue;
      }

      const incident = {
        type: extracted.type,
        title: extracted.title.substring(0, 200), // Limit title length
        description: extracted.description.substring(0, 500), // Limit description length
        location: {
          lat: geocoded.lat,
          lon: geocoded.lon,
          address: geocoded.address,
        },
        confidence: extracted.confidence,
        verified: false, // Auto-extracted incidents start unverified
        sourceArticle: {
          id: extracted.extractedFrom.articleId,
          title: extracted.extractedFrom.articleTitle,
          url: extracted.extractedFrom.articleUrl,
          source: extracted.extractedFrom.source,
        },
        timestamp: extracted.timestamp,
        keywords: extracted.keywords,
        reportedBy: 'official' as const, // Extracted from news sources
        upvotes: 0,
        relatedArticles: [
          {
            title: extracted.extractedFrom.articleTitle,
            url: extracted.extractedFrom.articleUrl,
            source: extracted.extractedFrom.source,
          },
        ],
      };

      incidents.push(incident);
    }

    console.log(`✅ Built ${incidents.length} incidents with geocoded locations`);

    // Step 4: Save to Firestore if requested and available
    let savedCount = 0;

    if (body.autoSave && isFirestoreAvailable()) {
      console.log('💾 Saving incidents to Firestore...');

      for (const incident of incidents) {
        try {
          const incidentId = await saveIncident(incident);
          // Add ID to incident for response
          (incident as any).id = incidentId;
          savedCount++;
        } catch (error) {
          console.error('Error saving incident:', error);
          errors.push(`Failed to save incident: ${incident.title}`);
        }
      }

      console.log(`✅ Saved ${savedCount}/${incidents.length} incidents to Firestore`);
    } else if (body.autoSave && !isFirestoreAvailable()) {
      errors.push('Firestore not available - incidents not saved');
    }

    return NextResponse.json({
      success: true,
      extractedCount: extractedIncidents.length,
      savedCount,
      incidents,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in /api/incidents/extract:', error);
    return NextResponse.json(
      {
        error: 'Failed to extract incidents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/incidents/extract/stats
 * Get extraction statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Return stats about geocoding cache
    const { getGeocodeStats } = await import('@/lib/geocoder');
    const stats = getGeocodeStats();

    return NextResponse.json({
      geocoding: stats,
      extractionThreshold: 40, // Minimum confidence score
      supportedTypes: ['protest', 'arrest', 'injury', 'death'],
      supportedSources: ['telegram', 'twitter', 'perplexity'],
    });
  } catch (error) {
    console.error('Error getting extraction stats:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}
