/**
 * IndexedDB wrapper for offline storage
 * Stores articles for offline access and queues reports for background sync
 */

const DB_NAME = 'persian-uprising-db';
const DB_VERSION = 1;

// Store names
const ARTICLES_STORE = 'articles';
const PENDING_REPORTS_STORE = 'pendingReports';

// Article without cachedAt (for input)
type ArticleInput = {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  topics: string[];
  source?: 'perplexity' | 'twitter' | 'telegram';
  author?: string;
  channelName?: string;
};

// Article with cachedAt (for storage)
interface Article extends ArticleInput {
  cachedAt: number;
}

interface PendingReport {
  id: string;
  type: string;
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    address: string;
  };
  timestamp: number;
  createdAt: number;
}

class OfflineDB {
  private db: IDBDatabase | null = null;

  /**
   * Initialize and open the database
   */
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('📦 IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create articles store
        if (!db.objectStoreNames.contains(ARTICLES_STORE)) {
          const articlesStore = db.createObjectStore(ARTICLES_STORE, { keyPath: 'id' });
          articlesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          articlesStore.createIndex('publishedAt', 'publishedAt', { unique: false });
        }

        // Create pending reports store
        if (!db.objectStoreNames.contains(PENDING_REPORTS_STORE)) {
          const reportsStore = db.createObjectStore(PENDING_REPORTS_STORE, { keyPath: 'id' });
          reportsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        console.log('📦 IndexedDB schema created');
      };
    });
  }

  /**
   * Store articles for offline access (keeps last 50)
   */
  async cacheArticles(articles: ArticleInput[]): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction([ARTICLES_STORE], 'readwrite');
    const store = transaction.objectStore(ARTICLES_STORE);

    // Add cachedAt timestamp to each article
    const articlesWithCache = articles.map(article => ({
      ...article,
      cachedAt: Date.now(),
    }));

    // Store all articles
    for (const article of articlesWithCache) {
      await store.put(article);
    }

    // Keep only the 50 most recent articles
    const allArticles = await this.getAllArticles();
    if (allArticles.length > 50) {
      const articlesToDelete = allArticles
        .sort((a, b) => b.cachedAt - a.cachedAt)
        .slice(50);

      for (const article of articlesToDelete) {
        await store.delete(article.id);
      }

      console.log(`🗑️  Removed ${articlesToDelete.length} old cached articles`);
    }

    console.log(`💾 Cached ${articles.length} articles for offline access`);
  }

  /**
   * Get all cached articles
   */
  async getAllArticles(): Promise<Article[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([ARTICLES_STORE], 'readonly');
      const store = transaction.objectStore(ARTICLES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const articles = request.result as Article[];
        // Sort by publishedAt descending
        articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        resolve(articles);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached articles
   */
  async clearArticles(): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction([ARTICLES_STORE], 'readwrite');
    const store = transaction.objectStore(ARTICLES_STORE);
    await store.clear();

    console.log('🗑️  Cleared all cached articles');
  }

  /**
   * Add a report to the pending queue (for background sync)
   */
  async queueReport(report: Omit<PendingReport, 'id' | 'createdAt'>): Promise<string> {
    if (!this.db) await this.init();

    const pendingReport: PendingReport = {
      ...report,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    const transaction = this.db!.transaction([PENDING_REPORTS_STORE], 'readwrite');
    const store = transaction.objectStore(PENDING_REPORTS_STORE);
    await store.add(pendingReport);

    console.log('📝 Queued report for background sync:', pendingReport.id);
    return pendingReport.id;
  }

  /**
   * Get all pending reports
   */
  async getPendingReports(): Promise<PendingReport[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_REPORTS_STORE], 'readonly');
      const store = transaction.objectStore(PENDING_REPORTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as PendingReport[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove a report from the pending queue
   */
  async removeReport(id: string): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction([PENDING_REPORTS_STORE], 'readwrite');
    const store = transaction.objectStore(PENDING_REPORTS_STORE);
    await store.delete(id);

    console.log('✅ Removed synced report:', id);
  }

  /**
   * Clear all pending reports
   */
  async clearPendingReports(): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction([PENDING_REPORTS_STORE], 'readwrite');
    const store = transaction.objectStore(PENDING_REPORTS_STORE);
    await store.clear();

    console.log('🗑️  Cleared all pending reports');
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ articles: number; pendingReports: number }> {
    if (!this.db) await this.init();

    const [articles, pendingReports] = await Promise.all([
      this.getAllArticles(),
      this.getPendingReports(),
    ]);

    return {
      articles: articles.length,
      pendingReports: pendingReports.length,
    };
  }
}

// Singleton instance
export const offlineDB = new OfflineDB();

// Helper: Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Helper: Wait for online status
export function waitForOnline(): Promise<void> {
  if (isOnline()) return Promise.resolve();

  return new Promise((resolve) => {
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };
    window.addEventListener('online', handleOnline);
  });
}
