/**
 * Perplexity Sonar API Integration
 * Implements batched multi-topic queries for cost optimization
 */

import { logger } from '@/lib/logger';

export interface PerplexityArticle {
  title: string;
  summary: string;
  content: string;
  url: string;
  publishedAt: string;
  topics: string[]; // Multiple topics can apply to one article
}

export interface TopicQuery {
  id: string;
  label: string;
  queries: string[];
  recency?: 'day' | 'week' | 'month';
  languages?: string[];
}

/**
 * 8 core topic feeds based on keywords.md
 */
export const TOPIC_FEEDS: TopicQuery[] = [
  {
    id: 'iran.now',
    label: 'Iran Events & Protests',
    recency: 'day',
    languages: ['en', 'fa'],
    queries: [
      'Iran protests unrest clashes crackdown live updates',
      'Iran internet shutdown blackout curfew security forces',
      'Tehran protests nationwide demonstrations Iran',
    ],
  },
  {
    id: 'iran.statements_official',
    label: 'Iranian Government Statements',
    recency: 'day',
    languages: ['en', 'fa'],
    queries: [
      'Iran Supreme Leader statement Khamenei protests',
      'Iran president statement protests unrest',
      'Iran foreign ministry statement spokesperson',
      'IRGC statement Basij Iran unrest',
    ],
  },
  {
    id: 'iran.statements_opposition',
    label: 'Opposition & Diaspora Statements',
    recency: 'day',
    languages: ['en', 'fa'],
    queries: [
      'Iran opposition leader statement exile diaspora',
      'Iranian diaspora leaders statement transition plan',
    ],
  },
  {
    id: 'entity.reza_pahlavi',
    label: 'Reza Pahlavi (Son of Shah)',
    recency: 'week',
    languages: ['en', 'fa'],
    queries: [
      'Reza Pahlavi statement Iran protests',
      'Crown Prince Reza Pahlavi calls on protesters',
      'son of the Shah Reza Pahlavi Iran',
    ],
  },
  {
    id: 'leaders.world_statements',
    label: 'World Leaders on Iran',
    recency: 'day',
    languages: ['en'],
    queries: [
      'statement on Iran protests UN EU White House',
      'sanctions announced Iran crackdown',
      'foreign ministry statement Iran unrest',
    ],
  },
  {
    id: 'protests.solidarity_global',
    label: 'Global Solidarity Protests',
    recency: 'day',
    languages: ['en', 'fr', 'de', 'da'],
    queries: [
      'solidarity rally support demonstration Iran',
      'protest outside Iranian embassy solidarity',
      'support Iranian protesters rally march',
    ],
  },
  {
    id: 'top.breaking_global',
    label: 'Breaking Global News',
    recency: 'day',
    languages: ['en'],
    queries: [
      'breaking news Iran developing story',
      'urgent Iran situation statement announced today',
    ],
  },
  {
    id: 'events.embassy_incidents',
    label: 'Embassy & Consulate Incidents',
    recency: 'day',
    languages: ['en'],
    queries: [
      'Iranian embassy protest incident',
      'consulate protest clash Iran',
    ],
  },
];

/**
 * Create batched prompt for Perplexity Sonar API
 * Combines all 8 topics into one query to save costs
 */
export function createBatchedPrompt(): string {
  const topicSections = TOPIC_FEEDS.map((topic, index) => {
    const queryList = topic.queries.map((q, i) => `   ${i + 1}. ${q}`).join('\n');
    return `
**Topic ${index + 1}: ${topic.label}** (${topic.id})
Search for news from the last ${topic.recency || 'day'}:
${queryList}`;
  }).join('\n');

  return `You are a news aggregation system. Search for and summarize the latest news on these 8 topics related to the Persian uprising and Iran protests. For each article found, provide:
- title (concise headline)
- summary (2-3 sentences)
- url (source link)
- publishedAt (date/time if available)
- topics (which topic IDs from below apply to this article - can be multiple)

${topicSections}

Return results as a JSON array of articles. Each article should have: title, summary, url, publishedAt, and topics (array of topic IDs like ["iran.now", "top.breaking_global"]).

Focus on the most recent and relevant news. Prioritize authoritative sources like Reuters, AP, BBC, Al Jazeera, Iran International, and official government statements.`;
}

/**
 * Call Perplexity Sonar API
 */
export async function fetchPerplexityNews(): Promise<PerplexityArticle[]> {
  const apiKey = process.env.RISE_UP_PERPLEXITY;

  if (!apiKey) {
    throw new Error('RISE_UP_PERPLEXITY is not set');
  }

  const prompt = createBatchedPrompt();

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar', // Using Sonar for web search
        messages: [
          {
            role: 'system',
            content: 'You are a news aggregation system that returns structured JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Low temperature for factual responses
        max_tokens: 4000, // Enough for multiple articles
        return_citations: true, // Get source URLs
        return_images: false, // Don't need images in API response (we'll extract from pages)
        search_recency_filter: 'day', // Focus on last 24 hours
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    // Parse the response
    const content = data.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    // Try to extract JSON from the response
    // First try to remove markdown code blocks if present
    let jsonText = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    // Now extract the JSON array
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn('perplexity_no_json_array', {
        content_preview: content.substring(0, 500)
      });
      return parseNonJsonResponse(content, data.citations || []);
    }

    let articles: PerplexityArticle[];
    try {
      articles = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('perplexity_json_parse_error', {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
        json_preview: jsonMatch[0].substring(0, 200)
      });
      return parseNonJsonResponse(content, data.citations || []);
    }

    // Enhance with citations if available
    if (data.citations && data.citations.length > 0) {
      articles.forEach((article, index) => {
        if (!article.url && data.citations[index]) {
          article.url = data.citations[index];
        }
      });
    }

    return articles;
  } catch (error) {
    logger.error('perplexity_fetch_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Fallback parser if response isn't clean JSON
 */
function parseNonJsonResponse(content: string, citations: string[]): PerplexityArticle[] {
  // Try to extract structured information from non-JSON response
  const articles: PerplexityArticle[] = [];

  // Look for patterns like "Title:", "Summary:", etc.
  const sections = content.split(/\n\n+/);

  for (const section of sections) {
    if (section.includes('title') || section.includes('Title')) {
      const titleMatch = section.match(/title[:\s]+(.+)/i);
      const summaryMatch = section.match(/summary[:\s]+(.+)/i);
      const urlMatch = section.match(/url[:\s]+(https?:\/\/[^\s]+)/i);

      if (titleMatch) {
        articles.push({
          title: titleMatch[1].trim(),
          summary: summaryMatch ? summaryMatch[1].trim() : '',
          content: section,
          url: urlMatch ? urlMatch[1].trim() : (citations[0] || ''),
          publishedAt: new Date().toISOString(),
          topics: ['iran.now'], // Default topic
        });
      }
    }
  }

  return articles;
}

/**
 * Get articles for a specific topic
 */
export function getArticlesByTopic(articles: PerplexityArticle[], topicId: string): PerplexityArticle[] {
  return articles.filter(article => article.topics.includes(topicId));
}

/**
 * Test function to verify API connectivity
 */
export async function testPerplexityConnection(): Promise<boolean> {
  try {
    const articles = await fetchPerplexityNews();
    logger.info('perplexity_test_successful', { article_count: articles.length });
    return true;
  } catch (error) {
    logger.error('perplexity_test_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}
