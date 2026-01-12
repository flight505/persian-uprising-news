/**
 * LSH (Locality-Sensitive Hashing) Index
 * Optimizes deduplication from O(n*m) to O(n*k) where k ≈ 5-10
 * Uses LSH banding technique to create buckets for fast similarity search
 */

interface Article {
  id: string;
  minHash: number[];
  title?: string;
  contentHash?: string;
}

export class LSHIndex {
  private buckets = new Map<string, Article[]>();
  private numBands: number = 5; // Number of LSH bands
  private rowsPerBand: number = 26; // 128 hashes / 5 bands ≈ 26 rows/band
  private threshold: number;

  constructor(numBands: number = 5, threshold: number = 0.8) {
    this.numBands = numBands;
    this.threshold = threshold;
    // Calculate rowsPerBand based on expected MinHash signature length (128)
    this.rowsPerBand = Math.ceil(128 / numBands);
  }

  /**
   * Clear all buckets
   */
  clear() {
    this.buckets.clear();
  }

  /**
   * Add article to LSH index
   */
  add(article: Article) {
    const bucketKeys = this.getBucketKeys(article.minHash);
    bucketKeys.forEach(key => {
      const bucket = this.buckets.get(key) || [];
      bucket.push(article);
      this.buckets.set(key, bucket);
    });
  }

  /**
   * Find similar articles above threshold
   * Returns articles with Jaccard similarity >= threshold
   */
  findSimilar(article: Article, threshold: number = this.threshold): Article[] {
    const bucketKeys = this.getBucketKeys(article.minHash);
    const candidateMap = new Map<string, Article>();

    // Collect candidates from all matching buckets
    bucketKeys.forEach(key => {
      const bucket = this.buckets.get(key) || [];
      bucket.forEach(candidate => {
        // Use ID or contentHash for deduplication
        const candidateKey = candidate.id || candidate.contentHash;
        if (candidateKey) {
          candidateMap.set(candidateKey, candidate);
        }
      });
    });

    // Filter by actual similarity
    const similar: Article[] = [];
    for (const candidate of candidateMap.values()) {
      // Skip self-comparison
      const candidateKey = candidate.id || candidate.contentHash;
      const articleKey = article.id || article.contentHash;
      if (candidateKey === articleKey) continue;

      const similarity = this.jaccardSimilarity(
        candidate.minHash,
        article.minHash
      );

      if (similarity >= threshold) {
        similar.push(candidate);
      }
    }

    return similar;
  }

  /**
   * Check if article is a duplicate (has similar articles)
   */
  isDuplicate(article: Article, threshold: number = this.threshold): boolean {
    const similar = this.findSimilar(article, threshold);
    return similar.length > 0;
  }

  /**
   * Generate bucket keys using LSH banding
   * Articles with similar MinHash signatures will hash to same buckets
   */
  private getBucketKeys(minHash: number[]): string[] {
    const keys: string[] = [];

    for (let band = 0; band < this.numBands; band++) {
      const start = band * this.rowsPerBand;
      const end = Math.min(start + this.rowsPerBand, minHash.length);
      const bandHash = minHash.slice(start, end).join('-');
      keys.push(`band${band}:${bandHash}`);
    }

    return keys;
  }

  /**
   * Calculate Jaccard similarity between two MinHash signatures
   * Returns value between 0 (completely different) and 1 (identical)
   */
  private jaccardSimilarity(sig1: number[], sig2: number[]): number {
    let matches = 0;
    const len = Math.min(sig1.length, sig2.length);

    for (let i = 0; i < len; i++) {
      if (sig1[i] === sig2[i]) matches++;
    }

    return matches / len;
  }

  /**
   * Get index statistics
   */
  getStats(): {
    buckets: number;
    articles: number;
    avgBucketSize: number;
    maxBucketSize: number;
  } {
    let totalArticles = 0;
    let maxBucketSize = 0;

    for (const bucket of this.buckets.values()) {
      totalArticles += bucket.length;
      maxBucketSize = Math.max(maxBucketSize, bucket.length);
    }

    return {
      buckets: this.buckets.size,
      articles: totalArticles,
      avgBucketSize: this.buckets.size > 0 ? totalArticles / this.buckets.size : 0,
      maxBucketSize,
    };
  }
}

/**
 * Helper function to create LSH index from articles
 */
export function createLSHIndex(articles: Article[], threshold: number = 0.8): LSHIndex {
  const index = new LSHIndex(5, threshold);
  articles.forEach(article => index.add(article));
  return index;
}
