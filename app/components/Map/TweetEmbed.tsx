'use client';

import { useEffect, useRef, useState } from 'react';

interface TweetEmbedProps {
  url: string;
  isDarkMode?: boolean;
}

// Extend Window interface to include twttr
declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTweet: (
          tweetId: string,
          container: HTMLElement,
          options: {
            theme?: 'light' | 'dark';
            cards?: 'visible' | 'hidden';
            conversation?: 'none' | 'all';
            align?: 'left' | 'center' | 'right';
            width?: string | number;
          }
        ) => Promise<HTMLElement | null>;
      };
    };
  }
}

export default function TweetEmbed({ url, isDarkMode = false }: TweetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    setIsLoading(true);
    setError(null);

    // CRITICAL: Handle comma-separated URLs (for alternate angles)
    // Iran-main uses this pattern: "url1, url2" for multiple angles
    const cleanUrl = url.split(',')[0].trim();

    // Extract tweet ID from URL
    const tweetId = cleanUrl.split('/').pop()?.split('?')[0];
    if (!tweetId) {
      setError('Invalid Twitter URL');
      setIsLoading(false);
      return;
    }

    // Always clear container (matching Iran-main pattern)
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Function to render tweet
    const renderTweet = () => {
      if (window.twttr && window.twttr.widgets) {
        embedTweet(tweetId);
      }
    };

    // Load Twitter widgets script if not already loaded
    if (window.twttr && window.twttr.widgets) {
      renderTweet();
    } else {
      // Check if script already exists
      if (!document.getElementById('twitter-wjs')) {
        const script = document.createElement('script');
        script.id = 'twitter-wjs';
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.onload = renderTweet;
        script.onerror = () => {
          setError('Failed to load Twitter widgets');
          setIsLoading(false);
        };
        document.body.appendChild(script);
      }
    }
  }, [url, isDarkMode]);

  const embedTweet = (tweetId: string) => {
    if (!containerRef.current || !window.twttr?.widgets) return;

    setIsLoading(true);
    setError(null);

    window.twttr.widgets
      .createTweet(tweetId, containerRef.current, {
        theme: isDarkMode ? 'dark' : 'light',
        conversation: 'none',
        align: 'center',
      })
      .then((element) => {
        if (!element) {
          setError('Tweet not found or unavailable');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error embedding tweet:', err);
        setError('Failed to load tweet');
        setIsLoading(false);
      });
  };

  if (error) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{error}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-flex items-center gap-1"
        >
          View on X
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div ref={containerRef} className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity'} />
    </div>
  );
}
