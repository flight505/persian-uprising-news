
'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { CheckCircle, XCircle, AlertTriangle, MapPin, Clock, Image as ImageIcon } from 'lucide-react';

interface ComponentProps {
    onVerify?: (id: string, status: boolean) => void;
}

export function VerificationWorkbench({ onVerify }: ComponentProps) {
    // Mock data for prototype - in real app, fetch from /api/verification/queue
    const [incidents, setIncidents] = useState([
        {
            id: '1',
            title: 'Protest in Vanak Square',
            timestamp: Date.now() - 3600000,
            location: 'Tehran',
            confidenceScore: 85,
            similarCount: 4,
            hasDuplicateMedia: true,
            imageUrl: 'https://placehold.co/600x400/png'
        },
        {
            id: '2',
            title: 'Reporting internet outage in Karaj',
            timestamp: Date.now() - 7200000,
            location: 'Karaj',
            confidenceScore: 45,
            similarCount: 1,
            hasDuplicateMedia: false,
            imageUrl: 'https://placehold.co/600x400/png'
        }
    ]);

    const handleAction = (id: string, approved: boolean) => {
        // Optimistic UI update
        setIncidents(prev => prev.filter(i => i.id !== id));
        if (onVerify) onVerify(id, approved);
    };

    if (incidents.length === 0) {
        return (
            <div className="p-12 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
                <p className="text-gray-500">No pending reports require verification.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                Verification Queue ({incidents.length})
            </h2>

            <div className="grid gap-6">
                {incidents.map(incident => (
                    <div key={incident.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                        {/* Media Section */}
                        <div className="w-full md:w-1/3 bg-gray-100 relative group">
                            <img
                                src={incident.imageUrl}
                                alt="Report media"
                                className="w-full h-48 md:h-full object-cover"
                            />
                            {incident.hasDuplicateMedia && (
                                <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    Duplicate Media
                                </div>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{incident.title}</h3>
                                    <div className="flex gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" /> {incident.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" /> {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end">
                                    <div className={`text-2xl font-black ${incident.confidenceScore > 80 ? 'text-green-600' :
                                            incident.confidenceScore > 50 ? 'text-yellow-600' : 'text-red-500'
                                        }`}>
                                        {incident.confidenceScore}%
                                    </div>
                                    <span className="text-xs uppercase tracking-wide text-gray-400 font-bold">Confidence</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg mb-6 text-sm">
                                <h4 className="font-semibold text-slate-700 mb-2">Automated Analysis:</h4>
                                <ul className="space-y-1 text-slate-600">
                                    <li className="flex items-center gap-2">
                                        {incident.similarCount > 2 ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-gray-400" />}
                                        Corroborated by {incident.similarCount} other nearby reports
                                    </li>
                                    <li className="flex items-center gap-2">
                                        {incident.hasDuplicateMedia ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                                        {incident.hasDuplicateMedia ? 'Image appears in other reports (Scanning for reposts)' : 'Media appears unique'}
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleAction(incident.id, true)}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Verify & Publish
                                </button>
                                <button
                                    onClick={() => handleAction(incident.id, false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold transition-colors"
                                >
                                    Dismiss
                                </button>
                                <button className="px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-lg font-semibold transition-colors">
                                    Flag Fake
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
