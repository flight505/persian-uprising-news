/**
 * Translation API Route
 * SEC-001 & SEC-002: Redis rate limiting + Zod validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { translateText, detectLanguage, type SupportedLanguage } from '@/lib/translation-robust';
import { ServiceContainer } from '@/lib/services/container';
import { createRateLimitHeaders } from '@/lib/services/rate-limit/i-rate-limiter';
import { getClientIP, generateIdentifier } from '@/lib/services/rate-limit/redis-rate-limiter';
import {
  validateTranslationRequest,
  formatZodErrors,
  sanitizeTranslationText,
} from '@/lib/validators/translation-validator';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers);
  const userAgent = req.headers.get('user-agent');
  const identifier = generateIdentifier(ip, userAgent);

  // Get rate limiter with detailed result
  const rateLimiter = ServiceContainer.getTranslationRateLimiter();
  const rateLimitResult = await rateLimiter.checkLimitWithResult(identifier);
  const config = rateLimiter.getConfig();

  if (!rateLimitResult.allowed) {
    const headers = createRateLimitHeaders(rateLimitResult, config);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Maximum ${config.maxRequests} requests per hour. Please try again later.`,
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // Validate input with Zod
    const validation = validateTranslationRequest(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { text, sourceLang, targetLang, autoDetect } = validation.data;

    // Sanitize text before processing
    const sanitizedText = sanitizeTranslationText(text);

    if (sanitizedText.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid text',
          message: 'Text is empty after sanitization',
        },
        { status: 400 }
      );
    }

    let finalSourceLang: SupportedLanguage = sourceLang || 'en';

    // Auto-detect language if needed
    if (autoDetect || !sourceLang) {
      finalSourceLang = await detectLanguage(sanitizedText);
    }

    // Skip translation if source equals target
    if (finalSourceLang === targetLang) {
      const headers = createRateLimitHeaders(rateLimitResult, config);
      return NextResponse.json(
        {
          translatedText: sanitizedText,
          detectedLanguage: finalSourceLang,
          cached: false,
          skipped: true,
        },
        { headers }
      );
    }

    // Perform translation
    const result = await translateText(sanitizedText, finalSourceLang, targetLang);

    const headers = createRateLimitHeaders(rateLimitResult, config);
    return NextResponse.json(
      {
        translatedText: result.translatedText,
        detectedLanguage: result.detectedLanguage || finalSourceLang,
        sourceLang: finalSourceLang,
        targetLang,
        tier: result.tier,
        cached: result.tier === 'cache',
      },
      { headers }
    );
  } catch (error) {
    logger.error('translation_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Translation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const rateLimiter = ServiceContainer.getTranslationRateLimiter();
  const config = rateLimiter.getConfig();

  return NextResponse.json(
    {
      service: 'Translation API',
      supportedLanguages: ['en', 'fa'],
      rateLimit: {
        limit: config.maxRequests,
        window: `${config.windowMs / 1000} seconds`,
        algorithm: 'sliding window',
      },
      usage: {
        method: 'POST',
        contentType: 'application/json',
        body: {
          text: 'string (required, max 10000 chars)',
          sourceLang: 'en | fa (optional, auto-detect if not provided)',
          targetLang: 'en | fa (required)',
          autoDetect: 'boolean (optional, default: false)',
        },
      },
      headers: {
        'X-RateLimit-Limit': 'Maximum requests per window',
        'X-RateLimit-Remaining': 'Remaining requests in current window',
        'X-RateLimit-Reset': 'Unix timestamp when window resets',
      },
    },
    { status: 200 }
  );
}
