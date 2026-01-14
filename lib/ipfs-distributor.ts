
import Pinata from '@pinata/sdk';
import { logger } from './logger';
import { Article } from './firestore';

interface IPFSConfig {
    gateway: 'pinata' | 'filebase' | 'cloudflare';
    pinataApiKey?: string;
    pinataSecretKey?: string;
    filebaseAccessKey?: string;
    filebaseSecretKey?: string;
}

export class IPFSDistributor {
    private pinata: any = null;

    constructor(private config: IPFSConfig) {
        if (config.gateway === 'pinata') {
            if (!config.pinataApiKey || !config.pinataSecretKey) {
                logger.warn('ipfs_missing_credentials', { provider: 'pinata' });
            } else {
                this.pinata = new Pinata(config.pinataApiKey, config.pinataSecretKey);
            }
        }
    }

    /**
     * Create and pin a snapshot of recent articles to IPFS
     */
    async createSnapshot(articles: Article[]): Promise<{
        cid: string;
        url: string;
        timestamp: number;
        sizeBytes?: number;
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
                        typeof a.publishedAt === 'number' ? a.publishedAt : Date.parse(a.publishedAt as string)
                    )),
                    to: Math.max(...articles.map(a =>
                        typeof a.publishedAt === 'number' ? a.publishedAt : Date.parse(a.publishedAt as string)
                    )),
                }
            }
        };

        const snapshotJson = JSON.stringify(snapshot, null, 2);
        // Approximate size
        const sizeBytes = Buffer.byteLength(snapshotJson, 'utf8');

        if (this.config.gateway === 'pinata' && this.pinata) {
            try {
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
                    sizeBytes
                };
            } catch (error) {
                logger.error('pinata_upload_failed', { error });
                throw error;
            }
        }

        throw new Error('No IPFS provider available (only Pinata supported currently)');
    }

    /**
     * Retrieve snapshot from IPFS by CID
     */
    async getSnapshot(cid: string): Promise<any> {
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
        if (!response.ok) {
            // Try fallback
            const fallback = await fetch(`https://ipfs.io/ipfs/${cid}`);
            if (!fallback.ok) {
                throw new Error(`Failed to retrieve IPFS snapshot: ${response.statusText}`);
            }
            return fallback.json();
        }
        return response.json();
    }

    /**
     * List all pinned snapshots
     */
    async listSnapshots(): Promise<Array<{ cid: string; timestamp: number; size: number }>> {
        if (this.config.gateway === 'pinata' && this.pinata) {
            try {
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
            } catch (err) {
                logger.error('pinata_list_failed', { error: err });
                return [];
            }
        }

        return [];
    }
}
