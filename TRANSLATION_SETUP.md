# Translation Feature - Implementation Guide

## Overview

The Persian Uprising News app now includes automatic translation support for Farsi (Persian) content using the Google Cloud Translation API. This feature allows users to translate Farsi articles to English with a single click, with intelligent caching and RTL text support.

## Features Implemented

### 1. Translation Service (`lib/translation.ts`)
- **Single Translation**: Translate individual text strings
- **Batch Translation**: Translate multiple texts efficiently in a single API call
- **Language Detection**: Automatic detection of Farsi vs English content
- **Memory Caching**: 10-minute TTL cache to reduce API calls
- **Error Handling**: Graceful fallback when translation service is unavailable

### 2. Translation API Endpoint (`app/api/translate/route.ts`)
- **POST /api/translate**: Translate text from Farsi to English or vice versa
- **Rate Limiting**: 100 requests per hour per IP address
- **Request Validation**: Input sanitization and length limits (10,000 chars)
- **Auto-Detection**: Automatically detect source language if not provided
- **Error Responses**: Clear error messages for rate limits, validation, and service issues

### 3. Enhanced NewsCard Component
- **Language Detection**: Automatic Farsi detection using Unicode range [\u0600-\u06FF]
- **Translation Toggle**: "Translate to English" / "Show Original" button
- **RTL Support**: Proper right-to-left text direction for Farsi content
- **Loading States**: Visual feedback during translation
- **Language Indicator**: 🇮🇷 Farsi badge for Persian articles
- **Smooth Transitions**: Fade animations between original and translated text

### 4. IndexedDB Translation Cache (`lib/offline-db.ts`)
- **Persistent Storage**: Translations cached locally for 7 days
- **Offline Access**: Previously translated articles work offline
- **Automatic Cleanup**: Old translations removed after 7 days
- **Database Schema**: New `translations` store (DB version 2)

### 5. User Experience Features
- **One-Click Translation**: No configuration needed
- **Cached Translations**: Instant load for previously translated articles
- **Toggle Display**: Switch between original and translated text
- **Error Messages**: Clear feedback when translation fails
- **Accessibility**: Proper `dir` and `textAlign` attributes for RTL

## Cost Analysis

### Free Tier (Sufficient for MVP)
- **Storage**: 1 GB
- **Characters**: 500,000 per month
- **Cost**: $0

### Expected Usage
- Average article: ~400 characters (title + summary)
- 88 Farsi articles: 35,200 characters (one-time)
- Monthly new articles: ~100 articles × 400 chars = 40,000 chars
- **Total monthly**: ~75,000 characters (15% of free tier)

### Cost Beyond Free Tier
- **$20 per 1 million characters**
- At scale (1000 users × 10 translations/month): 4M chars = $80/month
- With caching (70% reduction): ~1.2M chars = $24/month

## Setup Instructions

### 1. Install Dependencies

Already installed:
```bash
npm install @google-cloud/translate
```

### 2. Configure Environment Variables

Added to `.env`:
```bash
# Google Cloud Translation API
GOOGLE_CLOUD_PROJECT=coiled-cloud
GOOGLE_APPLICATION_CREDENTIALS=/Users/jesper/rise-up-firebase-key.json
```

### 3. Verify Service Account Key

Key file location: `~/rise-up-firebase-key.json`

Check permissions:
```bash
ls -la ~/rise-up-firebase-key.json
# Should show: -rw------- (600 permissions)
```

### 4. Enable Translation API (If Not Already Enabled)

```bash
gcloud services enable translate.googleapis.com --project=coiled-cloud
```

Check if enabled:
```bash
gcloud services list --enabled --project=coiled-cloud | grep translate
```

### 5. Test Translation API

Test the endpoint:
```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "سلام دنیا",
    "targetLang": "en",
    "autoDetect": true
  }'
```

Expected response:
```json
{
  "translatedText": "Hello world",
  "detectedLanguage": "fa",
  "sourceLang": "fa",
  "targetLang": "en",
  "cached": false
}
```

## Architecture

### Translation Flow

```
User clicks "Translate" on Farsi article
         ↓
Check IndexedDB cache for existing translation
         ↓
If cached → Load instantly
         ↓
If not cached → POST to /api/translate
         ↓
API checks memory cache (10 min TTL)
         ↓
If not in memory → Call Google Cloud Translation API
         ↓
Return translated text + cache in IndexedDB
         ↓
Display translated text with fade transition
```

### Caching Strategy

1. **Memory Cache (Server)**: 10 minutes TTL, reduces duplicate API calls
2. **IndexedDB (Client)**: 7 days TTL, enables offline translations
3. **Rate Limiting**: 100 requests/hour per IP, prevents abuse

### RTL Text Handling

Farsi articles automatically get:
- `dir="rtl"` attribute on text elements
- `textAlign: 'right'` CSS property
- Proper Unicode rendering for Persian script

When translated to English:
- Switches to `dir="ltr"`
- `textAlign: 'left'`
- Smooth transition animation

## API Reference

### POST /api/translate

**Request Body**:
```typescript
{
  text: string;              // Required, max 10,000 chars
  sourceLang?: 'fa' | 'en';  // Optional, auto-detect if not provided
  targetLang: 'fa' | 'en';   // Required
  autoDetect?: boolean;      // Optional, default: false
}
```

**Success Response (200)**:
```typescript
{
  translatedText: string;
  detectedLanguage: string;
  sourceLang: string;
  targetLang: string;
  cached: boolean;
}
```

**Error Responses**:
- `400`: Invalid request (missing text, invalid language, text too long)
- `429`: Rate limit exceeded (100 requests/hour)
- `503`: Translation service unavailable
- `500`: Internal server error

### GET /api/translate

Returns API documentation:
```json
{
  "message": "Translation API endpoint",
  "supportedLanguages": ["en", "fa"],
  "rateLimit": "100 requests per hour per IP",
  "usage": { ... }
}
```

## Database Schema

### IndexedDB: `translations` Store

```typescript
interface Translation {
  articleId: string;        // Primary key
  originalText: string;     // Original Farsi text
  translatedText: string;   // English translation
  sourceLang: 'fa' | 'en';  // Source language
  targetLang: 'fa' | 'en';  // Target language
  cachedAt: number;         // Timestamp (for expiration)
}
```

**Indexes**:
- `articleId` (primary key)
- `cachedAt` (for cleanup queries)

**Cleanup Policy**:
- Translations older than 7 days are automatically deleted
- Cleanup runs after each new translation is cached

## Usage Examples

### Translate Article in NewsCard

```tsx
// Automatic detection and caching
<NewsCard
  id="article-123"
  title="عنوان فارسی"
  summary="خلاصه متن فارسی"
  url="https://example.com"
  publishedAt="2025-01-12T00:00:00Z"
  topics={["iran.now"]}
  source="telegram"
/>
```

### Manual Translation API Call

```typescript
const response = await fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'سلام دنیا',
    targetLang: 'en',
    autoDetect: true,
  }),
});

const data = await response.json();
console.log(data.translatedText); // "Hello world"
```

### Check Translation Cache

```typescript
import { offlineDB } from '@/lib/offline-db';

const cached = await offlineDB.getCachedTranslation('article-123');
if (cached) {
  console.log('Cached translation:', cached.translatedText);
} else {
  console.log('No cached translation found');
}
```

## Monitoring

### Translation Statistics

Check cache size:
```typescript
import { getTranslationStats } from '@/lib/translation';

const stats = getTranslationStats();
console.log(`Cached translations: ${stats.cachedTranslations}`);
```

### Database Statistics

```typescript
const stats = await offlineDB.getStats();
console.log(`Articles: ${stats.articles}`);
console.log(`Pending Reports: ${stats.pendingReports}`);
console.log(`Translations: ${stats.translations}`);
```

### Rate Limit Status

Rate limits are per-IP and reset every hour. If a user hits the limit:
- They'll receive a 429 error
- Error message: "Rate limit exceeded. Please try again later."
- Can retry after 1 hour

## Production Deployment

### Vercel Environment Variables

Add to Vercel project settings:

1. `GOOGLE_CLOUD_PROJECT=coiled-cloud`
2. `GOOGLE_APPLICATION_CREDENTIALS` → Upload service account key as file

**Steps**:
1. Go to Vercel Project → Settings → Environment Variables
2. Add `GOOGLE_CLOUD_PROJECT` with value `coiled-cloud`
3. Upload `~/rise-up-firebase-key.json` as a file upload
4. Redeploy application

### Security Considerations

**Service Account Key**:
- Never commit to GitHub (already in `.gitignore`)
- Store securely in Vercel environment
- Use minimal IAM permissions (only `roles/translate.user`)

**Rate Limiting**:
- Currently IP-based (100 req/hour)
- Can be upgraded to user-based with authentication
- Consider Cloudflare for DDoS protection

**API Key Rotation**:
- Rotate service account keys every 90 days
- Use Google Cloud IAM for key management
- Monitor usage in Google Cloud Console

## Future Enhancements

### Planned Features
- [ ] Auto-translate setting in user preferences
- [ ] Support for more languages (Arabic, Turkish)
- [ ] Translation confidence scores
- [ ] Batch translate all visible articles
- [ ] Translation quality feedback
- [ ] Google Gemini Pro integration (cheaper + better context)

### Performance Optimizations
- [ ] Batch API calls for multiple articles
- [ ] Service Worker cache for translations
- [ ] Preload translations for popular articles
- [ ] CDN caching for common phrases

### User Experience
- [ ] Translation preview on hover
- [ ] Side-by-side view (original + translation)
- [ ] Copy translated text button
- [ ] Share translated article link

## Troubleshooting

### "Translation service unavailable"

**Cause**: Google Cloud Translation API not enabled or credentials invalid

**Fix**:
```bash
# Check if API is enabled
gcloud services list --enabled --project=coiled-cloud | grep translate

# Enable if not enabled
gcloud services enable translate.googleapis.com --project=coiled-cloud

# Verify credentials
gcloud auth application-default print-access-token
```

### "Rate limit exceeded"

**Cause**: More than 100 requests in 1 hour from same IP

**Fix**:
- Wait 1 hour for rate limit to reset
- Or adjust rate limit in `app/api/translate/route.ts`:
  ```typescript
  const RATE_LIMIT = 200; // Increase limit
  ```

### Translation not caching

**Cause**: IndexedDB not initialized or article missing `id` prop

**Fix**:
- Ensure `<NewsCard id={article.id} ... />` has `id` prop
- Check browser console for IndexedDB errors
- Clear IndexedDB and refresh: `await offlineDB.clearTranslations()`

### RTL text not displaying correctly

**Cause**: Browser doesn't support RTL or CSS overriding direction

**Fix**:
- Check that `dir="rtl"` attribute is present in DevTools
- Ensure no global CSS is overriding `text-align`
- Test in Chrome/Firefox (best RTL support)

## Resources

- **Google Cloud Translation API**: https://cloud.google.com/translate/docs
- **Pricing Calculator**: https://cloud.google.com/products/calculator
- **Supported Languages**: https://cloud.google.com/translate/docs/languages
- **RTL Best Practices**: https://material.io/design/usability/bidirectionality.html
- **IndexedDB Guide**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

## Cost Monitoring

Track usage in Google Cloud Console:
1. Go to https://console.cloud.google.com/
2. Select project: `coiled-cloud`
3. Navigate to: Translation API → Quotas & System Limits
4. Monitor: Characters translated, API calls, costs

Set up budget alerts:
```bash
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Translation API Budget" \
  --budget-amount=10 \
  --threshold-rule=percent=50,basis=current-spend
```

---

**Status**: ✅ Fully Implemented and Ready for Testing
**Last Updated**: 2025-01-12
**Next Steps**: Enable Google Cloud Translation API and test with real Farsi articles
