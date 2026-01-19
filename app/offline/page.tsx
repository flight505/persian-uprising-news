
import React from 'react';
import { SnapshotViewer } from '@/app/components/IPFS/SnapshotViewer';
import { VerifySnapshot } from '@/app/components/Snapshot/VerifySnapshot';
import { WifiOff, Shield, Download } from 'lucide-react';

export default function OfflinePage() {
    return (
        <div className="w-full min-h-screen bg-background text-foreground pb-20">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-12 text-center relative">
                    <div className="inline-flex items-center justify-center p-4 bg-surface-2/50 rounded-full mb-4 ring-1 ring-white/10 shadow-2xl">
                        <WifiOff className="w-10 h-10 text-zinc-400" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 text-white tracking-tight">
                        Offline & Resilience Tools
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Access news during internet blackouts using decentralized technology and verified offline snapshots.
                    </p>
                </div>

                <div className="grid gap-8">
                    {/* Section 1: Decentralized Content */}
                    <section className="bg-surface-2/30 backdrop-blur border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-expression-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h2 className="text-2xl font-bold text-expression-green mb-3 flex items-center gap-2 relative z-10">
                            <span className="w-2 h-2 rounded-full bg-expression-green animate-pulse"></span>
                            Decentralized Access (IPFS)
                        </h2>
                        <p className="text-zinc-300 mb-6 relative z-10 max-w-2xl">
                            When the main site is blocked, recent news is mirrored on the InterPlanetary File System (IPFS).
                            These links work through multiple public gateways, making them resistant to single-point-of-failure censorship.
                        </p>
                        <div className="relative z-10">
                            <SnapshotViewer />
                        </div>
                    </section>

                    {/* Section 2: Offline Snapshots */}
                    <section className="bg-surface-1/50 backdrop-blur border border-white/5 p-8 rounded-3xl shadow-xl">
                        <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-3">
                            <Download className="w-6 h-6 text-expression-amber" />
                            Offline Snapshot Packs
                        </h2>
                        <p className="text-zinc-400 mb-8">
                            Download verified news archives to share via USB, Bluetooth, or local networks during total blackouts.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Download Card */}
                            <div className="bg-black/40 p-6 rounded-2xl border border-white/10 hover:border-expression-amber/30 transition-colors group">
                                <h3 className="font-bold text-lg mb-2 text-white group-hover:text-expression-amber transition-colors">Latest Archive</h3>
                                <p className="text-sm text-zinc-500 mb-6">
                                    Last 7 days of news, cryptographically signed.
                                </p>
                                <a
                                    href="/api/snapshot/download"
                                    target="_blank"
                                    className="block w-full text-center bg-white text-black hover:bg-expression-amber hover:scale-[1.02] font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-white/10"
                                >
                                    Download Pack (.zip)
                                </a>
                            </div>

                            {/* Verification Component */}
                            <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                                <VerifySnapshot />
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Tor Info */}
                    <section className="bg-surface-2/30 backdrop-blur border border-purple-500/20 p-8 rounded-3xl relative overflow-hidden">
                        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                            <div className="p-4 bg-purple-500/10 rounded-full ring-1 ring-purple-500/30">
                                <Shield className="w-12 h-12 text-purple-400" />
                            </div>
                            <div className="text-center md:text-left">
                                <h2 className="text-xl font-bold text-purple-300">Anonymous Access via Tor</h2>
                                <p className="text-zinc-400 text-sm mt-2 max-w-xl">
                                    Access our Onion Service for enhanced privacy and circumvention.
                                    Requires <a href="https://www.torproject.org/" className="text-purple-400 underline hover:text-purple-300" target="_blank">Tor Browser</a>.
                                </p>
                                <div className="mt-4 bg-black/50 p-3 border border-purple-500/30 rounded-xl font-mono text-sm text-purple-200/80 mx-auto md:mx-0 w-fit select-all">
                                    (Onion address dependent on deployment)
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
