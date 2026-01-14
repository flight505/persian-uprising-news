'use client';

import React, { useState } from 'react';
import { IODADashboard } from '@/app/components/Connectivity/IODADashboard';
import { CloudflareDashboard } from '@/app/components/Connectivity/CloudflareDashboard';
import { OONIDashboard } from '@/app/components/Connectivity/OONIDashboard';
import { Activity, Radio, Shield, Globe } from 'lucide-react';

export default function ConnectivityPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'censorship' | 'security'>('overview');

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-600" />
                    Internet Connectivity Monitor
                </h1>
                <p className="text-gray-600 max-w-3xl">
                    Real-time analysis of Iran's internet health using data from global observatories.
                    Use this dashboard to verify if outages are local or nationwide.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Activity className="w-4 h-4" />
                    Overview & Outages
                </button>
                <button
                    onClick={() => setActiveTab('censorship')}
                    className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'censorship' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Globe className="w-4 h-4" />
                    Censorship (OONI)
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Shield className="w-4 h-4" />
                    BGP Security
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {activeTab === 'overview' && (
                        <>
                            <IODADashboard />
                            <section className="bg-slate-50 border border-slate-200 p-6 rounded-lg">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Radio className="w-5 h-5 text-slate-700" />
                                    How to read this data
                                </h2>
                                <ul className="space-y-3 text-sm text-slate-700">
                                    <li className="flex gap-2">
                                        <span className="font-bold text-blue-600">BGP Visibility:</span>
                                        <span>Shows if ISPs are advertising their routes to the world. A drop means cables are cut or routers are turned off.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-green-600">Active Probing:</span>
                                        <span>Can we "ping" computers inside Iran? A drop usually means filtering or deeper throttling is active (Digital Curfew).</span>
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
                <div className="space-y-6">
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-2 text-sm uppercase">Quick Stats</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-blue-600">Internet Availability</p>
                                <p className="text-xl font-bold text-blue-900">Normal</p>
                            </div>
                            <div>
                                <p className="text-xs text-blue-600">Social Media Blocked</p>
                                <p className="text-xl font-bold text-blue-900">4/5 Major Platforms</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
