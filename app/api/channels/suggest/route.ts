/**
 * Channel Suggestion API Route
 * SEC-001 & SEC-002: Redis rate limiting + Zod validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ServiceContainer } from '@/lib/services/container';
import { createRateLimitHeaders } from '@/lib/services/rate-limit/i-rate-limiter';
import { getClientIP, generateIdentifier } from '@/lib/services/rate-limit/redis-rate-limiter';
import {
  validateCreateChannelSuggestion,
  validateUpdateChannelSuggestion,
  validateChannelSuggestionQuery,
  formatZodErrors,
  normalizeHandle,
  type CreateChannelSuggestionInput,
} from '@/lib/validators/channel-validator';
import { logger } from '@/lib/logger';

export interface ChannelSuggestion {
  id: string;
  type: 'telegram' | 'twitter' | 'reddit' | 'instagram' | 'youtube' | 'rss' | 'other';
  handle: string;
  displayName?: string;
  description?: string;
  url?: string;
  submitterEmail?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
}

/**
 * POST /api/channels/suggest
 * Submit a new channel suggestion
 */
export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers);
  const userAgent = req.headers.get('user-agent');
  const identifier = generateIdentifier(ip, userAgent);

  // Rate limit check
  const rateLimiter = ServiceContainer.getChannelRateLimiter();
  const rateLimitResult = await rateLimiter.checkLimitWithResult(identifier);
  const config = rateLimiter.getConfig();

  if (!rateLimitResult.allowed) {
    const headers = createRateLimitHeaders(rateLimitResult, config);
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${config.maxRequests} suggestions per hour. Please try again later.`,
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429, headers }
    );
  }

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // Validate input with Zod (SEC-002)
    const validation = validateCreateChannelSuggestion(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const validatedData: CreateChannelSuggestionInput = validation.data;

    // Generate suggestion ID
    const suggestionId = `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Normalize handle for storage
    const normalizedHandle = normalizeHandle(validatedData.handle, validatedData.type);

    const suggestion: ChannelSuggestion = {
      id: suggestionId,
      type: validatedData.type,
      handle: normalizedHandle,
      displayName: validatedData.displayName,
      description: validatedData.description,
      url: validatedData.url,
      submitterEmail: validatedData.submitterEmail,
      reason: validatedData.reason.trim(),
      status: 'pending',
      submittedAt: Date.now(),
    };

    // Store in Firestore
    const { getDb, isFirestoreAvailable } = await import('@/lib/firestore');
    if (isFirestoreAvailable()) {
      const db = getDb();
      await db!.collection('channel_suggestions').doc(suggestionId).set(suggestion);
      logger.info('channel_suggestion_created', {
        suggestionId,
        type: suggestion.type,
        handle: suggestion.handle,
      });
    } else {
      logger.warn('channel_suggestion_firestore_unavailable', {
        suggestionId,
        type: suggestion.type,
        handle: suggestion.handle,
      });
    }

    const headers = createRateLimitHeaders(rateLimitResult, config);
    return NextResponse.json(
      {
        success: true,
        message: 'Thank you! Your channel suggestion has been submitted for review.',
        suggestionId,
      },
      { headers }
    );
  } catch (error) {
    logger.error('channel_suggestion_submit_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit suggestion',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/channels/suggest
 * Get all channel suggestions (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Auth check (simple admin secret)
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate query parameters
    const queryParams: Record<string, string | null> = {
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    const validation = validateChannelSuggestionQuery(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { status, type, limit, offset } = validation.data;

    const { getDb, isFirestoreAvailable } = await import('@/lib/firestore');
    if (!isFirestoreAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const db = getDb();
    let query = db!.collection('channel_suggestions').orderBy('submittedAt', 'desc');

    if (status) {
      query = query.where('status', '==', status) as FirebaseFirestore.Query;
    }

    if (type) {
      query = query.where('type', '==', type) as FirebaseFirestore.Query;
    }

    const snapshot = await query.offset(offset).limit(limit).get();
    const suggestions = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length,
      pagination: { limit, offset },
    });
  } catch (error) {
    logger.error('channel_suggestions_fetch_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/channels/suggest
 * Update suggestion status (admin only)
 */
export async function PATCH(req: NextRequest) {
  try {
    // Auth check
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const validation = validateUpdateChannelSuggestion(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { suggestionId, status, rejectionReason } = validation.data;

    const { getDb, isFirestoreAvailable } = await import('@/lib/firestore');
    if (!isFirestoreAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const db = getDb();
    await db!
      .collection('channel_suggestions')
      .doc(suggestionId)
      .update({
        status,
        reviewedAt: Date.now(),
        reviewedBy: 'admin',
        ...(rejectionReason && { rejectionReason }),
      });

    logger.info('channel_suggestion_updated', {
      suggestionId,
      status,
    });

    return NextResponse.json({
      success: true,
      message: `Suggestion ${status}`,
    });
  } catch (error) {
    logger.error('channel_suggestion_update_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update suggestion' },
      { status: 500 }
    );
  }
}
