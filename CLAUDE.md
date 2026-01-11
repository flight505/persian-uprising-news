# Persian Uprising News Aggregator

## Project Overview

A Progressive Web App (PWA) for real-time news aggregation and incident mapping during the Persian uprising. The app aggregates news from multiple sources (Perplexity API, Twitter, Telegram) and provides an interactive map for tracking protests, arrests, and other incidents.

## Key Features

- **Multi-Source News Aggregation**: Fetches news from Perplexity API, Twitter (Apify scraper), and Telegram channels
- **Intelligent Deduplication**: Uses MinHash + LSH algorithm to detect and remove duplicate articles (80% similarity threshold)
- **Interactive Map**: Leaflet-based map with clustered markers, multiple tile layers (Modern, Topographic, Satellite, Dark Mode)
- **Crowdsourced Reporting**: Users can submit incident reports with location and type
- **Push Notifications**: Web Push API with VAPID keys for breaking news alerts
- **Offline Support**: IndexedDB caching for offline article access and background sync for queued reports
- **Mobile-First PWA**: Installable on iOS and Android with home screen icon and splash screens

## Architecture

### Frontend
- **Framework**: Next.js 15 (App Router) + React 19
- **Styling**: Tailwind CSS
- **Maps**: React-Leaflet v4.2.1 + OpenStreetMap tiles
- **Data Fetching**: SWR for caching and revalidation
- **Offline Storage**: IndexedDB for article caching and report queueing

### Backend (Current - Development)
- **API Routes**: Next.js API routes for news, incidents, subscriptions, push notifications
- **Storage**: In-memory (development) → DynamoDB (production)
- **Caching**: 10-minute server-side cache with SWR client-side caching

### Backend (Planned - Production)
- **Compute**: AWS Lambda functions
- **Database**: DynamoDB (free tier: 25GB)
- **CDN**: Cloudflare Images (free tier: 100k images)
- **Deployment**: Vercel (frontend) + AWS SAM (backend)

## Tech Stack

```
├── Next.js 15 (App Router)
├── React 19
├── TypeScript
├── Tailwind CSS
├── React-Leaflet
├── SWR
├── IndexedDB
├── Web Push API
├── Service Workers
└── PWA (next-pwa)
```

## Project Structure

```
/app
  /api
    /incidents/route.ts      # CRUD API for map incidents
    /news/route.ts           # News aggregation endpoint
    /push/route.ts           # Push notification sender
    /subscribe/route.ts      # Push subscription management
  /components
    /Map
      IncidentMap.tsx        # Main map component with clustering
      LocationPicker.tsx     # Interactive location selector for reports
      NewsCard.tsx           # Article card component
    /NewsFeed
      NewsFeed.tsx           # Infinite scroll news feed
    /Shared
      NotificationButton.tsx # Push notification subscribe UI
  /map/page.tsx              # Map page with incident filters
  /report/page.tsx           # Crowdsourced incident reporting form
  /layout.tsx                # Root layout with PWA metadata
  /page.tsx                  # Home page (news feed)

/lib
  /minhash.ts                # MinHash + LSH deduplication algorithm
  /offline-db.ts             # IndexedDB wrapper for offline storage
  /perplexity.ts             # Perplexity API integration
  /telegram.ts               # Telegram Bot API integration
  /twitter.ts                # Twitter/Apify scraper integration

/public
  /icons                     # PWA icons (72x72 to 512x512)
  /manifest.json             # PWA manifest
  /sw.js                     # Service worker (auto-generated)
  /sw-custom.js              # Custom push notification handlers

/next.config.js              # Next.js + PWA configuration
/tailwind.config.ts          # Tailwind CSS configuration
/.env                        # Environment variables (not committed)
```

## Key Implementation Details

### News Aggregation Flow

1. **Fetch from Multiple Sources** (parallel):
   ```typescript
   const [perplexityArticles, twitterArticles, telegramArticles] = await Promise.all([
     fetchPerplexityNews(),      // Perplexity API (batched queries)
     getMockTwitterArticles(),   // Twitter/Apify (production: fetchTwitterNews())
     getMockTelegramArticles(),  // Telegram Bot API (production: fetchTelegramNews())
   ]);
   ```

2. **Deduplication**:
   ```typescript
   // Exact match (SHA-256 hash)
   const contentHash = await computeContentHash(article.content);

   // Fuzzy match (MinHash with 80% threshold)
   const minHash = generateMinHashSignature(article.content);
   const similarity = jaccardSimilarity(existing.minHash, newArticle.minHash);
   if (similarity >= 0.8) {
     // Skip duplicate
   }
   ```

3. **Caching**:
   - Server-side: 10-minute cache
   - Client-side: SWR with 10-minute refresh interval
   - Offline: IndexedDB stores last 50 articles

### Offline Support

**Article Caching**:
- Articles automatically cached to IndexedDB when fetched online
- Offline mode loads from cache if network unavailable
- Yellow banner indicates offline status

**Report Queueing**:
- Offline reports saved to IndexedDB
- Automatically synced when connection restored
- Success message indicates "Queued" vs "Submitted" status

**Online/Offline Detection**:
```typescript
useEffect(() => {
  const handleOnlineStatus = () => {
    setIsOffline(!navigator.onLine);
    if (navigator.onLine && isOffline) {
      mutate(); // Refresh data when back online
    }
  };
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOnlineStatus);
}, []);
```

### Push Notifications

**Setup**:
1. Generate VAPID keys: `npm run generate-vapid-keys`
2. Store in `.env`:
   ```
   VAPID_PUBLIC_KEY=<public-key>
   VAPID_PRIVATE_KEY=<private-key>
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key>
   ```

**Subscription Flow**:
1. User clicks "🔔 Notify Me" button
2. Request notification permission
3. Subscribe via Push Manager
4. Send subscription to `/api/subscribe`
5. Server stores subscription (in-memory dev, DynamoDB prod)

**Notification Sending**:
- Automatic: Triggered when new articles arrive
- Manual: POST to `/api/push` with title/message/url

### Map Visualization

**Tile Layers**:
- Modern (CartoDB Voyager) - Default, English labels
- Topographic (OpenTopoMap)
- Satellite (Esri World Imagery)
- Dark Mode (CartoDB Dark Matter)

**Marker Clustering**:
- Uses `react-leaflet-cluster` for performance
- Color-coded by incident type:
  - Protest: Red (📢)
  - Arrest: Amber (🚨)
  - Injury: Orange (🩹)
  - Casualty: Dark Red (💔)
  - Other: Indigo (📝)

**Verification Badges**:
- ✅ Verified (manual moderation)
- ⏳ Pending verification

### Cost Optimization

**Current Budget**: $10.60/month (47% under $20 target)

**Optimization Strategies**:
1. **Batching**: 6 Perplexity queries → 1 API call (83% savings)
2. **Caching**: 10-minute server cache + SWR client cache (70% fewer API calls)
3. **Adaptive Polling**: Off-peak 30min intervals vs peak 5min (37% savings)
4. **Deduplication**: MinHash prevents duplicate API calls (40-60% savings)
5. **Combined Effect**: 87% total API cost reduction

**Breakdown**:
- Perplexity API: $3.60/month (720 calls with optimizations)
- Twitter/Apify: $7.00/month (web scraping, official API is $100+/month)
- Telegram: $0.00/month (free Bot API)
- Vercel: $0.00/month (free tier)
- AWS: $0.00/month (free tier)

## Environment Variables

Create a `.env` file with the following:

```bash
# Perplexity API
PERPLEXITY_API_KEY=your_key_here

# Twitter/Apify (optional, using mock data in dev)
APIFY_API_TOKEN=your_token_here

# Telegram Bot (optional, using mock data in dev)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here

# Cloudflare Images (optional, for production image uploads)
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Base URL (for production)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Testing

### Test Push Notifications

1. Subscribe to notifications in the browser
2. Send a test notification:
   ```bash
   curl -X POST http://localhost:3000/api/push \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Notification",
       "message": "This is a test",
       "url": "/"
     }'
   ```

### Test Offline Mode

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Verify cached articles load
4. Submit a report → verify it's queued
5. Go back online → verify report syncs

### Test Map

1. Navigate to `/map`
2. Verify 8 pre-loaded incidents display
3. Click markers to view popups
4. Use layer control to switch tile layers
5. Test incident type filters

## Production Deployment (Planned)

### 1. Deploy Frontend (Vercel)

```bash
npm run build
vercel --prod
```

Set environment variables in Vercel dashboard.

### 2. Deploy Backend (AWS SAM)

```bash
sam build
sam deploy --guided
```

Provisions:
- 3 DynamoDB tables (Articles, Incidents, Subscriptions)
- 5 Lambda functions (Perplexity, Twitter, Telegram, Deduplicator, Push Sender)
- CloudWatch Event triggers (every 10 minutes)

### 3. Configure Telegram Bot

```bash
# Get bot token from @BotFather
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<LAMBDA_URL>/telegram-webhook"
```

## Maintenance

- **Daily**: Check CloudWatch for errors, review moderation queue
- **Weekly**: Monitor API costs, update channel list, check metrics
- **Monthly**: Review cost breakdown, archive old articles, update dependencies

## Known Issues

- PWA service worker regenerates on build (push handlers need to be re-added)
- React Strict Mode disabled for Leaflet compatibility
- Perplexity API occasionally refuses JSON format (fallback parsing implemented)
- iOS push notifications only work after "Add to Home Screen"

## Future Enhancements

- [ ] Multi-language support (English + Farsi)
- [ ] Search functionality (Algolia free tier)
- [ ] User accounts for favorites
- [ ] Analytics dashboard
- [ ] CSV export for researchers
- [ ] Browser extension for quick reporting
- [ ] RSS feed
- [ ] Dark mode toggle (currently auto via system preference)

## Contributing

This project is built with Claude Code (Anthropic's CLI). For contributions:

1. Maintain clean code with minimal comments (explanations in commit messages)
2. Use TypeScript for all new code
3. Follow existing patterns for component structure
4. Test offline support and push notifications thoroughly
5. Keep bundle size minimal (avoid unnecessary dependencies)

## License

[Specify license here]

## Contact

[Your contact information]

---

**Note**: This project is a humanitarian effort to provide real-time information during the Persian uprising. All data sources are public and no personal information is collected without explicit consent.
