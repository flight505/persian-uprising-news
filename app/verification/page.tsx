'use client';

import React, { useState } from 'react';
import { VerificationWorkbench } from '@/app/components/Admin/VerificationWorkbench';
import { DisinformationDashboard } from '@/app/components/Admin/DisinformationDashboard';
import { ExifViewer } from '@/app/components/Admin/ExifViewer';
import { ShieldCheck, Search, Database, Bot } from 'lucide-react';

export default function VerificationPage() {
    const [activeTab, setActiveTab] = useState<'verification' | 'disinformation'>('verification');

    return (
        <div className="w-full min-h-screen bg-background text-foreground pb-20">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mb-8 relative pl-6 border-l-4 border-expression-amber">
                    <h1 className="text-4xl font-bold mb-3 flex items-center gap-3 text-white tracking-tight">
                        <ShieldCheck className="w-10 h-10 text-expression-amber" />
                        Verification Workbench
                    </h1>
                    <p className="text-zinc-400 max-w-3xl text-lg">
                        Cross-reference citizen reports, deduplicate media, and identify coordinated disinformation campaigns.
                    </p>
                </div>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Sidebar Tools */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-surface-2/30 backdrop-blur p-5 rounded-2xl border border-white/5 shadow-xl">
                            <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Search className="w-4 h-4 text-expression-amber" />
                                Operations
                            </h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('verification')}
                                    className={`w-full text-left px-4 py-3 text-sm rounded-xl transition-all font-medium border-l-2 ${activeTab === 'verification'
                                        ? 'bg-expression-amber/20 border-expression-amber text-expression-amber shadow-lg shadow-expression-amber/10'
                                        : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    Verification Queue
                                </button>
                                <button
                                    onClick={() => setActiveTab('disinformation')}
                                    className={`w-full text-left px-4 py-3 text-sm rounded-xl transition-all font-medium border-l-2 ${activeTab === 'disinformation'
                                        ? 'bg-expression-red/20 border-expression-red text-expression-red shadow-lg shadow-expression-red/10'
                                        : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    Disinformation Analysis
                                </button>
                                <button className="w-full text-left px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors border-l-2 border-transparent">
                                    Crowd-Sourced Corroboration
                                </button>
                            </div>
                        </div>

                        <div className="bg-black/20 p-5 rounded-2xl border border-expression-green/20">
                            <h3 className="font-bold text-expression-green mb-3 text-xs uppercase tracking-wide flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-expression-green animate-pulse"></span>
                                System Status
                            </h3>
                            <ul className="space-y-3 text-xs text-zinc-400">
                                <li className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <span>Pending Reports</span>
                                    <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">2</span>
                                </li>
                                <li className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                                    <span>Avg. Confidence</span>
                                    <span className="font-mono font-bold text-expression-amber">65%</span>
                                </li>
                            </ul>
                        </div>

                        <ExifViewer />
                    </div>

                    {/* Main Workspace */}
                    <div className="lg:col-span-3">
                        <div className="bg-surface-1/50 backdrop-blur border border-white/5 rounded-3xl p-1 shadow-2xl min-h-[600px]">
                            {activeTab === 'verification' ? <VerificationWorkbench /> : <DisinformationDashboard />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
