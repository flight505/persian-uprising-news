'use client';

import { useEffect } from 'react';

interface Incident {
  id: string;
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  images?: string[];
  verified: boolean;
  reportedBy: 'crowdsource' | 'official';
  timestamp: number;
  upvotes: number;
  createdAt: number;
  relatedArticles?: Array<{
    title: string;
    url: string;
    source: string;
  }>;
  confidence?: number;
  keywords?: string[];
}

interface IncidentModalProps {
  incident: Incident | null;
  onClose: () => void;
  onVerify?: (incidentId: string) => void;
  isAdmin?: boolean;
}

export default function IncidentModal({
  incident,
  onClose,
  onVerify,
  isAdmin = false,
}: IncidentModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (incident) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [incident, onClose]);

  if (!incident) return null;

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      protest: 'Protest',
      arrest: 'Arrest',
      injury: 'Injury',
      death: 'Casualty',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      protest: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      arrest: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      injury: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      death: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100',
      other: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    return colors[type] || colors.other;
  };

  const shareOnTwitter = () => {
    const text = `${incident.title} - ${incident.location.address || 'Iran'}`;
    const url = window.location.href;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank'
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(incident.type)}`}>
              {getTypeLabel(incident.type)}
            </span>
            {incident.verified ? (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✓ Verified
              </span>
            ) : (
              <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                ⏳ Pending Verification
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {incident.title}
          </h2>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Location</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {incident.location.address || 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {incident.location.lat.toFixed(4)}, {incident.location.lon.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Time</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatTimestamp(incident.timestamp)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Source</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {incident.reportedBy === 'official' ? '🔵 Official' : '👤 Crowdsourced'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Engagement</p>
              <p className="font-medium text-gray-900 dark:text-white">
                👍 {incident.upvotes} upvotes
              </p>
            </div>
          </div>

          {/* Confidence Score (if available) */}
          {incident.confidence && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Extraction Confidence</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    incident.confidence >= 80
                      ? 'bg-green-500'
                      : incident.confidence >= 60
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${incident.confidence}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {incident.confidence}% confidence
              </p>
            </div>
          )}

          {/* Keywords (if available) */}
          {incident.keywords && incident.keywords.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Keywords Detected</p>
              <div className="flex flex-wrap gap-2">
                {incident.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Images */}
          {incident.images && incident.images.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Images</p>
              <div className="grid grid-cols-2 gap-2">
                {incident.images.map((imageUrl, idx) => (
                  <img
                    key={idx}
                    src={imageUrl}
                    alt={`Incident ${idx + 1}`}
                    className="w-full h-48 object-cover rounded cursor-pointer hover:opacity-80 transition"
                    onClick={() => window.open(imageUrl, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Related Articles */}
          {incident.relatedArticles && incident.relatedArticles.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Related Articles</p>
              <div className="space-y-2">
                {incident.relatedArticles.map((article, idx) => (
                  <a
                    key={idx}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                  >
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {article.source}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Social Share */}
          <div className="mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Share</p>
            <div className="flex gap-2">
              <button
                onClick={shareOnTwitter}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm font-medium"
              >
                Share on Twitter
              </button>
              <button
                onClick={copyLink}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm font-medium"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && !incident.verified && onVerify && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onVerify(incident.id)}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                ✓ Verify Incident
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Incident ID: {incident.id} • Reported {formatTimestamp(incident.createdAt || incident.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}
