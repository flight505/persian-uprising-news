'use client';

import React, { useState } from 'react';
import { IODADashboard } from '@/app/components/Connectivity/IODADashboard';
import { CloudflareDashboard } from '@/app/components/Connectivity/CloudflareDashboard';
import { OONIDashboard } from '@/app/components/Connectivity/OONIDashboard';
import { Activity, Radio, Shield, Globe } from 'lucide-react';

export default function ConnectivityPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'censorship' | 'security'>('overview');

    return (
        <div className="w-full min-h-screen bg-background text-foreground pb-20">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8 relative">
                    <div className="absolute -left-4 top-0 w-1 h-full bg-expression-green rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                    <h1 className="text-4xl font-bold mb-3 flex items-center gap-3 text-white tracking-tight">
                        <Activity className="w-8 h-8 text-expression-green" />
                        Internet Connectivity
                    </h1>
                    <p className="text-zinc-400 max-w-3xl text-lg leading-relaxed">
                        Real-time analysis of Iran's internet health using data from global observatories.
                        Verify outage scope and censorship status.
                    </p>
                </div>

                {/* Navigation Tabs - Glass Pill */}
                <div className="flex gap-2 mb-8 p-1 bg-surface-2/50 backdrop-blur-md rounded-full w-fit border border-white/5">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${activeTab === 'overview'
                                ? 'bg-expression-green text-black shadow-lg shadow-expression-green/20'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Activity className="w-4 h-4" />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('censorship')}
                        className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${activeTab === 'censorship'
                                ? 'bg-expression-amber text-black shadow-lg shadow-expression-amber/20'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Globe className="w-4 h-4" />
                        Censorship (OONI)
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${activeTab === 'security'
                                ? 'bg-expression-red text-white shadow-lg shadow-expression-red/20'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Shield className="w-4 h-4" />
                        BGP Security
                    </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8 animate-slide-up">
                        {activeTab === 'overview' && (
                            <>
                                <IODADashboard />
                                <section className="bg-surface-2/30 backdrop-blur border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                                        <Radio className="w-5 h-5 text-expression-green" />
                                        Data Intelligence
                                    </h2>
                                    <ul className="space-y-4 text-sm text-zinc-300 relative z-10">
                                        <li className="flex gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                                            <span className="font-bold text-expression-green whitespace-nowrap">BGP Visibility</span>
                                            <span>Advertised routes. A drop indicates physical cable cuts or router shutdowns.</span>
                                        </li>
                                        <li className="flex gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                                            <span className="font-bold text-expression-amber whitespace-nowrap">Active Probing</span>
                                            <span>Ping response rate. A drop suggests active filtering or "Digital Curfew".</span>
                                        </li>
                                    </ul>
                                </section>
                            </>
                        )}

                        {activeTab === 'censorship' && (
                            <OONIDashboard />
                        )}

                        {activeTab === 'security' && (
                            <CloudflareDashboard />
                        )}
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6 animate-slide-in-right">
                        <div className="bg-surface-2/30 backdrop-blur p-6 rounded-2xl border border-white/5 shadow-xl">
                            <h3 className="font-bold text-zinc-400 mb-4 text-xs uppercase tracking-wider">Network Status</h3>
                            <div className="space-y-4">
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-zinc-400 mb-1">Internet Availability</p>
                                    <p className="text-xl font-bold text-expression-green flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-expression-green animate-pulse"></span>
                                        Stable
                                    </p>
                                </div>
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-zinc-400 mb-1">Social Media Blocked</p>
                                    <p className="text-xl font-bold text-expression-red">4/5 Major Platforms</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
