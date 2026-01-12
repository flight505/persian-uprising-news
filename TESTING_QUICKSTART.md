# Testing Quick Start Guide

## Test Infrastructure Status

✅ **Test framework installed and configured**
✅ **Critical path tests written (MinHash deduplication)**
⚠️ **Component tests partially complete**
⚠️ **API tests need Next.js 15 compatibility fixes**

## Quick Commands

```bash
# Run all passing tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

## What's Working

### ✅ MinHash Deduplication Tests (33 tests, 100% passing)

**File**: `/Users/jesper/Projects/Dev_projects/Rise_up/lib/__tests__/minhash.test.ts`

These tests cover the core deduplication algorithm that prevents duplicate news articles:

- SHA-256 content hashing for exact duplicates
- MinHash signature generation for fuzzy matching
- Jaccard similarity calculation
- 80% similarity threshold detection
- Shingle (3-gram) generation
- Edge cases: empty text, special characters, Farsi support

**Coverage**: 100% of MinHash deduplicator

**Run only these tests**:
```bash
npm test -- lib/__tests__/minhash.test.ts
```

### ⚠️ Component Tests (Partial)

**File**: `/Users/jesper/Projects/Dev_projects/Rise_up/app/components/__tests__/NewsFeed.test.tsx`

Tests for the main news feed component including:
- Loading states
- Article rendering
- Offline detection
- Error handling

**Status**: Needs additional mocking for search/filter functionality

### ⚠️ API Tests (Infrastructure challenge)

**File**: `/Users/jesper/Projects/Dev_projects/Rise_up/app/api/__tests__/incidents.test.ts`

Tests for incident reporting API including:
- Input validation
- Rate limiting
- Firestore integration
- Error handling

**Status**: Next.js 15 Request/Response mocking needs refinement

## Test Structure

```
Rise_up/
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Global mocks and setup
├── lib/
│   └── __tests__/
│       ├── minhash.test.ts     # ✅ Core deduplication tests
│       └── test-utils.tsx      # Shared test utilities
├── app/
│   ├── api/
│   │   └── __tests__/
│   │       └── incidents.test.ts  # ⚠️ API route tests
│   └── components/
│       └── __tests__/
│           └── NewsFeed.test.tsx  # ⚠️ Component tests
└── .github/
    └── workflows/
        └── test.yml            # CI/CD workflow
```

## Writing New Tests

### 1. Unit Tests (Recommended starting point)

Create tests for pure functions and utilities:

```typescript
// lib/__tests__/my-utility.test.ts
import { myFunction } from '../my-utility';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### 2. Component Tests

Use test utilities for React components:

```typescript
// app/components/__tests__/MyComponent.test.tsx
import { renderWithProviders } from '@/lib/__tests__/test-utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render', () => {
    const { getByText } = renderWithProviders(<MyComponent />);
    expect(getByText('Hello')).toBeInTheDocument();
  });
});
```

### 3. API Tests

For simpler API testing, consider testing business logic separately:

```typescript
// lib/__tests__/api-logic.test.ts
import { validateIncident } from '../api-logic';

describe('validateIncident', () => {
  it('should reject invalid types', () => {
    expect(() => validateIncident({ type: 'invalid' }))
      .toThrow('Invalid incident type');
  });
});
```

## Coverage Goals

**Current**: ~45% (MinHash + utilities)
**Target**: 70% by Q1 2026

### Priority Areas for Additional Tests

1. **Translation service** (`lib/translation.ts`)
2. **News aggregation** (`lib/perplexity.ts`, `lib/telegram.ts`)
3. **Offline database** (`lib/offline-db.ts`)
4. **Search functionality** (`app/components/Search/`)
5. **Map components** (`app/components/Map/`)

## Troubleshooting

### Tests fail with "Request is not defined"

This is a Next.js 15 compatibility issue. Workaround:
- Test business logic separately from Next.js infrastructure
- Use lightweight mocks instead of full Request/Response objects
- Consider integration tests with actual HTTP server

### Tests timeout

- Ensure all `async` functions are properly `await`ed
- Use `waitFor` for React component updates
- Check for infinite loops in `useEffect` hooks

### Mock not working

- Ensure mocks are defined before imports
- Use `jest.mock()` at the top of the test file
- Clear mocks between tests with `jest.clearAllMocks()`

### Coverage not accurate

- Run with `--coverage` flag
- Check that files are not excluded in `jest.config.js`
- Ensure tests actually execute the code paths

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

**Workflow file**: `.github/workflows/test.yml`

The workflow:
1. Checks out code
2. Sets up Node.js 20
3. Installs dependencies
4. Runs linter
5. Runs tests with coverage
6. Uploads coverage to Codecov
7. Comments on PRs with coverage report

## Best Practices

1. **Write tests first** (TDD approach)
2. **Test behavior, not implementation**
3. **Keep tests focused** (one assertion per test)
4. **Use descriptive test names**
5. **Mock external dependencies**
6. **Clean up after tests** (clear mocks, reset state)
7. **Run tests before committing**

## Next Steps

### Immediate (Week 1)
- [x] Set up Jest and Testing Library
- [x] Configure test infrastructure
- [x] Write MinHash deduplication tests
- [x] Create test utilities
- [ ] Fix Next.js 15 Request/Response mocking
- [ ] Complete NewsFeed component tests

### Short-term (Month 1)
- [ ] Add translation service tests
- [ ] Add news API route tests
- [ ] Add search functionality tests
- [ ] Achieve 50% coverage

### Long-term (Quarter 1)
- [ ] Add map component tests
- [ ] Add offline database tests
- [ ] Add integration tests
- [ ] Achieve 70% coverage
- [ ] Set up mutation testing

## Resources

- **Jest Docs**: https://jestjs.io/
- **Testing Library**: https://testing-library.com/
- **React Testing Guide**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Next.js Testing**: https://nextjs.org/docs/testing

## Questions?

Refer to `TEST_INFRASTRUCTURE.md` for detailed documentation on:
- Test configuration
- Mock setup
- Coverage thresholds
- Troubleshooting common issues

---

**Last Updated**: 2026-01-12
**Status**: Infrastructure complete, critical path tests passing
**Next Milestone**: 70% coverage
