import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getActiveSubscriptions,
  addSubscription,
  removeSubscription,
  findSubscription,
  type SubscriptionData
} from '@/lib/subscriptions';
import { logger } from '@/lib/logger';

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
      logger.error('vapid_key_missing');
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
    const existing = await findSubscription(endpointHash);
    if (existing) {
      logger.info('subscription_already_exists', {
        subscriptionId: endpointHash,
      });
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

    await addSubscription(newSubscription);

    const totalSubs = (await getActiveSubscriptions()).length;
    logger.info('subscription_created', {
      subscriptionId: endpointHash,
      totalSubscriptions: totalSubs,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to notifications',
      subscriptionId: endpointHash,
    });

  } catch (error) {
    logger.error('subscription_create_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
    const existing = await findSubscription(endpointHash);
    await removeSubscription(endpointHash);

    if (existing) {
      const totalSubs = (await getActiveSubscriptions()).length;
      logger.info('subscription_removed', {
        subscriptionId: endpointHash,
        totalSubscriptions: totalSubs,
      });

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
    logger.error('subscription_delete_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
  const subscriptions = await getActiveSubscriptions();

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
