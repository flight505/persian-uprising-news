import { minHashDeduplicator, generateMinHashSignature, computeContentHash, checkSimilarity, MinHashDeduplicator } from '../minhash';

describe('MinHashDeduplicator', () => {
  describe('computeContentHash', () => {
    it('should generate consistent hashes for same content', async () => {
      const text = 'Protesters gathered in Tehran';
      const hash1 = await computeContentHash(text);
      const hash2 = await computeContentHash(text);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', async () => {
      const hash1 = await computeContentHash('Text A');
      const hash2 = await computeContentHash('Text B');
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize whitespace and case', async () => {
      const hash1 = await computeContentHash('Test  Text');
      const hash2 = await computeContentHash('test text');
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateShingles', () => {
    it('should generate 3-grams by default', () => {
      const shingles = minHashDeduplicator.generateShingles('hello');
      expect(shingles).toEqual(new Set(['hel', 'ell', 'llo']));
    });

    it('should handle text shorter than k', () => {
      const shingles = minHashDeduplicator.generateShingles('hi', 3);
      expect(shingles).toEqual(new Set(['hi']));
    });

    it('should normalize text before shingling', () => {
      const shingles1 = minHashDeduplicator.generateShingles('Hello World');
      const shingles2 = minHashDeduplicator.generateShingles('hello  world');
      expect(shingles1).toEqual(shingles2);
    });
  });

  describe('generateMinHashSignature', () => {
    it('should generate signature with 128 hashes', () => {
      const sig = generateMinHashSignature('Test content');
      expect(sig).toHaveLength(128);
    });

    it('should be deterministic for same input', () => {
      const sig1 = generateMinHashSignature('Test content');
      const sig2 = generateMinHashSignature('Test content');
      expect(sig1).toEqual(sig2);
    });

    it('should detect similar articles with high similarity', () => {
      const text1 = 'Large protest in Tehran today with thousands of participants gathering in central square';
      const text2 = 'Large protest in Tehran today with thousands of participants gathering in central square';

      const sig1 = generateMinHashSignature(text1);
      const sig2 = generateMinHashSignature(text2);
      const similarity = checkSimilarity(sig1, sig2);

      expect(similarity).toBeGreaterThanOrEqual(0.8);
    });

    it('should not flag different articles as duplicates', () => {
      const text1 = 'Protest in Tehran';
      const text2 = 'Earthquake in Isfahan';

      const sig1 = generateMinHashSignature(text1);
      const sig2 = generateMinHashSignature(text2);
      const similarity = checkSimilarity(sig1, sig2);

      expect(similarity).toBeLessThan(0.8);
    });

    it('should handle empty text', () => {
      const sig = generateMinHashSignature('');
      expect(sig).toHaveLength(128);
    });
  });

  describe('jaccardSimilarity', () => {
    it('should return 1 for identical signatures', () => {
      const sig = generateMinHashSignature('Test content');
      const similarity = minHashDeduplicator.jaccardSimilarity(sig, sig);
      expect(similarity).toBe(1);
    });

    it('should throw error for different length signatures', () => {
      const sig1 = [1, 2, 3];
      const sig2 = [1, 2];
      expect(() => minHashDeduplicator.jaccardSimilarity(sig1, sig2))
        .toThrow('Signatures must have the same length');
    });
  });

  describe('isDuplicate', () => {
    it('should detect exact duplicates', () => {
      const text = 'Protesters gathered in Tehran';
      expect(minHashDeduplicator.isDuplicate(text, text)).toBe(true);
    });

    it('should detect near-duplicates with minor differences', () => {
      const text1 = 'Large protest occurred in Tehran yesterday with many participants';
      const text2 = 'Large protest occurred in Tehran today with many participants';
      const isDupe = minHashDeduplicator.isDuplicate(text1, text2, 0.7);
      expect(isDupe).toBe(true);
    });

    it('should not flag completely different texts', () => {
      const text1 = 'Protest in Tehran';
      const text2 = 'Earthquake in Isfahan';
      expect(minHashDeduplicator.isDuplicate(text1, text2, 0.8)).toBe(false);
    });

    it('should respect custom threshold', () => {
      const text1 = 'Test A';
      const text2 = 'Test B';
      expect(minHashDeduplicator.isDuplicate(text1, text2, 0.99)).toBe(false);
    });
  });

  describe('findDuplicates', () => {
    it('should find duplicate pairs in array', () => {
      const texts = [
        'Large protest in Tehran',
        'Large protest in Tehran',
        'Earthquake in Isfahan',
      ];
      const duplicates = minHashDeduplicator.findDuplicates(texts, 0.8);
      expect(duplicates).toContainEqual([0, 1]);
    });

    it('should handle array with no duplicates', () => {
      const texts = [
        'Protest in Tehran',
        'Earthquake in Isfahan',
        'Strike in Shiraz',
      ];
      const duplicates = minHashDeduplicator.findDuplicates(texts, 0.8);
      expect(duplicates).toEqual([]);
    });

    it('should handle empty array', () => {
      const duplicates = minHashDeduplicator.findDuplicates([], 0.8);
      expect(duplicates).toEqual([]);
    });
  });

  describe('deduplicateArticles', () => {
    it('should remove duplicate articles', () => {
      const articles = [
        { id: 1, content: 'Large protest in Tehran' },
        { id: 2, content: 'Large protest in Tehran' },
        { id: 3, content: 'Earthquake in Isfahan' },
      ];
      const deduplicated = minHashDeduplicator.deduplicateArticles(articles, 0.8);
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].id).toBe(1);
      expect(deduplicated[1].id).toBe(3);
    });

    it('should keep first occurrence of duplicates', () => {
      const articles = [
        { id: 1, content: 'Test article content' },
        { id: 2, content: 'Different article content' },
        { id: 3, content: 'Test article content' },
      ];
      const deduplicated = minHashDeduplicator.deduplicateArticles(articles, 0.8);
      expect(deduplicated.map(a => a.id)).toEqual([1, 2]);
    });

    it('should handle empty array', () => {
      const deduplicated = minHashDeduplicator.deduplicateArticles([], 0.8);
      expect(deduplicated).toEqual([]);
    });

    it('should handle single article', () => {
      const articles = [{ id: 1, content: 'Test content' }];
      const deduplicated = minHashDeduplicator.deduplicateArticles(articles, 0.8);
      expect(deduplicated).toEqual(articles);
    });
  });

  describe('edge cases', () => {
    it('should handle very short text', () => {
      const sig = generateMinHashSignature('a');
      expect(sig).toHaveLength(128);
    });

    it('should handle text with special characters', () => {
      const text = 'Test! @#$% ^&*() content';
      const sig = generateMinHashSignature(text);
      expect(sig).toHaveLength(128);
    });

    it('should handle non-ASCII characters', () => {
      const text = 'تظاهرات در تهران';
      const sig = generateMinHashSignature(text);
      expect(sig).toHaveLength(128);
    });
  });
});
