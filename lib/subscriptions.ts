/**
 * Subscription storage and management using Firestore
 */

import {
  saveSubscription as saveFirestoreSubscription,
  getSubscriptions as getFirestoreSubscriptions,
  deleteSubscription as deleteFirestoreSubscription,
  isFirestoreAvailable,
} from './firestore';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscriptionData extends PushSubscription {
  id: string;
  userAgent?: string;
  subscribedAt: number;
  lastNotified?: number;
}

/**
 * Get all active subscriptions from Firestore
 */
export async function getActiveSubscriptions(): Promise<SubscriptionData[]> {
  if (!isFirestoreAvailable()) {
    console.warn('⚠️ Firestore not available, returning empty subscriptions array');
    return [];
  }

  try {
    const firestoreSubscriptions = await getFirestoreSubscriptions();
    return firestoreSubscriptions.map(sub => ({
      id: sub.id,
      endpoint: sub.endpoint,
      keys: sub.keys,
      userAgent: sub.userAgent,
      subscribedAt: sub.subscribedAt,
      lastNotified: sub.lastNotified,
    }));
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }
}

/**
 * Add a new subscription to Firestore
 */
export async function addSubscription(subscription: SubscriptionData): Promise<void> {
  if (!isFirestoreAvailable()) {
    throw new Error('Firestore not available');
  }

  try {
    await saveFirestoreSubscription({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: subscription.userAgent,
    });
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}

/**
 * Remove a subscription by ID from Firestore
 */
export async function removeSubscription(id: string): Promise<void> {
  if (!isFirestoreAvailable()) {
    throw new Error('Firestore not available');
  }

  try {
    await deleteFirestoreSubscription(id);
  } catch (error) {
    console.error('Error removing subscription:', error);
    throw error;
  }
}

/**
 * Find subscription by ID from Firestore
 */
export async function findSubscription(id: string): Promise<SubscriptionData | undefined> {
  if (!isFirestoreAvailable()) {
    return undefined;
  }

  try {
    const subscriptions = await getFirestoreSubscriptions();
    return subscriptions.find(sub => sub.id === id);
  } catch (error) {
    console.error('Error finding subscription:', error);
    return undefined;
  }
}
