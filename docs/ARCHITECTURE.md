# Arquitectura del Sistema - CambioCromos

Este documento describe la arquitectura técnica de CambioCromos, incluyendo decisiones de diseño, patrones utilizados y flujo de datos.

## Stack Tecnológico

### Frontend
- **Framework**: Next.js 15.5 (App Router)
- **UI Library**: React 19
- **Lenguaje**: TypeScript 5.7
- **Estilos**: Tailwind CSS 4.0
- **Componentes UI**: shadcn/ui (Radix UI)
- **Validación**: Zod 4.1
- **Estado**: React Context API + Custom Hooks

### Backend
- **Database**: PostgreSQL (vía Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **API**: Supabase RPC Functions
- **Realtime**: Supabase Realtime (para chat)

### DevOps & Monitoring
- **Deployment**: Vercel
- **Error Tracking**: Sentry
- **Testing**: Playwright (E2E)
- **Linting**: ESLint + TypeScript
- **Formatting**: Prettier

## Estructura de Carpetas

```
cromos-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── marketplace/        # Marketplace pages
│   │   ├── templates/          # Template explorer
│   │   ├── mis-plantillas/     # User collections
│   │   ├── profile/            # User profiles
│   │   └── layout.tsx          # Root layout
│   │
│   ├── components/             # React Components
│   │   ├── ui/                 # Base UI components (shadcn/ui)
│   │   ├── marketplace/        # Marketplace-specific components
│   │   ├── templates/          # Template-specific components
│   │   ├── providers/          # Context providers
│   │   └── AuthGuard.tsx       # Authentication wrapper
│   │
│   ├── hooks/                  # Custom React Hooks
│   │   ├── marketplace/        # Marketplace hooks
│   │   ├── templates/          # Template hooks
│   │   ├── trades/             # Trading hooks
│   │   └── useLocalStorage.ts  # Utility hooks
│   │
│   ├── lib/                    # Utility Libraries
│   │   ├── constants/          # Constants (errors, etc.)
│   │   ├── validations/        # Zod validation schemas
│   │   ├── logger.ts           # Logging utility
│   │   └── utils.ts            # Helper functions
│   │
│   └── types/                  # TypeScript Types
│       └── v1.6.0.ts           # Database types
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # Este archivo
│   ├── CONTRIBUTING.md         # Contribution guide
│   ├── TESTING.md              # Testing guide
│   ├── PERFORMANCE.md          # Performance guide
│   └── database-schema.md      # Database schema
│
├── scripts/                    # Utility Scripts
│   ├── generate-types.sh       # Type generation
│   └── *.sql                   # Database scripts
│
└── tests/                      # Test Files
    └── *.spec.ts               # Playwright tests
```

## Patrones de Arquitectura

### 1. Atomic Design (Componentes)

```
atoms/         → Componentes básicos (Button, Input)
molecules/     → Combinaciones simples (SearchBar)
organisms/     → Componentes complejos (ListingCard, TemplateCard)
templates/     → Layouts de páginas
pages/         → Páginas completas (en src/app/)
```

### 2. Custom Hooks Pattern

Todos los datos de Supabase se acceden vía custom hooks:

```typescript
// hooks/marketplace/useListings.ts
export function useListings(params) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [params]);

  return { listings, loading, error, refetch };
}
```

**Beneficios:**
- Lógica reutilizable
- Fácil testing
- Separación de concerns
- Tipado fuerte

### 3. Provider Pattern (Estado Global)

```typescript
// components/providers/SupabaseProvider.tsx
export function SupabaseProvider({ children }) {
  const [user, setUser] = useState(null);

  return (
    <SupabaseContext.Provider value={{ supabase, user }}>
      {children}
    </SupabaseContext.Provider>
  );
}
```

**Usado para:**
- Authentication state
- User profile
- Supabase client

### 4. Repository Pattern (Data Access)

Todas las operaciones de base de datos a través de RPC functions:

```typescript
// ✅ Bueno: Usar RPC function
const { data } = await supabase.rpc('list_trade_listings', {
  p_limit: 20,
  p_offset: 0
});

// ❌ Malo: Query directo
const { data } = await supabase
  .from('trade_listings')
  .select('*')
  .limit(20);
```

**Beneficios:**
- Server-side validation
- Complex joins optimized
- Consistent API
- Easier to maintain

## Flujo de Datos

### 1. Authentication Flow

```
User Login
    ↓
Supabase Auth
    ↓
SupabaseProvider updates context
    ↓
All components re-render with user data
    ↓
AuthGuard redirects if needed
```

### 2. Data Fetching Flow

```
Component mounts
    ↓
Custom hook calls useEffect
    ↓
RPC function called via Supabase client
    ↓
PostgreSQL executes function
    ↓
Data returned to hook
    ↓
Hook updates state
    ↓
Component re-renders with data
```

### 3. Form Submission Flow

```
User submits form
    ↓
Zod validates input
    ↓
If valid: Submit to Supabase
    ↓
RPC function processes
    ↓
Database updated
    ↓
Success: Show toast, redirect
Error: Show error message
```

### 4. Real-time Updates (Chat)

```
User sends message
    ↓
Insert into trade_chats table
    ↓
PostgreSQL trigger fires
    ↓
Supabase Realtime broadcasts
    ↓
Listening clients receive update
    ↓
UI updates automatically
```

## Decisiones de Diseño

### ¿Por qué Context API en lugar de Redux?

**Razones:**
1. **Simplicidad**: El estado global es limitado (solo auth y user)
2. **Performance**: No hay problemas de re-renders innecesarios
3. **Bundle size**: Redux + middleware añade ~40KB
4. **Learning curve**: Context API es más simple para contribuidores

### ¿Por qué RPC Functions en lugar de REST API?

**Razones:**
1. **Type safety**: Tipos generados desde PostgreSQL
2. **Performance**: Server-side joins y aggregations
3. **Security**: RLS policies en database
4. **Simplicity**: No need for separate API layer

### ¿Por qué Supabase en lugar de Firebase?

**Razones:**
1. **PostgreSQL**: Database relacional robusto
2. **Open source**: Puede ser self-hosted
3. **SQL familiar**: Easier para developers
4. **RLS**: Row Level Security built-in
5. **Pricing**: Más económico a escala

### ¿Por qué Next.js App Router?

**Razones:**
1. **Server Components**: Mejor performance
2. **Streaming**: Progressive rendering
3. **Layouts**: Shared layouts más simples
4. **Future-proof**: Dirección de React/Next.js

## Patrones de Componentes

### 1. Server vs Client Components

```typescript
// Server Component (por defecto)
// Puede acceder a database directamente
export default async function Page() {
  const listings = await getListings();
  return <ListingGrid listings={listings} />;
}

// Client Component
// Necesita interactividad o hooks
'use client';
export function InteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Regla:** Usa Server Components por defecto, Client Components solo cuando necesites:
- useState, useEffect, otros hooks
- Event handlers
- Browser APIs

### 2. Compound Components

```typescript
// Card compound component
<ModernCard>
  <ModernCardHeader>
    <ModernCardTitle>Título</ModernCardTitle>
  </ModernCardHeader>
  <ModernCardContent>
    Contenido
  </ModernCardContent>
</ModernCard>
```

### 3. Render Props / Children as Function

```typescript
// Loading wrapper
<LoadingWrapper loading={loading}>
  {({ data }) => <ListingCard listing={data} />}
</LoadingWrapper>
```

## Manejo de Estado

### Estado Local (useState)

Para datos específicos de un componente:

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [isOpen, setIsOpen] = useState(false);
```

### Estado del Servidor (Custom Hooks)

Para datos de Supabase:

```typescript
const { listings, loading, error } = useListings();
const { template, refetch } = useTemplate(id);
```

### Estado Global (Context)

Solo para:
- User authentication
- User profile
- Supabase client

## Optimistic Updates

Para mejor UX, implementamos optimistic updates:

```typescript
// Update UI inmediatamente
setCount(count + 1);

// Luego sincronizar con servidor
try {
  await supabase.rpc('update_count', { new_count: count + 1 });
} catch (error) {
  // Rollback si falla
  setCount(count);
  toast.error('Error al actualizar');
}
```

## Seguridad

### 1. Row Level Security (RLS)

Todas las tablas tienen RLS policies:

```sql
-- Example: Users can only see their own listings
CREATE POLICY "Users can view own listings"
ON trade_listings FOR SELECT
USING (auth.uid() = user_id);
```

### 2. Authentication

- JWT tokens via Supabase Auth
- Secure session management
- Auth state persisted in cookies

### 3. Input Validation

- Client-side: Zod schemas
- Server-side: PostgreSQL functions
- Never trust client input

### 4. XSS Prevention

- React escapes by default
- No dangerouslySetInnerHTML
- Sanitize user inputs

## Performance

### 1. Code Splitting

```typescript
// Dynamic import para routes grandes
const AdminDashboard = dynamic(() => import('@/components/admin/Dashboard'));
```

### 2. Image Optimization

```typescript
// Next.js Image component
<Image
  src={imageUrl}
  alt="Description"
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 3. Pagination

Todos los listados usan paginación:
- Marketplace: 20 items/página
- Templates: 12 items/página

### 4. Caching

- Static pages cached by Vercel
- Supabase queries no cacheadas (data en tiempo real)
- Browser cache para assets

## Testing

### E2E Tests (Playwright)

```typescript
test('user can create listing', async ({ page }) => {
  await page.goto('/marketplace/create');
  await page.fill('[name="title"]', 'Test');
  await page.click('[type="submit"]');
  await expect(page).toHaveURL(/\/marketplace\/\d+/);
});
```

### Unit Tests (Futuro)

- Utility functions
- Validation schemas
- Custom hooks (con React Testing Library)

## Deployment

### Vercel

- Automatic deployments from `main`
- Preview deployments for PRs
- Environment variables en dashboard

### Database Migrations

- Manual migrations via Supabase dashboard
- SQL files en `scripts/`
- Version control en git

## Roadmap Técnico

### v1.7.0 (Próximo)
- [ ] Request caching con SWR
- [ ] Virtual scrolling para listas largas
- [ ] Service worker para offline
- [ ] Performance monitoring

### v2.0.0 (Futuro)
- [ ] Mobile app (React Native)
- [ ] GraphQL API layer
- [ ] Redis caching
- [ ] Advanced analytics

---

**Última actualización**: 2025-01-22
**Versión del documento**: 1.0
