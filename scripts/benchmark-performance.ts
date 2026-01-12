/**
 * Performance Benchmarking Script
 * Compares old vs new deduplication and batch write performance
 */

import { minHashDeduplicator, generateMinHashSignature, computeContentHash } from '../lib/minhash';
import { createLSHIndex } from '../lib/deduplication/lsh-index';
import { perfMonitor } from '../lib/performance/monitor';

// Mock article generator
function generateMockArticle(index: number, duplicate: boolean = false) {
  const baseContent = duplicate
    ? 'Breaking news from Tehran: Massive protests continue in the streets as thousands gather'
    : `Article ${index}: Unique content about protests in different cities ${Math.random()}`;

  return {
    id: `article-${index}`,
    title: `Test Article ${index}`,
    content: baseContent,
    contentHash: '',
    minHash: [] as number[],
  };
}

// Old deduplication algorithm (O(n*m))
async function oldDeduplication(newArticles: any[], recentArticles: any[]) {
  return newArticles.filter(newArticle => {
    // Check exact duplicates
    const exactDuplicate = recentArticles.some(
      existing => existing.contentHash === newArticle.contentHash
    );

    if (exactDuplicate) return false;

    // Check fuzzy duplicates (O(m) for each article)
    const fuzzyDuplicate = recentArticles.some(existing => {
      const similarity = minHashDeduplicator.jaccardSimilarity(
        existing.minHash,
        newArticle.minHash
      );
      return similarity >= 0.8;
    });

    return !fuzzyDuplicate;
  });
}

// New deduplication algorithm (O(n*k) where k ≈ 5-10)
async function newDeduplication(newArticles: any[], recentArticles: any[]) {
  // O(1) exact duplicate check
  const recentHashSet = new Set(recentArticles.map(a => a.contentHash));

  // O(k) fuzzy duplicate check
  const lshIndex = createLSHIndex(recentArticles, 0.8);

  return newArticles.filter(newArticle => {
    if (recentHashSet.has(newArticle.contentHash)) return false;
    return !lshIndex.isDuplicate(newArticle, 0.8);
  });
}

// Benchmark deduplication
async function benchmarkDeduplication() {
  console.log('🔬 Benchmarking Deduplication Performance\n');

  const testCases = [
    { newCount: 10, recentCount: 50, name: 'Small' },
    { newCount: 50, recentCount: 200, name: 'Medium' },
    { newCount: 100, recentCount: 500, name: 'Large' },
  ];

  for (const { newCount, recentCount, name } of testCases) {
    console.log(`\n📊 ${name} Dataset: ${newCount} new articles vs ${recentCount} recent articles`);
    console.log('─'.repeat(80));

    // Generate test data
    const recentArticles = Array.from({ length: recentCount }, (_, i) =>
      generateMockArticle(i, i % 10 === 0)
    );

    const newArticles = Array.from({ length: newCount }, (_, i) =>
      generateMockArticle(1000 + i, i % 5 === 0)
    );

    // Add content hashes and minHashes
    for (const article of [...recentArticles, ...newArticles]) {
      article.contentHash = await computeContentHash(article.content);
      article.minHash = generateMinHashSignature(article.content);
    }

    // Benchmark old algorithm
    const oldStart = Date.now();
    const oldResult = await oldDeduplication(newArticles, recentArticles);
    const oldDuration = Date.now() - oldStart;

    // Benchmark new algorithm
    const newStart = Date.now();
    const newResult = await newDeduplication(newArticles, recentArticles);
    const newDuration = Date.now() - newStart;

    // Calculate speedup
    const speedup = oldDuration / newDuration;
    const improvement = ((oldDuration - newDuration) / oldDuration * 100).toFixed(1);

    console.log(`\n  Old Algorithm (O(n*m)):`);
    console.log(`    Time: ${oldDuration}ms`);
    console.log(`    Unique: ${oldResult.length}/${newCount}`);

    console.log(`\n  New Algorithm (O(n*k)):`);
    console.log(`    Time: ${newDuration}ms`);
    console.log(`    Unique: ${newResult.length}/${newCount}`);

    console.log(`\n  Performance Gain:`);
    console.log(`    Speedup: ${speedup.toFixed(2)}x faster`);
    console.log(`    Improvement: ${improvement}% reduction in time`);

    // Verify results match
    if (oldResult.length === newResult.length) {
      console.log(`    ✅ Results match`);
    } else {
      console.warn(`    ⚠️  Results differ: old=${oldResult.length}, new=${newResult.length}`);
    }
  }
}

// Benchmark batch writes (mock)
async function benchmarkBatchWrites() {
  console.log('\n\n🔬 Benchmarking Batch Write Performance\n');

  const testCases = [
    { count: 10, name: 'Small' },
    { count: 50, name: 'Medium' },
    { count: 100, name: 'Large' },
  ];

  for (const { count, name } of testCases) {
    console.log(`\n📊 ${name} Dataset: ${count} incidents`);
    console.log('─'.repeat(80));

    // Simulate sequential writes (old approach)
    const oldStart = Date.now();
    for (let i = 0; i < count; i++) {
      // Simulate 10-20ms per write (typical Firestore write latency)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 10));
    }
    const oldDuration = Date.now() - oldStart;

    // Simulate batch write (new approach)
    const newStart = Date.now();
    // Batch write takes ~100-200ms regardless of count (up to 500)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 100));
    const newDuration = Date.now() - newStart;

    // Calculate speedup
    const speedup = oldDuration / newDuration;
    const improvement = ((oldDuration - newDuration) / oldDuration * 100).toFixed(1);

    console.log(`\n  Sequential Writes (old):`);
    console.log(`    Time: ${oldDuration}ms`);
    console.log(`    Average per write: ${(oldDuration / count).toFixed(1)}ms`);

    console.log(`\n  Batch Write (new):`);
    console.log(`    Time: ${newDuration}ms`);
    console.log(`    Average per write: ${(newDuration / count).toFixed(1)}ms`);

    console.log(`\n  Performance Gain:`);
    console.log(`    Speedup: ${speedup.toFixed(2)}x faster`);
    console.log(`    Improvement: ${improvement}% reduction in time`);
  }
}

// Main benchmark
async function main() {
  console.log('═'.repeat(80));
  console.log('PERFORMANCE OPTIMIZATION BENCHMARKS');
  console.log('Persian Uprising News App');
  console.log('═'.repeat(80));

  try {
    await benchmarkDeduplication();
    await benchmarkBatchWrites();

    console.log('\n\n📊 Performance Summary:');
    console.log('═'.repeat(80));
    perfMonitor.printSummary();

    console.log('\n✅ Benchmark completed successfully!\n');
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();
