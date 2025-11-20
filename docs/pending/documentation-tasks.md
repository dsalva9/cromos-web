# Documentation Pending Tasks

Documentation updates and gaps identified during the documentation review and code verification phase.

---

## Documentation Updates Required

### ❌ High Priority

**1. Components Guide Cleanup**
- Remove legacy trading components documentation
- Verify all documented components actually exist
- Update component prop interfaces where changed
- **File**: `/docs/components/components-guide.md`
- **Effort**: 2-3 hours

**2. Architecture Verification**
- Verify folder structure matches actual `/src/` layout
- Confirm tech stack versions are accurate (Next 15.5.3, React 19.1.0, TypeScript 5)
- Update any outdated architecture patterns
- **File**: `/docs/architecture/ARCHITECTURE.md`
- **Effort**: 1-2 hours

**3. README Simplification**
- Simplify root README.md
- Add clear "Documentation" section pointing to `/docs/guides/README.md`
- Remove redundant architecture details
- Update all links to moved files
- **File**: `/README.md`
- **Effort**: 1 hour

---

## Cross-Reference Updates

### ❌ Medium Priority

**Files with broken/outdated references:**
- `PROJECT-INSTRUCTIONS.md` - Update file path references
- `CONTRIBUTING.md` - Update doc structure references  
- All files in `/docs/` - Fix links after file moves

**Estimated Effort**: 2-3 hours

---

## CHANGELOG Slimming

### 🔄 In Progress

**Root CHANGELOG.md:**
- Keep only last 3-5 major versions with summary bullets
- Add note pointing to `/docs/changelog/detailed-changelog.md`
- Move historical details to `/docs/changelog/`

**Create `/docs/changelog/detailed-changelog.md`:**
- Copy full historical changelog from root
- Preserve all version details

**Estimated Effort**: 1-2 hours

---

## Gaps Identified

### From Code Verification Phase

**1. Architecture Gaps**
- **Status**: Pending verification
- **File**: Will create `/docs/pending/architecture-gaps.md`

**2. Component Gaps**  
- **Status**: Pending verification
- **File**: Will create `/docs/pending/component-gaps.md`

**3. Legacy System Cleanup**
- **Status**: Started (removed from current-features.md)
- **File**: Will create `/docs/pending/legacy-system-cleanup.md`

---

## Total Estimated Effort

| Task | Effort |
|------|--------|
| Components guide cleanup | 2-3 hours |
| Architecture verification | 1-2 hours |
| README simplification | 1 hour |
| Cross-reference updates | 2-3 hours |
| CHANGELOG slimming | 1-2 hours |
| **TOTAL** | **7-11 hours** |

---

**Last Updated**: 2025-11-20  
**Maintained By**: Documentation Team
