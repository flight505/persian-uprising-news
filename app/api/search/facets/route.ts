import { NextResponse } from 'next/server';
import { getFacets, initAlgolia, initFuse, getSearchMode } from '@/lib/algolia';
import { getArticles, isFirestoreAvailable } from '@/lib/firestore';
import { logger } from '@/lib/logger';

let facetsInitialized = false;

async function ensureFacetsInitialized() {
  if (facetsInitialized) return;

  if (initAlgolia()) {
    facetsInitialized = true;
    return;
  }

  if (isFirestoreAvailable()) {
    const articles = await getArticles(1000);
    initFuse(articles);
    facetsInitialized = true;
  }
}

/**
 * GET /api/search/facets
 * Get available filter values (sources, topics, channels)
 */
export async function GET() {
  try {
    await ensureFacetsInitialized();

    const facets = await getFacets();

    return NextResponse.json({
      facets,
      mode: getSearchMode(),
    });
  } catch (error) {
    logger.error('facets_fetch_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch facets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
