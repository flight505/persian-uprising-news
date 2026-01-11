import crypto from 'crypto';

/**
 * MinHash implementation for fuzzy duplicate detection
 * Based on Locality-Sensitive Hashing (LSH)
 */

export class MinHashDeduplicator {
  private numHashes: number;

  constructor(numHashes: number = 128) {
    this.numHashes = numHashes;
  }

  /**
   * Generate k-grams (shingles) from text
   * @param text Input text
   * @param k Size of shingles (default: 3)
   * @returns Set of shingles
   */
  generateShingles(text: string, k: number = 3): Set<string> {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const shingles = new Set<string>();

    if (normalized.length < k) {
      shingles.add(normalized);
      return shingles;
    }

    for (let i = 0; i <= normalized.length - k; i++) {
      shingles.add(normalized.substring(i, i + k));
    }

    return shingles;
  }

  /**
   * Compute MinHash signature for a set of shingles
   * @param shingles Set of text shingles
   * @returns Array of hash values (signature)
   */
  computeMinHash(shingles: Set<string>): number[] {
    const signature: number[] = new Array(this.numHashes).fill(Infinity);

    for (const shingle of shingles) {
      for (let i = 0; i < this.numHashes; i++) {
        // Hash the shingle with a seed for each hash function
        const hash = this.hashString(`${shingle}_${i}`);
        signature[i] = Math.min(signature[i], hash);
      }
    }

    return signature;
  }

  /**
   * Hash a string to a number
   * @param str Input string
   * @returns Hash value
   */
  private hashString(str: string): number {
    const hash = crypto.createHash('md5').update(str).digest();
    // Convert first 4 bytes to a number
    return hash.readUInt32BE(0);
  }

  /**
   * Calculate Jaccard similarity between two MinHash signatures
   * @param sig1 First signature
   * @param sig2 Second signature
   * @returns Similarity score (0-1)
   */
  jaccardSimilarity(sig1: number[], sig2: number[]): number {
    if (sig1.length !== sig2.length) {
      throw new Error('Signatures must have the same length');
    }

    let matches = 0;
    for (let i = 0; i < sig1.length; i++) {
      if (sig1[i] === sig2[i]) {
        matches++;
      }
    }

    return matches / sig1.length;
  }

  /**
   * Compute SHA-256 hash for exact duplicate detection
   * @param text Input text
   * @returns Hex string hash
   */
  async computeContentHash(text: string): Promise<string> {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    return hash;
  }

  /**
   * Check if two texts are duplicates (exact or fuzzy)
   * @param text1 First text
   * @param text2 Second text
   * @param threshold Similarity threshold for fuzzy matching (default: 0.8)
   * @returns True if duplicate, false otherwise
   */
  isDuplicate(text1: string, text2: string, threshold: number = 0.8): boolean {
    // Step 1: Quick exact match check
    const normalized1 = text1.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalized2 = text2.toLowerCase().replace(/\s+/g, ' ').trim();

    if (normalized1 === normalized2) {
      return true;
    }

    // Step 2: Fuzzy match with MinHash
    const shingles1 = this.generateShingles(text1);
    const shingles2 = this.generateShingles(text2);

    const sig1 = this.computeMinHash(shingles1);
    const sig2 = this.computeMinHash(shingles2);

    const similarity = this.jaccardSimilarity(sig1, sig2);

    return similarity >= threshold;
  }

  /**
   * Find duplicates in a list of texts
   * @param texts Array of texts to check
   * @param threshold Similarity threshold
   * @returns Array of duplicate pairs [index1, index2]
   */
  findDuplicates(texts: string[], threshold: number = 0.8): Array<[number, number]> {
    const duplicates: Array<[number, number]> = [];
    const signatures = texts.map(text => {
      const shingles = this.generateShingles(text);
      return this.computeMinHash(shingles);
    });

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const similarity = this.jaccardSimilarity(signatures[i], signatures[j]);
        if (similarity >= threshold) {
          duplicates.push([i, j]);
        }
      }
    }

    return duplicates;
  }

  /**
   * Deduplicate an array of articles
   * @param articles Array of articles with content
   * @param threshold Similarity threshold
   * @returns Deduplicated array
   */
  deduplicateArticles<T extends { content: string }>(
    articles: T[],
    threshold: number = 0.8
  ): T[] {
    if (articles.length === 0) return [];

    const deduplicated: T[] = [articles[0]];
    const signatures = [this.computeMinHash(this.generateShingles(articles[0].content))];

    for (let i = 1; i < articles.length; i++) {
      const currentShingles = this.generateShingles(articles[i].content);
      const currentSig = this.computeMinHash(currentShingles);

      let isDupe = false;
      for (const existingSig of signatures) {
        const similarity = this.jaccardSimilarity(currentSig, existingSig);
        if (similarity >= threshold) {
          isDupe = true;
          break;
        }
      }

      if (!isDupe) {
        deduplicated.push(articles[i]);
        signatures.push(currentSig);
      }
    }

    return deduplicated;
  }
}

// Export singleton instance
export const minHashDeduplicator = new MinHashDeduplicator(128);

// Export helper functions
export async function computeContentHash(text: string): Promise<string> {
  return minHashDeduplicator.computeContentHash(text);
}

export function generateMinHashSignature(text: string): number[] {
  const shingles = minHashDeduplicator.generateShingles(text, 3);
  return minHashDeduplicator.computeMinHash(shingles);
}

export function checkSimilarity(sig1: number[], sig2: number[]): number {
  return minHashDeduplicator.jaccardSimilarity(sig1, sig2);
}
