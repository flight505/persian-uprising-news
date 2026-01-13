/**
 * Test endpoint to verify all API keys and environment variables are correctly configured
 * Access: https://persian-uprising-news.vercel.app/api/test-env
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    checks: {
      perplexity: {
        configured: !!process.env.RISE_UP_PERPLEXITY,
        keyLength: process.env.RISE_UP_PERPLEXITY?.length || 0,
        keyPrefix: process.env.RISE_UP_PERPLEXITY?.substring(0, 8) || 'MISSING',
      },
      telegram: {
        botToken: {
          configured: !!process.env.TELEGRAM_BOT_TOKEN,
          keyLength: process.env.TELEGRAM_BOT_TOKEN?.length || 0,
        },
        userApi: {
          apiId: !!process.env.TELEGRAM_API_ID,
          apiHash: !!process.env.TELEGRAM_API_HASH,
          sessionString: !!process.env.TELEGRAM_SESSION_STRING,
          sessionLength: process.env.TELEGRAM_SESSION_STRING?.length || 0,
        },
      },
      firebase: {
        serviceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
        googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || 'MISSING',
      },
      cloudflare: {
        apiToken: !!process.env.CLOUDFLARE_API_TOKEN,
        accountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      },
      apify: {
        configured: !!process.env.APIFY_API_TOKEN,
        keyLength: process.env.APIFY_API_TOKEN?.length || 0,
      },
      vapid: {
        publicKey: !!process.env.VAPID_PUBLIC_KEY,
        privateKey: !!process.env.VAPID_PRIVATE_KEY,
        subject: process.env.VAPID_SUBJECT || 'MISSING',
        nextPublic: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      },
      cron: {
        secret: !!process.env.CRON_SECRET,
        secretLength: process.env.CRON_SECRET?.length || 0,
      },
    },
  };

  // Test Perplexity API
  if (process.env.RISE_UP_PERPLEXITY) {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RISE_UP_PERPLEXITY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      results.checks.perplexity.apiWorking = response.ok;
      results.checks.perplexity.statusCode = response.status;
    } catch (error) {
      results.checks.perplexity.apiWorking = false;
      results.checks.perplexity.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Test Telegram Bot API
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`
      );
      const data = await response.json();

      results.checks.telegram.botToken.apiWorking = data.ok;
      if (data.ok) {
        results.checks.telegram.botToken.botUsername = data.result.username;
      }
    } catch (error) {
      results.checks.telegram.botToken.apiWorking = false;
      results.checks.telegram.botToken.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Test Firebase/Firestore
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const { isFirestoreAvailable } = await import('@/lib/firestore');
      results.checks.firebase.firestoreAvailable = isFirestoreAvailable();
    } catch (error) {
      results.checks.firebase.firestoreAvailable = false;
      results.checks.firebase.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  const allConfigured =
    results.checks.perplexity.configured &&
    results.checks.telegram.botToken.configured &&
    results.checks.telegram.userApi.apiId &&
    results.checks.telegram.userApi.apiHash &&
    results.checks.telegram.userApi.sessionString &&
    results.checks.firebase.serviceAccount &&
    results.checks.cloudflare.apiToken &&
    results.checks.apify.configured &&
    results.checks.vapid.publicKey &&
    results.checks.vapid.privateKey &&
    results.checks.cron.secret;

  return NextResponse.json({
    success: allConfigured,
    message: allConfigured
      ? '✅ All API keys and tokens are configured correctly'
      : '⚠️ Some API keys or tokens are missing',
    ...results,
  });
}
