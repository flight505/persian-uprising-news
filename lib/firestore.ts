/**
 * Firestore client for persistent data storage
 * Replaces in-memory cache with Google Cloud Firestore
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // In development, use service account key file
  // In production (Vercel), use environment variable
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : process.env.NODE_ENV === 'development'
    ? require('/Users/jesper/rise-up-firebase-key.json')
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'coiled-cloud',
    });
  } else {
    console.warn('⚠️ Firebase not initialized - missing service account credentials');
  }
}

const db = admin.apps.length ? admin.firestore() : null;

//=============================================================================
// ARTICLES COLLECTION
//=============================================================================

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: string;
  sourceUrl?: string;
  publishedAt: number | string;
  topics?: string[];
  tags?: string[];
  contentHash: string;
  minHash: number[];
  createdAt: number;
  // Optional fields from different sources
  author?: {
    username?: string;
    name?: string;
    verified?: boolean;
    followers?: number;
  };
  engagement?: {
    retweets?: number;
    replies?: number;
    likes?: number;
    quotes?: number;
  };
  channelName?: string;
  channelUsername?: string;
}

/**
 * Save an article to Firestore
 */
export async function saveArticle(article: Article): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  await db.collection('articles').doc(article.id).set({
    ...article,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Save multiple articles in batch
 */
export async function saveArticles(articles: Article[]): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const batch = db.batch();

  articles.forEach((article) => {
    const docRef = db.collection('articles').doc(article.id);
    batch.set(docRef, {
      ...article,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
}

/**
 * Get articles with pagination
 */
export async function getArticles(
  limit: number = 20,
  startAfter?: string
): Promise<Article[]> {
  if (!db) throw new Error('Firestore not initialized');

  let query = db
    .collection('articles')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (startAfter) {
    const startDoc = await db.collection('articles').doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Article[];
}

/**
 * Get article by ID
 */
export async function getArticleById(id: string): Promise<Article | null> {
  if (!db) throw new Error('Firestore not initialized');

  const doc = await db.collection('articles').doc(id).get();

  if (!doc.exists) return null;

  return {
    id: doc.id,
    ...doc.data(),
  } as Article;
}

/**
 * Get article by content hash (for deduplication)
 */
export async function getArticleByContentHash(contentHash: string): Promise<Article | null> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection('articles')
    .where('contentHash', '==', contentHash)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Article;
}

/**
 * Get recent articles for deduplication check (last 24 hours)
 */
export async function getRecentArticles(hoursBack: number = 24): Promise<Article[]> {
  if (!db) throw new Error('Firestore not initialized');

  const cutoffTime = Date.now() - hoursBack * 60 * 60 * 1000;

  const snapshot = await db
    .collection('articles')
    .where('createdAt', '>', cutoffTime)
    .orderBy('createdAt', 'desc')
    .limit(200) // Reasonable limit for dedup check
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Article[];
}

/**
 * Filter articles by topic
 */
export async function getArticlesByTopic(topic: string, limit: number = 20): Promise<Article[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection('articles')
    .where('topics', 'array-contains', topic)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Article[];
}

/**
 * Delete old articles (for cleanup)
 */
export async function deleteOldArticles(daysOld: number = 30): Promise<number> {
  if (!db) throw new Error('Firestore not initialized');

  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

  const snapshot = await db
    .collection('articles')
    .where('createdAt', '<', cutoffTime)
    .limit(500) // Delete in batches
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return snapshot.size;
}

//=============================================================================
// INCIDENTS COLLECTION
//=============================================================================

export interface Incident {
  id: string;
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  images?: string[];
  verified: boolean;
  reportedBy: 'crowdsource' | 'official';
  timestamp: number;
  upvotes: number;
  createdAt: number;
  relatedArticles?: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

/**
 * Save an incident to Firestore
 */
export async function saveIncident(incident: Omit<Incident, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = await db.collection('incidents').add({
    ...incident,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get all incidents
 */
export async function getIncidents(): Promise<Incident[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection('incidents')
    .orderBy('timestamp', 'desc')
    .limit(500)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Incident[];
}

/**
 * Get incident by ID
 */
export async function getIncidentById(id: string): Promise<Incident | null> {
  if (!db) throw new Error('Firestore not initialized');

  const doc = await db.collection('incidents').doc(id).get();

  if (!doc.exists) return null;

  return {
    id: doc.id,
    ...doc.data(),
  } as Incident;
}

/**
 * Update incident (e.g., upvote, verify)
 */
export async function updateIncident(id: string, updates: Partial<Incident>): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  await db.collection('incidents').doc(id).update(updates);
}

//=============================================================================
// SUBSCRIPTIONS COLLECTION
//=============================================================================

export interface Subscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  subscribedAt: number;
  lastNotified?: number;
}

/**
 * Save a push notification subscription
 */
export async function saveSubscription(subscription: Omit<Subscription, 'id' | 'subscribedAt'>): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  // Use endpoint hash as document ID for deduplication
  const crypto = require('crypto');
  const endpointHash = crypto.createHash('sha256').update(subscription.endpoint).digest('hex');

  await db.collection('subscriptions').doc(endpointHash).set({
    ...subscription,
    subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return endpointHash;
}

/**
 * Get all active subscriptions
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db.collection('subscriptions').get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Subscription[];
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(id: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  await db.collection('subscriptions').doc(id).delete();
}

/**
 * Update last notified timestamp
 */
export async function updateSubscriptionLastNotified(id: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  await db.collection('subscriptions').doc(id).update({
    lastNotified: admin.firestore.FieldValue.serverTimestamp(),
  });
}

//=============================================================================
// UTILITY FUNCTIONS
//=============================================================================

/**
 * Check if Firestore is initialized and available
 */
export function isFirestoreAvailable(): boolean {
  return db !== null;
}

/**
 * Get database instance (for advanced queries)
 */
export function getDb() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}
