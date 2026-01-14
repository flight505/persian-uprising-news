
'use client';

import React from 'react';
import useSWR from 'swr';
import { ShieldAlert, Globe, Activity } from 'lucide-react';

export function CloudflareDashboard() {
    const { data, error, isLoading } = useSWR(
        '/api/connectivity/cloudflare-radar',
        (url) => fetch(url).then(r => r.json()),
        { refreshInterval: 600000 } // 10 min
    );

    if (isLoading) return <div className="h-32 bg-gray-50 animate-pulse rounded-lg bg-opacity-50"></div>;

    if (error || !data) return null;

    const { hijacks, leaks } = data;
    const hasIncidents = (hijacks?.length > 0) || (leaks?.length > 0);

    if (!hasIncidents) {
        return (
            <div className="bg-green-50 border border-green-100 p-4 rounded-lg flex items-center gap-3">
                <Globe className="w-5 h-5 text-green-600" />
                <div>
                    <p className="text-green-900 font-medium">BGP Routing Stable</p>
                    <p className="text-green-700 text-xs">No hijacks or route leaks detected for major Iranian ISPs in the last 7 days.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {hijacks?.map((hijack: any, i: number) => (
                <div key={i} className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h3 className="text-red-800 font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
                        <ShieldAlert className="w-4 h-4" />
                        BGP Hijack Detected
                    </h3>
                    <div className="mt-2 text-sm text-red-900 grid grid-cols-2 gap-2">
                        <div>
                            <span className="opacity-70 text-xs block">Victim (Original):</span>
                            <span className="font-mono">{hijack.victim_as?.name} (AS{hijack.victim_as?.asn})</span>
                        </div>
                        <div>
                            <span className="opacity-70 text-xs block">Attacker/Error:</span>
                            <span className="font-mono">{hijack.violator_as?.name} (AS{hijack.violator_as?.asn})</span>
                        </div>
                    </div>
                    <p className="text-xs text-red-700 mt-2">
                        Detected: {new Date(hijack.time).toLocaleString()}
                    </p>
                </div>
            ))}

            {leaks?.map((leak: any, i: number) => (
                <div key={i} className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <h3 className="text-orange-800 font-bold flex items-center gap-2 text-sm uppercase tracking-wide">
                        <Activity className="w-4 h-4" />
                        Route Leak Detected
                    </h3>
                    <p className="text-xs text-orange-900 mt-1">
                        Route leak involving AS{leak.origin_as?.asn} ({leak.origin_as?.name}).
                    </p>
                </div>
            ))}
        </div>
    );
}
