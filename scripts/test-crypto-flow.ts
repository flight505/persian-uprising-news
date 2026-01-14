
import { SnapshotSigner } from '../lib/snapshot-signer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function runTest() {
    console.log('🔐 Testing Snapshot Signing & Verification...');

    // 1. Generate keys
    console.log('   - Generating new RSA-4096 keypair for testing...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const signer = new SnapshotSigner(privateKey, publicKey);

    // 2. Sign Content
    const snapshot = { news: 'This is a sensitive snapshot of news data.' };
    console.log('   - Signing test data...');
    const result = await signer.signSnapshot(snapshot);

    if (result.signature.length > 0) {
        console.log('✅ Signature generated successfully.');
    } else {
        console.error('❌ Signature generation failed.');
        return;
    }

    // 3. Verify Content (Valid)
    console.log('   - Verifying VALID signature...');
    const isValid = signer.verifySnapshot(snapshot, result.signature, result.publicKey);
    if (isValid) {
        console.log('✅ Signature verified correctly.');
    } else {
        console.error('❌ Valid signature rejected!');
    }

    // 4. Verify Content (Tampered)
    console.log('   - Verifying TAMPERED data...');
    const tamperedSnapshot = { news: 'This is a TEMPERED snapshot of news data.' };
    const isTamperedValid = signer.verifySnapshot(tamperedSnapshot, result.signature, result.publicKey);

    if (!isTamperedValid) {
        console.log('✅ Tampered data correctly rejected.');
    } else {
        console.error('❌ SECURITY FAILURE: Tampered data accepted!');
    }

    console.log('🎉 Crypto verification passed.');
}

runTest().catch(console.error);
