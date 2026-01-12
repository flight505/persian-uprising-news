/**
 * Google Cloud Translation API service
 * Handles translation between Persian (Farsi) and English
 */

import { TranslationServiceClient } from '@google-cloud/translate';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'coiled-cloud';
const LOCATION = 'global';

let translationClient: TranslationServiceClient | null = null;

function getTranslationClient(): TranslationServiceClient {
  if (!translationClient) {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credentials) {
      translationClient = new TranslationServiceClient({
        keyFilename: credentials,
      });
    } else {
      translationClient = new TranslationServiceClient();
    }
  }
  return translationClient;
}

export type SupportedLanguage = 'fa' | 'en';

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
}

interface BatchTranslationResult {
  translations: string[];
  detectedLanguage?: string;
}

const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(text: string, sourceLang: string, targetLang: string): string {
  return `${sourceLang}-${targetLang}-${text.substring(0, 100)}`;
}

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of translationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      translationCache.delete(key);
    }
  }
}

/**
 * Translate a single text string
 */
export async function translateText(
  text: string,
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<TranslationResult> {
  if (sourceLang === targetLang) {
    return { translatedText: text };
  }

  if (!text || text.trim().length === 0) {
    return { translatedText: text };
  }

  const cacheKey = getCacheKey(text, sourceLang, targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return { translatedText: cached.text };
  }

  try {
    const client = getTranslationClient();
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

    const [response] = await client.translateText({
      parent,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode: sourceLang,
      targetLanguageCode: targetLang,
    });

    const translatedText = response.translations?.[0]?.translatedText || text;
    const detectedLanguage = response.translations?.[0]?.detectedLanguageCode || sourceLang;

    translationCache.set(cacheKey, { text: translatedText, timestamp: Date.now() });

    if (translationCache.size > 1000) {
      cleanCache();
    }

    return { translatedText, detectedLanguage };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Translation service unavailable');
  }
}

/**
 * Translate multiple text strings in a single batch request (more efficient)
 */
export async function batchTranslate(
  texts: string[],
  sourceLang: SupportedLanguage,
  targetLang: SupportedLanguage
): Promise<BatchTranslationResult> {
  if (sourceLang === targetLang) {
    return { translations: texts };
  }

  if (texts.length === 0) {
    return { translations: [] };
  }

  const filteredTexts = texts.filter(t => t && t.trim().length > 0);
  if (filteredTexts.length === 0) {
    return { translations: texts };
  }

  try {
    const client = getTranslationClient();
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

    const [response] = await client.translateText({
      parent,
      contents: filteredTexts,
      mimeType: 'text/plain',
      sourceLanguageCode: sourceLang,
      targetLanguageCode: targetLang,
    });

    const translations = response.translations?.map(t => t.translatedText || '') || texts;
    const detectedLanguage = response.translations?.[0]?.detectedLanguageCode ?? undefined;

    for (let i = 0; i < filteredTexts.length; i++) {
      const cacheKey = getCacheKey(filteredTexts[i], sourceLang, targetLang);
      translationCache.set(cacheKey, { text: translations[i], timestamp: Date.now() });
    }

    return { translations, detectedLanguage };
  } catch (error) {
    console.error('Batch translation error:', error);
    throw new Error('Translation service unavailable');
  }
}

/**
 * Detect the language of a text string
 */
export async function detectLanguage(text: string): Promise<SupportedLanguage> {
  if (!text || text.trim().length === 0) {
    return 'en';
  }

  const farsiPattern = /[\u0600-\u06FF]/;
  if (farsiPattern.test(text)) {
    return 'fa';
  }

  try {
    const client = getTranslationClient();
    const parent = `projects/${PROJECT_ID}/locations/${LOCATION}`;

    const [response] = await client.detectLanguage({
      parent,
      content: text.substring(0, 500),
      mimeType: 'text/plain',
    });

    const detectedLang = response.languages?.[0]?.languageCode;

    if (detectedLang === 'fa' || detectedLang === 'en') {
      return detectedLang;
    }

    return 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

/**
 * Get translation statistics
 */
export function getTranslationStats() {
  return {
    cachedTranslations: translationCache.size,
    cacheSize: translationCache.size,
  };
}

/**
 * Clear translation cache
 */
export function clearTranslationCache() {
  translationCache.clear();
}
