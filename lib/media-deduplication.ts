
import sharp from 'sharp';
// @ts-ignore
import { bmvbhash } from 'blockhash-core';
// @ts-ignore
import hammingDistance from 'hamming-distance';
import { logger } from './logger';

export class MediaDeduplication {

    /**
     * Generate a perceptual hash for an image buffer.
     * Uses blockhash algorithm after normalizing the image.
     */
    async generatePHash(imageBuffer: Buffer): Promise<string> {
        try {
            // Normalize image: 16x16, grayscale, raw pixel data
            const data = await sharp(imageBuffer)
                .resize(16, 16, { fit: 'fill' })
                .grayscale()
                .raw()
                .toBuffer();

            // Calculate hash
            // blockhash-core expects RGBA or similar, but with raw grayscale we have 1 channel.
            // bmvbhash(data, bits)
            // Actually, blockhash-core implementation is cleaner if we just implement a simple DCT or average hash
            // OR rely on the library if we check its docs. 
            // Let's implement a robust "Difference Hash" (dHash) or "Average Hash" (aHash) manually with Sharp
            // to avoid "blockhash-core" type issues if it's not TS friendly.

            // Let's do Average Hash (aHash) - robust enough for exact/near duplicates
            // 1. Resize to 8x8 (64 pixels)
            // 2. Convert to grayscale
            // 3. Compute average value
            // 4. Compute bits: 1 if > average, 0 if < average

            const size = 8;
            const processed = await sharp(imageBuffer)
                .resize(size, size, { fit: 'fill' })
                .grayscale()
                .raw()
                .toBuffer();

            let total = 0;
            for (let i = 0; i < processed.length; i++) {
                total += processed[i];
            }
            const avg = total / processed.length;

            let hashBits = '';
            for (let i = 0; i < processed.length; i++) {
                hashBits += processed[i] >= avg ? '1' : '0';
            }

            // Convert binary string to hex for storage
            const hashHex = BigInt('0b' + hashBits).toString(16).padStart(size * size / 4, '0');

            return hashHex;

        } catch (error) {
            logger.error('phash_generation_failed', { error });
            throw new Error('Failed to generate image hash');
        }
    }

    /**
     * Calculate Hamming distance between two hex hashes
     */
    calculateDistance(hash1: string, hash2: string): number {
        // Hamming distance of the binary representations
        // simple logic: convert back to bits? Or use library.
        // Libraries like 'hamming-distance' usually expect strings or buffers.
        // If we pass hex strings, it compares characters, which is WRONG for bitwise distance unless mapped.

        // Let's just compare bits manually since we have the logic.
        // Or use the installed library if it supports hex.
        // To be safe and dependency-free for this critical logic:

        let val1 = BigInt('0x' + hash1);
        let val2 = BigInt('0x' + hash2);
        let x = val1 ^ val2;
        let distance = 0;
        const zero = BigInt(0);
        const one = BigInt(1);

        while (x > zero) {
            if (x & one) distance++;
            x >>= one;
        }
        return distance;
    }

    /**
     * Check if two hashes calculate to a duplicate image
     * @param threshold Max bit difference (0-64). 5 is usually good for resized/compressed edits.
     */
    isDuplicate(hash1: string, hash2: string, threshold: number = 5): boolean {
        if (!hash1 || !hash2) return false;
        const distance = this.calculateDistance(hash1, hash2);
        return distance <= threshold;
    }
}
