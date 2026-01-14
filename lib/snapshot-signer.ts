
import * as crypto from 'crypto';

export class SnapshotSigner {
    private privateKey: crypto.KeyObject | null = null;
    private publicKey: crypto.KeyObject | null = null;

    constructor(privateKey?: string | crypto.KeyObject, publicKey?: string | crypto.KeyObject) {
        // 1. Prioritize constructor arguments (for testing/runtime injection)
        if (privateKey) {
            this.privateKey = typeof privateKey === 'string' ? crypto.createPrivateKey(privateKey) : privateKey;
        }
        if (publicKey) {
            this.publicKey = typeof publicKey === 'string' ? crypto.createPublicKey(publicKey) : publicKey;
        }

        // 2. Fallback to Environment Variables (if not provided)
        if (!this.privateKey && process.env.SNAPSHOT_SIGNING_PRIVATE_KEY) {
            try {
                const formattedKey = process.env.SNAPSHOT_SIGNING_PRIVATE_KEY.replace(/\\n/g, '\n');
                this.privateKey = crypto.createPrivateKey(formattedKey);
            } catch (e) {
                console.error('Failed to load private key from env', e);
            }
        }

        if (!this.publicKey && process.env.SNAPSHOT_SIGNING_PUBLIC_KEY) {
            try {
                const formattedKey = process.env.SNAPSHOT_SIGNING_PUBLIC_KEY.replace(/\\n/g, '\n');
                this.publicKey = crypto.createPublicKey(formattedKey);
            } catch (e) {
                console.error('Failed to load public key from env', e);
            }
        }
    }

    /**
     * Sign a snapshot with RSA private key
     */
    async signSnapshot(snapshot: any): Promise<{
        snapshot: any;
        signature: string;
        publicKey: string;
        signedAt: number;
    }> {
        if (!this.privateKey) {
            throw new Error('Private key not configured');
        }

        const snapshotJson = JSON.stringify(snapshot);
        const snapshotBuffer = Buffer.from(snapshotJson, 'utf-8');

        const signature = crypto.sign('sha256', snapshotBuffer, this.privateKey);

        return {
            snapshot,
            signature: signature.toString('base64'),
            publicKey: this.publicKey ? this.publicKey.export({ type: 'spki', format: 'pem' }) as string : '',
            signedAt: Date.now(),
        };
    }

    /**
     * Verify snapshot signature
     */
    verifySnapshot(
        snapshot: any,
        signature: string,
        publicKeyPem: string
    ): boolean {
        try {
            const snapshotJson = JSON.stringify(snapshot);
            const snapshotBuffer = Buffer.from(snapshotJson, 'utf-8');
            const signatureBuffer = Buffer.from(signature, 'base64');

            const publicKey = crypto.createPublicKey(publicKeyPem);

            return crypto.verify('sha256', snapshotBuffer, publicKey, signatureBuffer);
        } catch (error) {
            console.error('Verification failed', error);
            return false;
        }
    }

    /**
     * Generate key pair (run once during setup)
     */
    static generateKeyPair(): { privateKey: string; publicKey: string } {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });

        return { privateKey, publicKey };
    }
}
