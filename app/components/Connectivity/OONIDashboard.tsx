
'use client';

import React from 'react';
import useSWR from 'swr';
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

export function OONIDashboard() {
    const { data, error, isLoading } = useSWR(
        '/api/connectivity/ooni',
        (url) => fetch(url).then(r => r.json()),
        { refreshInterval: 300000 }
    );

    if (isLoading) return <div className="h-64 bg-gray-50 animate-pulse rounded-xl border border-gray-200"></div>;
    if (error) return <div className="text-red-500 p-4 border rounded">Failed to load censorship data.</div>;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-purple-600" />
                    Censorship Awareness (OONI)
                </h2>
                <p className="text-sm text-gray-500">
                    Real-time blocking status of critical communication platforms in Iran.
                    Source: Open Observatory of Network Interference.
                </p>
            </div>

            <div className="grid gap-3">
                {data.summary.map((item: any) => (
                    <div key={item.domain} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${item.status === 'Blocked' ? 'bg-red-100 text-red-600' :
                                    item.status === 'Partial' ? 'bg-orange-100 text-orange-600' :
                                        'bg-green-100 text-green-600'
                                }`}>
                                {item.status === 'Blocked' && <ShieldAlert className="w-5 h-5" />}
                                {item.status === 'Partial' && <ShieldQuestion className="w-5 h-5" />}
                                {item.status === 'Accessible' && <ShieldCheck className="w-5 h-5" />}
                            </div>
                            <div>
                                <span className="font-bold text-gray-900 block">{item.domain}</span>
                                <span className="text-xs text-gray-500">
                                    Tests: {item.total} | Anomalies: {item.blocked}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${item.status === 'Blocked' ? 'bg-red-50 border-red-200 text-red-700' :
                                    item.status === 'Partial' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                                        'bg-green-50 border-green-200 text-green-700'
                                }`}>
                                {item.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-xs text-right text-gray-400">
                Results from last 20 probes (approx 24h)
            </div>
        </div>
    );
}
