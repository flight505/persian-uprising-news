# Map Enhancement Guide

## Overview

This guide documents the major enhancements to the incident map system, including automatic incident extraction from Telegram articles, interactive timeline filtering, heatmap visualization, and improved user experience.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     News Aggregation                         │
│  (Perplexity API + Telegram Channels + Twitter Scraping)   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Incident Extraction Pipeline                      │
│  1. NLP Pattern Matching (Farsi + English)                  │
│  2. Location Detection & Geocoding (Nominatim)              │
│  3. Confidence Scoring & Filtering                          │
│  4. Deduplication & Storage (Firestore)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Interactive Map Visualization                   │
│  • Timeline Slider (30-day range)                           │
│  • Heatmap Layer (incident density)                         │
│  • Incident Detail Modal                                    │
│  • Type Filtering (protest/arrest/injury/death)             │
│  • Marker Clustering                                        │
└─────────────────────────────────────────────────────────────┘
```

## Features Implemented

### 1. Automatic Incident Extraction

**Location**: `/lib/incident-extractor.ts`

Automatically extracts incident information from news articles using NLP pattern matching.

**Supported Incident Types**:
- **Protest**: اعتراض, تظاهرات, protest, demonstration
- **Arrest**: بازداشت, دستگیر, arrest, detained
- **Injury**: زخمی, مجروح, injured, wounded
- **Death**: کشته, قتل, killed, fatal

**Extraction Process**:
1. **Keyword Detection**: Scans article content for incident-related keywords (weighted scoring)
2. **Location Extraction**: Identifies Iranian cities and locations (50+ cities supported)
3. **Confidence Scoring**: 0-100% based on keyword matches and location presence
4. **Title/Description Generation**: Extracts relevant sentences from article
5. **Timestamp Extraction**: Parses dates from article metadata or content

**Confidence Thresholds**:
- **80-100%**: High confidence (multiple keywords, specific location)
- **60-79%**: Medium confidence (some keywords, generic location)
- **40-59%**: Low confidence (minimal keywords or no location)
- **<40%**: Rejected (insufficient evidence)

**Example Output**:
```typescript
{
  type: 'protest',
  title: 'Large demonstration in Tehran',
  description: 'Thousands gathered in central Tehran demanding political reform...',
  location: 'Tehran',
  confidence: 85,
  extractedFrom: {
    articleId: 'telegram-12345',
    articleTitle: 'Breaking: Protests in Tehran',
    articleUrl: 'https://t.me/iranintl/12345',
    source: 'telegram'
  },
  timestamp: 1704067200000,
  keywords: ['اعتراض', 'تظاهرات', 'protest']
}
```

### 2. Geocoding Service

**Location**: `/lib/geocoder.ts`

Converts location names to geographic coordinates using OpenStreetMap Nominatim API.

**Features**:
- **Predefined Coordinates**: 60+ Iranian cities with exact coordinates (instant lookup)
- **Nominatim API Fallback**: For locations not in predefined list
- **Rate Limiting**: 1 request/second to respect API limits
- **Caching**: In-memory cache to avoid duplicate API calls
- **Confidence Levels**: High/Medium/Low based on geocoding accuracy

**Supported Cities** (partial list):
- Tehran, Mashhad, Isfahan, Shiraz, Tabriz
- Karaj, Qom, Ahvaz, Kermanshah, Rasht
- And 50+ more cities across Iran

**Usage**:
```typescript
const geocoded = await geocodeLocation('Tehran');
// Returns: { lat: 35.6892, lon: 51.389, address: 'Tehran, Iran', confidence: 'high' }
```

### 3. Incident Extraction API

**Endpoint**: `/app/api/incidents/extract/route.ts`

REST API for extracting incidents from articles.

**POST /api/incidents/extract**

Request body:
```json
{
  "articles": [
    {
      "id": "telegram-123",
      "title": "Protests in Tehran",
      "content": "Full article content...",
      "url": "https://t.me/channel/123",
      "source": "telegram",
      "publishedAt": "2025-01-12T10:00:00Z"
    }
  ],
  "autoSave": true
}
```

Response:
```json
{
  "success": true,
  "extractedCount": 12,
  "savedCount": 8,
  "incidents": [
    {
      "type": "protest",
      "title": "Large demonstration in Tehran",
      "location": { "lat": 35.6892, "lon": 51.389, "address": "Tehran, Iran" },
      "confidence": 85,
      "verified": false,
      ...
    }
  ]
}
```

**GET /api/incidents/extract/stats**

Returns extraction statistics:
```json
{
  "geocoding": {
    "cacheSize": 45,
    "predefinedCount": 60,
    "totalCached": 45
  },
  "extractionThreshold": 40,
  "supportedTypes": ["protest", "arrest", "injury", "death"]
}
```

### 4. Timeline Slider

**Location**: `/app/components/Map/TimelineSlider.tsx`

Interactive timeline for filtering incidents by date range.

**Features**:
- Dual-handle range slider (30-day window)
- Bar chart visualization showing incident count per day
- Real-time filtering as slider moves
- Date labels and incident count display

**Visual Elements**:
- Blue bars for incidents in selected range
- Gray bars for incidents outside range
- Height represents incident density

### 5. Heatmap Visualization

**Location**: `/app/components/Map/IncidentMap.tsx`

Density-based heatmap overlay showing incident hotspots.

**Features**:
- Weighted by incident severity:
  - Death: 1.0 (red)
  - Injury: 0.7 (orange)
  - Arrest: 0.5 (yellow)
  - Protest: 0.3 (blue)
- Toggle on/off via "Show Heatmap" button
- Dynamic updates based on filters

**Configuration**:
```typescript
{
  radius: 25,        // Heat radius in pixels
  blur: 35,          // Blur amount
  maxZoom: 17,       // Max zoom for heatmap
  gradient: {
    0.0: '#0000ff', // Blue (low)
    0.5: '#ffff00', // Yellow (medium)
    1.0: '#ff0000'  // Red (high)
  }
}
```

### 6. Incident Detail Modal

**Location**: `/app/components/Map/IncidentModal.tsx`

Full-screen modal showing detailed incident information.

**Displays**:
- Incident type badge with verification status
- Location coordinates and address
- Timestamp and engagement metrics
- Confidence score (for auto-extracted incidents)
- Extraction keywords (for debugging)
- Related articles with source links
- Images (if available)
- Social sharing buttons (Twitter, copy link)

**Admin Features** (when `isAdmin=true`):
- "Verify Incident" button for unverified incidents

### 7. Quick Report from Articles

**Location**: `/app/components/NewsFeed/NewsCard.tsx`

One-click incident reporting directly from news articles.

**Flow**:
1. User clicks "Report Incident from This Article" button on NewsCard
2. Article metadata stored in sessionStorage
3. User redirected to `/report` page
4. Report form pre-filled with article details

**Stored Data**:
```typescript
{
  articleId: string,
  articleTitle: string,
  articleUrl: string,
  articleContent: string,
  articleSource: string
}
```

### 8. Integrated Extraction Pipeline

**Location**: `/app/api/news/route.ts`

Automatic extraction triggered when new Telegram articles are fetched.

**Process**:
1. News aggregation fetches articles from sources
2. Articles deduplicated and saved to Firestore
3. **Background task**: Extract incidents from Telegram articles
4. Geocode extracted locations
5. Filter by confidence threshold (≥40%)
6. Save verified incidents to Firestore
7. Link to source articles

**Logging Example**:
```
🔄 Fetching fresh news from sources...
📱 Received 4 articles from Telegram (Mock)
📊 Extracted 12 potential incidents
🗺️ Geocoding 9 unique locations...
✅ Geocoded 9 locations
✅ Saved 8/12 auto-extracted incidents to Firestore
```

## Database Schema

### Incidents Collection (Firestore)

```typescript
interface Incident {
  id: string;                          // Auto-generated UUID
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;                       // Max 200 chars
  description: string;                 // Max 500 chars
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  images?: string[];                   // Cloudflare URLs
  verified: boolean;                   // Manual verification flag
  reportedBy: 'crowdsource' | 'official';
  timestamp: number;                   // Incident occurrence time
  upvotes: number;
  createdAt: number;                   // Database creation time
  confidence?: number;                 // 0-100 (for auto-extracted)
  keywords?: string[];                 // Extraction keywords
  relatedArticles?: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}
```

## Testing

### Manual Test

Run the extraction test script:

```bash
npm run test:extraction
# or
npx tsx scripts/test-extraction.ts
```

Expected output:
- 5 mock articles processed
- 12 incidents extracted
- 9 unique locations geocoded
- 12 incidents ready for storage
- Type breakdown: 4 arrests, 2 injuries, 4 protests, 2 deaths

### Integration Test

1. Start development server: `npm run dev`
2. Navigate to `/map`
3. Verify timeline slider works
4. Toggle heatmap on/off
5. Click incident markers to open modal
6. Filter by incident type
7. Adjust date range and verify filtering

## Performance Optimization

### Geocoding Optimization

- **Predefined coordinates**: 60+ cities = instant lookup
- **In-memory caching**: Avoids duplicate API calls
- **Rate limiting**: 1 req/sec = complies with Nominatim policy
- **Batch processing**: Geocodes all locations in parallel (respecting rate limits)

**Cost**: FREE (OpenStreetMap Nominatim)

### Extraction Optimization

- **Background processing**: Doesn't block news fetch
- **Confidence filtering**: Only saves high-quality incidents (≥40%)
- **Deduplication**: Prevents duplicate incidents from multiple articles
- **Batch geocoding**: Geocodes unique locations only

**Processing Time**: ~5-10 seconds for 20 articles

### Map Performance

- **Marker clustering**: Groups nearby markers at low zoom levels
- **Lazy loading**: Only loads incidents in viewport (future enhancement)
- **Heatmap toggle**: User can disable for better performance
- **Date filtering**: Reduces visible incidents on map

## Cost Analysis

### Current Costs (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| OpenStreetMap Nominatim | $0 | Free API, rate limited |
| Perplexity API | $3.60 | 720 calls/month with batching |
| Telegram Bot API | $0 | Free, unlimited |
| Vercel Hosting | $0 | Free tier |
| Firestore | $0 | Free tier (50k reads, 20k writes) |
| **Total** | **$3.60** | **82% under $20 budget** |

### Estimated Usage with Auto-Extraction

| Operation | Daily | Monthly | Cost |
|-----------|-------|---------|------|
| News fetches | 144 | 4,320 | $0 (cached) |
| Incident extractions | 144 | 4,320 | $0 (local processing) |
| Geocoding API calls | 50 | 1,500 | $0 (free, cached) |
| Firestore writes | 100 | 3,000 | $0 (under free tier) |
| Firestore reads | 1,000 | 30,000 | $0 (under free tier) |

## Future Enhancements

### Short-term (1-2 weeks)

- [ ] Incident verification workflow (admin dashboard)
- [ ] Duplicate detection for auto-extracted incidents
- [ ] Image extraction from Telegram messages
- [ ] Multi-language support for extracted incidents

### Medium-term (1-2 months)

- [ ] Machine learning for better extraction accuracy
- [ ] Sentiment analysis for incident severity
- [ ] Real-time incident updates via WebSocket
- [ ] Mobile app (React Native)

### Long-term (3+ months)

- [ ] Video processing and analysis
- [ ] Cross-source incident correlation
- [ ] Predictive analytics for protest patterns
- [ ] International expansion (other countries)

## Troubleshooting

### Extraction Issues

**Problem**: No incidents extracted from articles
- Check article content has Farsi or English keywords
- Verify location mentions (city names)
- Lower confidence threshold (currently 40%)

**Problem**: Incorrect location geocoding
- Add city to predefined coordinates in `/lib/geocoder.ts`
- Check Nominatim API rate limits (1 req/sec)

### Map Issues

**Problem**: Heatmap not showing
- Verify `leaflet.heat` is installed: `npm list leaflet.heat`
- Check browser console for errors
- Try toggling heatmap off and on

**Problem**: Timeline slider not filtering
- Check incident timestamps are valid numbers
- Verify date range calculation in TimelineSlider

### Performance Issues

**Problem**: Map slow with many incidents
- Enable marker clustering (already implemented)
- Reduce date range filter
- Disable heatmap layer

**Problem**: Extraction taking too long
- Check Nominatim API response time
- Verify rate limiting is working (1 req/sec)
- Consider caching more cities in predefined list

## Maintenance

### Daily Tasks

- [ ] Check extraction logs for errors
- [ ] Review new auto-extracted incidents
- [ ] Verify geocoding accuracy

### Weekly Tasks

- [ ] Update predefined city coordinates if needed
- [ ] Review extraction confidence scores
- [ ] Check Nominatim API usage

### Monthly Tasks

- [ ] Analyze extraction patterns and adjust keywords
- [ ] Review cost usage (Firestore, APIs)
- [ ] Update documentation with lessons learned

## References

### Documentation

- [OpenStreetMap Nominatim](https://nominatim.org/release-docs/develop/api/Overview/)
- [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat)
- [React Leaflet](https://react-leaflet.js.org/)
- [Firestore](https://firebase.google.com/docs/firestore)

### Code Locations

| Component | Path |
|-----------|------|
| Incident Extractor | `/lib/incident-extractor.ts` |
| Geocoder | `/lib/geocoder.ts` |
| Extraction API | `/app/api/incidents/extract/route.ts` |
| Timeline Slider | `/app/components/Map/TimelineSlider.tsx` |
| Incident Modal | `/app/components/Map/IncidentModal.tsx` |
| Map Component | `/app/components/Map/IncidentMap.tsx` |
| Map Page | `/app/map/page.tsx` |
| News API | `/app/api/news/route.ts` |

## Contact & Support

For questions or issues:
- GitHub: [flight505](https://github.com/flight505/)
- Project: Persian Uprising News Aggregator

---

**Last Updated**: January 12, 2026
**Version**: 1.0.0
