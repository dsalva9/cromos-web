# Components Architecture Guide

This document outlines the component structure and patterns used in the Cromos Web application.

## Component Organization

```
src/components/
├── ui/                    # shadcn/ui base components + custom extensions
├── providers/             # Context providers
├── collection/           # Collection-specific components
├── profile/             # Profile-specific components (if any)
└── [shared-components]   # Reusable application components
```

## Provider Components

### SupabaseProvider

**File**: `src/components/providers/SupabaseProvider.tsx`

Central authentication and database provider with multiple hook exports.

```typescript
// Main context hook
const { user, session, loading, supabase } = useSupabase();

// Convenience hooks
const { user, loading } = useUser();
const { session, loading } = useSession();
const supabase = useSupabaseClient();
```

**Responsibilities:**

- Manages Supabase client instance
- Handles authentication state changes
- Provides user session data
- Manages global loading states
- Auto-refreshes tokens

## Guard Components

### AuthGuard

**File**: `src/components/AuthGuard.tsx`

Protects routes that require authentication.

```typescript
<AuthGuard redirectTo="/login">
  <ProtectedContent />
</AuthGuard>
```

**Features:**

- Redirects unauthenticated users
- Shows Spanish loading states ("Verificando autenticación...")
- Customizable redirect destination
- Graceful handling of auth state changes

## Collection Components

### CollectionsDropdown

**File**: `src/components/collection/CollectionsDropdown.tsx`

Navigation dropdown for switching between user's owned collections.

```typescript
<CollectionsDropdown
  collections={ownedCollections}
  currentId={currentCollectionId}
  activeId={activeCollectionId}
  onSelect={(id) => router.push(`/mi-coleccion/${id}`)} // Optional
/>
```

**Key Features:**

- **Smart visibility**: Auto-hides when user has ≤1 collection
- **Keyboard accessibility**: Enter/Space key navigation with proper ARIA roles
- **Visual state indicators**:
  - "Activa" badge for active collection
  - "Actual" badge for currently viewed collection
  - Blue highlight for current selection
- **Flexible navigation**: Optional `onSelect` prop, defaults to direct routing
- **Responsive design**: Fixed-width dropdown (320px) with scroll for many collections
- **Backdrop interaction**: Click outside to close

### EmptyCollectionState

**File**: `src/components/collection/EmptyCollectionState.tsx`

Full-screen empty state component for users without collections.

```typescript
<EmptyCollectionState /> // Self-contained with no props
```

**Features:**

- **Full-screen layout**: Takes entire viewport with centered content
- **Contextual messaging**:
  - Welcome message "¡Bienvenido a CambiaCromos!"
  - Clear explanation of next steps
  - Friendly onboarding tone in Spanish
- **Direct CTA**: "Seguir una Colección" button routes to `/profile`
- **Visual hierarchy**: Trophy icon, headings, and descriptive text
- **Theme consistency**: Uses app's gradient background and modern card styling
- **Responsive spacing**: Proper padding and max-width constraints

## Page Components

### CollectionPage

**File**: `src/app/mi-coleccion/[id]/page.tsx`

Main sticker collection interface with optimistic updates.

**Key Features:**

- Sticker grid with rarity-based gradients
- TENGO/QUIERO button interactions
- Real-time progress calculation with useMemo
- Sticky progress header
- Optimistic UI updates with error rollback

**State Management Pattern:**

```typescript
// Progress calculation
const progress = useMemo((): UserProgress => {
  // Calculate from current stickers state
  const totalStickers = stickers.length;
  const ownedUniqueStickers = stickers.filter(s => s.count > 0).length;
  // ... more calculations
  return { total_stickers, owned_unique_stickers, completion_percentage };
}, [stickers]);

// Optimistic updates
const updateStickerOwnership = async (stickerId: number) => {
  // 1. Immediate UI update
  setStickers(prev => prev.map(s =>
    s.id === stickerId ? { ...s, count: s.count + 1 } : s
  ));

  try {
    // 2. Server sync
    await supabase.from('user_stickers').upsert({...});
  } catch (error) {
    // 3. Revert on error
    fetchStickersAndCollection();
  }
};
```

### ProfilePage

**File**: `src/app/profile/page.tsx`

User profile and collection management with advanced optimistic updates.

**Key Features:**

- Inline nickname editing with keyboard shortcuts
- Optimistic collection management (add/remove/activate)
- Simple toast notifications
- Per-action loading states
- Confirmation modals for destructive actions

**Optimistic Update Pattern:**

```typescript
// Take snapshot for rollback
const previousState = [...currentState];

try {
  // 1. Optimistic update
  setState(newState);
  showToast('Success message');

  // 2. Server call
  await supabaseOperation();
} catch (error) {
  // 3. Rollback on error
  setState(previousState);
  showToast('Error message', 'error');
}
```

## Navigation Components

### SiteHeader

**File**: `src/components/site-header.tsx`

Main application navigation with responsive design.

**Features:**

- Dynamic navigation based on auth state
- Mobile hamburger menu
- Proper ARIA labels and roles
- Focus management
- Logout functionality

### NavLink

**File**: `src/components/nav-link.tsx`

Navigation link with active state detection.

```typescript
<NavLink href="/profile" className="custom-styles" onClick={closeMenu}>
  Profile
</NavLink>
```

**Features:**

- Special handling for home route (exact match only)
- Active state styling
- Click handler support for menu closing

## UI Components

### Base shadcn/ui Components

All standard shadcn/ui components are available:

- `Button` - With loading states and variants
- `Input` - Form inputs with validation styling
- `Badge` - Status indicators
- `Dialog` - Modal windows
- `Avatar` - User avatars with fallbacks
- `Progress` - Progress bars
- `Textarea` - Multi-line text inputs
- `Card` - Standard card layouts

### Custom UI Extensions

#### ModernCard

**File**: `src/components/ui/modern-card.tsx`

Enhanced card component for the sports card theme.

```typescript
<ModernCard className="bg-gradient-to-r from-teal-400 to-cyan-500">
  <ModernCardContent className="p-6">
    Content with hover effects and smooth transitions
  </ModernCardContent>
</ModernCard>
```

#### ConfirmModal

**File**: `src/components/ui/confirm-modal.tsx`

Reusable confirmation modal for destructive actions.

```typescript
<ConfirmModal
  open={confirmState.open}
  onOpenChange={setConfirmState}
  title="Eliminar colección"
  description={<span>¿Estás seguro? <strong>Esto no se puede deshacer</strong></span>}
  confirmText="Eliminar"
  cancelText="Cancelar"
  onConfirm={handleDelete}
  loading={deleteLoading}
  variant="destructive"
/>
```

## Form Components

### AuthForm Components

**File**: `src/components/AuthForm.tsx`

Comprehensive form component library for authentication flows.

```typescript
// Individual components
<FormContainer title="Iniciar Sesión" description="Accede a tu cuenta">
  <FormField
    id="email"
    label="Email"
    type="email"
    value={email}
    onChange={setEmail}
    error={emailError}
    required
  />

  <LoadingButton loading={isLoading} loadingText="Iniciando sesión...">
    Iniciar Sesión
  </LoadingButton>

  <ErrorAlert error={errorMessage} />
  <SuccessAlert message={successMessage} />
</FormContainer>
```

## Styling Patterns

### Gradient Design System

```css
/* Primary application gradients */
.bg-gradient-primary: from-teal-400 via-cyan-500 to-blue-600
.bg-gradient-success: from-green-400 to-green-500
.bg-gradient-warning: from-orange-400 to-orange-500
.bg-gradient-profile: from-blue-500 to-purple-600

/* Card header strips */
.bg-gradient-active: from-green-400 to-green-500
.bg-gradient-inactive: from-gray-400 to-gray-500
.bg-gradient-available: from-yellow-400 to-yellow-500
```

### Rarity-Based Gradients

```typescript
function getRarityGradient(rarity: Sticker['rarity']) {
  switch (rarity) {
    case 'legendary':
      return 'from-yellow-400 to-orange-500';
    case 'epic':
      return 'from-purple-400 to-pink-500';
    case 'rare':
      return 'from-blue-400 to-cyan-500';
    case 'common':
      return 'from-gray-400 to-gray-500';
  }
}
```

### Toast Notification System

Simple inline toast implementation for user feedback:

```typescript
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('[data-toast]');
  existingToasts.forEach(toast => toast.remove());

  // Create and show toast
  const toast = document.createElement('div');
  toast.setAttribute('data-toast', 'true');
  toast.className = `fixed top-20 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white font-medium ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => toast.remove(), 3000);
};
```

## State Management Patterns

### Optimistic Updates with Rollback

All user actions follow this pattern for immediate feedback:

```typescript
const performAction = async actionData => {
  // 1. Take snapshot for potential rollback
  const snapshot = takeCurrentStateSnapshot();

  try {
    // 2. Apply optimistic update
    updateUIImmediately(actionData);
    showToast('Action completed');

    // 3. Sync with server
    await serverOperation(actionData);
  } catch (error) {
    // 4. Rollback on failure
    restoreFromSnapshot(snapshot);
    showToast('Action failed', 'error');
  }
};
```

### Loading States

Per-action loading for granular user feedback:

```typescript
const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

const handleAction = async (actionId: string) => {
  const actionKey = `action-${actionId}`;

  try {
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    await performAction();
  } finally {
    setActionLoading(prev => ({ ...prev, [actionKey]: false }));
  }
};

// In render
<Button
  disabled={actionLoading[`action-${actionId}`]}
  loading={actionLoading[`action-${actionId}`]}
>
  {actionLoading[`action-${actionId}`] ? 'Processing...' : 'Action'}
</Button>
```

## Component Creation Guidelines

### TypeScript Interface Standards

```typescript
interface ComponentProps {
  // Required props first
  id: string;
  title: string;

  // Optional props with defaults
  variant?: 'primary' | 'secondary';
  className?: string;
  children?: React.ReactNode;

  // Event handlers
  onUpdate?: (data: UpdateData) => void;
  onClick?: () => void;
}
```

### Accessibility Requirements

- **Spanish language**: All user-facing text in Spanish
- **ARIA labels**: Proper labeling for screen readers
- **Keyboard navigation**: Tab order and keyboard shortcuts
- **Focus management**: Visible focus indicators
- **Semantic HTML**: Proper heading hierarchy and roles

### File Naming Conventions

- **Components**: PascalCase (`ProfilePage.tsx`, `CollectionsDropdown.tsx`)
- **Utilities**: kebab-case (`nav-link.tsx`, `confirm-modal.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useProfileData.ts`)

## Testing Considerations (Future Implementation)

### Priority Testing Areas

- **Optimistic updates**: Verify rollback behavior on server errors
- **Auth flows**: Login/logout state transitions
- **Form validation**: Error states and accessibility
- **Navigation**: Route protection and redirects
- **User interactions**: Button clicks, modal interactions

## Performance Optimization

### Current Optimizations

- **Memoization**: `useMemo` for expensive calculations (progress stats)
- **Callback stability**: `useCallback` for event handlers
- **Optimistic UI**: Zero perceived latency for user actions
- **Selective re-renders**: Proper dependency arrays

### Future Improvements

- **Image optimization**: Lazy loading for sticker images
- **Virtual scrolling**: Large collection support
- **Code splitting**: Route-based component loading
- **Caching**: React Query for server state management

## Debug Components

### Development Tools

- **SessionDebug**: Display current Supabase session (development only)
- **AuthTest**: Interactive auth testing component

These should be removed from production builds.

---

## Component Checklist for New Features

When creating new components:

1. ✅ **TypeScript interfaces** defined for all props
2. ✅ **Spanish language** for all user-facing text
3. ✅ **Error boundaries** and proper error handling
4. ✅ **Loading states** for async operations
5. ✅ **Responsive design** with mobile-first approach
6. ✅ **Accessibility** features (ARIA, keyboard navigation)
7. ✅ **Consistent styling** following gradient design system
8. ✅ **Optimistic updates** where applicable
