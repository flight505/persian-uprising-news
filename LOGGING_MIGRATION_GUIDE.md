# Logging Migration Guide

## Overview

Replace 613 console.log statements with structured logging for better observability, security, and performance.

## New Logging Utility

Location: `lib/logger.ts`

Features:
- ✅ Environment-aware (dev vs production)
- ✅ Structured JSON output
- ✅ Automatic sensitive data redaction
- ✅ Error tracking integration (Sentry ready)
- ✅ Performance timing utilities
- ✅ HTTP request logging

## Migration Patterns

### Pattern 1: Simple Info Logging

```typescript
// ❌ Before
console.log('🔄 Starting news refresh...');
console.log('✅ Fetched 50 articles');

// ✅ After
import { logger } from '@/lib/logger';

logger.info('news_refresh_started');
logger.info('articles_fetched', { count: 50 });
```

### Pattern 2: Error Logging

```typescript
// ❌ Before
console.error('Error fetching incidents:', error);

// ✅ After
logger.error('incidents_fetch_failed', {
  error: error.message,
  stack: error.stack,
  endpoint: '/api/incidents',
});
```

### Pattern 3: Debug Logging

```typescript
// ❌ Before
console.log('Cache hit for key:', key);
console.log('TTL:', ttl);

// ✅ After
logger.debug('cache_hit', {
  key,
  ttl,
  size_bytes: value.length,
});
```

### Pattern 4: Performance Timing

```typescript
// ❌ Before
const start = Date.now();
await fetchData();
console.log(`Fetch took ${Date.now() - start}ms`);

// ✅ After
const endTimer = logger.time('data_fetch', { source: 'telegram' });
await fetchData();
endTimer(); // Automatically logs duration
```

### Pattern 5: HTTP Request Logging

```typescript
// ❌ Before
console.log(`${method} ${path} - ${statusCode} - ${duration}ms`);

// ✅ After
logger.http(method, path, statusCode, duration, {
  user_id: userId,
  ip: clientIp,
});
```

### Pattern 6: Conditional Logging

```typescript
// ❌ Before
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// ✅ After
logger.debug('debug_info', { data }); // Automatically filtered
```

## Migration Priority

### Phase 1: Core Services (High Impact)
1. `lib/services/news/news-service.ts` - 10 console statements
2. `lib/services/incidents/incident-service.ts` - 4 console statements
3. `lib/translation.ts` - 3 console statements
4. `lib/firestore.ts` - 4 console statements
5. `lib/telegram-user-api.ts` - 7 console statements

### Phase 2: API Routes (Security Impact)
6. `app/api/news/route.ts` - 7 console statements
7. `app/api/incidents/route.ts` - 3 console statements
8. `app/api/translate/route.ts` - 1 console statement
9. `app/api/cron/fetch-telegram/route.ts` - 4 console statements

### Phase 3: Components (Low Priority)
10. Client-side components (use sparingly in production)

## Naming Conventions

Use snake_case for log message identifiers:

### ✅ Good Examples
- `user_login_success`
- `api_request_failed`
- `cache_invalidated`
- `db_connection_timeout`
- `news_refresh_started`

### ❌ Bad Examples
- `User logged in successfully` (too verbose)
- `Error!` (not descriptive)
- `test123` (meaningless)

## Context Best Practices

### ✅ Include Useful Context
```typescript
logger.info('article_saved', {
  article_id: article.id,
  source: article.source,
  topics: article.topics,
  duration_ms: 150,
});
```

### ❌ Avoid Sensitive Data
```typescript
// Don't include:
logger.info('user_created', {
  password: user.password,        // ❌ Sensitive
  api_key: process.env.API_KEY,   // ❌ Secret
  credit_card: user.ccNumber,     // ❌ PII
});

// Instead:
logger.info('user_created', {
  user_id: user.id,               // ✅ Safe
  email_domain: user.email.split('@')[1], // ✅ Anonymized
});
```

## Automated Migration Script

```bash
# Create a migration script
cat > scripts/migrate-logging.ts << 'EOF'
#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

const patterns = [
  // Simple console.log
  {
    find: /console\.log\('🔄 Starting (.+?)\.\.\.'\)/g,
    replace: "logger.info('$1_started')",
  },
  {
    find: /console\.log\('✅ (.+?)'\)/g,
    replace: "logger.info('$1')",
  },
  {
    find: /console\.error\('Error (.+?):', error\)/g,
    replace: "logger.error('$1_failed', { error: error.message, stack: error.stack })",
  },
];

function migrateFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  for (const pattern of patterns) {
    if (pattern.find.test(content)) {
      content = content.replace(pattern.find, pattern.replace);
      modified = true;
    }
  }

  if (modified) {
    // Add import at top if not present
    if (!content.includes("from '@/lib/logger'")) {
      content = "import { logger } from '@/lib/logger';\n" + content;
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Migrated: ${filePath}`);
  }
}

// Find all TypeScript files
const files = process.argv.slice(2);
files.forEach(migrateFile);
EOF

chmod +x scripts/migrate-logging.ts

# Run on specific files
npx tsx scripts/migrate-logging.ts lib/services/news/news-service.ts
```

## Testing

### Unit Tests
```typescript
import { logger } from '@/lib/logger';

// Mock console in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('logs info message', () => {
  logger.info('test_message', { foo: 'bar' });
  expect(console.log).toHaveBeenCalled();
});
```

## Production Setup

### 1. Add Sentry Integration

```typescript
// lib/logger.ts - Update sendToErrorTracking()
private sendToErrorTracking(entry: LogEntry) {
  if (typeof window !== 'undefined' && window.Sentry) {
    Sentry.captureMessage(entry.message, {
      level: entry.level.toLowerCase() as SeverityLevel,
      extra: entry.context,
    });
  }
}
```

### 2. Environment Variables

```bash
# .env.production
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=INFO
```

### 3. Next.js Instrumentation

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}
```

## Performance Impact

### Before (613 console.log statements)
- ❌ Blocking I/O on every log
- ❌ No filtering in production
- ❌ Large logs in browser console
- ❌ No aggregation possible

### After (Structured Logging)
- ✅ Environment-aware filtering
- ✅ JSON format for log aggregation
- ✅ Automatic sensitive data redaction
- ✅ Integration with monitoring tools
- ✅ ~30% reduction in log volume (production)

## Monitoring Dashboard

Once migrated, you can use tools like:
- **Datadog**: Query `service:rise-up-news level:ERROR`
- **Sentry**: Automatic error grouping
- **CloudWatch**: Parse JSON logs
- **ELK Stack**: Full-text search on structured logs

## Rollout Plan

### Week 1: Core Services
- Migrate `lib/services/` directory (50 statements)
- Test thoroughly in development

### Week 2: API Routes
- Migrate `app/api/` directory (80 statements)
- Deploy to staging

### Week 3: Client Components
- Migrate client-side logging (100 statements)
- Add Sentry browser integration

### Week 4: Cleanup
- Remove remaining console statements (383 statements)
- Set up production monitoring
- Document common log queries

## Success Metrics

- [ ] Zero console.log in production code
- [ ] Error tracking integrated
- [ ] Log volume reduced by 30%
- [ ] Response time for debugging reduced by 50%
- [ ] Sentry capturing 100% of production errors

## FAQ

**Q: Should I remove all console statements?**
A: Keep console.error for critical errors, but replace console.log/warn with logger.

**Q: What about client-side logging?**
A: Use logger.debug for client-side, but sparingly (performance impact).

**Q: How do I debug in production?**
A: Set up log aggregation (DataDog/CloudWatch) and query by trace_id or user_id.

**Q: What if I need to log before logger is initialized?**
A: Use console.error only for initialization failures.

## Support

If you encounter issues during migration:
1. Check existing examples in migrated files
2. Review this guide
3. Test in development first
4. Ask for code review before deploying
