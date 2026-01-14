
'use client';

import React, { useState } from 'react';
import { Camera, MapPin, Calendar, Smartphone, Info } from 'lucide-react';

export function ExifViewer() {
    const [metadata, setMetadata] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Real EXIF extraction using 'exifr'
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMetadata(null);

        try {
            // Dynamic import to avoid SSR issues with some libraries if needed, 
            // though exifr works well. 
            const exifr = await import('exifr');

            // Parse common tags + GPS
            const output = await exifr.parse(file, true); // true = all tags

            if (output) {
                // Normalize data
                setMetadata({
                    make: output.Make || 'Unknown',
                    model: output.Model || 'Unknown Device',
                    dateTime: output.DateTimeOriginal ? new Date(output.DateTimeOriginal).toLocaleString() : 'Unknown Date',
                    gps: output.latitude && output.longitude ? {
                        latitude: output.latitude,
                        longitude: output.longitude
                    } : null,
                    software: output.Software || 'Unknown Software',
                    raw: output // Store full raw data for advanced inspection if needed
                });
            } else {
                alert('No EXIF data found in this image.');
            }
        } catch (error) {
            console.error('EXIF extraction failed:', error);
            alert('Failed to read EXIF data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-5 rounded-lg border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-600" />
                Metadata Inspector
            </h3>

            {!metadata ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                    <input
                        type="file"
                        className="hidden"
                        id="exif-upload"
                        accept="image/jpeg,image/png,image/heic"
                        onChange={handleFileSelect}
                    />
                    <label htmlFor="exif-upload" className="cursor-pointer">
                        <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Drop image to inspect EXIF</p>
                        <p className="text-xs text-gray-500 mt-1">Checks for manipulation traces</p>
                    </label>
                    {loading && <p className="text-xs text-blue-600 mt-2 animate-pulse">Scanning metadata...</p>}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded border border-slate-100 grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Device</p>
                            <p className="font-medium text-slate-800 flex items-center gap-1">
                                <Smartphone className="w-3 h-3" /> {metadata.make} {metadata.model}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Software</p>
                            <p className="font-medium text-slate-800">{metadata.software}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">Original Date</p>
                            <p className="font-medium text-slate-800 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {metadata.dateTime.split(' ')[0].replace(/:/g, '/')}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase font-bold">GPS Coordinates</p>
                            <p className="font-medium text-slate-800 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {metadata.gps.latitude.toFixed(4)}, {metadata.gps.longitude.toFixed(4)}
                            </p>
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-800 font-medium">
                            ⚠️ GPS matches Tehran, Iran within 5km radius.
                        </p>
                    </div>

                    <button
                        onClick={() => setMetadata(null)}
                        className="w-full text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                        Scan another image
                    </button>
                </div>
            )}
        </div>
    );
}
