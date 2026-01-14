/**
 * Firestore client for persistent data storage
 * Replaces in-memory cache with Google Cloud Firestore
 */

import * as admin from 'firebase-admin';
import { logger } from './logger';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Priority 1: FIREBASE_SERVICE_ACCOUNT (Vercel production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      logger.info('firebase_initialized', {
        credential_type: 'FIREBASE_SERVICE_ACCOUNT',
        project_id: serviceAccount.project_id,
      });
    }
    // Priority 2: GOOGLE_APPLICATION_CREDENTIALS (local development)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.GOOGLE_CLOUD_PROJECT || 'deposits-f29a0',
      });
      logger.info('firebase_initialized', {
        credential_type: 'GOOGLE_APPLICATION_CREDENTIALS',
        project_id: process.env.GOOGLE_CLOUD_PROJECT || 'deposits-f29a0',
      });
    }
    // Priority 3: No credentials (fail gracefully)
    else {
      logger.warn('firebase_not_initialized', {
        reason: 'missing_credentials',
        expected_env_vars: ['FIREBASE_SERVICE_ACCOUNT', 'GOOGLE_APPLICATION_CREDENTIALS'],
      });
    }
  } catch (error) {
    logger.error('firebase_initialization_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
  imageHash?: string; // Perceptual hash for deduplication
  source: string;
  sourceUrl: string;
  publishedAt: number | string;
  topics: string[];
  verified?: boolean;
  verificationScore?: number;
  corroboratedBy?: string[]; // List of Incident IDs that corroborate this
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
 * Remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

/**
 * Save an article to Firestore
 */
export async function saveArticle(article: Article): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const cleanedArticle = removeUndefined({
    ...article,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('articles').doc(article.id).set(cleanedArticle);
}

/**
 * Save multiple articles in batch
 */
export async function saveArticles(articles: Article[]): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const batch = db.batch();

  articles.forEach((article) => {
    const docRef = db.collection('articles').doc(article.id);
    const cleanedArticle = removeUndefined({
      ...article,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(docRef, cleanedArticle);
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
  confidence?: number; // For auto-extracted incidents (0-100)
  keywords?: string[]; // Extraction keywords for debugging
  relatedArticles?: Array<{
    title: string;
    url: string;
    source: string;
  }>;

  // Media embedding support (Priority 2)
  twitterUrl?: string;        // Primary Twitter post URL
  telegramUrl?: string;       // Telegram post URL (channel/post_id)
  alternateUrl?: string;      // Alternate angle/view
  mediaUrls?: string[];       // Direct image/video URLs
  embedType?: 'twitter' | 'telegram' | 'image' | 'video';
  tags?: string[];            // User-friendly tags (e.g., ["Gunfire", "Deaths"])
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
//=============================================================================
// IPFS SNAPSHOTS COLLECTION
//=============================================================================

export interface IPFSSnapshot {
  id: string;
  cid: string;
  url: string;
  timestamp: number;
  articleCount: number;
  sizeBytes: number;
  createdAt: number;
}

export async function saveIPFSSnapshot(snapshot: Omit<IPFSSnapshot, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = await db.collection('ipfs_snapshots').add({
    ...snapshot,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function getIPFSSnapshots(limit: number = 20): Promise<IPFSSnapshot[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection('ipfs_snapshots')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as IPFSSnapshot[];
}
