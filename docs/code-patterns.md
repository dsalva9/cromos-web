# Code Patterns & Standards

This document captures the established patterns used throughout the Cromos Web application.

## Database Query Patterns

### Standard Error Handling

```typescript
try {
  setLoading(true);
  setError(null);

  const { data, error } = await supabase.from('table_name').select('*');

  if (error) throw error;

  // Process data
  setData(data);
} catch (err: unknown) {
  console.error('Operation failed:', err);
  const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
  setError(errorMessage);
} finally {
  setLoading(false);
}
```

### Optimistic Updates

```typescript
const updateData = async (id: number) => {
  // 1. Optimistic UI update
  setItems(prev =>
    prev.map(item => (item.id === id ? { ...item, newField: newValue } : item))
  );

  try {
    // 2. Sync with database
    const { error } = await supabase
      .from('table_name')
      .update({ newField: newValue })
      .eq('id', id);

    if (error) throw error;
  } catch (err) {
    console.error('Update failed:', err);
    // 3. Revert on error
    fetchData();
  }
};
```

## Component Structure Patterns

### Page Component Template

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';

interface DataType {
  // Define your data structure
}

function PageContent() {
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();

  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    // Fetch logic here
  }, [user, supabase]);

  useEffect(() => {
    if (!userLoading && user) {
      fetchData();
    }
  }, [user, userLoading, fetchData]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  // Component JSX
  return (
    <div className="min-h-screen bg-[#1F2937]">
      {/* Content */}
    </div>
  );
}

export default function PageName() {
  return (
    <AuthGuard>
      <PageContent />
    </AuthGuard>
  );
}
```

## UI Patterns

### Loading States

```typescript
// Page-level loading
<div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
  <div className="text-white text-xl">Cargando...</div>
</div>

// Component-level loading
<div className="animate-pulse bg-gray-200 rounded h-4 w-full"></div>
```

### Error Display

```typescript
{error && (
  <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
    {error}
  </div>
)}
```

### Action Buttons

```typescript
// Primary action (TENGO style)
<Button
  className={`w-full font-bold rounded-xl transition-all duration-200 ${
    isActive
      ? 'bg-green-500 hover:bg-green-600 text-white shadow-md'
      : 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50'
  }`}
  onClick={() => handleAction(id)}
>
  {isActive ? 'ACTIVO' : 'INACTIVO'}
</Button>
```

## Spanish Text Standards

### Common UI Text

- Loading: "Cargando..."
- Error: "Error", "Error desconocido"
- Success: "Éxito", "Guardado correctamente"
- Empty state: "No hay elementos disponibles"

### Action Buttons

- Save: "Guardar"
- Cancel: "Cancelar"
- Edit: "Editar"
- Delete: "Eliminar"
- Join: "Unirse"
- Leave: "Salir"

### Navigation

- Home: "Inicio"
- Profile: "Perfil"
- Collection: "Mi Colección"
- Trades: "Intercambios"
- Messages: "Mensajes"

## File Organization

### Component Files

- Use PascalCase: `CollectionPage.tsx`
- Include 'use client' for client components
- Export default at bottom with AuthGuard wrapper

### Utility Files

- Use kebab-case: `nav-link.tsx`
- Single purpose per file
- Clear, descriptive names

### Type Definitions

- Auto-generated database types in `src/types/database.ts` via `supabase gen types typescript`
- Re-exported as `Database` from `src/types/index.ts`
- App-specific types (TemplateCopy, SlotProgress, etc.) in `src/types/v1.6.0.ts`
- All Supabase clients use `Database` generic for full type inference
- Use `number` for database IDs (slot_id, template_id, copy_id, etc.)
- Convert to `string` with `String()` only when required by URL params or specific APIs

## Database Conventions

### Table Relationships

- Always use foreign keys with proper references
- Include created_at/updated_at where relevant
- Use meaningful constraint names

### Query Patterns

```typescript
// Get data with relationships
const { data } = await supabase
  .from('parent_table')
  .select(
    `
    *,
    child_table (
      field1,
      field2
    )
  `
  )
  .eq('user_id', userId);
```

### RLS Policies

- Users can only access their own data
- Public read access for reference data (collections, stickers)
- Descriptive policy names that explain the access pattern

