/**
 * Subscription storage and management using Firestore
 */

import { logger } from '@/lib/logger';
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
    logger.warn('firestore_unavailable_subscriptions');
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
    logger.error('subscriptions_fetch_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
    logger.error('subscription_save_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
    logger.error('subscription_remove_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
    logger.error('subscription_find_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return undefined;
  }
}
