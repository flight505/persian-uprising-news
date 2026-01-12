# Service Architecture

Clean, testable, SOLID-based service architecture for the Persian Uprising News app.

## Quick Start

```typescript
import { ServiceContainer } from '@/lib/services/container';

// Get services from container
const newsService = ServiceContainer.getNewsService();
const incidentService = ServiceContainer.getIncidentService();
const rateLimiter = ServiceContainer.getRateLimiter();

// Use services
const result = await newsService.refresh();
const incidents = await incidentService.getAll();
```

## Core Services

### NewsService
**Purpose**: Orchestrate news aggregation workflow

**Methods**:
- `refresh(): Promise<RefreshResult>` - Fetch, deduplicate, save, notify

**Usage**:
```typescript
const newsService = ServiceContainer.getNewsService();
const result = await newsService.refresh();
console.log(`Added ${result.articlesAdded} new articles`);
```

### IncidentService
**Purpose**: Manage incident CRUD operations

**Methods**:
- `getAll(filters?): Promise<Incident[]>` - Get incidents with optional filters
- `create(data): Promise<string>` - Create new incident
- `upvote(id): Promise<void>` - Upvote incident

**Usage**:
```typescript
const incidentService = ServiceContainer.getIncidentService();

// Get all incidents
const incidents = await incidentService.getAll();

// Get filtered incidents
const protests = await incidentService.getAll({
  type: 'protest',
  bounds: { north: 36, south: 35, east: 52, west: 51 }
});

// Create incident
const id = await incidentService.create({
  type: 'protest',
  title: 'Demonstration in Tehran',
  description: 'Large gathering in Azadi Square',
  location: { lat: 35.6892, lon: 51.3890 },
  verified: false,
  reportedBy: 'crowdsource',
  timestamp: Date.now(),
  upvotes: 0,
});
```

## Interfaces

### INewsSource
All news providers implement this interface.

```typescript
interface INewsSource {
  readonly name: string;
  fetch(query?: string): Promise<Article[]>;
}
```

**Implementations**:
- `PerplexityNewsSource` - Perplexity API
- `TelegramNewsSource` - Telegram channels

**Adding a new source**:
```typescript
class TwitterNewsSource implements INewsSource {
  readonly name = 'twitter';

  async fetch(): Promise<Article[]> {
    // Fetch from Twitter API
    const tweets = await fetchTwitter();
    // Normalize to Article format
    return tweets.map(normalize);
  }
}

// Add to container.ts
const sources = [
  new PerplexityNewsSource(...),
  new TelegramNewsSource(...),
  new TwitterNewsSource(...), // Added!
];
```

### IDeduplicator
Detects and removes duplicate articles.

```typescript
interface IDeduplicator {
  process(articles: Article[], recentArticles: ArticleWithHash[]): Promise<ArticleWithHash[]>;
  computeHash(content: string): Promise<string>;
}
```

**Implementations**:
- `MinHashDeduplicator` - MinHash + LSH algorithm (80% similarity threshold)

### IArticleRepository
Persist and retrieve articles.

```typescript
interface IArticleRepository {
  getRecent(hoursBack: number): Promise<ArticleWithHash[]>;
  saveMany(articles: ArticleWithHash[]): Promise<ArticleWithHash[]>;
  getById(id: string): Promise<ArticleWithHash | null>;
  getByContentHash(hash: string): Promise<ArticleWithHash | null>;
}
```

**Implementations**:
- `FirestoreArticleRepository` - Google Cloud Firestore

### INotificationService
Send push notifications.

```typescript
interface INotificationService {
  notifyNewArticles(articles: ArticleWithHash[]): Promise<NotificationResult>;
}
```

**Implementations**:
- `PushNotificationService` - Web Push API

### IIncidentExtractor
Extract incidents from articles using NLP.

```typescript
interface IIncidentExtractor {
  extractFromArticles(articles: ArticleWithHash[]): Promise<ExtractedIncident[]>;
}
```

**Implementations**:
- `IncidentExtractorService` - Keyword-based extraction with geocoding

### IRateLimiter
Throttle requests.

```typescript
interface IRateLimiter {
  checkLimit(identifier: string): boolean;
  reset(identifier: string): void;
}
```

**Implementations**:
- `InMemoryRateLimiter` - In-memory (5 requests/hour)

## Dependency Injection Container

**Purpose**: Manage service instances and dependencies.

```typescript
class ServiceContainer {
  static getNewsService(): NewsService
  static getIncidentService(): IncidentService
  static getRateLimiter(): IRateLimiter
  static clear(): void
  static has(serviceName: string): boolean
}
```

**Features**:
- **Singleton pattern**: One instance per service
- **Lazy initialization**: Create only when needed
- **Dependency wiring**: Services get their dependencies automatically
- **Testable**: Clear for testing

**Usage**:
```typescript
// Production
const newsService = ServiceContainer.getNewsService();
await newsService.refresh();

// Testing
ServiceContainer.clear(); // Reset for each test
const service = new NewsService(
  [mockSource],
  mockDeduplicator,
  mockRepository,
  mockNotifier,
  mockExtractor
);
```

## Testing

### Unit Test Example

```typescript
import { NewsService } from './news/news-service';

describe('NewsService', () => {
  it('should handle source failures gracefully', async () => {
    const mockSource = {
      name: 'mock',
      fetch: jest.fn().mockRejectedValue(new Error('API down')),
    };

    const mockDeduplicator = {
      process: jest.fn().mockResolvedValue([]),
      computeHash: jest.fn(),
    };

    const mockRepository = {
      getRecent: jest.fn().mockResolvedValue([]),
      saveMany: jest.fn().mockResolvedValue([]),
    };

    const mockNotifier = {
      notifyNewArticles: jest.fn().mockResolvedValue({ success: true, sent: 0 }),
    };

    const mockExtractor = {
      extractFromArticles: jest.fn().mockResolvedValue([]),
    };

    const service = new NewsService(
      [mockSource],
      mockDeduplicator,
      mockRepository,
      mockNotifier,
      mockExtractor
    );

    const result = await service.refresh();

    expect(result.articlesAdded).toBe(0);
    expect(mockSource.fetch).toHaveBeenCalled();
    expect(mockNotifier.notifyNewArticles).not.toHaveBeenCalled();
  });

  it('should deduplicate articles', async () => {
    const article = {
      id: '1',
      title: 'Test',
      summary: 'Test',
      content: 'Test article',
      source: 'mock',
      publishedAt: Date.now(),
    };

    const mockSource = {
      name: 'mock',
      fetch: jest.fn().mockResolvedValue([article]),
    };

    const mockDeduplicator = {
      process: jest.fn().mockImplementation((articles, recent) => {
        // Simulate deduplication
        return articles.filter(a => !recent.some(r => r.contentHash === a.contentHash));
      }),
      computeHash: jest.fn().mockResolvedValue('hash123'),
    };

    const recentArticle = {
      ...article,
      contentHash: 'hash123',
      minHash: [1, 2, 3],
      createdAt: Date.now(),
    };

    const mockRepository = {
      getRecent: jest.fn().mockResolvedValue([recentArticle]),
      saveMany: jest.fn().mockResolvedValue([]),
    };

    const service = new NewsService(
      [mockSource],
      mockDeduplicator,
      mockRepository,
      mock.notifier,
      mockExtractor
    );

    const result = await service.refresh();

    expect(mockDeduplicator.process).toHaveBeenCalledWith(
      expect.anything(),
      [recentArticle]
    );
    expect(result.articlesAdded).toBe(0); // Duplicate removed
  });
});
```

### Integration Test Example

```typescript
describe('NewsService Integration', () => {
  beforeEach(() => {
    ServiceContainer.clear();
  });

  it('should refresh news from real sources', async () => {
    // Uses real implementations from container
    const newsService = ServiceContainer.getNewsService();
    const result = await newsService.refresh();

    expect(result.articlesAdded).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeGreaterThan(Date.now() - 1000);
  });
});
```

## Performance Optimizations

### 1. LSH Index for Deduplication
**Before**: O(n*m) comparison - 200 recent × 50 new = 10,000 comparisons
**After**: O(n+k) lookup - 200 inserts + ~5 bucket lookups = ~250 operations

```typescript
// Automatic in MinHashDeduplicator
const lshIndex = createLSHIndex(recentArticles, 0.8);
if (lshIndex.isDuplicate(newArticle, 0.8)) {
  // Skip duplicate (O(k) lookup where k ≈ 5-10)
}
```

### 2. Batch Writes for Incidents
**Before**: N sequential Firestore writes
**After**: Batched writes (500 per batch)

```typescript
// Automatic in IncidentExtractorService
const batchWriter = new FirestoreBatchWriter(db);
const result = await batchWriter.writeBatch('incidents', incidentsToSave);
```

### 3. Parallel Source Fetching
```typescript
// Automatic in NewsService
const results = await Promise.allSettled(
  this.sources.map(source => source.fetch())
);
```

## Error Handling

### Graceful Degradation
Sources return empty arrays on failure:
```typescript
async fetch(): Promise<Article[]> {
  try {
    const result = await fetchPerplexityNews();
    return this.normalize(result);
  } catch (error) {
    console.error(`[${this.name}] Fetch failed:`, error);
    return []; // Graceful degradation
  }
}
```

### Error Propagation
Services log errors but don't crash:
```typescript
if (saved.length > 0) {
  this.notificationService.notifyNewArticles(saved).catch(err =>
    console.error('Failed to send push notification:', err)
  );
}
```

## Migration from Old Code

### Before (Monolithic)
```typescript
// app/api/news/route.ts (394 lines)
async function refreshNewsCache() {
  // 1. Fetch from sources
  const [perplexityArticles, telegramArticles] = await Promise.all([...]);

  // 2. Normalize
  const normalizedArticles = [...];

  // 3. Add hashes
  const processedArticles = await Promise.all([...]);

  // 4. Get recent articles
  const recentArticles = await getRecentArticles(24);

  // 5. Deduplicate
  const deduplicated = processedArticles.filter([...]);

  // 6. Save
  await saveArticles(deduplicated);

  // 7. Send notifications
  await sendPushNotification([...]);

  // 8. Extract incidents
  await extractIncidents([...]);
}
```

### After (Service Architecture)
```typescript
// app/api/news/route.ts (110 lines)
export async function POST() {
  const newsService = ServiceContainer.getNewsService();
  const result = await newsService.refresh(); // All logic encapsulated
  return NextResponse.json({ success: true, result });
}

// lib/services/news/news-service.ts (clean orchestration)
async refresh() {
  const articles = await this.fetchFromAllSources();
  const recentArticles = await this.repository.getRecent(24);
  const deduplicated = await this.deduplicator.process(articles, recentArticles);
  const saved = await this.repository.saveMany(deduplicated);

  if (saved.length > 0) {
    this.notificationService.notifyNewArticles(saved);
  }

  const incidents = await this.incidentExtractor.extractFromArticles(saved);

  return { articlesAdded: saved.length, incidentsExtracted: incidents.length };
}
```

## Best Practices

### 1. Depend on Interfaces
```typescript
// ✅ Good
constructor(private sources: INewsSource[]) {}

// ❌ Bad
constructor(private sources: PerplexityNewsSource[]) {}
```

### 2. Use Container for Service Access
```typescript
// ✅ Good
const newsService = ServiceContainer.getNewsService();

// ❌ Bad
const newsService = new NewsService(...); // Manual wiring
```

### 3. Keep API Routes Thin
```typescript
// ✅ Good
export async function POST() {
  const service = ServiceContainer.getNewsService();
  const result = await service.refresh();
  return NextResponse.json({ result });
}

// ❌ Bad
export async function POST() {
  // 100+ lines of business logic
}
```

### 4. Return Empty Arrays on Failure
```typescript
// ✅ Good
async fetch(): Promise<Article[]> {
  try {
    return await fetchData();
  } catch (error) {
    console.error(error);
    return []; // Graceful degradation
  }
}

// ❌ Bad
async fetch(): Promise<Article[]> {
  return await fetchData(); // Crashes on error
}
```

## See Also

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Full architecture documentation
- [CLAUDE.md](../../CLAUDE.md) - Project overview
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID) - Design principles reference
