import { NextRequest, NextResponse } from 'next/server';
import { translateText, detectLanguage, type SupportedLanguage } from '@/lib/translation';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

function cleanupRateLimitMap() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

setInterval(cleanupRateLimitMap, 5 * 60 * 1000); // Every 5 minutes

interface TranslateRequestBody {
  text: string;
  sourceLang?: SupportedLanguage;
  targetLang: SupportedLanguage;
  autoDetect?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body: TranslateRequestBody = await req.json();
    const { text, sourceLang, targetLang, autoDetect = false } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: text is required' },
        { status: 400 }
      );
    }

    if (!targetLang || !['en', 'fa'].includes(targetLang)) {
      return NextResponse.json(
        { error: 'Invalid request: targetLang must be "en" or "fa"' },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text too long (max 10000 characters)' },
        { status: 400 }
      );
    }

    let finalSourceLang: SupportedLanguage = sourceLang || 'en';

    if (autoDetect || !sourceLang) {
      finalSourceLang = await detectLanguage(text);
    }

    if (finalSourceLang === targetLang) {
      return NextResponse.json({
        translatedText: text,
        detectedLanguage: finalSourceLang,
        cached: false,
      });
    }

    const result = await translateText(text, finalSourceLang, targetLang);

    return NextResponse.json({
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage || finalSourceLang,
      sourceLang: finalSourceLang,
      targetLang,
      cached: false,
    });
  } catch (error) {
    console.error('Translation API error:', error);

    if (error instanceof Error && error.message.includes('unavailable')) {
      return NextResponse.json(
        { error: 'Translation service temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Translation API endpoint',
      supportedLanguages: ['en', 'fa'],
      rateLimit: `${RATE_LIMIT} requests per hour per IP`,
      usage: {
        method: 'POST',
        body: {
          text: 'string (required)',
          sourceLang: 'en | fa (optional, auto-detect if not provided)',
          targetLang: 'en | fa (required)',
          autoDetect: 'boolean (optional, default: false)',
        },
      },
    },
    { status: 200 }
  );
}
