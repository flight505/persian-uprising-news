import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push-notifications';
import { logger } from '@/lib/logger';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * POST /api/push
 * Send a test push notification (admin/debug endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, url } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 500 }
      );
    }

    // Use the helper function from lib
    const result = await sendPushNotification(title, message, url);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
    });

  } catch (error) {
    logger.error('push_notification_send_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
