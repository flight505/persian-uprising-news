import webPush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (!vapidConfigured && vapidPublicKey && vapidPrivateKey) {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
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

  // Configure VAPID details at runtime (not module load time)
  ensureVapidConfigured();

  try {
    const { getActiveSubscriptions } = await import('./subscriptions');
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
