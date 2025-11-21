# Playwright Test Refactoring Plan

**Created**: 2025-10-08
**Status**: Deferred - Tests disabled, plan ready for future implementation
**Priority**: Medium - Tests will be implemented during dedicated testing phase

## ⚠️ Current Status: Tests Disabled

**Decision**: Tests have been disabled in CI/CD to unblock deployments. They will remain in the codebase for future implementation but won't run during builds.

**Configuration**:
- ✅ `.vercelignore` - Excludes test files from deployment
- ✅ `vercel.json` - Explicitly sets build command (no tests)
- ✅ `package.json` - `npm test` script disabled (prints message and exits 0)
- ✅ Manual test execution available via `npm run test:e2e`

**When to re-enable**: During dedicated testing phase when infrastructure is ready (see Phase 1 below)

---

## Executive Summary

The Playwright E2E test suite needs comprehensive refactoring. Current issues:
1. **No test data setup** - Tests rely on hardcoded user credentials and manual database state
2. **Incomplete tests** - Many tests have `TODO` placeholders and skip actual verification
3. **No authentication helpers** - Login code is duplicated across files
4. **Missing fixtures** - No shared test fixtures for common scenarios
5. **No test isolation** - Tests can interfere with each other due to shared database
6. **Environment config missing** - baseURL not configured, manual URL construction

---

## Current Test Inventory

### ✅ Working (Minimal Changes Needed)
1. **`example.spec.ts`** - Playwright demo test (can be deleted)
2. **`segmented-tabs.spec.ts`** - Recently updated, needs auth setup only

### ⚠️ Needs Major Refactoring
3. **`mark-team-page-complete.spec.ts`** - Needs test data fixtures
4. **`theme-rollout.spec.ts`** - Needs auth setup and selector updates
5. **`trade-chat-unread-badges.spec.ts`** - Needs two-user fixtures and real proposal data
6. **`trades-find-vs-search.spec.ts`** - All TODOs, needs complete implementation
7. **`proposal-highlight.spec.ts`** - All TODOs, needs complete implementation

---

## Root Cause Analysis

### Issue 1: No Test Data Management
**Problem**: Tests assume database state exists (users, collections, proposals)
**Impact**: Tests fail when run against clean database
**Solution**: Create test data fixtures and setup/teardown hooks

### Issue 2: No Authentication Infrastructure
**Problem**: Each test file duplicates login logic
**Impact**: Hard to maintain, inconsistent auth handling
**Solution**: Create shared auth fixtures and helpers

### Issue 3: No Shared Test Utilities
**Problem**: Common selectors and actions duplicated everywhere
**Impact**: When UI changes, many tests break
**Solution**: Create page object models (POMs) or shared utilities

### Issue 4: Incomplete Test Coverage
**Problem**: Many tests are stubs with TODOs
**Impact**: False sense of test coverage
**Solution**: Implement missing tests or remove stubs

### Issue 5: No Base URL Configuration
**Problem**: URLs constructed manually with `BASE_URL || 'http://localhost:3000'`
**Impact**: Harder to run against different environments
**Solution**: Configure baseURL in playwright.config.ts

---

## Refactoring Strategy

### Phase 1: Foundation (Critical Path) 🔥

#### 1.1 Configure Playwright Base Setup
- [ ] Enable `baseURL: 'http://localhost:3000'` in `playwright.config.ts`
- [ ] Enable webServer auto-start for local dev
- [ ] Add environment variable support (.env.test)
- [ ] Update all tests to use relative URLs

**Files to modify**:
- `playwright.config.ts`
- Create `.env.test` with test credentials
- Update all `*.spec.ts` files to remove BASE_URL constant

#### 1.2 Create Authentication Fixtures
- [ ] Create `tests/fixtures/auth.ts` with reusable auth context
- [ ] Create `tests/helpers/auth.ts` with login/logout functions
- [ ] Support multiple test users (USER_1, USER_2) for trading tests
- [ ] Add authenticated browser context fixture

**New files to create**:
```typescript
// tests/fixtures/auth.ts
export const authenticatedUser = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await login(page, TEST_USER);
    await use(page);
    await logout(page);
  },
});

// tests/helpers/auth.ts
export async function login(page: Page, user: TestUser) { ... }
export async function logout(page: Page) { ... }
export async function createTestUser() { ... }
```

#### 1.3 Create Test Data Fixtures
- [ ] Create `tests/fixtures/test-data.ts` for database seeding
- [ ] Create SQL migration for test data: `database/test-data/seed.sql`
- [ ] Add functions to create: users, collections, stickers, proposals
- [ ] Add cleanup functions for test isolation

**New files to create**:
```typescript
// tests/fixtures/test-data.ts
export async function seedTestData() {
  await createTestUsers();
  await createTestCollections();
  await createTestStickers();
  await createTestProposals();
}

export async function cleanupTestData() { ... }
```

---

### Phase 2: Refactor Existing Tests

#### 2.1 Update Authentication-Dependent Tests
**Files to update**:
- `mark-team-page-complete.spec.ts`
- `theme-rollout.spec.ts`
- `trade-chat-unread-badges.spec.ts`
- `segmented-tabs.spec.ts`

**Changes**:
```typescript
// Before
test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_USER.email);
  // ...
});

// After
import { test } from '../fixtures/auth';

test.use({ authenticatedPage: true });

test('my test', async ({ page }) => {
  // Already authenticated!
  await page.goto('/mi-coleccion');
});
```

#### 2.2 Fix Selector Brittleness
**Problem**: Tests use fragile selectors like `.text-sm.font-bold.text-gray-300`
**Solution**: Add data-testid attributes to key elements

**UI components to update** (add data-testid):
- `AlbumSummaryHeader` → `data-testid="album-summary-header"`
- `AlbumPager` → `data-testid="album-pager"`
- `AlbumPageGrid` → `data-testid="album-page-grid"`
- `StickerTile` → `data-testid="sticker-tile-{stickerId}"`
- `ProposalCard` → `data-testid="proposal-card"` (already exists)
- `TradeChatPanel` → `data-testid="trade-chat-panel"` (already exists)

#### 2.3 Create Page Object Models (Optional but Recommended)
**Benefits**: Encapsulate page interactions, easier to maintain

**New files to create**:
```typescript
// tests/pages/ProposalsPage.ts
export class ProposalsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/trades/proposals');
  }

  async switchToTab(tab: 'inbox' | 'outbox') {
    await this.page.click(`[data-testid="segmented-tab-${tab}"]`);
  }

  async openFirstProposal() {
    await this.page.click('[data-testid="proposal-card"]');
  }
}
```

---

### Phase 3: Complete Incomplete Tests

#### 3.1 Implement `trades-find-vs-search.spec.ts`
**Current status**: All TODOs, no real tests
**Required**:
- [ ] Add test data: User with active collection
- [ ] Mock or seed stickers for trading
- [ ] Implement all 6 test cases
- [ ] Verify filter functionality

#### 3.2 Implement `proposal-highlight.spec.ts`
**Current status**: All TODOs, no real tests
**Required**:
- [ ] Add test data: Two users, proposals
- [ ] Test proposal creation flow end-to-end
- [ ] Verify highlight animation (check for CSS class or animation)
- [ ] Verify highlight removal after timeout
- [ ] Implement all 6 test cases

#### 3.3 Update `trade-chat-unread-badges.spec.ts`
**Current status**: Partially complete, needs test data
**Required**:
- [ ] Create fixture for two users with existing proposal
- [ ] Seed initial chat messages
- [ ] Fix realtime tests (may need websocket mocking)
- [ ] Verify all 20+ test cases work with fixtures

#### 3.4 Update `mark-team-page-complete.spec.ts`
**Current status**: Complete but relies on manual DB state
**Required**:
- [ ] Add fixture: User with partially complete collection
- [ ] Seed team pages with missing stickers
- [ ] Verify all 4 test cases
- [ ] Add cleanup to avoid test pollution

#### 3.5 Update `theme-rollout.spec.ts`
**Current status**: Complete but fragile selectors
**Required**:
- [ ] Replace complex CSS selectors with data-testid
- [ ] Add visual regression testing (optional)
- [ ] Verify all 14 test cases

---

### Phase 4: New Test Coverage (Nice to Have)

#### 4.1 Add Critical Path Tests
- [ ] User registration flow
- [ ] Collection activation flow
- [ ] Sticker add/remove flow
- [ ] Proposal acceptance/rejection flow
- [ ] Trade completion flow

#### 4.2 Add Error Scenario Tests
- [ ] Network failures
- [ ] Invalid data submissions
- [ ] Unauthorized access attempts
- [ ] Edge cases (empty collections, etc.)

---

## Implementation Priority

### 🔥 Critical (Week 1)
1. ✅ Phase 1.1: Configure Playwright base setup
2. ✅ Phase 1.2: Create authentication fixtures
3. ✅ Phase 1.3: Create test data fixtures
4. ✅ Phase 2.1: Update all tests to use new auth fixtures

### ⚠️ High Priority (Week 2)
5. ✅ Phase 2.2: Add data-testid to all components
6. ✅ Phase 3.1: Implement `trades-find-vs-search.spec.ts`
7. ✅ Phase 3.2: Implement `proposal-highlight.spec.ts`

### 📋 Medium Priority (Week 3)
8. ✅ Phase 3.3: Update `trade-chat-unread-badges.spec.ts`
9. ✅ Phase 3.4: Update `mark-team-page-complete.spec.ts`
10. ✅ Phase 3.5: Update `theme-rollout.spec.ts`

### 💡 Nice to Have (Week 4+)
11. Phase 2.3: Create Page Object Models
12. Phase 4.1: Add critical path tests
13. Phase 4.2: Add error scenario tests

---

## File Structure After Refactoring

```
tests/
├── fixtures/
│   ├── auth.ts              # Auth context fixture
│   ├── test-data.ts         # Database seeding
│   └── index.ts             # Export all fixtures
├── helpers/
│   ├── auth.ts              # Login/logout helpers
│   ├── navigation.ts        # Common navigation
│   └── assertions.ts        # Custom assertions
├── pages/                   # Page Object Models (optional)
│   ├── ProposalsPage.ts
│   ├── AlbumPage.ts
│   └── ProfilePage.ts
├── example.spec.ts          # DELETE
├── mark-team-page-complete.spec.ts
├── theme-rollout.spec.ts
├── trade-chat-unread-badges.spec.ts
├── trades-find-vs-search.spec.ts
├── proposal-highlight.spec.ts
└── segmented-tabs.spec.ts
```

---

## Database Test Data Requirements

### Required Test Users
```sql
-- User 1 (primary test user)
email: test1@cambiocromo.com
password: Test123!@#
nickname: TestUser1

-- User 2 (for trading tests)
email: test2@cambiocromo.com
password: Test123!@#
nickname: TestUser2
```

### Required Collections
- Collection 1: "La Liga 2024-25" (active for User 1)
- Collection 2: "Premier League 2024-25" (owned by User 1)
- Collection 3: "La Liga 2024-25" (active for User 2)

### Required Stickers & Pages
- User 1: 50% complete team page (10/20 stickers)
- User 1: Duplicate stickers for trading
- User 2: Duplicate stickers for trading
- Mutual trading opportunity between User 1 and User 2

### Required Proposals
- 1 pending proposal from User 2 to User 1
- 1 accepted proposal between users
- 1 sent proposal from User 1 to User 2
- At least one proposal with chat messages

---

## Migration Strategy

### Option A: Big Bang (Not Recommended)
- Refactor all tests at once
- High risk, may break CI/CD
- Difficult to track progress

### Option B: Incremental (Recommended) ✅
1. **Setup infrastructure** (auth, fixtures) without breaking existing tests
2. **Migrate one test file at a time** to new fixtures
3. **Run old and new tests in parallel** until all migrated
4. **Remove old test helpers** once all tests migrated
5. **Add new test coverage** after stabilization

### Step-by-Step Migration
```bash
# Week 1: Infrastructure
1. Create fixtures/ and helpers/ directories
2. Add test user seeds to database
3. Configure playwright.config.ts
4. Verify one test works with new setup

# Week 2-3: Migration (one file per day)
1. Update segmented-tabs.spec.ts (easiest, already working)
2. Update theme-rollout.spec.ts (auth only)
3. Update mark-team-page-complete.spec.ts (needs fixtures)
4. Update trades-find-vs-search.spec.ts (implement TODOs)
5. Update proposal-highlight.spec.ts (implement TODOs)
6. Update trade-chat-unread-badges.spec.ts (complex, save for last)

# Week 4: Stabilization
1. Run full test suite against staging
2. Fix flaky tests
3. Document test patterns for team
4. Add CI/CD integration
```

---

## Success Criteria

### Definition of Done
- [ ] All tests pass consistently (no flakes)
- [ ] No hardcoded URLs or credentials in test files
- [ ] All tests use shared auth fixtures
- [ ] All tests use data-testid selectors (no fragile CSS selectors)
- [ ] Test data is seeded automatically before tests
- [ ] Test data is cleaned up after tests
- [ ] All TODO comments implemented or removed
- [ ] CI/CD pipeline runs tests successfully
- [ ] Test execution time < 5 minutes for full suite
- [ ] Code coverage report available

### Metrics to Track
- **Test Pass Rate**: Currently unknown → Target: 100%
- **Test Execution Time**: Currently unknown → Target: < 5 min
- **Test Flakiness**: Currently high → Target: 0% flaky
- **Code Coverage**: Currently 0% → Target: 80% critical paths

---

## Risks & Mitigations

### Risk 1: Test Data Conflicts
**Impact**: Tests fail due to database state pollution
**Mitigation**: Use unique test user IDs, implement cleanup hooks

### Risk 2: Async Race Conditions
**Impact**: Flaky tests due to timing issues
**Mitigation**: Use Playwright's auto-waiting, avoid arbitrary timeouts

### Risk 3: Breaking Changes During Migration
**Impact**: Tests break as we refactor
**Mitigation**: Feature flags, run old and new tests in parallel

### Risk 4: Time Investment Too High
**Impact**: Team abandons E2E testing
**Mitigation**: Start small, show value early, automate in CI

---

## Next Steps (Immediate Actions)

### This Week
1. **Review this plan with team** - Get buy-in and feedback
2. **Set up test database** - Create test.supabase.com project or local instance
3. **Create test users** - Seed initial test data
4. **Update playwright.config.ts** - Enable baseURL and webServer
5. **Create auth fixtures** - `tests/fixtures/auth.ts`
6. **Migrate one test** - Prove the approach works (start with `segmented-tabs.spec.ts`)

### Next Week
7. **Add data-testid to components** - Update all UI components
8. **Create test data seeds** - `database/test-data/seed.sql`
9. **Migrate remaining tests** - One per day
10. **Run full suite** - Verify all tests pass

### Month 2+
11. **Add CI/CD integration** - GitHub Actions workflow
12. **Add visual regression tests** - Percy or Playwright snapshots
13. **Expand coverage** - Critical paths and edge cases
14. **Team training** - Document patterns and best practices

---

## Resources & References

### Playwright Best Practices
- [Playwright Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Page Object Models](https://playwright.dev/docs/pom)
- [Auto-waiting](https://playwright.dev/docs/actionability)
- [Test Isolation](https://playwright.dev/docs/test-isolation)

### Our Documentation
- `docs/database-schema.md` - Database structure
- `docs/components-guide.md` - UI components reference
- `docs/test-refactoring-plan.md` - This document

### Tools
- Playwright Test Runner
- Supabase CLI (for local test DB)
- GitHub Actions (for CI/CD)

---

**Last Updated**: 2025-10-08
**Next Review**: After Week 1 implementation
**Owner**: Development Team
