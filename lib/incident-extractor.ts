/**
 * Incident Extractor
 * Automatically extracts incident information from news articles using NLP pattern matching
 * Supports both Farsi and English keywords
 */

export interface ExtractedIncident {
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: string; // City or location name to be geocoded
  confidence: number; // 0-100 score based on keyword matches
  extractedFrom: {
    articleId: string;
    articleTitle: string;
    articleUrl: string;
    source: string;
  };
  timestamp: number;
  keywords: string[]; // Keywords that triggered extraction
}

// Incident type keywords with weighted importance
const INCIDENT_PATTERNS = {
  protest: {
    farsi: [
      { term: 'اعتراض', weight: 10 },
      { term: 'تظاهرات', weight: 10 },
      { term: 'تجمع', weight: 8 },
      { term: 'راهپیمایی', weight: 8 },
      { term: 'شعار', weight: 6 },
      { term: 'معترض', weight: 7 },
      { term: 'اعتصاب', weight: 9 },
    ],
    english: [
      { term: 'protest', weight: 10 },
      { term: 'demonstration', weight: 10 },
      { term: 'rally', weight: 8 },
      { term: 'march', weight: 7 },
      { term: 'gathering', weight: 6 },
      { term: 'chant', weight: 5 },
      { term: 'strike', weight: 9 },
    ],
  },
  arrest: {
    farsi: [
      { term: 'بازداشت', weight: 10 },
      { term: 'دستگیر', weight: 10 },
      { term: 'توقیف', weight: 9 },
      { term: 'زندان', weight: 7 },
      { term: 'بازداشتی', weight: 9 },
    ],
    english: [
      { term: 'arrest', weight: 10 },
      { term: 'detained', weight: 10 },
      { term: 'custody', weight: 9 },
      { term: 'imprisoned', weight: 8 },
      { term: 'jail', weight: 7 },
    ],
  },
  injury: {
    farsi: [
      { term: 'زخمی', weight: 10 },
      { term: 'مجروح', weight: 10 },
      { term: 'آسیب', weight: 7 },
      { term: 'ضرب', weight: 6 },
      { term: 'تیراندازی', weight: 8 },
    ],
    english: [
      { term: 'injured', weight: 10 },
      { term: 'wounded', weight: 10 },
      { term: 'hurt', weight: 7 },
      { term: 'shot', weight: 8 },
      { term: 'beaten', weight: 8 },
      { term: 'tear gas', weight: 7 },
      { term: 'rubber bullet', weight: 8 },
    ],
  },
  death: {
    farsi: [
      { term: 'کشته', weight: 10 },
      { term: 'قتل', weight: 10 },
      { term: 'شهید', weight: 9 },
      { term: 'جان باخت', weight: 10 },
      { term: 'کشتار', weight: 10 },
      { term: 'مرگ', weight: 8 },
    ],
    english: [
      { term: 'killed', weight: 10 },
      { term: 'death', weight: 9 },
      { term: 'died', weight: 9 },
      { term: 'fatal', weight: 9 },
      { term: 'dead', weight: 8 },
      { term: 'casualty', weight: 8 },
      { term: 'martyr', weight: 8 },
    ],
  },
};

// Location keywords for major Iranian cities
const IRAN_CITIES = [
  // Major cities
  'تهران', 'Tehran',
  'مشهد', 'Mashhad',
  'اصفهان', 'Isfahan',
  'شیراز', 'Shiraz',
  'تبریز', 'Tabriz',
  'کرج', 'Karaj',
  'قم', 'Qom',
  'اهواز', 'Ahvaz',
  'کرمانشاه', 'Kermanshah',
  'رشت', 'Rasht',
  'اراک', 'Arak',
  'همدان', 'Hamedan',
  'یزد', 'Yazd',
  'اردبیل', 'Ardabil',
  'بندرعباس', 'Bandar Abbas',
  'کرمان', 'Kerman',
  'قزوین', 'Qazvin',
  'زنجان', 'Zanjan',
  'سنندج', 'Sanandaj',
  'خرم‌آباد', 'Khorramabad',
  'گرگان', 'Gorgan',
  'ساری', 'Sari',
  'بابل', 'Babol',
  'قشم', 'Qeshm',
  'فسا', 'Fasa',
  'کوهدشت', 'Kuhdasht',
  'رامهرمز', 'Ramhormoz',
  'فولادشهر', 'Fuladshahr',
  'ازنا', 'Azna',
  'مارلیک', 'Marlik',
  'لردگان', 'Lordegan',
  'کوار', 'Kavar',
  'اسدآباد', 'Asadabad',
  'مرودشت', 'Marvdasht',
  'کازرون', 'Kazerun',
  'ایلام', 'Ilam',
  'شازند', 'Shazand',
  'یاسوج', 'Yasuj',
  'ملکشاهی', 'Malekshahi',
  // Tehran neighborhoods
  'ونک', 'Vanak',
  'ولنجک', 'Velenjak',
  'نیاوران', 'Niavaran',
  'تهرانپارس', 'Tehranpars',
  'نارمک', 'Narmak',
  'نازی‌آباد', 'Nazi Abad',
  // Common location terms
  'میدان', 'square',
  'خیابان', 'street',
  'بلوار', 'boulevard',
  'دانشگاه', 'university',
  'بازار', 'bazaar',
];

/**
 * Extract location mentions from text
 */
function extractLocations(text: string): string[] {
  const locations: string[] = [];
  const lowerText = text.toLowerCase();

  for (const city of IRAN_CITIES) {
    if (lowerText.includes(city.toLowerCase())) {
      locations.push(city);
    }
  }

  return [...new Set(locations)]; // Remove duplicates
}

/**
 * Calculate confidence score based on keyword matches
 */
function calculateConfidence(
  type: keyof typeof INCIDENT_PATTERNS,
  text: string,
  hasLocation: boolean
): { score: number; keywords: string[] } {
  const lowerText = text.toLowerCase();
  let totalWeight = 0;
  const matchedKeywords: string[] = [];

  // Check Farsi keywords
  for (const { term, weight } of INCIDENT_PATTERNS[type].farsi) {
    if (lowerText.includes(term.toLowerCase())) {
      totalWeight += weight;
      matchedKeywords.push(term);
    }
  }

  // Check English keywords
  for (const { term, weight } of INCIDENT_PATTERNS[type].english) {
    if (lowerText.includes(term.toLowerCase())) {
      totalWeight += weight;
      matchedKeywords.push(term);
    }
  }

  // Normalize to 0-100 scale
  let score = Math.min(totalWeight * 3, 100);

  // Boost score if location is found
  if (hasLocation) {
    score = Math.min(score + 20, 100);
  }

  return { score, keywords: matchedKeywords };
}

/**
 * Extract title from article content (first sentence or up to 150 chars)
 */
function extractTitle(content: string, type: string): string {
  // Try to get first sentence
  const sentences = content.split(/[.!?؟]/);
  if (sentences.length > 0 && sentences[0].length > 10 && sentences[0].length <= 150) {
    return sentences[0].trim();
  }

  // Otherwise take first 100 chars
  const title = content.length > 100 ? content.substring(0, 97) + '...' : content;
  return title;
}

/**
 * Extract description (first 3 sentences or 300 chars)
 */
function extractDescription(content: string): string {
  const sentences = content.split(/[.!?؟]/);
  const firstThree = sentences.slice(0, 3).join('. ').trim();

  if (firstThree.length > 300) {
    return firstThree.substring(0, 297) + '...';
  }

  return firstThree;
}

/**
 * Extract timestamp from article published date or content
 */
function extractTimestamp(publishedAt: string | number, content: string): number {
  // If already a number (Unix timestamp), return it
  if (typeof publishedAt === 'number') {
    return publishedAt;
  }

  // Parse published date string
  const pubDate = new Date(publishedAt);
  if (!isNaN(pubDate.getTime())) {
    return pubDate.getTime();
  }

  // Look for time indicators in content
  const now = Date.now();
  const lowerContent = content.toLowerCase();

  // Check for relative time indicators
  if (lowerContent.includes('today') || lowerContent.includes('امروز')) {
    return now;
  }
  if (lowerContent.includes('yesterday') || lowerContent.includes('دیروز')) {
    return now - 86400000; // 24 hours ago
  }
  if (lowerContent.includes('tonight') || lowerContent.includes('امشب')) {
    return now;
  }

  // Default to now
  return now;
}

/**
 * Main extraction function - analyzes article and extracts potential incidents
 */
export function extractIncidentsFromArticle(article: {
  id: string;
  title: string;
  content: string;
  url?: string; // Optional for compatibility
  sourceUrl?: string; // Telegram uses sourceUrl
  source: string;
  publishedAt: string | number;
}): ExtractedIncident[] {
  const incidents: ExtractedIncident[] = [];
  const combinedText = `${article.title} ${article.content}`;

  // Check each incident type
  for (const type of ['protest', 'arrest', 'injury', 'death'] as const) {
    const { score, keywords } = calculateConfidence(type, combinedText, false);

    // Only extract if confidence is above threshold
    if (score >= 30 && keywords.length > 0) {
      const locations = extractLocations(combinedText);

      // Create an incident for each location found, or one generic if no location
      if (locations.length > 0) {
        for (const location of locations) {
          const { score: finalScore } = calculateConfidence(type, combinedText, true);

          incidents.push({
            type,
            title: extractTitle(combinedText, type),
            description: extractDescription(article.content),
            location,
            confidence: finalScore,
            extractedFrom: {
              articleId: article.id,
              articleTitle: article.title,
              articleUrl: article.sourceUrl || article.url || '', // Handle both field names
              source: article.source,
            },
            timestamp: extractTimestamp(article.publishedAt, article.content),
            keywords,
          });
        }
      } else {
        // No location found - create incident but with lower confidence
        incidents.push({
          type,
          title: extractTitle(combinedText, type),
          description: extractDescription(article.content),
          location: 'Tehran', // Default to Tehran if no location found
          confidence: Math.max(score - 20, 10), // Reduce confidence
          extractedFrom: {
            articleId: article.id,
            articleTitle: article.title,
            articleUrl: article.sourceUrl || article.url || '', // Handle both field names
            source: article.source,
          },
          timestamp: extractTimestamp(article.publishedAt, article.content),
          keywords,
        });
      }
    }
  }

  // Sort by confidence (highest first) and limit to top 3 per article
  incidents.sort((a, b) => b.confidence - a.confidence);
  return incidents.slice(0, 3);
}

/**
 * Batch extract incidents from multiple articles
 */
export function extractIncidentsFromArticles(
  articles: Array<{
    id: string;
    title: string;
    content: string;
    url: string;
    source: string;
    publishedAt: string;
  }>
): ExtractedIncident[] {
  const allIncidents: ExtractedIncident[] = [];

  for (const article of articles) {
    const incidents = extractIncidentsFromArticle(article);
    allIncidents.push(...incidents);
  }

  // Remove duplicates based on location + type + similar timestamp
  const uniqueIncidents = allIncidents.filter((incident, index, self) => {
    return (
      index ===
      self.findIndex(
        (i) =>
          i.location === incident.location &&
          i.type === incident.type &&
          Math.abs(i.timestamp - incident.timestamp) < 3600000 // Within 1 hour
      )
    );
  });

  return uniqueIncidents;
}
