import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubscriptionData extends PushSubscription {
  id: string;
  userAgent?: string;
  subscribedAt: number;
  lastNotified?: number;
}

// In-memory storage for development (will be replaced with DynamoDB in production)
let subscriptions: SubscriptionData[] = [];

/**
 * POST /api/subscribe
 * Subscribe to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Validate VAPID public key
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('VAPID public key not configured');
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 500 }
      );
    }

    // Create hash of endpoint for ID (privacy)
    const endpointHash = crypto
      .createHash('sha256')
      .update(subscription.endpoint)
      .digest('hex')
      .substring(0, 16);

    // Check if already subscribed
    const existing = subscriptions.find(sub => sub.id === endpointHash);
    if (existing) {
      console.log(`✅ Subscription already exists: ${endpointHash}`);
      return NextResponse.json({
        success: true,
        message: 'Already subscribed',
        subscriptionId: endpointHash,
      });
    }

    // Store subscription
    const newSubscription: SubscriptionData = {
      id: endpointHash,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: request.headers.get('user-agent') || undefined,
      subscribedAt: Date.now(),
    };

    subscriptions.push(newSubscription);

    console.log(`📬 New push subscription: ${endpointHash}`);
    console.log(`📊 Total subscriptions: ${subscriptions.length}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to notifications',
      subscriptionId: endpointHash,
    });

  } catch (error) {
    console.error('Error in /api/subscribe POST:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/subscribe
 * Unsubscribe from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Create hash of endpoint
    const endpointHash = crypto
      .createHash('sha256')
      .update(subscription.endpoint)
      .digest('hex')
      .substring(0, 16);

    // Remove subscription
    const initialLength = subscriptions.length;
    subscriptions = subscriptions.filter(sub => sub.id !== endpointHash);

    if (subscriptions.length < initialLength) {
      console.log(`🗑️ Removed subscription: ${endpointHash}`);
      console.log(`📊 Total subscriptions: ${subscriptions.length}`);

      return NextResponse.json({
        success: true,
        message: 'Successfully unsubscribed',
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Subscription not found',
      });
    }

  } catch (error) {
    console.error('Error in /api/subscribe DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscribe
 * Get subscription statistics (admin/debug)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    totalSubscriptions: subscriptions.length,
    subscriptions: subscriptions.map(sub => ({
      id: sub.id,
      subscribedAt: new Date(sub.subscribedAt).toISOString(),
      lastNotified: sub.lastNotified ? new Date(sub.lastNotified).toISOString() : null,
      userAgent: sub.userAgent,
    })),
  });
}

// Export subscriptions for use by push sender
export function getActiveSubscriptions(): SubscriptionData[] {
  return subscriptions;
}
