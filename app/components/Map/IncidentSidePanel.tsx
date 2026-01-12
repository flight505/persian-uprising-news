'use client';

import { useEffect } from 'react';
import TweetEmbed from './TweetEmbed';
import TelegramEmbed from './TelegramEmbed';

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
  // Media embedding support
  twitterUrl?: string;
  telegramUrl?: string;
  alternateUrl?: string;
  mediaUrls?: string[];
  embedType?: 'twitter' | 'telegram' | 'image' | 'video';
  tags?: string[];
}

interface IncidentSidePanelProps {
  incident: Incident | null;
  onClose: () => void;
}

export default function IncidentSidePanel({ incident, onClose }: IncidentSidePanelProps) {
  useEffect(() => {
    if (incident) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [incident]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && incident) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [incident, onClose]);

  if (!incident) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'protest': return 'bg-red-500';
      case 'arrest': return 'bg-amber-500';
      case 'injury': return 'bg-orange-500';
      case 'death': return 'bg-red-600';
      default: return 'bg-indigo-500';
    }
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

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / 60000);
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
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
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-[10002]';
    toast.textContent = '✓ Link copied!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <>
      {/* Backdrop - only visible on mobile */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] md:hidden"
        onClick={onClose}
      />

      {/* Desktop: Right side panel | Mobile: Bottom sheet */}
      <div
        className={`
          fixed z-[9999] bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto

          /* Desktop - Right side panel */
          md:top-0 md:right-0 md:h-full md:w-[450px]
          md:animate-slide-in-right

          /* Mobile - Bottom sheet */
          bottom-0 left-0 right-0 h-[66vh] rounded-t-3xl
          animate-slide-up
        `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className={`inline-block ${getTypeColor(incident.type)} text-white text-xs font-bold px-3 py-1 rounded-full uppercase`}>
                {getTypeLabel(incident.type)}
              </span>
              {incident.verified ? (
                <span className="inline-block bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-semibold px-2 py-1 rounded-full">
                  ✓ Verified
                </span>
              ) : (
                <span className="inline-block bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-semibold px-2 py-1 rounded-full">
                  ⏳ Pending
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {incident.title}
          </h2>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">📍 Location</div>
              <div className="text-gray-900 dark:text-white">{incident.location.address || 'Iran'}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">🕐 Time</div>
              <div className="text-gray-900 dark:text-white">{formatTimestamp(incident.timestamp)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">📰 Source</div>
              <div className="text-gray-900 dark:text-white capitalize">{incident.reportedBy}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">❤️ Engagement</div>
              <div className="text-gray-900 dark:text-white">{incident.upvotes} upvotes</div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {incident.description}
            </p>
          </div>

          {/* Images */}
          {incident.images && incident.images.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Images</h3>
              <div className="grid grid-cols-2 gap-2">
                {incident.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Embedded Twitter/Media Content */}
          {incident.twitterUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Media Content</h3>
              <TweetEmbed url={incident.twitterUrl} isDarkMode={false} />
            </div>
          )}

          {/* Telegram Content */}
          {incident.telegramUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Telegram Video</h3>
              <TelegramEmbed url={incident.telegramUrl} isDarkMode={false} />
            </div>
          )}

          {/* Alternate View/Angle */}
          {incident.alternateUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Alternate Angle</h3>
              <TweetEmbed url={incident.alternateUrl} isDarkMode={false} />
            </div>
          )}

          {/* Tags */}
          {incident.tags && incident.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {incident.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related Articles */}
          {incident.relatedArticles && incident.relatedArticles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Related News</h3>
              <div className="space-y-2">
                {incident.relatedArticles.map((article, idx) => (
                  <a
                    key={idx}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                      {article.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Source: {article.source}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Social Share */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Share This Incident</h3>
            <div className="flex gap-3 justify-center">
              {/* Twitter/X */}
              <button
                onClick={shareOnTwitter}
                title="Share on Twitter/X"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-black hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all transform hover:scale-110"
              >
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              {/* Telegram */}
              <button
                onClick={shareOnTelegram}
                title="Share on Telegram"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0088cc] hover:bg-[#006699] transition-all transform hover:scale-110"
              >
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </button>

              {/* WhatsApp */}
              <button
                onClick={shareOnWhatsApp}
                title="Share on WhatsApp"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] hover:bg-[#1da851] transition-all transform hover:scale-110"
              >
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </button>

              {/* Facebook */}
              <button
                onClick={shareOnFacebook}
                title="Share on Facebook"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1877F2] hover:bg-[#145dbf] transition-all transform hover:scale-110"
              >
                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              {/* Copy Link */}
              <button
                onClick={copyLink}
                title="Copy Link"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 transition-all transform hover:scale-110"
              >
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <div>Incident ID: {incident.id}</div>
            <div>Reported: {new Date(incident.createdAt).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </>
  );
}
