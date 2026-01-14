
import * as crypto from 'crypto';
import * as fs from 'fs';

function generateKeys() {
    console.log('🔐 Generating RSA-4096 Key Pair for Snapshot Signing...');

    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
        },
    });

    // Flatten for .env (replace newlines with \n)
    const privateKeyEnv = privateKey.replace(/\n/g, '\\n');
    const publicKeyEnv = publicKey.replace(/\n/g, '\\n');

    console.log('\n✅ Keys Generated Successfully!\n');

    console.log('👇 ADD THESE TO YOUR .env / .zsh_secrets FILE 👇');
    console.log('------------------------------------------------');
    console.log(`export SNAPSHOT_SIGNING_PRIVATE_KEY='${privateKeyEnv}'`);
    console.log(`export SNAPSHOT_SIGNING_PUBLIC_KEY='${publicKeyEnv}'`);
    console.log('------------------------------------------------');
    console.log('\n⚠️  SAVE THESE SECURELY. The private key enables signing official news snapshots.');
}

generateKeys();
