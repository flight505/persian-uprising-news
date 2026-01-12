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

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${incident.title} - ${incident.location.address || 'Iran'}`;

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const shareOnTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const shareOnWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'width=550,height=420'
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    // Show a nicer toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-[10001]';
    toast.textContent = '✓ Link copied!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black bg-opacity-50"
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Share</p>
            <div className="flex gap-3 justify-center">
              {/* Twitter/X */}
              <button
                onClick={shareOnTwitter}
                title="Share on Twitter/X"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-black hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all transform hover:scale-110"
              >
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              {/* Telegram */}
              <button
                onClick={shareOnTelegram}
                title="Share on Telegram"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0088cc] hover:bg-[#006699] transition-all transform hover:scale-110"
              >
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.098.155.23.171.324.016.093.036.306.02.472z"/>
                </svg>
              </button>

              {/* WhatsApp */}
              <button
                onClick={shareOnWhatsApp}
                title="Share on WhatsApp"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20BD5C] transition-all transform hover:scale-110"
              >
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </button>

              {/* Facebook */}
              <button
                onClick={shareOnFacebook}
                title="Share on Facebook"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1877F2] hover:bg-[#145DBF] transition-all transform hover:scale-110"
              >
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              {/* Copy Link */}
              <button
                onClick={copyLink}
                title="Copy link"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-all transform hover:scale-110"
              >
                <svg className="w-5 h-5 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
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
