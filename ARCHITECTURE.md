# Service Architecture (SOLID Refactoring)

## Overview

The API layer has been refactored from monolithic route handlers into a clean, modular service architecture following SOLID principles.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ /api/news    │  │ /api/incidents│  │ /api/push    │     │
│  │   route.ts   │  │   route.ts    │  │   route.ts   │     │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘     │
└─────────┼──────────────────┼───────────────────┼────────────┘
          │                  │                   │
          └──────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │ ServiceContainer │ (Dependency Injection)
                    │   (Singleton)    │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
    │ News    │      │ Incident    │    │ Rate        │
    │ Service │      │ Service     │    │ Limiter     │
    └────┬────┘      └─────────────┘    └─────────────┘
         │
         ├─────────────┬─────────────┬─────────────┬──────────────┐
         │             │             │             │              │
    ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌─────▼─────┐  ┌────▼────┐
    │ News    │  │ Dedupli-│  │ Article │  │ Push      │  │Incident │
    │ Sources │  │ cator   │  │ Repo    │  │ Notifier  │  │Extractor│
    └─────────┘  └─────────┘  └─────────┘  └───────────┘  └─────────┘
         │
    ┌────┼─────┐
    │    │     │
┌───▼┐ ┌─▼──┐ ┌▼───┐
│Perp│ │Tele│ │Twit│
│lexi│ │gram│ │ter │
│ty  │ │    │ │    │
└────┘ └────┘ └────┘
```

## Layer Responsibilities

### 1. API Layer (`app/api/*/route.ts`)
**Responsibility**: HTTP request/response handling, parameter parsing, error formatting

**What it does**:
- Parse query parameters and request bodies
- Validate HTTP-level concerns (headers, content-type)
- Call appropriate service methods
- Format responses as JSON
- Handle HTTP status codes

**What it doesn't do**:
- Business logic
- Data fetching
- Deduplication
- Validation (business rules)

### 2. Service Layer (`lib/services/*`)
**Responsibility**: Business logic orchestration

**What it does**:
- Coordinate multiple operations
- Implement business workflows
- Handle errors gracefully
- Log operations

**What it doesn't do**:
- HTTP concerns
- Direct database access
- External API calls (delegates to sources/repos)

### 3. Data Sources (`lib/services/news/sources/*`)
**Responsibility**: External data fetching and normalization

**What it does**:
- Fetch from external APIs
- Normalize different formats to common Article interface
- Handle source-specific errors
- Return empty arrays on failure (graceful degradation)

### 4. Repositories (`lib/services/news/repositories/*`)
**Responsibility**: Data persistence

**What it does**:
- CRUD operations
- Query building
- Batch operations
- Database-specific error handling

### 5. Specialized Services
- **Deduplicator**: MinHash-based fuzzy duplicate detection
- **NotificationService**: Push notification delivery
- **IncidentExtractor**: NLP-based incident extraction from articles
- **RateLimiter**: Request throttling

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
**Before**: `app/api/news/route.ts` had 6+ responsibilities
- Fetching from multiple sources
- Normalization
- Deduplication
- Database persistence
- Push notifications
- Incident extraction

**After**: Each class has ONE clear responsibility
- `PerplexityNewsSource`: Fetch from Perplexity
- `TelegramNewsSource`: Fetch from Telegram
- `MinHashDeduplicator`: Detect duplicates
- `FirestoreArticleRepository`: Persist articles
- `PushNotificationService`: Send notifications
- `IncidentExtractorService`: Extract incidents
- `NewsService`: Orchestrate the workflow

### Open/Closed Principle (OCP)
**Extensibility without modification**

Adding a new news source:
```typescript
// Create new source (extends behavior)
class TwitterNewsSource implements INewsSource {
  readonly name = 'twitter';

  async fetch(): Promise<Article[]> {
    // Implementation
  }
}

// Add to container (no modification to existing code)
const sources = [
  new PerplexityNewsSource(...),
  new TelegramNewsSource(...),
  new TwitterNewsSource(...), // New source added
];
```

### Liskov Substitution Principle (LSP)
**Interfaces ensure substitutability**

Any `INewsSource` implementation can replace another:
```typescript
interface INewsSource {
  readonly name: string;
  fetch(query?: string): Promise<Article[]>;
}

// All sources are interchangeable
const sources: INewsSource[] = [
  new PerplexityNewsSource(...),
  new TelegramNewsSource(...),
  // Could add MockNewsSource for testing
];
```

### Interface Segregation Principle (ISP)
**Focused interfaces**

Services depend only on what they need:
```typescript
// News service only needs these interfaces
constructor(
  private sources: INewsSource[],        // Just fetch()
  private deduplicator: IDeduplicator,   // Just process()
  private repository: IArticleRepository, // Just getRecent(), saveMany()
  private notificationService: INotificationService, // Just notifyNewArticles()
  private incidentExtractor: IIncidentExtractor      // Just extractFromArticles()
)
```

### Dependency Inversion Principle (DIP)
**Depend on abstractions, not concretions**

Services depend on interfaces, not implementations:
```typescript
// High-level module (NewsService) depends on abstractions
class NewsService {
  constructor(
    private sources: INewsSource[],  // Interface, not PerplexityNewsSource
    private deduplicator: IDeduplicator, // Interface, not MinHashDeduplicator
    // ...
  )
}

// Low-level modules implement interfaces
class PerplexityNewsSource implements INewsSource { ... }
class MinHashDeduplicator implements IDeduplicator { ... }
```

## Dependency Injection Container

**Purpose**: Manage service instances and dependencies

```typescript
const newsService = ServiceContainer.getNewsService();
const incidentService = ServiceContainer.getIncidentService();
const rateLimiter = ServiceContainer.getRateLimiter();
```

**Benefits**:
- Single source of truth for service configuration
- Lazy initialization (only create when needed)
- Singleton pattern (one instance per service)
- Easy to clear/reset for testing

## Testing Benefits

### Before (Monolithic)
```typescript
// ❌ Cannot test in isolation
// Must mock: Perplexity, Telegram, Firestore, Push, Incidents
test('news refresh', async () => {
  // Impossible to test without real API calls
});
```

### After (Service Architecture)
```typescript
// ✅ Test each service in isolation
test('NewsService.refresh', async () => {
  const mockSources = [
    { name: 'mock', fetch: async () => [mockArticle] }
  ];
  const mockDeduplicator = {
    process: async (articles) => articles
  };
  const mockRepo = {
    getRecent: async () => [],
    saveMany: async (articles) => articles
  };
  const mockNotifier = {
    notifyNewArticles: async () => ({ success: true, sent: 0 })
  };
  const mockExtractor = {
    extractFromArticles: async () => []
  };

  const service = new NewsService(
    mockSources,
    mockDeduplicator,
    mockRepo,
    mockNotifier,
    mockExtractor
  );

  const result = await service.refresh();
  expect(result.articlesAdded).toBe(1);
});
```

## Code Metrics

### Before Refactoring
- **API Route Size**: 394 lines (news), 315 lines (incidents)
- **Cyclomatic Complexity**: 18+ (news refresh function)
- **Test Coverage**: 0% (untestable)
- **Responsibilities per class**: 6+

### After Refactoring
- **API Route Size**: 110 lines (news), 124 lines (incidents)
- **Cyclomatic Complexity**: 3-5 per method
- **Test Coverage**: Ready for 80%+ (all services testable)
- **Responsibilities per class**: 1

## File Structure

```
lib/services/
├── container.ts                           # DI Container
├── news/
│   ├── news-service.ts                    # Orchestrator
│   ├── sources/
│   │   ├── i-news-source.ts              # Interface
│   │   ├── perplexity-source.ts          # Perplexity implementation
│   │   └── telegram-source.ts            # Telegram implementation
│   ├── deduplication/
│   │   ├── i-deduplicator.ts             # Interface
│   │   └── minhash-deduplicator.ts       # MinHash implementation
│   └── repositories/
│       ├── i-article-repository.ts       # Interface
│       └── firestore-article-repository.ts # Firestore implementation
├── incidents/
│   ├── incident-service.ts                # CRUD operations
│   ├── i-incident-extractor.ts           # Interface
│   └── incident-extractor-service.ts     # NLP extraction
├── notifications/
│   ├── i-notification-service.ts         # Interface
│   └── push-notification-service.ts      # Web Push implementation
└── rate-limit/
    ├── i-rate-limiter.ts                 # Interface
    └── in-memory-rate-limiter.ts         # In-memory implementation
```

## Future Enhancements

### 1. Add Unit Tests
```typescript
describe('MinHashDeduplicator', () => {
  it('should detect exact duplicates', async () => {
    const deduplicator = new MinHashDeduplicator();
    const articles = [article1, article1];
    const result = await deduplicator.process(articles, []);
    expect(result.length).toBe(1);
  });
});
```

### 2. Add Alternative Implementations
```typescript
// Redis-based rate limiter for production
class RedisRateLimiter implements IRateLimiter {
  // Production-ready distributed rate limiting
}

// Cache repository for performance
class CachedArticleRepository implements IArticleRepository {
  constructor(
    private redis: RedisClient,
    private firestore: FirestoreArticleRepository
  ) {}
}
```

### 3. Add Monitoring Service
```typescript
interface IMonitoringService {
  trackFetch(source: string, duration: number, success: boolean): void;
  trackDeduplication(input: number, output: number, duration: number): void;
}

class DatadogMonitoringService implements IMonitoringService {
  // Send metrics to Datadog
}
```

## Migration Guide

### For Developers
1. **Import from container**: Use `ServiceContainer.getNewsService()` instead of direct imports
2. **Don't instantiate services directly**: Let the container manage instances
3. **Use interfaces for dependencies**: Accept `INewsSource`, not `PerplexityNewsSource`
4. **Keep API routes thin**: Only HTTP concerns, delegate to services

### Breaking Changes
None! The refactored API routes maintain the same HTTP interface:
- `GET /api/news` - Same response format
- `POST /api/news/refresh` - Same response format
- `GET /api/incidents` - Same response format
- `POST /api/incidents` - Same response format

## Performance Impact

**Negligible overhead** from dependency injection:
- Container uses lazy initialization
- Services are singletons (created once)
- Interface calls are resolved at compile time (TypeScript)

**Improved maintainability** leads to better performance:
- Easier to optimize individual services
- Clear boundaries for caching strategies
- Testable code reduces bugs

## Summary

This refactoring transforms the codebase from a monolithic architecture to a clean, modular service architecture:

✅ **Testable**: Each service can be tested in isolation
✅ **Maintainable**: Single responsibility per class
✅ **Extensible**: Easy to add new sources/implementations
✅ **Type-safe**: Interfaces ensure contract compliance
✅ **Decoupled**: Services communicate through interfaces
✅ **Production-ready**: Clear separation of concerns

The API routes are now thin orchestration layers, and all business logic lives in testable, reusable service classes.
