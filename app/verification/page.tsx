'use client';

import React, { useState } from 'react';
import { VerificationWorkbench } from '@/app/components/Admin/VerificationWorkbench';
import { DisinformationDashboard } from '@/app/components/Admin/DisinformationDashboard';
import { ExifViewer } from '@/app/components/Admin/ExifViewer';
import { ShieldCheck, Search, Database, Bot } from 'lucide-react';

export default function VerificationPage() {
    const [activeTab, setActiveTab] = useState<'verification' | 'disinformation'>('verification');

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <ShieldCheck className="w-10 h-10 text-slate-800" />
                    OSINT Verification Workbench
                </h1>
                <p className="text-gray-600 max-w-3xl">
                    Tools for cross-referencing citizen reports, deduplicating media, and identifying coordinated disinformation.
                </p>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Sidebar Tools */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5 text-blue-600" />
                            Quick Tools
                        </h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setActiveTab('verification')}
                                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors font-medium border-l-4 ${activeTab === 'verification' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-transparent text-gray-700 hover:bg-gray-100'}`}
                            >
                                Verification Queue
                            </button>
                            <button
                                onClick={() => setActiveTab('disinformation')}
                                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors font-medium border-l-4 ${activeTab === 'disinformation' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-transparent text-gray-700 hover:bg-gray-100'}`}
                            >
                                Disinformation Analysis
                            </button>
                            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors border-l-4 border-transparent">
                                Crowd-Sourced Corroboration
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-2 text-sm uppercase tracking-wide">System Status</h3>
                        <ul className="space-y-2 text-xs text-blue-800">
                            <li className="flex justify-between">
                                <span>Pending Reports:</span>
                                <span className="font-bold">2</span>
                            </li>
                            <li className="flex justify-between">
                                <span>Avg. Confidence:</span>
                                <span className="font-bold">65%</span>
                            </li>
                        </ul>
                    </div>

                    <ExifViewer />
                </div>

                {/* Main Workspace */}
                <div className="lg:col-span-3">
                    {activeTab === 'verification' ? <VerificationWorkbench /> : <DisinformationDashboard />}
                </div>
            </div>
        </div>
    );
}
