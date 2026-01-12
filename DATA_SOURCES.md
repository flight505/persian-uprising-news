# Data Sources & Channels

## Overview

Persian Uprising News aggregates information from multiple sources to provide comprehensive coverage of the ongoing Iran protests (January 2026). This document lists all tracked sources and explains how to suggest new ones.

## Current Data Sources

### 1. Telegram Channels (Primary Source)

Telegram is our main source for real-time updates. We use the Telegram User API (MTProto) to monitor public channels without requiring admin access.

#### Verified High-Frequency Channels

**Top 3 - Most Reliable:**
- **@BBCPersian** - BBC Persian
  - International verification standards
  - Posts: 10-20/day
  - Languages: Farsi, English
  - [View Channel](https://t.me/BBCPersian)

- **@IranIntlTV** - Iran International
  - Top opposition news network
  - Posts: 20-30/day
  - 24/7 live updates
  - [View Channel](https://t.me/IranIntlTV)

- **@RadioFarda** - Radio Farda (RFE/RL)
  - Human rights focus
  - Posts: 15-25/day
  - US government-funded
  - [View Channel](https://t.me/RadioFarda)

**Live Updates & Clash Reports:**
- **@ClashReport** - Real-time clash maps and videos
  - Hourly updates during active protests
  - Posts: 50+ videos/day
  - [View Channel](https://t.me/ClashReport)

- **@noel_reports** - Protest analysis and recaps
  - Daily situation reports
  - Geographic breakdowns
  - [View Channel](https://t.me/noel_reports)

- **@irbriefing** - Iran briefing threads
  - Hashtag: #iranbriefing
  - Daily summaries
  - [View Channel](https://t.me/irbriefing)

**Official/Government Perspective:**
- **@Irna_en** - IRNA State Media (English)
  - Official government statements
  - Balance against opposition sources
  - [View Channel](https://t.me/Irna_en)

**Citizen Journalism:**
- **@vahidonline** - Citizen videos from protests
  - Direct footage from protesters
  - Unverified but valuable
  - [Instagram Alternative](https://instagram.com/vahidonline)

#### Additional Verified Channels (Available)

We can add these channels - currently commented out to manage API quota:

- **@ManotoTV** - Manoto TV (entertainment + news)
- **@IranWireFA** - IranWire Farsi (investigative journalism)
- **@AvaToday** - Ava Today (news network)

### 2. Twitter/X (Planned Integration)

Twitter provides real-time updates from journalists, activists, and eyewitnesses.

#### Key Hashtags:
- `#IranProtests`
- `#MahsaAmini`
- `#OpIran`
- `#IranRevolution`
- `#زن_زندگی_آزادی` (Woman Life Freedom in Farsi)

#### Key Accounts to Track:
- [@AlinejadMasih](https://twitter.com/AlinejadMasih) - Iranian activist (1M+ followers)
- [@1500tasvir](https://twitter.com/1500tasvir) - Protest documentation
- [@IranIntl](https://twitter.com/IranIntl) - Iran International Twitter
- [@BBCPersian](https://twitter.com/BBCPersian) - BBC Persian Twitter
- [@RadioFarda_](https://twitter.com/RadioFarda_) - Radio Farda Twitter

**Implementation Status:**
- ✅ Backend integration complete (Apify scraper)
- ⏳ Currently using mock data in development
- 📋 Production deployment pending

### 3. Reddit (Planned Integration)

Reddit communities provide crowdsourced information and verification.

#### Subreddits:
- **r/NewIran** (100k+ members)
  - Main protest discussion hub
  - Real-time updates
  - User-submitted videos
  - [View Subreddit](https://reddit.com/r/NewIran)

- **r/iranian** (50k+ members)
  - Mixed perspectives
  - Political discussions
  - [View Subreddit](https://reddit.com/r/iranian)

**Implementation Status:**
- ⏳ Integration planned
- Reddit API authentication required
- Will fetch top posts hourly

### 4. Perplexity API (Secondary Source)

AI-powered news synthesis from web sources.

**Topics Tracked:**
- `iran.now` - Current events
- `leaders.world_statements` - International response
- `top.breaking_global` - Breaking news
- `iran.statements_official` - Government statements

**Benefits:**
- Synthesizes information from 50+ sources
- Automatic summarization
- Fact-checked content

**Limitations:**
- 10-minute aggregation delay
- Lower priority than primary sources
- Cost: $3.60/month (720 API calls with optimization)

### 5. Instagram (Manual Tracking)

Instagram provides visual documentation of protests.

**Key Accounts:**
- @vahidonline - Citizen videos
- @bbcpersian - BBC Persian Instagram
- @iranintl - Iran International Instagram

**Current Status:**
- Manual monitoring only
- API integration not planned (Instagram API restrictions)
- Users can submit Instagram links via "Suggest Source" feature

### 6. YouTube (Future Integration)

Live streams and video documentation.

**Channels to Track:**
- Iran International (24/7 live news)
- BBC Persian (news broadcasts)
- VOA Persian (Voice of America)

**Current Status:**
- Not implemented
- Low priority (most video content already on Telegram)

## How to Suggest New Sources

We welcome community suggestions for additional news sources!

### Using the Web Interface

1. Click **"📡 Suggest Source"** button on the homepage
2. Select source type (Telegram, Twitter, Reddit, etc.)
3. Enter channel handle/URL
4. Explain why we should track this source
5. Submit for admin review

### What Makes a Good Suggestion?

✅ **Good Sources:**
- High posting frequency (10+ posts/day)
- Verified content (fact-checked or from trusted reporters)
- Unique coverage (not duplicating existing sources)
- English or Farsi language
- Public/open access

❌ **Poor Sources:**
- Propaganda or misinformation
- Low activity (< 5 posts/week)
- Duplicate content from existing sources
- Paywalled or private
- Spam or bot accounts

### Example Suggestions

**Good Example:**
```
Type: Telegram
Handle: @IranWireFA
Reason: "IranWire provides investigative journalism not covered by other sources.
They have reporters inside Iran and post 15-20 verified articles per day.
500k+ subscribers."
```

**Poor Example:**
```
Type: Telegram
Handle: @randomuser123
Reason: "has good content"
```

## Source Priority & Deduplication

### Priority Hierarchy

1. **Tier 1: Primary Sources** (10-minute cache)
   - Telegram channels (@BBCPersian, @IranIntlTV, @RadioFarda)
   - Direct eyewitness accounts

2. **Tier 2: Verified Secondary** (30-minute cache)
   - Twitter/X verified accounts
   - Reddit r/NewIran posts with high upvotes

3. **Tier 3: AI Synthesis** (1-hour cache)
   - Perplexity API aggregation
   - Used for overview/context

### Deduplication

We use **MinHash + LSH algorithm** to detect duplicate articles:

- **80% similarity threshold** - Articles with >80% textual similarity are considered duplicates
- **SHA-256 hashing** - Exact duplicate detection
- **24-hour window** - Only check for duplicates within last 24 hours

This ensures you don't see the same story multiple times from different sources.

## API Costs & Quotas

### Current Monthly Costs

| Source | Cost | Quota | Status |
|--------|------|-------|--------|
| Telegram API | $0.00 | Unlimited | ✅ Active |
| Perplexity API | $3.60 | 720 calls/month | ✅ Active |
| Twitter/Apify | $7.00 | 50 runs/day | ⏳ Mock data |
| Reddit API | $0.00 | 100 requests/min | ⏳ Planned |
| **Total** | **$10.60** | | **47% under $20 budget** |

### Cost Optimization

We aggressively optimize API costs:

1. **Intelligent Batching** - Combine multiple queries into one API call
2. **Multi-Layer Caching** - Cloudflare CDN + SWR client-side caching
3. **Adaptive Polling** - Slower updates during off-peak hours
4. **Deduplication** - Skip processing duplicate articles

**Result:** 87% reduction in API costs compared to naive implementation.

## Data Freshness

### Update Intervals

- **Telegram**: Real-time (WebSocket updates)
- **Twitter**: Every 10 minutes
- **Reddit**: Every 30 minutes
- **Perplexity**: Every 10 minutes
- **User Reports**: Instant

### Cache Strategy

```
┌─────────────────────────────────────┐
│  Client (SWR)      5-10 min cache  │
├─────────────────────────────────────┤
│  Cloudflare CDN    5 min cache     │
├─────────────────────────────────────┤
│  API Routes        10 min cache    │
├─────────────────────────────────────┤
│  Firestore         Persistent      │
└─────────────────────────────────────┘
```

## Verification & Moderation

### Content Verification

- **Official Sources** (BBC, VOA): Auto-verified
- **Opposition Sources** (Iran Intl): Verified badge + manual review
- **Citizen Reports**: Unverified badge + AI moderation

### AI Moderation

We use **Claude Haiku** to filter spam and misinformation:

- Automatic rejection of obvious spam
- Flagging suspicious content for manual review
- Cost: ~$0.25 per 1000 reports

### Manual Review

Admin dashboard for reviewing:
- User-submitted channel suggestions
- Flagged incidents
- Unverified reports

Access: `GET /api/channels/suggest` with `x-admin-secret` header

## Integration Guides

### For Developers

#### Adding a New Telegram Channel

1. Update `lib/telegram-user-api.ts`:
   ```typescript
   const MONITORED_CHANNELS = [
     '@BBCPersian',
     '@YourNewChannel',  // Add here
   ];
   ```

2. Verify channel is public: `https://t.me/YourNewChannel`

3. Test locally: `npm run dev` → Check `/api/news`

4. Deploy: `vercel --prod`

#### Adding a New Twitter Account

1. Update `lib/twitter.ts` (when implemented):
   ```typescript
   const TRACKED_ACCOUNTS = [
     'AlinejadMasih',
     'YourNewAccount',  // Add here
   ];
   ```

2. Apify actor will automatically scrape the account

#### Adding a New Reddit Subreddit

1. Update `lib/reddit.ts` (when implemented):
   ```typescript
   const TRACKED_SUBREDDITS = [
     'NewIran',
     'YourNewSubreddit',  // Add here
   ];
   ```

2. Requires Reddit API credentials

## FAQ

### Q: Why isn't my suggested channel approved yet?

A: Channel suggestions are reviewed manually within 24-48 hours. We verify:
- Channel authenticity
- Content quality
- Posting frequency
- Relevance to Iran protests

### Q: Can I track private Telegram channels?

A: No. We only track public channels to respect privacy and terms of service.

### Q: How do I remove a source?

A: Email the admin or open a GitHub issue. We periodically review source quality.

### Q: Can I add international news sources (CNN, Al Jazeera)?

A: Yes, but only if they have dedicated Iran coverage. General news sites are too broad.

### Q: Why do some articles have "Mock Data" labels?

A: In development mode, Twitter integration uses mock data to avoid API costs. Production will use real data.

### Q: How can I help improve data sources?

A:
1. Suggest high-quality channels via the web interface
2. Report spam or misinformation
3. Contribute code (GitHub)
4. Share the app with trusted sources

## Related Documentation

- **Setup Guide**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Map Features**: [MAP_ENHANCEMENT_GUIDE.md](./MAP_ENHANCEMENT_GUIDE.md)
- **Search & Performance**: [SEARCH_AND_PERFORMANCE.md](./SEARCH_AND_PERFORMANCE.md)
- **API Documentation**: See `/app/api/` endpoints

## Contact

- **Project**: Persian Uprising News Aggregator
- **GitHub**: [flight505](https://github.com/flight505/)
- **Issues**: Report bugs or suggest features via GitHub Issues

---

**Last Updated**: January 12, 2026
**Version**: 2.0.0 (Multi-Source Integration)
