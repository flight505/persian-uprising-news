'use client';

import { useEffect, useRef, useState } from 'react';

interface TelegramEmbedProps {
  url: string;
  isDarkMode?: boolean;
}

/**
 * TelegramEmbed Component
 *
 * Embeds Telegram posts/videos using Telegram's official embed methods:
 * 1. Telegram Web Widget (official script-based embed)
 * 2. iframe embed (fallback)
 * 3. Direct link (final fallback)
 *
 * Telegram URL formats supported:
 * - https://t.me/channel_name/post_id
 * - https://telegram.me/channel_name/post_id
 */
export default function TelegramEmbed({ url, isDarkMode = false }: TelegramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedMethod, setEmbedMethod] = useState<'widget' | 'iframe' | 'link'>('widget');

  useEffect(() => {
    if (!url || !containerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Parse Telegram URL to extract channel and post ID
    const telegramMatch = url.match(/(?:t\.me|telegram\.me)\/([^/]+)\/(\d+)/);

    if (!telegramMatch) {
      setError('Invalid Telegram URL');
      setIsLoading(false);
      setEmbedMethod('link');
      return;
    }

    const [, channelName, postId] = telegramMatch;

    // Method 1: Try Telegram Web Widget (official method)
    loadTelegramWidget(channelName, postId);

  }, [url, isDarkMode]);

  const loadTelegramWidget = (channelName: string, postId: string) => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    // Load Telegram Web widget script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-post', `${channelName}/${postId}`);
    script.setAttribute('data-width', '100%');

    if (isDarkMode) {
      script.setAttribute('data-dark', '1');
    }

    script.onload = () => {
      setIsLoading(false);
      setEmbedMethod('widget');
    };

    script.onerror = () => {
      console.warn('Telegram widget failed, trying iframe method');
      loadTelegramIframe(channelName, postId);
    };

    containerRef.current.appendChild(script);
  };

  const loadTelegramIframe = (channelName: string, postId: string) => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    // Create iframe embed
    const iframe = document.createElement('iframe');
    iframe.src = `https://t.me/${channelName}/${postId}?embed=1${isDarkMode ? '&dark=1' : ''}`;
    iframe.width = '100%';
    iframe.height = '400';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');

    iframe.onload = () => {
      setIsLoading(false);
      setEmbedMethod('iframe');
    };

    iframe.onerror = () => {
      console.warn('Telegram iframe failed, falling back to link');
      setError('Unable to embed Telegram post');
      setIsLoading(false);
      setEmbedMethod('link');
    };

    containerRef.current.appendChild(iframe);
  };

  if (error || embedMethod === 'link') {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
        {error && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{error}</p>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
          </svg>
          View on Telegram
        </a>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="flex items-center justify-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div
        ref={containerRef}
        className={`telegram-embed-container ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity'}`}
        style={{ minHeight: isLoading ? '400px' : 'auto' }}
      />
    </div>
  );
}
