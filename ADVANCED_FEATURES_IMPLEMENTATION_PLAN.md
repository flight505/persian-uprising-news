# Advanced Features Implementation Plan
## Persian Uprising News Aggregator - Censorship-Resistant & OSINT Enhancement

**Date**: January 13, 2026
**Status**: Research Complete - Implementation Ready
**Research Sources**: OONI API, IPFS, GRIP API, BotSlayer/Hoaxy, Coordination Detection

---

## Executive Summary

This plan outlines implementation of advanced features transforming the Persian Uprising News application from a basic news aggregator into a censorship-resistant, intelligence-grade platform for monitoring internet connectivity, verifying reports, and detecting disinformation campaigns.

**Key Enhancements**:
- **Blackout-Resilient Infrastructure**: IPFS distribution, signed offline snapshots, Tor onion services
- **OSINT Verification Tools**: Media deduplication, cross-source corroboration, verification workbench
- **Disinformation Detection**: BotSlayer-inspired coordination detection, campaign tracking
- **Connectivity Dashboards**: IODA, OONI, GRIP integration for real-time internet monitoring

**Estimated Cost**: +$25-45/month (total: $35.60-$55.60/month, still under $60)
**Implementation Timeline**: 10-12 weeks
**Risk Level**: Medium (requires careful security review)

---

## Table of Contents

1. [Priority 0: Blackout-Resilient Infrastructure](#priority-0-blackout-resilient-infrastructure)
2. [Priority 1: OSINT Verification Tools](#priority-1-osint-verification-tools)
3. [Priority 2: Disinformation Detection](#priority-2-disinformation-detection)
4. [Priority 3: Advanced Connectivity Dashboards](#priority-3-advanced-connectivity-dashboards)
5. [Priority 4: Relay Network Features](#priority-4-relay-network-features)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Security Considerations](#security-considerations)
8. [Cost Analysis](#cost-analysis)

---

## Priority 0: Blackout-Resilient Infrastructure

### Overview

When Iran's government shuts down internet connectivity, the application must continue delivering news through alternative distribution channels. This priority implements decentralized content distribution, offline-first architecture, and censorship-resistant access methods.

### Feature A1: IPFS Decentralized Distribution

**Objective**: Distribute news snapshots through IPFS (InterPlanetary File System) to enable content access even when central servers are blocked.

#### Technical Architecture

**IPFS Gateway Integration**:
```typescript
// lib/ipfs-distributor.ts
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import Pinata from '@pinata/sdk';

interface IPFSConfig {
  gateway: 'pinata' | 'filebase' | 'cloudflare';
  pinataApiKey?: string;
  pinataSecretKey?: string;
  filebaseAccessKey?: string;
  filebaseSecretKey?: string;
}

export class IPFSDistributor {
  private client: IPFSHTTPClient | null = null;
  private pinata: any = null;

  constructor(private config: IPFSConfig) {
    if (config.gateway === 'pinata') {
      this.pinata = new Pinata(config.pinataApiKey!, config.pinataSecretKey!);
    } else if (config.gateway === 'filebase') {
      // Filebase S3-compatible interface
      this.client = create({
        host: 's3.filebase.com',
        protocol: 'https',
        headers: {
          authorization: `Basic ${Buffer.from(
            `${config.filebaseAccessKey}:${config.filebaseSecretKey}`
          ).toString('base64')}`
        }
      });
    }
  }

  /**
   * Create and pin a snapshot of recent articles to IPFS
   */
  async createSnapshot(articles: Article[]): Promise<{
    cid: string;
    url: string;
    timestamp: number;
  }> {
    const snapshot = {
      timestamp: Date.now(),
      version: '1.0',
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        content: a.content,
        imageUrl: a.imageUrl,
        source: a.source,
        sourceUrl: a.sourceUrl,
        publishedAt: a.publishedAt,
        topics: a.topics,
      })),
      metadata: {
        articleCount: articles.length,
        generatedAt: new Date().toISOString(),
        coversPeriod: {
          from: Math.min(...articles.map(a =>
            typeof a.publishedAt === 'number' ? a.publishedAt : Date.parse(a.publishedAt)
          )),
          to: Math.max(...articles.map(a =>
            typeof a.publishedAt === 'number' ? a.publishedAt : Date.parse(a.publishedAt)
          )),
        }
      }
    };

    const snapshotJson = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([snapshotJson], { type: 'application/json' });

    if (this.config.gateway === 'pinata') {
      const result = await this.pinata.pinJSONToIPFS(snapshot, {
        pinataMetadata: {
          name: `news-snapshot-${snapshot.timestamp}`,
          keyvalues: {
            type: 'news-snapshot',
            timestamp: snapshot.timestamp.toString(),
            articleCount: snapshot.articles.length.toString(),
          }
        }
      });

      return {
        cid: result.IpfsHash,
        url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
        timestamp: snapshot.timestamp,
      };
    }

    // For Filebase or self-hosted nodes
    const { cid } = await this.client!.add(snapshotJson);

    return {
      cid: cid.toString(),
      url: `https://ipfs.io/ipfs/${cid.toString()}`,
      timestamp: snapshot.timestamp,
    };
  }

  /**
   * Retrieve snapshot from IPFS by CID
   */
  async getSnapshot(cid: string): Promise<any> {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    if (!response.ok) {
      throw new Error(`Failed to retrieve IPFS snapshot: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * List all pinned snapshots
   */
  async listSnapshots(): Promise<Array<{ cid: string; timestamp: number; size: number }>> {
    if (this.config.gateway === 'pinata') {
      const result = await this.pinata.pinList({
        status: 'pinned',
        metadata: {
          keyvalues: {
            type: {
              value: 'news-snapshot',
              op: 'eq'
            }
          }
        }
      });

      return result.rows.map((pin: any) => ({
        cid: pin.ipfs_pin_hash,
        timestamp: parseInt(pin.metadata.keyvalues.timestamp),
        size: pin.size,
      }));
    }

    return [];
  }
}
```

**Snapshot Creation API Endpoint**:
```typescript
// app/api/ipfs/snapshot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IPFSDistributor } from '@/lib/ipfs-distributor';
import { getArticles } from '@/lib/firestore';
import { logger } from '@/lib/logger';

const ipfs = new IPFSDistributor({
  gateway: 'pinata',
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretKey: process.env.PINATA_SECRET_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get last 24 hours of articles
    const articles = await getArticles(200);
    const recentArticles = articles.filter(a => {
      const publishedAt = typeof a.publishedAt === 'number'
        ? a.publishedAt
        : Date.parse(a.publishedAt);
      return publishedAt > Date.now() - 24 * 60 * 60 * 1000;
    });

    logger.info('ipfs_snapshot_creating', {
      article_count: recentArticles.length,
    });

    const snapshot = await ipfs.createSnapshot(recentArticles);

    const duration = Date.now() - startTime;
    logger.http('POST', '/api/ipfs/snapshot', 200, duration, {
      cid: snapshot.cid,
      article_count: recentArticles.length,
    });

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('ipfs_snapshot_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('POST', '/api/ipfs/snapshot', 500, duration);

    return NextResponse.json(
      { error: 'Failed to create IPFS snapshot' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get('cid');

  if (cid) {
    try {
      const snapshot = await ipfs.getSnapshot(cid);
      return NextResponse.json(snapshot);
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to retrieve snapshot' },
        { status: 404 }
      );
    }
  }

  // List all snapshots
  try {
    const snapshots = await ipfs.listSnapshots();
    return NextResponse.json({ snapshots });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list snapshots' },
      { status: 500 }
    );
  }
}
```

**Automated Snapshot Generation (Cron)**:
```typescript
// app/api/cron/ipfs-snapshot/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Trigger snapshot creation every 6 hours
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ipfs/snapshot`, {
    method: 'POST',
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Snapshot creation failed' },
      { status: 500 }
    );
  }

  const data = await response.json();
  return NextResponse.json({
    success: true,
    snapshot: data.snapshot,
  });
}
```

**Client-Side IPFS Snapshot Viewer**:
```typescript
// app/components/IPFS/SnapshotViewer.tsx
'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';

interface Snapshot {
  cid: string;
  url: string;
  timestamp: number;
}

export function SnapshotViewer() {
  const { data: snapshots, error } = useSWR<{ snapshots: Snapshot[] }>(
    '/api/ipfs/snapshot',
    (url) => fetch(url).then(r => r.json()),
    { refreshInterval: 60000 }
  );

  if (error) return <div className="text-red-600">Failed to load snapshots</div>;
  if (!snapshots) return <div>Loading snapshots...</div>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">📦 IPFS Snapshots (Censorship-Resistant)</h2>
      <p className="text-gray-600 mb-4">
        These snapshots are distributed through IPFS and remain accessible even if the main site is blocked.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {snapshots.snapshots.map((snapshot) => (
          <div key={snapshot.cid} className="border p-4 rounded bg-blue-50">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-mono text-sm text-gray-700">
                  CID: {snapshot.cid}
                </p>
                <p className="text-sm text-gray-600">
                  Created: {new Date(snapshot.timestamp).toLocaleString()}
                </p>
              </div>
              <a
                href={snapshot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Open Snapshot
              </a>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Alternative IPFS Gateways:</p>
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`https://ipfs.io/ipfs/${snapshot.cid}`}
                  className="text-xs text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ipfs.io
                </a>
                <a
                  href={`https://cloudflare-ipfs.com/ipfs/${snapshot.cid}`}
                  className="text-xs text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cloudflare
                </a>
                <a
                  href={`https://dweb.link/ipfs/${snapshot.cid}`}
                  className="text-xs text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  dweb.link
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Firestore Schema for Snapshots**:
```typescript
// Add to lib/firestore.ts

export interface IPFSSnapshot {
  id: string;
  cid: string;
  url: string;
  timestamp: number;
  articleCount: number;
  sizeBytes: number;
  createdAt: number;
}

export async function saveIPFSSnapshot(snapshot: Omit<IPFSSnapshot, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');

  const docRef = await db.collection('ipfs_snapshots').add({
    ...snapshot,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function getIPFSSnapshots(limit: number = 20): Promise<IPFSSnapshot[]> {
  if (!db) throw new Error('Firestore not initialized');

  const snapshot = await db
    .collection('ipfs_snapshots')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as IPFSSnapshot[];
}
```

#### Cost Estimate (IPFS)

**Pinata Pricing** (Recommended):
- Free tier: 1 GB storage, 100 GB bandwidth/month
- Picnic Plan: $20/month (100 GB storage, unlimited bandwidth)
- **For MVP**: Free tier sufficient (snapshots ~5-10 MB each, 6/day = ~60 MB/day = 1.8 GB/month)

**Filebase Pricing** (Alternative):
- Free tier: 5 GB storage, 5 GB egress/month
- Pay-as-you-go: $5.99/TB/month storage, $7/TB egress

**Recommended**: Start with Pinata free tier ($0/month), upgrade to Picnic ($20/month) if usage grows.

---

### Feature A2: Signed Offline Snapshot Packs

**Objective**: Generate cryptographically signed snapshot packs that can be distributed via USB drives, Bluetooth, or Wi-Fi Direct during internet blackouts.

#### Technical Architecture

**Snapshot Signing Service**:
```typescript
// lib/snapshot-signer.ts
import * as crypto from 'crypto';
import * as jose from 'jose';

export class SnapshotSigner {
  private privateKey: crypto.KeyObject;
  private publicKey: crypto.KeyObject;

  constructor() {
    // Load keys from environment (generated once, stored securely)
    const privateKeyPem = process.env.SNAPSHOT_SIGNING_PRIVATE_KEY!;
    const publicKeyPem = process.env.SNAPSHOT_SIGNING_PUBLIC_KEY!;

    this.privateKey = crypto.createPrivateKey(privateKeyPem);
    this.publicKey = crypto.createPublicKey(publicKeyPem);
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
    const snapshotJson = JSON.stringify(snapshot);
    const snapshotBuffer = Buffer.from(snapshotJson, 'utf-8');

    const signature = crypto.sign('sha256', snapshotBuffer, this.privateKey);

    return {
      snapshot,
      signature: signature.toString('base64'),
      publicKey: this.publicKey.export({ type: 'spki', format: 'pem' }) as string,
      signedAt: Date.now(),
    };
  }

  /**
   * Verify snapshot signature (client-side or server-side)
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
```

**Downloadable Snapshot Pack API**:
```typescript
// app/api/snapshot/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getArticles } from '@/lib/firestore';
import { SnapshotSigner } from '@/lib/snapshot-signer';
import { logger } from '@/lib/logger';
import JSZip from 'jszip';

const signer = new SnapshotSigner();

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get last 7 days of articles
    const articles = await getArticles(500);
    const recentArticles = articles.filter(a => {
      const publishedAt = typeof a.publishedAt === 'number'
        ? a.publishedAt
        : Date.parse(a.publishedAt);
      return publishedAt > Date.now() - 7 * 24 * 60 * 60 * 1000;
    });

    // Create signed snapshot
    const signedSnapshot = await signer.signSnapshot({
      timestamp: Date.now(),
      version: '1.0',
      articles: recentArticles,
      metadata: {
        articleCount: recentArticles.length,
        generatedAt: new Date().toISOString(),
      }
    });

    // Create ZIP archive with snapshot + signature
    const zip = new JSZip();
    zip.file('snapshot.json', JSON.stringify(signedSnapshot.snapshot, null, 2));
    zip.file('signature.txt', signedSnapshot.signature);
    zip.file('public_key.pem', signedSnapshot.publicKey);
    zip.file('README.txt', `
Persian Uprising News - Offline Snapshot Pack

This archive contains news articles from the last 7 days.

Files:
- snapshot.json: News articles in JSON format
- signature.txt: Cryptographic signature (RSA-4096)
- public_key.pem: Public key for signature verification

Verification:
To verify the snapshot has not been tampered with, use the signature and public key.

Generated: ${new Date().toISOString()}
Articles: ${recentArticles.length}
    `.trim());

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const duration = Date.now() - startTime;
    logger.http('GET', '/api/snapshot/download', 200, duration, {
      article_count: recentArticles.length,
      zip_size_bytes: zipBuffer.length,
    });

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="persian-uprising-news-${Date.now()}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('snapshot_download_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('GET', '/api/snapshot/download', 500, duration);

    return NextResponse.json(
      { error: 'Failed to generate snapshot' },
      { status: 500 }
    );
  }
}
```

**Client-Side Signature Verification**:
```typescript
// app/components/Snapshot/VerifySnapshot.tsx
'use client';

import React, { useState } from 'react';

export function VerifySnapshot() {
  const [file, setFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const verifySignature = async () => {
    if (!file) return;

    try {
      // Read ZIP file using JSZip (client-side)
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);

      const snapshotJson = await zip.file('snapshot.json')?.async('string');
      const signature = await zip.file('signature.txt')?.async('string');
      const publicKey = await zip.file('public_key.pem')?.async('string');

      if (!snapshotJson || !signature || !publicKey) {
        throw new Error('Invalid snapshot pack structure');
      }

      // Send to server for verification (signature verification requires Node.js crypto)
      const response = await fetch('/api/snapshot/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot: JSON.parse(snapshotJson),
          signature,
          publicKey,
        }),
      });

      const result = await response.json();

      setVerificationResult({
        verified: result.verified,
        message: result.verified
          ? '✅ Snapshot verified! This archive has not been tampered with.'
          : '❌ Verification failed! This archive may have been modified.',
        details: {
          articleCount: JSON.parse(snapshotJson).articles?.length,
          timestamp: JSON.parse(snapshotJson).timestamp,
        },
      });
    } catch (error) {
      setVerificationResult({
        verified: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="text-xl font-bold mb-4">🔐 Verify Offline Snapshot</h3>
      <p className="text-gray-600 mb-4">
        Upload a downloaded snapshot pack to verify its authenticity using cryptographic signatures.
      </p>

      <input
        type="file"
        accept=".zip"
        onChange={handleFileChange}
        className="block mb-4"
      />

      <button
        onClick={verifySignature}
        disabled={!file}
        className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
      >
        Verify Signature
      </button>

      {verificationResult && (
        <div className={`mt-4 p-4 rounded ${
          verificationResult.verified ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <p className="font-semibold">{verificationResult.message}</p>
          {verificationResult.details && (
            <div className="mt-2 text-sm">
              <p>Articles: {verificationResult.details.articleCount}</p>
              <p>Generated: {new Date(verificationResult.details.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Cost Estimate (Signing)

**Infrastructure**: $0 (uses existing Next.js API routes)
**Storage**: Minimal (signatures are small, ~500 bytes each)

---

### Feature A3: Tor Onion Service Access

**Objective**: Provide censorship-resistant access via Tor hidden service (.onion domain).

#### Technical Architecture

**Deployment Strategy**:

Since Vercel doesn't support Tor directly, we need a separate VPS running a Tor hidden service that proxies to the Vercel deployment.

**VPS Setup** (Ubuntu 22.04):
```bash
# Install Tor
sudo apt update
sudo apt install tor nginx -y

# Configure Tor hidden service
sudo nano /etc/tor/torrc
```

**Tor Configuration** (`/etc/tor/torrc`):
```
HiddenServiceDir /var/lib/tor/persian_uprising_news/
HiddenServicePort 80 127.0.0.1:8080
HiddenServiceVersion 3
```

**Nginx Reverse Proxy** (`/etc/nginx/sites-available/onion-proxy`):
```nginx
server {
    listen 127.0.0.1:8080;

    location / {
        proxy_pass https://persian-uprising-news-bactie494-jespers-projects-dbff6d83.vercel.app;
        proxy_set_header Host persian-uprising-news-bactie494-jespers-projects-dbff6d83.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_ssl_server_name on;
    }
}
```

**Start Services**:
```bash
# Enable and start Tor
sudo systemctl enable tor
sudo systemctl start tor

# Get onion address
sudo cat /var/lib/tor/persian_uprising_news/hostname
# Output: <random>.onion

# Enable Nginx proxy
sudo ln -s /etc/nginx/sites-available/onion-proxy /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

**Client-Side Onion Detection**:
```typescript
// app/components/Shared/TorAccessButton.tsx
'use client';

import React, { useEffect, useState } from 'react';

export function TorAccessButton() {
  const [isTor, setIsTor] = useState(false);
  const onionAddress = process.env.NEXT_PUBLIC_ONION_ADDRESS;

  useEffect(() => {
    // Detect if user is accessing via Tor
    setIsTor(window.location.hostname.endsWith('.onion'));
  }, []);

  if (isTor) {
    return (
      <div className="bg-purple-900 text-white p-4 rounded">
        <p className="font-semibold">🧅 Accessing via Tor</p>
        <p className="text-sm">Your connection is anonymized and censorship-resistant.</p>
      </div>
    );
  }

  return (
    <div className="bg-purple-100 p-4 rounded">
      <p className="font-semibold mb-2">🔒 Censorship-Resistant Access</p>
      <p className="text-sm mb-2">
        Access this site via Tor for maximum privacy and censorship resistance.
      </p>
      <a
        href={`http://${onionAddress}`}
        className="text-purple-700 font-mono text-xs hover:underline"
      >
        {onionAddress}
      </a>
      <p className="text-xs text-gray-600 mt-2">
        Requires Tor Browser: <a href="https://www.torproject.org/download/" className="underline">Download</a>
      </p>
    </div>
  );
}
```

#### Cost Estimate (Tor)

**VPS Hosting** (DigitalOcean/Vultr):
- Basic Droplet: $6/month (1 vCPU, 1 GB RAM, 25 GB SSD)
- **Total: $6/month**

---

## Priority 1: OSINT Verification Tools

### Overview

Implement verification workbench for moderators to verify crowdsourced reports using OSINT techniques including cross-source corroboration, media deduplication, and reverse image search.

### Feature B1: Media Deduplication & Reuse Detection

**Objective**: Detect when the same image/video is reused across multiple reports to identify coordinated disinformation or recycled content.

#### Technical Architecture

**Perceptual Hashing Service**:
```typescript
// lib/media-deduplicator.ts
import * as crypto from 'crypto';
import sharp from 'sharp';

export class MediaDeduplicator {
  /**
   * Generate perceptual hash (pHash) for image deduplication
   */
  async generatePerceptualHash(imageBuffer: Buffer): Promise<string> {
    // Resize to 8x8 grayscale
    const resized = await sharp(imageBuffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate average pixel value
    const pixels = Array.from(resized);
    const avg = pixels.reduce((sum, val) => sum + val, 0) / pixels.length;

    // Generate hash: 1 if pixel > avg, 0 otherwise
    let hash = '';
    for (const pixel of pixels) {
      hash += pixel > avg ? '1' : '0';
    }

    // Convert binary to hex
    return parseInt(hash, 2).toString(16).padStart(16, '0');
  }

  /**
   * Calculate Hamming distance between two hashes
   */
  hammingDistance(hash1: string, hash2: string): number {
    const bin1 = parseInt(hash1, 16).toString(2).padStart(64, '0');
    const bin2 = parseInt(hash2, 16).toString(2).padStart(64, '0');

    let distance = 0;
    for (let i = 0; i < 64; i++) {
      if (bin1[i] !== bin2[i]) distance++;
    }

    return distance;
  }

  /**
   * Check if image is duplicate (Hamming distance < 5)
   */
  isDuplicate(hash1: string, hash2: string, threshold: number = 5): boolean {
    return this.hammingDistance(hash1, hash2) < threshold;
  }

  /**
   * Find similar images in database
   */
  async findSimilarImages(
    imageHash: string,
    existingHashes: Array<{ id: string; hash: string }>,
    threshold: number = 5
  ): Promise<Array<{ id: string; distance: number }>> {
    const similar: Array<{ id: string; distance: number }> = [];

    for (const existing of existingHashes) {
      const distance = this.hammingDistance(imageHash, existing.hash);
      if (distance < threshold) {
        similar.push({ id: existing.id, distance });
      }
    }

    return similar.sort((a, b) => a.distance - b.distance);
  }
}
```

**Image Upload with Deduplication Check**:
```typescript
// app/api/media/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MediaDeduplicator } from '@/lib/media-deduplicator';
import { getDb } from '@/lib/firestore';
import { logger } from '@/lib/logger';

const deduplicator = new MediaDeduplicator();

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate perceptual hash
    const imageHash = await deduplicator.generatePerceptualHash(buffer);

    // Check for duplicates in database
    const db = getDb();
    const existingImages = await db.collection('media_hashes').get();
    const existingHashes = existingImages.docs.map(doc => ({
      id: doc.id,
      hash: doc.data().perceptualHash,
    }));

    const similar = await deduplicator.findSimilarImages(imageHash, existingHashes, 5);

    if (similar.length > 0) {
      logger.warn('duplicate_image_detected', {
        new_hash: imageHash,
        similar_count: similar.length,
        most_similar_id: similar[0].id,
        hamming_distance: similar[0].distance,
      });

      return NextResponse.json({
        duplicate: true,
        similarImages: similar.map(s => ({
          id: s.id,
          hammingDistance: s.distance,
        })),
        hash: imageHash,
      });
    }

    // Upload to Cloudflare Images (or store hash if not duplicate)
    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
        body: formData,
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.success) {
      throw new Error('Cloudflare upload failed');
    }

    // Store hash in Firestore
    await db.collection('media_hashes').add({
      perceptualHash: imageHash,
      cloudflareId: uploadResult.result.id,
      uploadedAt: new Date(),
      url: uploadResult.result.variants[0],
    });

    const duration = Date.now() - startTime;
    logger.http('POST', '/api/media/upload', 200, duration, {
      hash: imageHash,
      duplicate: false,
    });

    return NextResponse.json({
      duplicate: false,
      imageUrl: uploadResult.result.variants[0],
      hash: imageHash,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('media_upload_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('POST', '/api/media/upload', 500, duration);

    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

**Verification Dashboard Component**:
```typescript
// app/components/Verification/DuplicationChecker.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface SimilarImage {
  id: string;
  hammingDistance: number;
}

export function DuplicationChecker() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    duplicate: boolean;
    similarImages?: SimilarImage[];
    hash?: string;
  } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const checkDuplication = async () => {
    if (!selectedFile) return;

    setChecking(true);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Duplication check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-6 border rounded bg-white">
      <h2 className="text-2xl font-bold mb-4">🔍 Media Deduplication Check</h2>
      <p className="text-gray-600 mb-4">
        Upload an image to check if it has been used in previous reports.
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="block mb-4"
      />

      {preview && (
        <div className="mb-4">
          <Image
            src={preview}
            alt="Preview"
            width={300}
            height={300}
            className="object-cover border rounded"
          />
        </div>
      )}

      <button
        onClick={checkDuplication}
        disabled={!selectedFile || checking}
        className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
      >
        {checking ? 'Checking...' : 'Check for Duplicates'}
      </button>

      {result && (
        <div className={`mt-6 p-4 rounded ${
          result.duplicate ? 'bg-red-100' : 'bg-green-100'
        }`}>
          {result.duplicate ? (
            <div>
              <p className="font-semibold text-red-800 mb-2">
                ⚠️ Potential Duplicate Detected!
              </p>
              <p className="text-sm mb-2">
                This image is similar to {result.similarImages?.length} existing image(s):
              </p>
              <ul className="text-sm">
                {result.similarImages?.map((img, idx) => (
                  <li key={idx}>
                    Image ID: {img.id} (Distance: {img.hammingDistance})
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-600 mt-2">
                Hamming distance &lt; 5 indicates near-identical images.
              </p>
            </div>
          ) : (
            <p className="font-semibold text-green-800">
              ✅ No duplicates found. This appears to be original content.
            </p>
          )}
          <p className="text-xs text-gray-600 mt-2">
            Perceptual Hash: {result.hash}
          </p>
        </div>
      )}
    </div>
  );
}
```

#### Cost Estimate (Deduplication)

**Infrastructure**: $0 (uses existing Firestore for hash storage)
**Cloudflare Images**: Free tier (100k images, already budgeted)

---

### Feature B2: Cross-Source Corroboration

**Objective**: Verify incident reports by checking if multiple independent news sources mention the same event.

#### Technical Architecture

**Corroboration Engine**:
```typescript
// lib/corroboration-engine.ts
import { Article } from '@/lib/firestore';
import { logger } from '@/lib/logger';

interface CorroborationResult {
  corroborated: boolean;
  sourceCount: number;
  sources: string[];
  articles: Article[];
  confidence: number;
}

export class CorroborationEngine {
  /**
   * Find articles mentioning similar keywords/location
   */
  async findCorroboratingArticles(
    keywords: string[],
    location?: string,
    timeWindow: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<CorroborationResult> {
    // Import at runtime to avoid circular dependency
    const { getArticles } = await import('@/lib/firestore');

    const articles = await getArticles(500);

    // Filter to recent articles within time window
    const recentArticles = articles.filter(a => {
      const publishedAt = typeof a.publishedAt === 'number'
        ? a.publishedAt
        : Date.parse(a.publishedAt);
      return publishedAt > Date.now() - timeWindow;
    });

    // Find articles containing keywords
    const matchingArticles = recentArticles.filter(article => {
      const content = `${article.title} ${article.summary} ${article.content}`.toLowerCase();

      // Check keyword match
      const keywordMatch = keywords.some(keyword =>
        content.includes(keyword.toLowerCase())
      );

      // Check location match (if provided)
      const locationMatch = location
        ? content.includes(location.toLowerCase())
        : true;

      return keywordMatch && locationMatch;
    });

    // Group by unique sources
    const sources = [...new Set(matchingArticles.map(a => a.source))];

    // Calculate confidence based on source diversity
    const confidence = Math.min(sources.length / 3, 1.0) * 100;

    const result = {
      corroborated: sources.length >= 2,
      sourceCount: sources.length,
      sources,
      articles: matchingArticles,
      confidence: Math.round(confidence),
    };

    logger.info('corroboration_check', {
      keywords,
      location,
      matching_articles: matchingArticles.length,
      unique_sources: sources.length,
      corroborated: result.corroborated,
      confidence: result.confidence,
    });

    return result;
  }
}
```

**Corroboration API Endpoint**:
```typescript
// app/api/verify/corroborate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CorroborationEngine } from '@/lib/corroboration-engine';
import { logger } from '@/lib/logger';

const engine = new CorroborationEngine();

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { keywords, location } = await request.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array required' },
        { status: 400 }
      );
    }

    const result = await engine.findCorroboratingArticles(keywords, location);

    const duration = Date.now() - startTime;
    logger.http('POST', '/api/verify/corroborate', 200, duration, {
      keywords_count: keywords.length,
      corroborated: result.corroborated,
      source_count: result.sourceCount,
    });

    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('corroboration_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('POST', '/api/verify/corroborate', 500, duration);

    return NextResponse.json(
      { error: 'Corroboration check failed' },
      { status: 500 }
    );
  }
}
```

**Verification Dashboard Component**:
```typescript
// app/components/Verification/CorroborationChecker.tsx
'use client';

import React, { useState } from 'react';

export function CorroborationChecker() {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkCorroboration = async () => {
    setChecking(true);

    try {
      const response = await fetch('/api/verify/corroborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.split(',').map(k => k.trim()),
          location: location || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Corroboration check failed:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-6 border rounded bg-white">
      <h2 className="text-2xl font-bold mb-4">🔎 Cross-Source Corroboration</h2>
      <p className="text-gray-600 mb-4">
        Verify if an incident is reported by multiple independent sources.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block font-semibold mb-2">
            Keywords (comma-separated):
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="protest, arrest, clash"
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">
            Location (optional):
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Tehran, Isfahan, etc."
            className="w-full border p-2 rounded"
          />
        </div>

        <button
          onClick={checkCorroboration}
          disabled={!keywords || checking}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
        >
          {checking ? 'Checking...' : 'Check Corroboration'}
        </button>
      </div>

      {result && (
        <div className={`mt-6 p-4 rounded ${
          result.corroborated ? 'bg-green-100' : 'bg-yellow-100'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {result.corroborated ? (
              <span className="text-2xl">✅</span>
            ) : (
              <span className="text-2xl">⚠️</span>
            )}
            <p className="font-semibold">
              {result.corroborated
                ? `Corroborated by ${result.sourceCount} sources`
                : `Only ${result.sourceCount} source(s) found`}
            </p>
          </div>

          <p className="text-sm mb-2">
            Confidence: {result.confidence}% (based on source diversity)
          </p>

          <div className="mt-4">
            <p className="font-semibold text-sm mb-2">Sources:</p>
            <ul className="text-sm space-y-1">
              {result.sources.map((source: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  {source}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <p className="font-semibold text-sm mb-2">
              Matching Articles ({result.articles.length}):
            </p>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {result.articles.slice(0, 5).map((article: any, idx: number) => (
                <div key={idx} className="text-sm p-2 bg-white rounded">
                  <p className="font-semibold">{article.title}</p>
                  <p className="text-xs text-gray-600">
                    {article.source} • {new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Cost Estimate (Corroboration)

**Infrastructure**: $0 (uses existing Firestore queries)

---

## Priority 2: Disinformation Detection

### Overview

Implement BotSlayer-inspired coordination detection to identify bot networks amplifying disinformation campaigns.

### Feature C1: Coordination Detection Engine

**Objective**: Detect coordinated inauthentic behavior through temporal clustering, content similarity, and network analysis.

#### Technical Architecture

Based on the comprehensive BotSlayer/Hoaxy research, implement a simplified coordination detection system focusing on hashtag co-occurrence and temporal clustering.

**Coordination Detector**:
```typescript
// lib/coordination-detector.ts
import { logger } from '@/lib/logger';

interface Post {
  id: string;
  author: string;
  content: string;
  hashtags: string[];
  timestamp: number;
}

interface CoordinationSignal {
  accounts: string[];
  coordinationType: 'hashtag_cooccurrence' | 'temporal_clustering' | 'content_similarity';
  confidence: number;
  evidence: {
    sharedHashtags?: string[];
    temporalWindow?: number;
    contentSimilarity?: number;
  };
}

export class CoordinationDetector {
  /**
   * Detect hashtag co-occurrence coordination
   * Accounts sharing 3-7 identical hashtags in identical sequence
   */
  detectHashtagCoordination(
    posts: Post[],
    minSharedHashtags: number = 3
  ): CoordinationSignal[] {
    const signals: CoordinationSignal[] = [];

    // Group posts by hashtag sequences
    const hashtagSequences = new Map<string, string[]>();

    for (const post of posts) {
      if (post.hashtags.length < minSharedHashtags) continue;

      const sequence = post.hashtags.slice(0, 7).join('|');
      if (!hashtagSequences.has(sequence)) {
        hashtagSequences.set(sequence, []);
      }
      hashtagSequences.get(sequence)!.push(post.author);
    }

    // Find sequences used by multiple accounts
    for (const [sequence, authors] of hashtagSequences) {
      if (authors.length >= 2) {
        const uniqueAuthors = [...new Set(authors)];
        if (uniqueAuthors.length >= 2) {
          signals.push({
            accounts: uniqueAuthors,
            coordinationType: 'hashtag_cooccurrence',
            confidence: Math.min(uniqueAuthors.length / 5, 1.0),
            evidence: {
              sharedHashtags: sequence.split('|'),
            },
          });
        }
      }
    }

    logger.info('hashtag_coordination_detected', {
      signals_count: signals.length,
      total_posts: posts.length,
    });

    return signals;
  }

  /**
   * Detect temporal clustering coordination
   * Accounts posting within narrow time windows (< 15 minutes)
   */
  detectTemporalClustering(
    posts: Post[],
    windowMs: number = 15 * 60 * 1000 // 15 minutes
  ): CoordinationSignal[] {
    const signals: CoordinationSignal[] = [];

    // Group posts by time windows
    const sortedPosts = posts.sort((a, b) => a.timestamp - b.timestamp);

    let windowStart = 0;
    while (windowStart < sortedPosts.length) {
      const currentTime = sortedPosts[windowStart].timestamp;
      const windowPosts = [];

      for (let i = windowStart; i < sortedPosts.length; i++) {
        if (sortedPosts[i].timestamp - currentTime <= windowMs) {
          windowPosts.push(sortedPosts[i]);
        } else {
          break;
        }
      }

      // Check if window has suspicious concentration
      if (windowPosts.length >= 5) {
        const authors = [...new Set(windowPosts.map(p => p.author))];

        signals.push({
          accounts: authors,
          coordinationType: 'temporal_clustering',
          confidence: Math.min(windowPosts.length / 10, 1.0),
          evidence: {
            temporalWindow: windowMs,
          },
        });
      }

      windowStart++;
    }

    logger.info('temporal_clustering_detected', {
      signals_count: signals.length,
      window_ms: windowMs,
    });

    return signals;
  }

  /**
   * Detect content similarity coordination
   * Accounts posting nearly identical content (cosine similarity > 0.85)
   */
  detectContentSimilarity(
    posts: Post[],
    similarityThreshold: number = 0.85
  ): CoordinationSignal[] {
    const signals: CoordinationSignal[] = [];

    // Simple TF-IDF-like similarity
    for (let i = 0; i < posts.length; i++) {
      for (let j = i + 1; j < posts.length; j++) {
        const similarity = this.calculateCosineSimilarity(
          posts[i].content,
          posts[j].content
        );

        if (similarity >= similarityThreshold) {
          signals.push({
            accounts: [posts[i].author, posts[j].author],
            coordinationType: 'content_similarity',
            confidence: similarity,
            evidence: {
              contentSimilarity: similarity,
            },
          });
        }
      }
    }

    logger.info('content_similarity_detected', {
      signals_count: signals.length,
      threshold: similarityThreshold,
    });

    return signals;
  }

  /**
   * Calculate cosine similarity between two texts
   */
  private calculateCosineSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const allWords = [...new Set([...words1, ...words2])];

    const vector1 = allWords.map(word => words1.filter(w => w === word).length);
    const vector2 = allWords.map(word => words2.filter(w => w === word).length);

    const dotProduct = vector1.reduce((sum, val, idx) => sum + val * vector2[idx], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }
}
```

**Coordination Detection API**:
```typescript
// app/api/detect/coordination/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CoordinationDetector } from '@/lib/coordination-detector';
import { logger } from '@/lib/logger';

const detector = new CoordinationDetector();

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { posts } = await request.json();

    if (!posts || !Array.isArray(posts)) {
      return NextResponse.json(
        { error: 'Posts array required' },
        { status: 400 }
      );
    }

    // Run all coordination detection methods
    const hashtagSignals = detector.detectHashtagCoordination(posts);
    const temporalSignals = detector.detectTemporalClustering(posts);
    const contentSignals = detector.detectContentSimilarity(posts);

    const allSignals = [...hashtagSignals, ...temporalSignals, ...contentSignals];

    // Group by accounts
    const accountGroups = new Map<string, typeof allSignals>();
    for (const signal of allSignals) {
      const key = signal.accounts.sort().join(',');
      if (!accountGroups.has(key)) {
        accountGroups.set(key, []);
      }
      accountGroups.get(key)!.push(signal);
    }

    // Sort by confidence
    const sortedSignals = Array.from(accountGroups.values())
      .map(group => ({
        accounts: group[0].accounts,
        signals: group,
        overallConfidence: group.reduce((sum, s) => sum + s.confidence, 0) / group.length,
      }))
      .sort((a, b) => b.overallConfidence - a.overallConfidence);

    const duration = Date.now() - startTime;
    logger.http('POST', '/api/detect/coordination', 200, duration, {
      posts_analyzed: posts.length,
      signals_detected: allSignals.length,
      account_groups: sortedSignals.length,
    });

    return NextResponse.json({
      signals: sortedSignals,
      summary: {
        totalPosts: posts.length,
        totalSignals: allSignals.length,
        hashtagSignals: hashtagSignals.length,
        temporalSignals: temporalSignals.length,
        contentSignals: contentSignals.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('coordination_detection_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('POST', '/api/detect/coordination', 500, duration);

    return NextResponse.json(
      { error: 'Coordination detection failed' },
      { status: 500 }
    );
  }
}
```

**Coordination Dashboard**:
```typescript
// app/components/Disinformation/CoordinationDashboard.tsx
'use client';

import React, { useState } from 'react';

export function CoordinationDashboard() {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const analyzeSampleData = async () => {
    setAnalyzing(true);

    // Sample posts for demonstration
    const samplePosts = [
      {
        id: '1',
        author: 'user1',
        content: 'Join the protest today #IranProtests #FreedomForIran #WomenLifeFreedom',
        hashtags: ['#IranProtests', '#FreedomForIran', '#WomenLifeFreedom'],
        timestamp: Date.now(),
      },
      {
        id: '2',
        author: 'user2',
        content: 'Support the movement #IranProtests #FreedomForIran #WomenLifeFreedom',
        hashtags: ['#IranProtests', '#FreedomForIran', '#WomenLifeFreedom'],
        timestamp: Date.now() + 1000,
      },
      {
        id: '3',
        author: 'user3',
        content: 'Stand with Iran #IranProtests #FreedomForIran #WomenLifeFreedom',
        hashtags: ['#IranProtests', '#FreedomForIran', '#WomenLifeFreedom'],
        timestamp: Date.now() + 2000,
      },
    ];

    try {
      const response = await fetch('/api/detect/coordination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: samplePosts }),
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-6 border rounded bg-white">
      <h2 className="text-2xl font-bold mb-4">🤖 Coordination Detection</h2>
      <p className="text-gray-600 mb-4">
        Detect coordinated inauthentic behavior and bot networks amplifying disinformation.
      </p>

      <button
        onClick={analyzeSampleData}
        disabled={analyzing}
        className="bg-red-600 text-white px-6 py-2 rounded disabled:bg-gray-400 mb-4"
      >
        {analyzing ? 'Analyzing...' : 'Analyze Sample Data'}
      </button>

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-100 p-4 rounded">
              <p className="text-2xl font-bold">{results.summary.totalPosts}</p>
              <p className="text-sm text-gray-600">Posts Analyzed</p>
            </div>
            <div className="bg-orange-100 p-4 rounded">
              <p className="text-2xl font-bold">{results.summary.hashtagSignals}</p>
              <p className="text-sm text-gray-600">Hashtag Coordination</p>
            </div>
            <div className="bg-purple-100 p-4 rounded">
              <p className="text-2xl font-bold">{results.summary.temporalSignals}</p>
              <p className="text-sm text-gray-600">Temporal Clustering</p>
            </div>
            <div className="bg-red-100 p-4 rounded">
              <p className="text-2xl font-bold">{results.summary.contentSignals}</p>
              <p className="text-sm text-gray-600">Content Similarity</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Detected Coordination Groups:</h3>
            <div className="space-y-2">
              {results.signals.map((group: any, idx: number) => (
                <div key={idx} className="border p-4 rounded bg-red-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">
                        {group.accounts.length} Coordinated Accounts
                      </p>
                      <p className="text-sm text-gray-600">
                        {group.accounts.join(', ')}
                      </p>
                    </div>
                    <span className="bg-red-600 text-white px-3 py-1 rounded text-sm">
                      {Math.round(group.overallConfidence * 100)}% Confidence
                    </span>
                  </div>

                  <div className="mt-2">
                    <p className="text-sm font-semibold">Evidence:</p>
                    <ul className="text-sm space-y-1">
                      {group.signals.map((signal: any, sidx: number) => (
                        <li key={sidx}>
                          • {signal.coordinationType.replace(/_/g, ' ')}
                          {signal.evidence.sharedHashtags && (
                            <span className="text-gray-600">
                              {' '}({signal.evidence.sharedHashtags.join(', ')})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Cost Estimate (Coordination Detection)

**Infrastructure**: $0 (uses existing Next.js API routes)
**Computational**: Minimal (runs on-demand, not continuous)

---

## Priority 3: Advanced Connectivity Dashboards

### Overview

Integrate real-time internet connectivity monitoring using IODA, OONI, and GRIP APIs to provide situational awareness during internet blackouts and routing attacks.

### Feature D1: OONI Censorship Measurements Integration

**Objective**: Display real-time censorship measurements from OONI showing what websites/apps are blocked in Iran.

#### Technical Architecture

**OONI API Client**:
```typescript
// lib/ooni-client.ts
import { logger } from '@/lib/logger';

interface OONIMeasurement {
  measurement_uid: string;
  test_name: string;
  input: string;
  probe_cc: string;
  probe_asn: string;
  measurement_start_time: string;
  anomaly: boolean;
  confirmed: boolean;
  failure: boolean;
}

export class OONIClient {
  private baseUrl = 'https://api.ooni.io/api/v1';

  /**
   * Get censorship measurements for Iran
   */
  async getMeasurements(
    testName?: string,
    since?: string,
    until?: string,
    limit: number = 100
  ): Promise<OONIMeasurement[]> {
    const params = new URLSearchParams({
      probe_cc: 'IR', // Iran country code
      limit: limit.toString(),
    });

    if (testName) params.append('test_name', testName);
    if (since) params.append('since', since);
    if (until) params.append('until', until);

    const url = `${this.baseUrl}/measurements?${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OONI API error: ${response.statusText}`);
      }

      const data = await response.json();

      logger.info('ooni_measurements_fetched', {
        count: data.results.length,
        test_name: testName,
        probe_cc: 'IR',
      });

      return data.results;
    } catch (error) {
      logger.error('ooni_fetch_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get censorship events (blocking spikes)
   */
  async getCensorshipEvents(): Promise<any[]> {
    // OONI doesn't have a direct "events" endpoint, but we can aggregate measurements
    // to detect censorship spikes

    const measurements = await this.getMeasurements(undefined, undefined, undefined, 500);

    // Group by input (website/app) and calculate anomaly rate
    const inputGroups = new Map<string, { total: number; anomalies: number }>();

    for (const m of measurements) {
      if (!inputGroups.has(m.input)) {
        inputGroups.set(m.input, { total: 0, anomalies: 0 });
      }

      const group = inputGroups.get(m.input)!;
      group.total++;
      if (m.anomaly) group.anomalies++;
    }

    // Find inputs with high anomaly rates (potential blocking)
    const events = [];
    for (const [input, stats] of inputGroups) {
      const anomalyRate = stats.anomalies / stats.total;
      if (anomalyRate > 0.5 && stats.total >= 5) {
        events.push({
          input,
          anomalyRate,
          totalMeasurements: stats.total,
          anomalies: stats.anomalies,
        });
      }
    }

    events.sort((a, b) => b.anomalyRate - a.anomalyRate);

    logger.info('ooni_censorship_events_detected', {
      events_count: events.length,
    });

    return events;
  }
}
```

**OONI Dashboard API**:
```typescript
// app/api/connectivity/ooni/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OONIClient } from '@/lib/ooni-client';
import { logger } from '@/lib/logger';

const ooniClient = new OONIClient();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const testName = searchParams.get('test_name') || undefined;

  try {
    // Get last 24 hours of measurements
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const measurements = await ooniClient.getMeasurements(testName, since);

    // Get censorship events
    const events = await ooniClient.getCensorshipEvents();

    const duration = Date.now() - startTime;
    logger.http('GET', '/api/connectivity/ooni', 200, duration, {
      measurements_count: measurements.length,
      events_count: events.length,
    });

    return NextResponse.json({
      measurements,
      events,
      summary: {
        totalMeasurements: measurements.length,
        anomalies: measurements.filter(m => m.anomaly).length,
        confirmed: measurements.filter(m => m.confirmed).length,
        censorshipEvents: events.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('ooni_api_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('GET', '/api/connectivity/ooni', 500, duration);

    return NextResponse.json(
      { error: 'OONI API request failed' },
      { status: 500 }
    );
  }
}
```

**OONI Dashboard Component**:
```typescript
// app/components/Connectivity/OONIDashboard.tsx
'use client';

import React from 'react';
import useSWR from 'swr';

export function OONIDashboard() {
  const { data, error, isLoading } = useSWR(
    '/api/connectivity/ooni',
    (url) => fetch(url).then(r => r.json()),
    { refreshInterval: 300000 } // Refresh every 5 minutes
  );

  if (isLoading) return <div>Loading OONI data...</div>;
  if (error) return <div className="text-red-600">Failed to load OONI data</div>;

  return (
    <div className="p-6 border rounded bg-white">
      <h2 className="text-2xl font-bold mb-4">📡 OONI Censorship Measurements</h2>
      <p className="text-gray-600 mb-4">
        Real-time censorship measurements from OONI showing what's blocked in Iran.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded">
          <p className="text-2xl font-bold">{data.summary.totalMeasurements}</p>
          <p className="text-sm text-gray-600">Total Measurements (24h)</p>
        </div>
        <div className="bg-orange-100 p-4 rounded">
          <p className="text-2xl font-bold">{data.summary.anomalies}</p>
          <p className="text-sm text-gray-600">Anomalies Detected</p>
        </div>
        <div className="bg-red-100 p-4 rounded">
          <p className="text-2xl font-bold">{data.summary.confirmed}</p>
          <p className="text-sm text-gray-600">Confirmed Blocks</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2">Detected Censorship Events:</h3>
        {data.events.length === 0 ? (
          <p className="text-gray-600">No censorship events detected in the last 24 hours.</p>
        ) : (
          <div className="space-y-2">
            {data.events.map((event: any, idx: number) => (
              <div key={idx} className="border p-4 rounded bg-red-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{event.input}</p>
                    <p className="text-sm text-gray-600">
                      {event.totalMeasurements} measurements, {event.anomalies} anomalies
                    </p>
                  </div>
                  <span className="bg-red-600 text-white px-3 py-1 rounded text-sm">
                    {Math.round(event.anomalyRate * 100)}% Blocked
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Cost Estimate (OONI)

**API Access**: FREE (OONI provides public API with no rate limits)
**Infrastructure**: $0 (uses existing Next.js API routes)

---

### Feature D2: GRIP BGP Hijacking Detection

**Objective**: Monitor BGP hijacking incidents affecting Iranian ISPs.

#### Technical Architecture

**GRIP API Client**:
```typescript
// lib/grip-client.ts
import { logger } from '@/lib/logger';

interface GRIPEvent {
  event_id: string;
  event_type: string;
  start_time: string;
  end_time: string;
  victim_asn: number;
  victim_as_name: string;
  attacker_asn: number;
  attacker_as_name: string;
  prefixes_affected: string[];
  suspicion_level: number;
}

export class GRIPClient {
  private baseUrl = 'https://api.grip.inetintel.cc.gatech.edu/dev/json/events';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Query GRIP for BGP hijacking events affecting Iranian ASNs
   */
  async getIranEvents(
    startTime?: string,
    minSuspicion: number = 60
  ): Promise<GRIPEvent[]> {
    // Major Iranian ISPs
    const iranianAsns = [12880, 8529, 6127, 15418]; // TIC, Omantel, RipeTCI, others

    const params = new URLSearchParams({
      asn: iranianAsns.join(','),
      min_susp: minSuspicion.toString(),
      max_susp: '100',
    });

    if (startTime) {
      params.append('start_time', startTime);
    }

    const url = `${this.baseUrl}?${params}`;

    try {
      const response = await fetch(url, {
        headers: {
          'grips-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`GRIP API error: ${response.statusText}`);
      }

      const events: GRIPEvent[] = await response.json();

      logger.info('grip_events_fetched', {
        count: events.length,
        asns: iranianAsns.join(','),
        min_suspicion: minSuspicion,
      });

      return events;
    } catch (error) {
      logger.error('grip_fetch_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}
```

**GRIP Dashboard API**:
```typescript
// app/api/connectivity/grip/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GRIPClient } from '@/lib/grip-client';
import { logger } from '@/lib/logger';

const gripClient = new GRIPClient(process.env.GRIP_API_KEY!);

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get last 7 days of events
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const events = await gripClient.getIranEvents(since);

    const duration = Date.now() - startTime;
    logger.http('GET', '/api/connectivity/grip', 200, duration, {
      events_count: events.length,
    });

    return NextResponse.json({
      events,
      summary: {
        totalEvents: events.length,
        highSuspicion: events.filter(e => e.suspicion_level >= 80).length,
        mediumSuspicion: events.filter(e => e.suspicion_level >= 60 && e.suspicion_level < 80).length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('grip_api_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('GET', '/api/connectivity/grip', 500, duration);

    return NextResponse.json(
      { error: 'GRIP API request failed' },
      { status: 500 }
    );
  }
}
```

**GRIP Dashboard Component**:
```typescript
// app/components/Connectivity/GRIPDashboard.tsx
'use client';

import React from 'react';
import useSWR from 'swr';

export function GRIPDashboard() {
  const { data, error, isLoading } = useSWR(
    '/api/connectivity/grip',
    (url) => fetch(url).then(r => r.json()),
    { refreshInterval: 600000 } // Refresh every 10 minutes
  );

  if (isLoading) return <div>Loading GRIP data...</div>;
  if (error) return <div className="text-red-600">Failed to load GRIP data</div>;

  return (
    <div className="p-6 border rounded bg-white">
      <h2 className="text-2xl font-bold mb-4">🌐 GRIP BGP Hijacking Detection</h2>
      <p className="text-gray-600 mb-4">
        BGP routing incidents affecting Iranian ISPs.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded">
          <p className="text-2xl font-bold">{data.summary.totalEvents}</p>
          <p className="text-sm text-gray-600">Total Events (7 days)</p>
        </div>
        <div className="bg-orange-100 p-4 rounded">
          <p className="text-2xl font-bold">{data.summary.mediumSuspicion}</p>
          <p className="text-sm text-gray-600">Medium Suspicion</p>
        </div>
        <div className="bg-red-100 p-4 rounded">
          <p className="text-2xl font-bold">{data.summary.highSuspicion}</p>
          <p className="text-sm text-gray-600">High Suspicion</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2">Recent BGP Events:</h3>
        {data.events.length === 0 ? (
          <p className="text-gray-600">No BGP events detected in the last 7 days.</p>
        ) : (
          <div className="space-y-2">
            {data.events.slice(0, 10).map((event: any) => (
              <div key={event.event_id} className="border p-4 rounded bg-orange-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-sm">{event.event_type.toUpperCase()}</p>
                    <p className="text-sm text-gray-600">
                      Victim: {event.victim_as_name} (AS{event.victim_asn})
                    </p>
                    <p className="text-sm text-gray-600">
                      Attacker: {event.attacker_as_name} (AS{event.attacker_asn})
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm ${
                    event.suspicion_level >= 80 ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
                  }`}>
                    {event.suspicion_level}% Suspicion
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Prefixes: {event.prefixes_affected.join(', ')}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Cost Estimate (GRIP)

**API Access**: TBD (contact Georgia Tech for API key and pricing)
**Estimated**: $0-20/month (academic/research use may be free)

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Week 1: IPFS Infrastructure**
- [ ] Set up Pinata account (free tier)
- [ ] Implement IPFS snapshot creation (`lib/ipfs-distributor.ts`)
- [ ] Create snapshot API endpoints (`/api/ipfs/snapshot`)
- [ ] Add automated cron job (6-hour intervals)
- [ ] Test snapshot retrieval from multiple gateways

**Week 2: Offline Snapshots**
- [ ] Implement cryptographic signing (`lib/snapshot-signer.ts`)
- [ ] Generate RSA-4096 key pair (one-time setup)
- [ ] Create downloadable snapshot pack API (`/api/snapshot/download`)
- [ ] Build verification UI component
- [ ] Test signature verification flow

**Week 3: OONI Integration**
- [ ] Implement OONI API client (`lib/ooni-client.ts`)
- [ ] Create OONI dashboard API (`/api/connectivity/ooni`)
- [ ] Build OONI visualization component
- [ ] Add automatic refresh (5-minute intervals)

### Phase 2: Verification Tools (Weeks 4-6)

**Week 4: Media Deduplication**
- [ ] Implement perceptual hashing (`lib/media-deduplicator.ts`)
- [ ] Update image upload endpoint with dedup check
- [ ] Add Firestore schema for media hashes
- [ ] Build deduplication checker UI
- [ ] Test with sample images

**Week 5: Cross-Source Corroboration**
- [ ] Implement corroboration engine (`lib/corroboration-engine.ts`)
- [ ] Create corroboration API (`/api/verify/corroborate`)
- [ ] Build verification dashboard UI
- [ ] Test with real article data

**Week 6: Integration Testing**
- [ ] Test media deduplication with 1000+ images
- [ ] Test corroboration accuracy with known events
- [ ] Performance optimization for large datasets
- [ ] Bug fixes and refinements

### Phase 3: Disinformation Detection (Weeks 7-9)

**Week 7: Coordination Detection**
- [ ] Implement coordination detector (`lib/coordination-detector.ts`)
- [ ] Create detection API (`/api/detect/coordination`)
- [ ] Build coordination dashboard UI
- [ ] Test with sample social media data

**Week 8: GRIP Integration**
- [ ] Obtain GRIP API key
- [ ] Implement GRIP client (`lib/grip-client.ts`)
- [ ] Create GRIP dashboard API
- [ ] Build visualization component

**Week 9: Dashboard Unification**
- [ ] Create unified connectivity dashboard page
- [ ] Integrate OONI + GRIP + coordination detection
- [ ] Add real-time alerts for critical events
- [ ] Performance testing

### Phase 4: Tor & Polish (Weeks 10-12)

**Week 10: Tor Onion Service**
- [ ] Provision VPS (DigitalOcean/Vultr)
- [ ] Install and configure Tor hidden service
- [ ] Set up Nginx reverse proxy to Vercel
- [ ] Test .onion access with Tor Browser

**Week 11: Client-Side Detection & Polish**
- [ ] Add Tor access button/banner
- [ ] Implement IPFS snapshot viewer
- [ ] Add verification dashboard to admin panel
- [ ] UI/UX improvements

**Week 12: Documentation & Deployment**
- [ ] Write user documentation for all features
- [ ] Create admin guide for verification tools
- [ ] Deploy all features to production
- [ ] Monitor and fix any issues

---

## Security Considerations

### Authentication & Authorization

**Current State**: No authentication system

**Recommendations**:
1. **Admin Panel Protection**: Implement admin authentication for:
   - Verification dashboards
   - Coordination detection
   - Media deduplication review

2. **API Rate Limiting**: Prevent abuse of:
   - IPFS snapshot creation (limit to 1/hour per IP)
   - Coordination detection (limit to 10/day per IP)
   - Media upload (limit to 5/hour per IP)

3. **Environment Variables**: All API keys stored in environment variables:
   - `PINATA_API_KEY` / `PINATA_SECRET_KEY`
   - `GRIP_API_KEY`
   - `SNAPSHOT_SIGNING_PRIVATE_KEY` / `SNAPSHOT_SIGNING_PUBLIC_KEY`

### Data Privacy

**Considerations**:
1. **OONI/GRIP Data**: Public data, no privacy concerns
2. **Media Hashes**: Store perceptual hashes only, not original images (privacy-preserving)
3. **Coordination Detection**: Analyze public social media data only (no PII)
4. **Tor Access**: No logging of .onion visitors (privacy-first)

### Cryptographic Security

**Snapshot Signing**:
- Use RSA-4096 (industry standard for long-term security)
- Store private key in HSM or secure environment variable (never commit to Git)
- Rotate keys annually

**IPFS CID Verification**:
- CIDs are cryptographically verifiable (content-addressed)
- No additional verification needed beyond CID matching

---

## Cost Analysis

### Monthly Cost Breakdown

| Service | Current | New | Total |
|---------|---------|-----|-------|
| **Existing Services** | | | |
| Perplexity API | $3.60 | - | $3.60 |
| Twitter/Apify | $7.00 | - | $7.00 |
| Telegram Bot API | $0.00 | - | $0.00 |
| Vercel | $0.00 | - | $0.00 |
| **New Services** | | | |
| IPFS (Pinata Free) | - | $0.00 | $0.00 |
| IPFS (Pinata Paid, if needed) | - | ($20.00) | ($20.00) |
| Tor VPS | - | $6.00 | $6.00 |
| OONI API | - | $0.00 | $0.00 |
| GRIP API | - | $0-20 | $10.00 (est.) |
| **TOTAL (MVP)** | **$10.60** | **+$16.00** | **$26.60** |
| **TOTAL (Full Featured)** | **$10.60** | **+$46.00** | **$56.60** |

### Cost Optimization Strategies

1. **IPFS**: Start with free Pinata tier (sufficient for 6 snapshots/day)
2. **GRIP**: Request academic/research access (may be free)
3. **Tor VPS**: Use cheapest VPS tier ($6/month Vultr/DigitalOcean)
4. **Caching**: Aggressive caching reduces API calls to OONI/GRIP

### Scalability Costs

If usage grows significantly:
- **IPFS Storage**: $20/month (Pinata Picnic) for 100 GB
- **VPS Upgrade**: $12/month for 2 GB RAM (handle more traffic)
- **GRIP API**: Contact for enterprise pricing if needed

**Expected Total at Scale**: $50-70/month (still reasonable)

---

## Next Steps

1. **Immediate (This Week)**:
   - Set up Pinata account
   - Implement IPFS snapshot creation
   - Deploy to production for testing

2. **Short-Term (Next 2 Weeks)**:
   - Complete snapshot signing
   - Integrate OONI dashboard
   - Begin media deduplication implementation

3. **Medium-Term (Next 6 Weeks)**:
   - Complete all verification tools
   - Implement coordination detection
   - Deploy GRIP integration

4. **Long-Term (Next 12 Weeks)**:
   - Complete Tor onion service
   - Full production deployment
   - Monitoring and optimization

---

## Conclusion

This implementation plan transforms the Persian Uprising News application into a censorship-resistant, intelligence-grade platform while maintaining reasonable costs ($26.60-$56.60/month). The phased approach ensures each feature is thoroughly tested before moving to the next, minimizing risk while maximizing impact.

**Key Success Metrics**:
- [ ] IPFS snapshots generated every 6 hours
- [ ] Tor .onion site accessible
- [ ] OONI dashboard showing real-time censorship data
- [ ] Media deduplication catching 80%+ duplicate images
- [ ] Coordination detection identifying bot networks
- [ ] GRIP integration showing BGP incidents

**Risk Mitigation**:
- Start with free/low-cost tiers
- Incremental deployment (test each feature before scaling)
- Security review before production deployment
- Monitoring and alerts for API failures

This plan provides the foundation for truly censorship-resistant news distribution with advanced OSINT capabilities, positioning the application as a critical tool for monitoring political developments in restrictive internet environments.
