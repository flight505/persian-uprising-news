
'use client';

import React from 'react';
import useSWR from 'swr';
import { NetworkGraph } from '@/app/components/Admin/NetworkGraph';
import { Users, Share2, AlertOctagon, BrainCircuit } from 'lucide-react';

export function DisinformationDashboard() {
    const { data, error, isLoading } = useSWR(
        '/api/disinformation/analyze',
        (url) => fetch(url).then(r => r.json()),
        { refreshInterval: 60000 }
    );

    if (isLoading) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl"></div>;
    if (error) return <div className="text-red-500">Failed to load analysis.</div>;

    const { coordinationGroups } = data || {};

    if (!coordinationGroups || coordinationGroups.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                <BrainCircuit className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-900 font-medium">No coordinated activity detected</h3>
                <p className="text-gray-500 text-sm mt-1">
                    Analysis of the last 24h shows no clear signs of scripted bot activity.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertOctagon className="w-6 h-6 text-red-600" />
                Detected Coordinated Campaigns
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="col-span-2">
                    <NetworkGraph data={data} />
                </div>

                {coordinationGroups.map((group: any) => (
                    <div key={group.id} className="bg-red-50 border border-red-200 rounded-xl p-5">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-red-900 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Bot Network #{group.id.split('-').pop()}
                                </h3>
                                <p className="text-sm text-red-700 mt-1">
                                    {group.incidentIds.length} accounts posting identical content within an hour.
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
                                    {group.confidence}% Confidence
                                </span>
                            </div>
                        </div>

                        <div className="bg-white p-3 rounded border border-red-100 mb-3">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Shared Content Detected:</p>
                            <p className="text-sm text-gray-800 italic">"{group.sharedContentSample}"</p>
                        </div>

                        <div className="flex gap-2">
                            <button className="text-xs bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 font-medium flex items-center gap-1">
                                <AlertOctagon className="w-3 h-3" />
                                Purge All {group.incidentIds.length} Reports
                            </button>
                            <button className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50 font-medium flex items-center gap-1">
                                <Share2 className="w-3 h-3" />
                                Visualize Network
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
