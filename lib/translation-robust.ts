/**
 * ROBUST MULTI-TIER TRANSLATION SERVICE
 * Humanitarian-grade reliability: NEVER fails, always provides translation
 *
 * Tier 1: Google Cloud Translation (best quality, requires credentials)
 * Tier 2: MyMemory Free API (good quality, 1000 chars/day free)
 * Tier 3: LibreTranslate (open source, can self-host)
 * Tier 4: Client-side dictionary for critical phrases
 */

import { TranslationServiceClient } from '@google-cloud/translate';
import { logger } from '@/lib/logger';

export type SupportedLanguage = 'fa' | 'en';

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  tier?: 'google' | 'mymemory' | 'libretranslate' | 'dictionary' | 'cache';
}

// In-memory cache (persists across requests in same process)
const translationCache = new Map<string, { text: string; timestamp: number; tier: string }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for reliability

function getCacheKey(text: string, sourceLang: string, targetLang: string): string {
  // Use hash for long texts to keep key size reasonable
  const textKey = text.length > 100 ? text.substring(0, 100) : text;
  return `${sourceLang}-${targetLang}-${textKey}`;
}

/**
 * Tier 1: Google Cloud Translation
 */
async function translateWithGoogle(
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<TranslationResult | null> {
  try {
    // Check if credentials are available
    const hasServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    const hasCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!hasServiceAccount && !hasCredentialsPath) {
      logger.debug('google_credentials_not_configured');
      return null;
    }

    let client: TranslationServiceClient;

    if (hasServiceAccount) {
      // Parse service account JSON from environment variable (Vercel-compatible)
      const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
      client = new TranslationServiceClient({
        credentials,
        projectId: credentials.project_id,
      });
    } else {
      client = new TranslationServiceClient();
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'coiled-cloud';
    const parent = `projects/${projectId}/locations/global`;

    const [response] = await client.translateText({
      parent,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode: sourceLang,
      targetLanguageCode: targetLang,
    });

    const translatedText = response.translations?.[0]?.translatedText;
    if (translatedText) {
      return {
        translatedText,
        detectedLanguage: response.translations?.[0]?.detectedLanguageCode || sourceLang,
        tier: 'google',
      };
    }

    return null;
  } catch (error) {
    logger.error('google_translation_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Tier 2: MyMemory Free Translation API
 * Free tier: 1000 words/day, no API key required
 */
async function translateWithMyMemory(
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<TranslationResult | null> {
  try {
    // MyMemory API endpoint
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text.substring(0, 500)); // API limit
    url.searchParams.set('langpair', `${sourceLang}|${targetLang}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'PersianUprisingNews/1.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return {
        translatedText: data.responseData.translatedText,
        detectedLanguage: sourceLang,
        tier: 'mymemory',
      };
    }

    return null;
  } catch (error) {
    logger.error('mymemory_translation_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Tier 3: LibreTranslate (can use public instance or self-host)
 */
async function translateWithLibreTranslate(
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<TranslationResult | null> {
  try {
    // Use public instance or custom instance from env
    const apiUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com/translate';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text.substring(0, 5000),
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.translatedText) {
      return {
        translatedText: data.translatedText,
        detectedLanguage: sourceLang,
        tier: 'libretranslate',
      };
    }

    return null;
  } catch (error) {
    logger.error('libretranslate_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Tier 4: Emergency dictionary for critical phrases
 * Ensures users ALWAYS get some translation even if all APIs fail
 */
const criticalPhrasesDictionary: Record<string, Record<string, string>> = {
  'fa-en': {
    // Critical protest/safety phrases
    'تظاهرات': 'protest',
    'اعتراض': 'protest',
    'تجمع': 'gathering',
    'دستگیری': 'arrest',
    'بازداشت': 'detention',
    'کشته': 'killed',
    'زخمی': 'injured',
    'مجروح': 'wounded',
    'پلیس': 'police',
    'امنیتی': 'security forces',
    'تهران': 'Tehran',
    'خیابان': 'street',
    'دانشگاه': 'university',
    'دانشجو': 'student',
    'مردم': 'people',
    'آزادی': 'freedom',
    'جمهوری اسلامی': 'Islamic Republic',
    'رژیم': 'regime',
    'حکومت': 'government',
    'اینترنت': 'internet',
    'قطع': 'cut off',
    'فیلتر': 'filtered',
    'شعار': 'chant',
    'فریاد': 'cry',
  },
  'en-fa': {
    'protest': 'تظاهرات',
    'arrest': 'دستگیری',
    'killed': 'کشته',
    'injured': 'زخمی',
    'police': 'پلیس',
    'Tehran': 'تهران',
    'freedom': 'آزادی',
  },
};

function translateWithDictionary(
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): TranslationResult {
  const dictionaryKey = `${sourceLang}-${targetLang}`;
  const dictionary = criticalPhrasesDictionary[dictionaryKey] || {};

  let translatedText = text;
  let matchedCount = 0;

  // Replace known phrases
  for (const [source, target] of Object.entries(dictionary)) {
    if (translatedText.includes(source)) {
      translatedText = translatedText.replace(new RegExp(source, 'gi'), target);
      matchedCount++;
    }
  }

  // If we matched some phrases, it's better than nothing
  if (matchedCount > 0) {
    return {
      translatedText: `[Dictionary Translation] ${translatedText}`,
      tier: 'dictionary',
    };
  }

  // Absolute last resort: return original with warning
  return {
    translatedText: `[Original: Translation services temporarily unavailable] ${text}`,
    tier: 'dictionary',
  };
}

/**
 * MAIN TRANSLATION FUNCTION
 * Tries all tiers in sequence until success
 * NEVER throws an error - always returns something
 */
export async function translateText(
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<TranslationResult> {
  // Quick exit if same language
  if (sourceLang === targetLang) {
    return { translatedText: text, tier: 'cache' };
  }

  // Empty text
  if (!text || text.trim().length === 0) {
    return { translatedText: text, tier: 'cache' };
  }

  // Check cache first
  const cacheKey = getCacheKey(text, sourceLang, targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('translation_cache_hit', { tier: cached.tier });
    return { translatedText: cached.text, tier: cached.tier as any };
  }

  logger.debug('translation_multi_tier_started');

  // Tier 1: Google Cloud Translation
  const googleResult = await translateWithGoogle(text, sourceLang, targetLang);
  if (googleResult) {
    logger.info('translation_tier1_succeeded');
    translationCache.set(cacheKey, {
      text: googleResult.translatedText,
      timestamp: Date.now(),
      tier: 'google',
    });
    return googleResult;
  }

  // Tier 2: MyMemory
  const myMemoryResult = await translateWithMyMemory(text, sourceLang, targetLang);
  if (myMemoryResult) {
    logger.info('translation_tier2_succeeded');
    translationCache.set(cacheKey, {
      text: myMemoryResult.translatedText,
      timestamp: Date.now(),
      tier: 'mymemory',
    });
    return myMemoryResult;
  }

  // Tier 3: LibreTranslate
  const libreResult = await translateWithLibreTranslate(text, sourceLang, targetLang);
  if (libreResult) {
    logger.info('translation_tier3_succeeded');
    translationCache.set(cacheKey, {
      text: libreResult.translatedText,
      timestamp: Date.now(),
      tier: 'libretranslate',
    });
    return libreResult;
  }

  // Tier 4: Dictionary fallback (always succeeds)
  logger.warn('translation_all_tiers_failed_using_dictionary');
  const dictionaryResult = translateWithDictionary(text, sourceLang, targetLang);
  return dictionaryResult;
}

/**
 * Detect language (simple pattern matching - reliable and fast)
 */
export async function detectLanguage(text: string): Promise<SupportedLanguage> {
  if (!text || text.trim().length === 0) {
    return 'en';
  }

  // Use regex for fast detection
  const farsiPattern = /[\u0600-\u06FF]/;
  if (farsiPattern.test(text)) {
    return 'fa';
  }

  return 'en';
}

/**
 * Batch translation with parallel processing
 */
export async function batchTranslate(
  texts: string[],
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  // Process in parallel with Promise.all
  const results = await Promise.all(
    texts.map(text => translateText(text, sourceLang, targetLang))
  );

  return results.map(r => r.translatedText);
}

/**
 * Get translation statistics
 */
export function getTranslationStats() {
  const stats: Record<string, number> = {
    google: 0,
    mymemory: 0,
    libretranslate: 0,
    dictionary: 0,
  };

  for (const cached of translationCache.values()) {
    stats[cached.tier] = (stats[cached.tier] || 0) + 1;
  }

  return {
    totalCached: translationCache.size,
    byTier: stats,
  };
}

/**
 * Clear old cache entries (run periodically)
 */
export function cleanCache() {
  const now = Date.now();
  let removed = 0;

  for (const [key, value] of translationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      translationCache.delete(key);
      removed++;
    }
  }

  logger.debug('translation_cache_cleaned', { removed_count: removed });
}

// Auto-clean cache every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanCache, 60 * 60 * 1000);
}
