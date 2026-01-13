import { IDeduplicator, ArticleWithHash } from './i-deduplicator';
import { Article } from '../sources/i-news-source';
import {
  minHashDeduplicator,
  generateMinHashSignature,
  computeContentHash as computeHash,
} from '@/lib/minhash';
import { createLSHIndex } from '@/lib/deduplication/lsh-index';
import { perfMonitor } from '@/lib/performance/monitor';
import { logger } from '@/lib/logger';

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
      logger.debug('lsh_index_created', {
        buckets: stats.buckets,
        articles: stats.articles,
        avg_bucket_size: stats.avgBucketSize,
      });

      return articlesWithHash.filter(newArticle => {
        // O(1) exact duplicate check
        if (recentHashSet.has(newArticle.contentHash)) {
          logger.debug('exact_duplicate_skipped', {
            title: newArticle.title.substring(0, 50),
          });
          return false;
        }

        // O(k) fuzzy duplicate check (k ≈ 5-10)
        if (lshIndex.isDuplicate(newArticle, this.similarityThreshold)) {
          logger.debug('fuzzy_duplicate_skipped', {
            title: newArticle.title.substring(0, 50),
          });
          return false;
        }

        return true;
      });
    });

    logger.info('deduplication_completed', {
      input_count: articles.length,
      output_count: deduplicated.length,
      duplicates_removed: articles.length - deduplicated.length,
    });

    return deduplicated;
  }

  async computeHash(content: string): Promise<string> {
    return computeHash(content);
  }
}
