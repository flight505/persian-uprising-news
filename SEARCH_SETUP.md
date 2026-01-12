# 🔍 Search Setup Guide

Quick setup guide for adding full-text search to your Persian Uprising News app.

## Quick Start (5 minutes)

The app works **out of the box** with Fuse.js (client-side search). For production with better performance, set up Algolia.

### Option 1: Use Fuse.js (No Setup Required) ✅

Just start the app - search will work automatically using Fuse.js:

```bash
npm run dev
# Press ⌘K or Ctrl+K to search
```

**Pros:**
- ✅ No setup required
- ✅ Works offline
- ✅ No API costs
- ✅ Persian language support

**Cons:**
- ⚠️ Slower for 1000+ articles
- ⚠️ No server-side caching
- ⚠️ Less advanced features (no typo tolerance, no faceted search)

### Option 2: Use Algolia (Recommended for Production) ⚡

Better performance with 10,000 free searches/month.

#### Step 1: Sign Up

1. Go to [algolia.com/users/sign_up](https://www.algolia.com/users/sign_up)
2. Create account (free tier)
3. Create an application (e.g., "RiseUp-News")

#### Step 2: Create Index

1. Click "Indices" → "Create Index"
2. Name: `articles`
3. Click "Create"

#### Step 3: Get API Keys

1. Go to "Settings" → "API Keys"
2. Copy:
   - Application ID
   - Search-Only API Key
   - Admin API Key

#### Step 4: Add to .env

```bash
# Add these to your .env file
NEXT_PUBLIC_ALGOLIA_APP_ID=your_app_id_here
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your_search_only_key_here
ALGOLIA_ADMIN_KEY=your_admin_key_here
ADMIN_SECRET=choose_a_random_secret
```

#### Step 5: Index Your Articles

Start the dev server:
```bash
npm run dev
```

Index articles (one-time setup):
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Authorization: Bearer your_admin_secret"
```

You should see:
```json
{
  "success": true,
  "articlesIndexed": 100,
  "message": "Articles indexed successfully"
}
```

#### Step 6: Test Search

```bash
# Search for "protest"
curl "http://localhost:3000/api/search?q=protest&limit=5"
```

Expected response:
```json
{
  "hits": [...],
  "nbHits": 42,
  "processingTimeMS": 45,
  "mode": "algolia"
}
```

**Done!** Search is now powered by Algolia ⚡

## Optional: Redis Caching (10x Faster)

Add Redis caching for 10x faster repeated searches.

### Step 1: Sign Up for Upstash

1. Go to [console.upstash.com](https://console.upstash.com/redis)
2. Sign up (free tier: 10k commands/day)
3. Click "Create Database"
4. Choose a region close to your users
5. Click "Create"

### Step 2: Get Credentials

1. Copy "REST URL"
2. Copy "REST Token"

### Step 3: Add to .env

```bash
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

### Step 4: Test Cache

```bash
# First request (slow - cache miss)
time curl "http://localhost:3000/api/news"
# ~450ms

# Second request (fast - cache hit)
time curl "http://localhost:3000/api/news"
# ~50ms ⚡
```

**Done!** Redis caching is now active 🚀

## Test Everything

Run the test suite:

```bash
npm run test-search
```

Expected output:
```
🔍 Testing Search Functionality

1. Testing basic search...
   ✅ Found 42 results in 125ms
   Mode: algolia
   Processing time: 45ms

2. Testing search with filters...
   ✅ Found 15 results in 89ms
   Filters applied: source, topics

3. Testing date range filter...
   ✅ Found 28 results in 76ms
   Date range: Last 7 days

4. Testing facets endpoint...
   ✅ Loaded facets in 34ms
   Sources: 3
   Topics: 8
   Channels: 12

5. Testing cache performance...
   First request: 450ms
   Second request: 52ms
   ✅ 88% faster with cache

✅ All tests completed!
```

## Deploy Firestore Indexes

For faster Firestore queries:

```bash
npm run deploy-indexes
```

Wait ~5 minutes for indexes to build.

## Troubleshooting

### "Search not working"

**Check 1:** Is Fuse.js initialized?
```bash
# In browser console, look for:
✅ Fuse.js initialized with 100 articles
```

**Check 2:** Are Algolia credentials correct?
```bash
echo $NEXT_PUBLIC_ALGOLIA_APP_ID
# Should output your app ID
```

**Check 3:** Re-index articles
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Authorization: Bearer your_admin_secret"
```

### "Redis not caching"

**Check 1:** Are credentials correct?
```bash
echo $UPSTASH_REDIS_REST_URL
# Should output your Redis URL
```

**Check 2:** Test connection
```bash
curl "$UPSTASH_REDIS_REST_URL/ping" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
# Should return: "PONG"
```

### "Firestore indexes failing"

**Check 1:** Are you logged in to Firebase?
```bash
firebase login
```

**Check 2:** Is project configured?
```bash
firebase use --add
# Select your project
```

**Check 3:** Deploy indexes
```bash
npm run deploy-indexes
```

## Cost Breakdown

### Free Tier Usage (Typical)

**Algolia:**
- Limit: 10,000 searches/month
- Typical: 2,000 searches/month
- Cost: **$0.00** ✅

**Upstash Redis:**
- Limit: 10,000 commands/day (300k/month)
- Typical: 50,000 commands/month
- Cost: **$0.00** ✅

**Google Firestore:**
- Limit: 50,000 reads/day (1.5M/month)
- Typical: 15,000 reads/day (with Redis)
- Cost: **$0.00** ✅

**Total: $0.00/month** (all within free tiers) 🎉

## Features

### Command Palette (⌘K)

Press `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) to open search:

- ⚡ Instant search (300ms debounce)
- 🕒 Recent searches (saved to localStorage)
- ⬆️⬇️ Keyboard navigation
- 📱 Mobile-friendly (full-screen)
- 🔌 Works offline with Fuse.js

### Advanced Filters

- **Source**: Perplexity, Telegram, Twitter
- **Date**: Last 24h, 7d, 30d, or custom range
- **Topics**: Multi-select checkboxes
- **Channel**: Telegram channels dropdown
- **Clear All**: Reset all filters at once

### Search API

```bash
# Basic search
GET /api/search?q=protest&limit=20

# With filters
GET /api/search?q=protest&source=telegram&topics=iran.now

# Date range
GET /api/search?q=protest&dateFrom=1704067200000&dateTo=1704153600000

# Pagination
GET /api/search?q=protest&page=2&limit=20
```

## Performance Targets

- ✅ Search response: < 100ms
- ✅ Cache hit: < 50ms
- ✅ Fuse.js search: < 300ms
- ✅ First Contentful Paint: < 1.5s
- ✅ Time to Interactive: < 3s
- ✅ Lighthouse Score: 90+

## Next Steps

1. ✅ Set up Algolia (optional)
2. ✅ Set up Redis (optional)
3. ✅ Deploy Firestore indexes
4. ✅ Test search with `npm run test-search`
5. ✅ Deploy to production

## Need Help?

- 📖 [Full Documentation](./SEARCH_AND_PERFORMANCE.md)
- 🐛 [Report Issue](https://github.com/your-repo/issues)
- 💬 [Discord Community](https://discord.gg/your-invite)

---

**Built with ❤️ for the Persian Uprising**
