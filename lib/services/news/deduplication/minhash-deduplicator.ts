import { IDeduplicator, ArticleWithHash } from './i-deduplicator';
import { Article } from '../sources/i-news-source';
import {
  minHashDeduplicator,
  generateMinHashSignature,
  computeContentHash as computeHash,
} from '@/lib/minhash';
import { createLSHIndex } from '@/lib/deduplication/lsh-index';
import { perfMonitor } from '@/lib/performance/monitor';

export class MinHashDeduplicator implements IDeduplicator {
  private similarityThreshold = 0.8;

  async process(
    articles: Article[],
    recentArticles: ArticleWithHash[]
  ): Promise<ArticleWithHash[]> {
    const articlesWithHash = await perfMonitor.measure('Hash generation', async () =>
      Promise.all(
        articles.map(async (article) => ({
          ...article,
          contentHash: await this.computeHash(article.content || article.summary),
          minHash: generateMinHashSignature(article.content || article.summary),
          createdAt: Date.now(),
        }))
      )
    );

    // PERFORMANCE OPTIMIZATION: Use O(1) Set + O(k) LSH instead of O(n*m) comparison
    const deduplicated = perfMonitor.measureSync('Deduplication', () => {
      // Build hash set for O(1) exact duplicate lookup
      const recentHashSet = new Set(recentArticles.map(a => a.contentHash));

      // Build LSH index for O(k) fuzzy duplicate lookup (k ≈ 5-10 bucket size)
      const lshIndex = createLSHIndex(recentArticles, this.similarityThreshold);
      const stats = lshIndex.getStats();
      console.log(
        `📊 LSH Index: ${stats.buckets} buckets, ${stats.articles} articles, ` +
        `avg ${stats.avgBucketSize.toFixed(1)} per bucket`
      );

      return articlesWithHash.filter(newArticle => {
        // O(1) exact duplicate check
        if (recentHashSet.has(newArticle.contentHash)) {
          console.log(`⏭️  Skipping exact duplicate: ${newArticle.title.substring(0, 50)}...`);
          return false;
        }

        // O(k) fuzzy duplicate check (k ≈ 5-10)
        if (lshIndex.isDuplicate(newArticle, this.similarityThreshold)) {
          console.log(`⏭️  Skipping fuzzy duplicate: ${newArticle.title.substring(0, 50)}...`);
          return false;
        }

        return true;
      });
    });

    console.log(
      `✅ Deduplication: ${articles.length} → ${deduplicated.length} ` +
      `(${articles.length - deduplicated.length} duplicates removed)`
    );

    return deduplicated;
  }

  async computeHash(content: string): Promise<string> {
    return computeHash(content);
  }
}
