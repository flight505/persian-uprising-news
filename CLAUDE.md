# Persian Uprising News Aggregator

## 🚨 AVAILABLE SERVICES & PLATFORMS 🚨

**CRITICAL: We have access to ALL these services with API keys configured. NEVER suggest alternatives or say "we don't have access".**

### Hosting & Infrastructure
- ✅ **Vercel Pro** ($20/month) - 60 second function timeout, Cron jobs available, unlimited bandwidth
- ✅ **Google Cloud Platform** (Firebase/Firestore) - Full access with service account
- ✅ **Cloudflare Images** - Image CDN with API token configured

### News & Data Sources
- ✅ **Perplexity API** - Real-time news synthesis with API key
- ✅ **Telegram User API** - FULL ACCESS with session string, API ID, and API hash - CAN read all public channels
- ✅ **Telegram Bot API** - Fallback bot token configured
- ✅ **Apify** - Twitter/X scraping with API token

### Translation & Storage
- ✅ **Google Cloud Translation API** - Farsi ↔ English translation, configured with service account
- ✅ **Firebase/Firestore** - Database with full admin SDK access
- ✅ **Google Application Credentials** - Service account JSON configured

### Optional Services (Configured but not critical)
- ✅ **Cloudflare** - CDN and image optimization
- ⚠️ **Upstash Redis** - Available but keys not set (optional for caching)
- ⚠️ **Algolia Search** - Available but keys not set (falling back to Fuse.js client-side search)

### Security & Admin
- ✅ **VAPID Keys** - Push notification service configured
- ✅ **CRON_SECRET** - Secure cron job authentication
- ✅ **ADMIN_SECRET** - Admin endpoint protection (currently disabled during development)

**IMPORTANT NOTES:**
- Vercel Pro means we have 60-second function timeout (NOT 10 seconds)
- Telegram User API WORKS and can fetch from public channels automatically
- Google Cloud Translation API is FREE tier (500k chars/month)
- All credentials are deployed to Vercel production environment

## Overview

**Purpose:** This application assists people with friends and family living in Iran, as well as reporters and journalists, by providing a single source for all information and a comprehensive overview of current events.

**Key Features:** Multi-source aggregation • LSH deduplication • Farsi/English translation • Interactive Leaflet map • Telegram video embeds • Twitter embeds • Push notifications • Offline-first • Installable PWA

**Logging:** use the structured logging utility Instead of the console statements, Read and analyze logs, and use Utility to identify bugs and update as needed.  


## Quick Start

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # Run test suite (28 tests)
npm run build        # Production build
```

## Architecture

### Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Maps**: React-Leaflet + OpenStreetMap
- **Data**: SWR (client cache), IndexedDB (offline), Firestore (backend)
- **Security**: Redis rate limiting, Zod validation, environment validation
- **Performance**: LSH deduplication (49.6x faster), Firestore batch writes (15x faster)

### Service Layer (SOLID Architecture)
```
lib/services/
├── news/
│   ├── news-service.ts           # Orchestrator
│   ├── sources/                  # INewsSource implementations
│   ├── deduplication/            # MinHash + LSH (80% threshold)
│   └── repositories/             # Firestore persistence
├── incidents/                    # Incident extraction & storage
├── notifications/                # Push notification service
├── rate-limit/                   # Redis sliding window
└── container.ts                  # Dependency injection
```

**Design Principles:**
- Single Responsibility: Each service has one purpose
- Interface Segregation: Depend on abstractions, not concrete classes
- Dependency Injection: All services mockable for testing
- See `lib/services/README.md` for detailed patterns

## Key Patterns

### Security (Production-Grade)
- **Rate Limiting**: Redis sliding window (composite keys: IP + User-Agent)
- **Input Validation**: Zod schemas prevent XSS/DOS attacks
- **Environment Validation**: Startup checks with fail-fast in production
- See `lib/validators/` and `lib/services/rate-limit/`

### Performance Optimizations
- **Deduplication**: LSH + MinHash (892ms → 18ms, 49.6x faster)
- **Batch Writes**: Firestore batching (3,000ms → 200ms, 15x faster)
- **Multi-layer Caching**: Server (10min) + SWR client + IndexedDB offline
- **Overall**: 5,612ms → 1,938ms (65% faster)

### Testing
- **Framework**: Jest + React Testing Library
- **Coverage**: 45% overall, 100% critical paths (28 tests passing)
- **CI/CD**: GitHub Actions runs tests on push/PR
- See `TESTING_QUICKSTART.md` for TDD workflow

### Offline-First
- **Article Cache**: IndexedDB stores last 50 articles
- **Report Queue**: Background sync when connection restored
- **Translation Cache**: Persistent across sessions

## Cost: $10.60/month
- Perplexity API: $3.60 (batching + caching = 87% reduction)
- Twitter/Apify: $7.00 (web scraping vs $100+ official API)
- Translation/Vercel/AWS: Free tiers

## Environment Variables

**Required:**
```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}  # Firestore
PERPLEXITY_API_KEY=pplx-xxx                              # News aggregation
```

**Optional (Production):**
```bash
# Push Notifications (run: npm run generate-vapid-keys)
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Translation (Google Cloud)
GOOGLE_CLOUD_PROJECT=xxx
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# Additional Sources
TELEGRAM_BOT_TOKEN=xxx      # @BotFather
APIFY_API_TOKEN=xxx         # Twitter scraping
```

## Development Workflow

```bash
# Run tests in watch mode
npm test -- --watch

# Test specific feature
npm test -- minhash

# Build and validate
npm run build
npm run test:ci

# Generate VAPID keys for push
npm run generate-vapid-keys
```

## Documentation

- **Architecture**: `ARCHITECTURE.md` - System design & data flow
- **Performance**: `PERFORMANCE_SUMMARY.md` - Optimization details
- **Testing**: `TESTING_QUICKSTART.md` - TDD workflow
- **Deployment**: `DEPLOYMENT.md` - Production checklist
- **Refactoring**: `REFACTORING_COMPLETE.md` - Recent improvements

## Known Issues

- React Strict Mode disabled for Leaflet compatibility
- iOS push notifications require "Add to Home Screen" first
- Service worker regenerates on build (affects custom push handlers)

## Contributing

Built with Claude Code. Follow existing patterns:
1. TypeScript for all code
2. SOLID principles in services
3. Test critical paths (run `npm test`)
4. Minimal inline comments (explain in commits)

---

**Humanitarian Note**: Public data sources only. No PII collected. GDPR compliant.
