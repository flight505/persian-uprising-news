'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/lib/utils';
import { offlineDB } from '@/lib/offline-db';

interface NewsCardProps {
  id?: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  topics: string[];
  source?: 'perplexity' | 'twitter' | 'telegram';
  author?: string;
  channelName?: string;
  content?: string; // Full article content for incident extraction
}

function detectLanguage(text: string): 'fa' | 'en' {
  const farsiPattern = /[\u0600-\u06FF]/;
  return farsiPattern.test(text) ? 'fa' : 'en';
}

// Check if article likely describes an incident
function containsIncidentKeywords(text: string): boolean {
  const incidentKeywords = [
    'protest', 'arrest', 'detained', 'clash', 'injured', 'killed', 'death',
    'shooting', 'police', 'crackdown', 'demonstration', 'rally', 'gathering',
    'tear gas', 'violence', 'casualty', 'shot', 'wounded', 'confrontation'
  ];
  const lowerText = text.toLowerCase();
  return incidentKeywords.some(keyword => lowerText.includes(keyword));
}

export default function NewsCard({ id, title, summary, url, publishedAt, topics, source, author, channelName, content }: NewsCardProps) {
  const router = useRouter();
  const [isTranslated, setIsTranslated] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedSummary, setTranslatedSummary] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [detectedLang, setDetectedLang] = useState<'fa' | 'en'>('en');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const lang = detectLanguage(title + ' ' + summary);
    setDetectedLang(lang);

    if (id && lang === 'fa') {
      offlineDB.getCachedTranslation(id).then(cached => {
        if (cached) {
          setTranslatedTitle(cached.translatedText.split('\n')[0]);
          setTranslatedSummary(cached.translatedText.split('\n').slice(1).join('\n'));
        }
      });
    }
  }, [id, title, summary]);

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedTitle && translatedSummary) {
      setIsTranslated(true);
      return;
    }

    setIsTranslating(true);
    setTranslationError('');

    try {
      const textToTranslate = `${title}\n${summary}`;
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToTranslate,
          sourceLang: detectedLang,
          targetLang: 'en',
          autoDetect: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      const lines = data.translatedText.split('\n');
      const newTitle = lines[0];
      const newSummary = lines.slice(1).join('\n');

      setTranslatedTitle(newTitle);
      setTranslatedSummary(newSummary);
      setIsTranslated(true);

      if (id) {
        await offlineDB.cacheTranslation(
          id,
          textToTranslate,
          data.translatedText,
          detectedLang,
          'en'
        );
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError('Translation unavailable');
    } finally {
      setIsTranslating(false);
    }
  };

  const displayTitle = isTranslated && translatedTitle ? translatedTitle : title;
  const displaySummary = isTranslated && translatedSummary ? translatedSummary : summary;
  const isRTL = !isTranslated && detectedLang === 'fa';

  const topicVariants: Record<string, 'iran' | 'official' | 'opposition' | 'leader' | 'world' | 'solidarity' | 'breaking' | 'embassy'> = {
    'iran.now': 'iran',
    'iran.statements_official': 'official',
    'iran.statements_opposition': 'opposition',
    'entity.reza_pahlavi': 'leader',
    'leaders.world_statements': 'world',
    'protests.solidarity_global': 'solidarity',
    'top.breaking_global': 'breaking',
    'events.embassy_incidents': 'embassy',
  };

  const topicLabels: Record<string, string> = {
    'iran.now': 'Iran Events',
    'iran.statements_official': 'Official Statement',
    'iran.statements_opposition': 'Opposition',
    'entity.reza_pahlavi': 'Reza Pahlavi',
    'leaders.world_statements': 'World Leaders',
    'protests.solidarity_global': 'Global Solidarity',
    'top.breaking_global': 'Breaking',
    'events.embassy_incidents': 'Embassy',
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return dateStr;
    }
  };

  const sourceIcons = {
    twitter: '𝕏',
    telegram: '✈️',
    perplexity: '🔍'
  };

  const handleReportIncident = () => {
    // Store article data in sessionStorage for pre-filling the report form
    if (id) {
      sessionStorage.setItem('reportFromArticle', JSON.stringify({
        articleId: id,
        articleTitle: title,
        articleUrl: url,
        articleContent: content || summary,
        articleSource: source || 'unknown',
      }));
    }
    router.push('/report');
  };

  return (
    <article className={cn(
      "group relative",
      "bg-card rounded-xl overflow-hidden",
      "border border-border/50",
      "transition-all duration-300 ease-out",
      "hover:scale-[1.02] hover:shadow-xl hover:border-primary/30",
      "elevation-2 hover:elevation-4"
    )}>
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content container */}
      <div className="relative p-6">
        {/* Topics and Language Indicator */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {topics.map((topic) => (
            <Badge
              key={topic}
              variant={topicVariants[topic] || 'secondary'}
              className="transition-transform duration-200 hover:scale-105"
            >
              {topicLabels[topic] || topic}
            </Badge>
          ))}
          {detectedLang === 'fa' && (
            <Badge variant="outline" className="gap-1">
              🇮🇷 Farsi
            </Badge>
          )}
        </div>

        {/* Title */}
        <h2
          className={cn(
            "text-title mb-3 text-card-foreground",
            "transition-all duration-300",
            "group-hover:text-primary",
            "leading-tight"
          )}
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {displayTitle}
        </h2>

        {/* Summary */}
        <div>
          <p
            className={cn(
              "text-body text-muted-foreground mb-2 leading-relaxed",
              !isExpanded && "line-clamp-3",
              "transition-all duration-300"
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{ textAlign: isRTL ? 'right' : 'left' }}
          >
            {displaySummary}
          </p>
          {displaySummary.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {isExpanded ? '← Show less' : 'Show more →'}
            </button>
          )}
        </div>

        {/* Translation Button */}
        {detectedLang === 'fa' && (
          <div className="mb-4">
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className={cn(
                "text-label text-primary hover:text-primary/80",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2",
                "transition-colors duration-200"
              )}
            >
              {isTranslating ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>Translating...</span>
                </>
              ) : isTranslated ? (
                <>
                  <span>🇮🇷</span>
                  <span>Show Original</span>
                </>
              ) : (
                <>
                  <span>🇬🇧</span>
                  <span>Translate to English</span>
                </>
              )}
            </button>
            {translationError && (
              <p className="text-xs text-destructive mt-2">
                {translationError}
              </p>
            )}
          </div>
        )}

        {/* Footer with divider */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-label text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <time className="font-medium">{formatDate(publishedAt)}</time>
              {source && (
                <>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-base">{sourceIcons[source]}</span>
                    <span className="text-xs">
                      {author ? `@${author}` : channelName || source}
                    </span>
                  </span>
                </>
              )}
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-primary hover:text-primary/80 font-medium",
                "transition-colors duration-200",
                "flex items-center gap-1"
              )}
            >
              <span>Read more</span>
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </a>
          </div>

          {/* Quick Report Button - Only show for articles with incident keywords */}
          {containsIncidentKeywords(title + ' ' + summary) && (
            <button
              onClick={handleReportIncident}
              className={cn(
                "w-full px-3 py-2 rounded-lg",
                "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30",
                "border border-blue-200 dark:border-blue-800",
                "text-blue-700 dark:text-blue-300",
                "text-xs font-medium",
                "transition-all duration-200",
                "flex items-center justify-center gap-2",
                "hover:scale-[1.02]"
              )}
            >
              <span>📍</span>
              <span>Report Incident from This Article</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
