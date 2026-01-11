'use client';

interface NewsCardProps {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  topics: string[];
  source?: 'perplexity' | 'twitter' | 'telegram';
  author?: string;
  channelName?: string;
}

export default function NewsCard({ title, summary, url, publishedAt, topics, source, author, channelName }: NewsCardProps) {
  const topicColors: Record<string, string> = {
    'iran.now': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'iran.statements_official': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'iran.statements_opposition': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'entity.reza_pahlavi': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'leaders.world_statements': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'protests.solidarity_global': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'top.breaking_global': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'events.embassy_incidents': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
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

  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Topics */}
      <div className="flex flex-wrap gap-2 mb-3">
        {topics.map((topic) => (
          <span
            key={topic}
            className={`px-2 py-1 rounded-full text-xs font-medium ${topicColors[topic] || 'bg-gray-100 text-gray-800'}`}
          >
            {topicLabels[topic] || topic}
          </span>
        ))}
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
        {title}
      </h2>

      {/* Summary */}
      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
        {summary}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <time>{formatDate(publishedAt)}</time>
          {source && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                {source === 'twitter' && '🐦'}
                {source === 'telegram' && '📱'}
                {source === 'perplexity' && '🔍'}
                {author && `@${author}`}
                {!author && channelName && channelName}
              </span>
            </>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Read more →
        </a>
      </div>
    </article>
  );
}
