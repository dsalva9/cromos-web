# E2E Tests (Playwright)

## ⚠️ Current Status: DISABLED

**Tests are currently disabled and will NOT run during CI/CD builds.**

### Why?
- Tests are incomplete and rely on manual database setup
- No test data fixtures in place
- Would break Vercel builds
- Will be properly implemented during dedicated testing phase

### Configuration
- `.vercelignore` - Excludes tests from deployment
- `vercel.json` - Explicitly sets build command (no tests)
- `package.json`:
  - `npm test` - Disabled (prints message and exits)
  - `npm run test:e2e` - Runs Playwright tests (manual only)
  - `npm run test:ui` - Opens Playwright UI mode (manual only)

---

## Manual Test Execution (When Needed)

### Prerequisites
1. Local dev server running: `npm run dev`
2. Test database seeded with test users (see below)
3. Environment variables set in `.env.test` (if needed)

### Run Tests
```bash
# Run all tests (headless)
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:ui

# Run specific test file
npx playwright test tests/segmented-tabs.spec.ts

# Run with debug mode
npx playwright test --debug
```

---

## Test Files Status

### ✅ Complete (but disabled)
- `segmented-tabs.spec.ts` - SegmentedTabs component tests
- `theme-rollout.spec.ts` - Theme verification tests
- `mark-team-page-complete.spec.ts` - Album page completion tests

### ⚠️ Incomplete (TODOs)
- `trades-find-vs-search.spec.ts` - All tests are TODOs
- `proposal-highlight.spec.ts` - All tests are TODOs
- `trade-chat-unread-badges.spec.ts` - Needs test data fixtures

### 🗑️ To Delete
- `example.spec.ts` - Playwright demo test

---

## Required Test Data (Not Yet Implemented)

### Test Users
```
User 1:
  email: test1@cambiocromo.com
  password: Test123!@#
  nickname: TestUser1

User 2 (for trading tests):
  email: test2@cambiocromo.com
  password: Test123!@#
  nickname: TestUser2
```

### Test Collections
- Collection 1: "La Liga 2024-25" (active for User 1)
- Collection 2: "Premier League 2024-25" (owned by User 1)
- Collection 3: "La Liga 2024-25" (active for User 2)

### Test Stickers
- User 1: 50% complete team page (10/20 stickers)
- User 1 & User 2: Duplicate stickers for trading
- Mutual trading opportunity between users

### Test Proposals
- 1 pending proposal from User 2 to User 1
- 1 accepted proposal between users
- 1 sent proposal from User 1 to User 2

---

## Future Implementation Plan

See **`docs/test-refactoring-plan.md`** for the complete refactoring plan.

**Summary**:
1. **Phase 1**: Set up test infrastructure (auth fixtures, test data)
2. **Phase 2**: Refactor existing tests (shared helpers, data-testid)
3. **Phase 3**: Complete incomplete tests (implement TODOs)
4. **Phase 4**: Expand coverage (critical paths, edge cases)

**Timeline**: 3-4 weeks when testing phase begins

---

## Adding New Tests (Current Workflow)

When adding new tests now:

1. ✅ **DO** create test files for new features
2. ✅ **DO** follow existing patterns in `segmented-tabs.spec.ts`
3. ✅ **DO** add `TODO` comments for missing prerequisites
4. ❌ **DON'T** expect tests to run in CI/CD
5. ❌ **DON'T** block features waiting for tests to pass

**Example**:
```typescript
test('new feature works', async ({ page }) => {
  // TODO: Add test user authentication when fixtures are ready
  // TODO: Seed test data when database helpers are ready

  await page.goto('/new-feature');
  // ... test implementation
});
```

---

## Re-enabling Tests

When ready to implement the full testing infrastructure:

1. Update `package.json` to restore `test` script:
   ```json
   "test": "playwright test"
   ```

2. Create test fixtures (see refactoring plan):
   - `tests/fixtures/auth.ts`
   - `tests/fixtures/test-data.ts`

3. Configure `playwright.config.ts`:
   - Enable `baseURL: 'http://localhost:3000'`
   - Enable `webServer` for auto-start

4. Seed test database with required users/collections

5. Update all tests to use fixtures

6. Run full suite and fix issues

7. Enable in CI/CD (GitHub Actions, Vercel)

---

**Last Updated**: 2025-10-08
**Status**: Tests disabled, plan documented
**Next Steps**: Wait for dedicated testing phase
