import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

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

    // Get all active subscriptions
    // In production, this would fetch from DynamoDB
    // For now, we'll import from the subscribe route
    const { getActiveSubscriptions } = await import('../subscribe/route');
    const subscriptions = getActiveSubscriptions();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions',
        sent: 0,
      });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: message,
      url: url || '/',
      tag: 'news-update',
      timestamp: Date.now(),
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload
          );
          return { success: true, id: sub.id };
        } catch (error: any) {
          // Handle 410 Gone (subscription expired)
          if (error.statusCode === 410) {
            console.log(`🗑️ Removing expired subscription: ${sub.id}`);
            return { success: false, id: sub.id, expired: true };
          }
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📬 Push notifications sent: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: subscriptions.length,
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to send push notification
 * Can be called from other parts of the app
 */
export async function sendPushNotification(title: string, message: string, url?: string) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('⚠️ VAPID keys not configured, skipping push notification');
    return { success: false, sent: 0 };
  }

  try {
    const { getActiveSubscriptions } = await import('../subscribe/route');
    const subscriptions = getActiveSubscriptions();

    if (subscriptions.length === 0) {
      return { success: true, sent: 0 };
    }

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || '/',
      tag: 'news-update',
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        ).catch(error => {
          if (error.statusCode === 410) {
            console.log(`🗑️ Removing expired subscription: ${sub.id}`);
          }
          throw error;
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;

    return { success: true, sent: successful };

  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, sent: 0, error };
  }
}
