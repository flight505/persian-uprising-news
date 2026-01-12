import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema
const suggestionSchema = z.object({
  type: z.enum(['telegram', 'twitter', 'reddit', 'instagram', 'youtube', 'rss', 'other']),
  handle: z.string().min(1).max(200),
  displayName: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  url: z.string().url().optional(),
  submitterEmail: z.string().email().optional(),
  reason: z.string().max(1000),
});

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
  try {
    const body = await req.json();

    // Validate input
    const validatedData = suggestionSchema.parse(body);

    // Rate limiting: max 5 suggestions per IP per hour
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    // TODO: Implement Redis-based rate limiting

    // Generate suggestion ID
    const suggestionId = `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const suggestion: ChannelSuggestion = {
      id: suggestionId,
      ...validatedData,
      status: 'pending',
      submittedAt: Date.now(),
    };

    // Store in Firestore
    const { getDb, isFirestoreAvailable } = await import('@/lib/firestore');
    if (isFirestoreAvailable()) {
      const db = getDb();
      await db!.collection('channel_suggestions').doc(suggestionId).set(suggestion);
    } else {
      // Fallback: In-memory storage (dev mode)
      console.log('📝 Channel suggestion (in-memory):', suggestion);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your channel suggestion has been submitted for review.',
      suggestionId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid input',
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('Error submitting channel suggestion:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to submit suggestion. Please try again.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/channels/suggest
 * Get all channel suggestions (for admin review)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;

    // Auth check (simple admin secret for now)
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { getDb, isFirestoreAvailable } = await import('@/lib/firestore');
    if (!isFirestoreAvailable()) {
      return NextResponse.json(
        { success: false, message: 'Database not configured' },
        { status: 500 }
      );
    }

    const db = getDb();
    let query = db!.collection('channel_suggestions').orderBy('submittedAt', 'desc');

    if (status) {
      query = query.where('status', '==', status) as any;
    }

    const snapshot = await query.limit(100).get();
    const suggestions = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/channels/suggest
 * Update suggestion status (approve/reject)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { suggestionId, status, rejectionReason } = body;

    // Auth check
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { getDb, isFirestoreAvailable } = await import('@/lib/firestore');
    if (!isFirestoreAvailable()) {
      return NextResponse.json(
        { success: false, message: 'Database not configured' },
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

    return NextResponse.json({
      success: true,
      message: `Suggestion ${status}`,
    });
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update suggestion' },
      { status: 500 }
    );
  }
}
