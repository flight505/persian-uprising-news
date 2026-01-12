/**
 * Firestore Batch Writer
 * Solves N+1 query problem by using Firestore batch writes
 * Handles batches of up to 500 operations (Firestore limit)
 */

import * as admin from 'firebase-admin';

export interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{ batch: string[]; error: string }>;
}

export class FirestoreBatchWriter {
  private db: admin.firestore.Firestore;
  private batchSize: number = 500; // Firestore batch limit

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  /**
   * Write multiple documents in batches
   * @param collectionName Collection to write to
   * @param documents Array of documents with optional IDs
   * @param options Write options (e.g., { merge: true })
   * @returns Batch result with success/failure counts
   */
  async writeBatch<T extends Record<string, any>>(
    collectionName: string,
    documents: Array<{ id?: string; data: T }>,
    options?: { merge?: boolean }
  ): Promise<BatchResult> {
    const results: BatchResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    if (documents.length === 0) {
      return results;
    }

    // Split into batches of 500
    const batches = this.splitIntoBatches(documents);
    console.log(`📦 Writing ${documents.length} documents in ${batches.length} batch(es)`);

    for (let i = 0; i < batches.length; i++) {
      const batchDocs = batches[i];
      const batch = this.db.batch();

      batchDocs.forEach(({ id, data }) => {
        const docRef = id
          ? this.db.collection(collectionName).doc(id)
          : this.db.collection(collectionName).doc();

        // Remove undefined values (Firestore doesn't accept them)
        const cleanedData = this.removeUndefined({
          ...data,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batch.set(docRef, cleanedData, options || {});
      });

      try {
        await batch.commit();
        results.success += batchDocs.length;
        console.log(`✅ Batch ${i + 1}/${batches.length}: Wrote ${batchDocs.length} documents`);
      } catch (error) {
        results.failed += batchDocs.length;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          batch: batchDocs.map(d => d.id || 'auto-generated'),
          error: errorMessage,
        });
        console.error(`❌ Batch ${i + 1}/${batches.length} failed:`, errorMessage);
      }
    }

    return results;
  }

  /**
   * Split documents into batches of 500
   */
  private splitIntoBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }

  /**
   * Remove undefined values from object (Firestore doesn't accept undefined)
   */
  private removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }
}
