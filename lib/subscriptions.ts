/**
 * Subscription storage and management
 * In-memory storage for development (will be replaced with DynamoDB in production)
 */

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

// In-memory storage for development (will be replaced with DynamoDB in production)
let subscriptions: SubscriptionData[] = [];

/**
 * Get all active subscriptions
 */
export function getActiveSubscriptions(): SubscriptionData[] {
  return subscriptions;
}

/**
 * Add a new subscription
 */
export function addSubscription(subscription: SubscriptionData): void {
  subscriptions.push(subscription);
}

/**
 * Remove a subscription by ID
 */
export function removeSubscription(id: string): void {
  subscriptions = subscriptions.filter(sub => sub.id !== id);
}

/**
 * Find subscription by ID
 */
export function findSubscription(id: string): SubscriptionData | undefined {
  return subscriptions.find(sub => sub.id === id);
}
