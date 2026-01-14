
'use client';

import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, FileArchive, ShieldCheck, Loader2 } from 'lucide-react';

export function VerifySnapshot() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{
        verified: boolean;
        message: string;
        details?: any;
    } | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setVerificationResult(null);
        }
    };

    const verifySignature = async () => {
        if (!file) return;

        setLoading(true);
        setVerificationResult(null);

        try {
            // Import JSZip dynamically to avoid large initial bundle
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(file);

            const snapshotJson = await zip.file('snapshot.json')?.async('string');
            const signature = await zip.file('signature.txt')?.async('string');
            const publicKey = await zip.file('public_key.pem')?.async('string');

            if (!snapshotJson || !signature || !publicKey) {
                throw new Error('Invalid snapshot pack structure. Missing critical files.');
            }

            // Send to server for verification
            const response = await fetch('/api/snapshot/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snapshot: JSON.parse(snapshotJson),
                    signature,
                    publicKey,
                }),
            });

            if (!response.ok) {
                throw new Error(`Server verification failed: ${response.statusText}`);
            }

            const result = await response.json();
            const snapshotData = JSON.parse(snapshotJson);

            setVerificationResult({
                verified: result.verified,
                message: result.verified
                    ? 'Authenticated Snapshot: Signature is valid and untouched.'
                    : 'Verification Failed: Signature does not match content.',
                details: {
                    articleCount: snapshotData.articles?.length,
                    timestamp: snapshotData.timestamp,
                },
            });
        } catch (error) {
            setVerificationResult({
                verified: false,
                message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-green-600" />
                Verify Offline Snapshot
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
                If you received a snapshot pack via USB or Bluetooth, upload it here to verify it originated from a trusted source and hasn't been tampered with.
            </p>

            <div className="mb-6">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">ZIP archive (max 50MB)</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept=".zip"
                        onChange={handleFileChange}
                    />
                </label>
            </div>

            {file && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">
                    <FileArchive className="w-4 h-4" />
                    <span className="font-medium truncate">{file.name}</span>
                    <span className="text-xs opacity-70">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
            )}

            <button
                onClick={verifySignature}
                disabled={!file || loading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying Signature...
                    </>
                ) : (
                    'Verify Cryptographic Signature'
                )}
            </button>

            {verificationResult && (
                <div className={`mt-6 p-4 rounded-lg border flex items-start gap-3 ${verificationResult.verified ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
                    }`}>
                    {verificationResult.verified ? <CheckCircle className="w-6 h-6 flex-shrink-0 text-green-600" /> : <XCircle className="w-6 h-6 flex-shrink-0 text-red-600" />}
                    <div>
                        <p className="font-bold text-lg mb-1">
                            {verificationResult.verified ? 'Verified Authentic' : 'Verification Failed'}
                        </p>
                        <p className="text-sm opacity-90 mb-2">{verificationResult.message}</p>

                        {verificationResult.details && (
                            <div className="mt-2 pt-2 border-t border-black/10 text-sm grid grid-cols-2 gap-x-8 gap-y-1">
                                <div>
                                    <span className="opacity-70">Content:</span> <span className="font-medium">{verificationResult.details.articleCount} Articles</span>
                                </div>
                                <div>
                                    <span className="opacity-70">Generated:</span> <span className="font-medium">{new Date(verificationResult.details.timestamp).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
