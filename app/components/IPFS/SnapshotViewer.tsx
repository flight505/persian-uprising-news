
'use client';

import React from 'react';
import useSWR from 'swr';
import { Download, ExternalLink, Clock, Database } from 'lucide-react';

interface Snapshot {
    cid: string;
    url: string;
    timestamp: number;
    articleCount: number;
    sizeBytes?: number;
}

export function SnapshotViewer() {
    const { data: snapshots, error, isLoading } = useSWR<{ snapshots: Snapshot[] }>(
        '/api/ipfs/snapshot',
        (url) => fetch(url).then(r => r.json()),
        { refreshInterval: 60000 }
    );

    const formatBytes = (bytes?: number) => {
        if (!bytes) return 'Unknown size';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (isLoading) {
        return <div className="p-4 text-gray-500 text-center animate-pulse">Loading distributed snapshots...</div>;
    }

    if (error) return <div className="text-red-600 p-4 border border-red-200 rounded">Unable to load unauthorized snapshots.</div>;

    if (!snapshots || snapshots.snapshots.length === 0) return (
        <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
            <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No decentralized snapshots available yet.</p>
        </div>
    );

    return (
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-600" />
                        Latest IPFS Snapshots
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Access news via decentralized IPFS gateways if main site is blocked.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {snapshots.snapshots.map((snapshot) => (
                    <div key={snapshot.cid} className="border border-gray-200 p-4 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200 truncate max-w-[200px]" title={snapshot.cid}>
                                        CID: {snapshot.cid.substring(0, 12)}...
                                    </span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(snapshot.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-700 font-medium">
                                    {snapshot.articleCount} Articles • {formatBytes(snapshot.sizeBytes)}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={snapshot.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Open Gateway
                                </a>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Alternative Mirrors:</p>
                            <div className="flex gap-3 flex-wrap">
                                <a
                                    href={`https://ipfs.io/ipfs/${snapshot.cid}`}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    ipfs.io
                                </a>
                                <span className="text-gray-300">|</span>
                                <a
                                    href={`https://cloudflare-ipfs.com/ipfs/${snapshot.cid}`}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Cloudflare
                                </a>
                                <span className="text-gray-300">|</span>
                                <a
                                    href={`https://dweb.link/ipfs/${snapshot.cid}`}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
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
