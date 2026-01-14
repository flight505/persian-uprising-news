
'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react';

export function TorBanner() {
    const [isOnion, setIsOnion] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    // Placeholder for real .onion address (would come from env var or config)
    const ONION_ADDRESS = process.env.NEXT_PUBLIC_ONION_ADDRESS || 'riseup7...v2.onion';

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnion(window.location.hostname.endsWith('.onion'));
        }
    }, []);

    if (!isVisible) return null;

    if (isOnion) {
        return (
            <div className="bg-purple-900 text-purple-100 px-4 py-2 text-sm font-medium flex justify-between items-center text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start w-full gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span>You are securely connected via Tor Onion Service.</span>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-purple-300 hover:text-white ml-4"
                >
                    ×
                </button>
            </div>
        );
    }

    // If on clear web, suggest Tor for better security in high-risk zones
    return (
        <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs md:text-sm font-medium border-b border-slate-700">
            <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-yellow-500" />
                    <span>Accessing from Iran? Use our Tor Onion Service for anonymity.</span>
                </div>

                <div className="flex items-center gap-4">
                    <code className="bg-black/30 px-2 py-0.5 rounded text-slate-400 font-mono select-all">
                        {ONION_ADDRESS}
                    </code>
                    <a
                        href={`http://${ONION_ADDRESS}`}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Switch <ArrowRight className="w-3 h-3" />
                    </a>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-slate-500 hover:text-slate-300"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    );
}
