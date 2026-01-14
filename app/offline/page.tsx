
import React from 'react';
import { SnapshotViewer } from '@/app/components/IPFS/SnapshotViewer';
import { VerifySnapshot } from '@/app/components/Snapshot/VerifySnapshot';
import { WifiOff, Shield, Download } from 'lucide-react';

export default function OfflinePage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
                    <WifiOff className="w-8 h-8 text-slate-800" />
                    Offline & Resilience Tools
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Access news during internet blackouts using decentralized technology and offline snapshots.
                </p>
            </div>

            <div className="grid gap-8">

                {/* Section 1: Decentralized Content */}
                <section>
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl mb-6">
                        <h2 className="text-2xl font-bold text-blue-900 mb-2">Decentralized Access (IPFS)</h2>
                        <p className="text-blue-800 mb-4">
                            When the main site is blocked, recent news is mirrored on the InterPlanetary File System (IPFS).
                            These links work through multiple public gateways.
                        </p>
                        <SnapshotViewer />
                    </div>
                </section>

                {/* Section 2: Offline Snapshots */}
                <section>
                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Download className="w-6 h-6" />
                            Offline Snapshot Packs
                        </h2>
                        <p className="text-slate-700 mb-6">
                            Download verified news archives to share via USB, Bluetooth, or local networks during total blackouts.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Download Card */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                                <h3 className="font-bold text-lg mb-2">Download Latest Pack</h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    Get a ZIP file containing the last 7 days of news, cryptographically signed for verification.
                                </p>
                                <a
                                    href="/api/snapshot/download"
                                    target="_blank"
                                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                                >
                                    Download Archive (.zip)
                                </a>
                            </div>

                            {/* Verification Component */}
                            <VerifySnapshot />
                        </div>
                    </div>
                </section>

                {/* Section 3: Tor Info */}
                <section>
                    <div className="bg-purple-50 border border-purple-100 p-6 rounded-xl text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <Shield className="w-12 h-12 text-purple-600 flex-shrink-0" />
                            <div>
                                <h2 className="text-xl font-bold text-purple-900">Anonymous Access via Tor</h2>
                                <p className="text-purple-800 text-sm mt-1">
                                    A Tor Onion Service is available for anonymous, censorship-resistant access.
                                    Requires <a href="https://www.torproject.org/" className="underline font-bold" target="_blank">Tor Browser</a>.
                                </p>
                                <div className="mt-3 bg-white p-2 border border-purple-200 rounded font-mono text-sm text-center select-all">
                                    (Onion address will appear here once deployed)
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
