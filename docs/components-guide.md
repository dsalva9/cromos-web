# Components Architecture Guide

This document outlines the component structure and patterns used in the Cromos Web application.

## Component Organization

```
src/components/
├── ui/                    # shadcn/ui base components
├── providers/             # Context providers
├── [feature-components]   # Page-specific components
└── [shared-components]    # Reusable components
```

## Provider Components

### SupabaseProvider

**File**: `src/components/providers/SupabaseProvider.tsx`

Central authentication and database provider.

```typescript
const { user, session, loading, supabase } = useSupabase();
const { user, loading } = useUser(); // Simplified hook
```

**Responsibilities:**

- Manages Supabase client instance
- Handles authentication state
- Provides user session data
- Manages loading states

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
- Shows loading states
- Customizable redirect destination

## Page Components

### CollectionPage

**File**: `src/app/mi-coleccion/page.tsx`

Main sticker collection interface.

**Key Features:**

- Sticker grid display with rarity gradients
- Ownership tracking ("TENGO" button)
- Want list management ("QUIERO" button)
- Optimistic UI updates
- Real-time progress calculation

**State Management:**

```typescript
const [stickers, setStickers] = useState<CollectionItem[]>([]);
const [activeCollection, setActiveCollection] = useState<Collection | null>(
  null
);
const progress = useMemo(() => calculateProgress(stickers), [stickers]);
```

### ProfilePage

**File**: `src/app/profile/page.tsx`

User profile and collection management.

**Key Features:**

- Profile editing (nickname, avatar)
- Collection statistics display
- Collection switching functionality
- New collection discovery and joining

## Navigation Components

### SiteHeader

**File**: `src/components/site-header.tsx`

Main application navigation.

**Features:**

- Responsive design (desktop/mobile)
- Dynamic menu based on auth state
- Logout functionality
- Active route highlighting

### NavLink

**File**: `src/components/nav-link.tsx`

Navigation link component with active state.

```typescript
<NavLink href="/profile" className="custom-styles">
  Profile
</NavLink>
```

## UI Components (shadcn/ui)

### ModernCard

**File**: `src/components/ui/modern-card.tsx`

Custom card component with gradient styling.

```typescript
<ModernCard className="bg-gradient-to-r from-teal-400 to-cyan-500">
  <ModernCardContent className="p-6">
    Content here
  </ModernCardContent>
</ModernCard>
```

### Other UI Components

- `Button` - Primary action buttons
- `Input` - Form inputs
- `Badge` - Status indicators
- `Dialog` - Modal windows
- `Avatar` - User avatars
- `Progress` - Progress bars

## Styling Patterns

### Gradient Design System

```css
/* Primary gradients */
.gradient-primary: from-teal-400 via-cyan-500 to-blue-600
.gradient-success: from-green-400 to-green-500
.gradient-warning: from-orange-400 to-orange-500
```

### Rarity Colors

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

## State Management Patterns

### Optimistic Updates

Used in CollectionPage for immediate UI feedback:

```typescript
const updateStickerOwnership = async (stickerId: number) => {
  // 1. Optimistic update
  setStickers(prev =>
    prev.map(s => s.id === stickerId ? { ...s, count: s.count + 1 } : s)
  );

  try {
    // 2. Sync with database
    await supabase.from('user_stickers').upsert({...});
  } catch (error) {
    // 3. Revert on error
    fetchStickersAndCollection();
  }
};
```

### Loading States

Standard pattern for async operations:

```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    // ... fetch logic
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

## Component Creation Guidelines

### New Component Checklist

1. **TypeScript interfaces** for all props
2. **Error boundaries** for error handling
3. **Loading states** for async operations
4. **Responsive design** (mobile-first)
5. **Accessibility** (ARIA labels, keyboard navigation)
6. **Spanish language** for user-facing text

### File Naming Convention

- PascalCase for component files: `ProfilePage.tsx`
- kebab-case for utility files: `nav-link.tsx`
- Descriptive names that indicate purpose

### Props Interface Pattern

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
}

export default function Component({
  id,
  title,
  variant = 'primary',
  className,
  children,
  onUpdate,
}: ComponentProps) {
  // Component logic
}
```

## Testing Considerations (Future)

When adding tests, focus on:

- User interactions (button clicks, form submissions)
- State changes (optimistic updates, error handling)
- Authentication flows
- Database operations (mock Supabase responses)

## Performance Optimization

### Current Optimizations

- `useMemo` for expensive calculations
- `useCallback` for stable function references
- Optimistic updates for perceived performance
- Proper dependency arrays in useEffect

### Future Considerations

- Image lazy loading for sticker images
- Virtual scrolling for large collections
- React Query for server state management
- Component code splitting
