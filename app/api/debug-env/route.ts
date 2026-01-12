import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    telegram: {
      hasSessionString: !!process.env.TELEGRAM_SESSION_STRING,
      sessionStringLength: process.env.TELEGRAM_SESSION_STRING?.length || 0,
      hasApiId: !!process.env.TELEGRAM_API_ID,
      apiId: process.env.TELEGRAM_API_ID ? 'SET' : 'MISSING',
      hasApiHash: !!process.env.TELEGRAM_API_HASH,
      apiHashLength: process.env.TELEGRAM_API_HASH?.length || 0,
    },
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL ? 'true' : 'false',
  });
}
