# Tests Técnicos - Fase 09: Calidad Transversal

## 📋 Información General

**Fase:** Fase-09
**Categoría:** Calidad - Performance, Seguridad, Monitoreo
**Audiencia:** David (tester técnico)

---

## 🎯 Cobertura

**3 tests técnicos** verificando:
- Auditoría completa con Lighthouse
- Manejo de errores y logging
- Performance de queries críticas

---

## CP-F09-Q07: Lighthouse - Auditoría completa

### Objetivo

Ejecutar Lighthouse y asegurar que la app cumple con estándares de calidad en Performance, Accessibility, Best Practices y SEO.

### Herramienta

Google Lighthouse (incluido en Chrome DevTools)

### Ejecución del Test

**Paso 1: Auditoría en Desktop**

1. Abrir Chrome DevTools (F12)
2. Ir a pestaña **"Lighthouse"**
3. Configuración:
   - ☑ Performance
   - ☑ Accessibility
   - ☑ Best Practices
   - ☑ SEO
   - Device: Desktop
4. Click **"Analyze page load"**

**Paso 2: Analizar Resultados**

**Scores mínimos requeridos:**

| Categoría | Score mínimo | Objetivo |
|-----------|--------------|----------|
| Performance | 80 | 90+ |
| Accessibility | 90 | 95+ |
| Best Practices | 90 | 95+ |
| SEO | 85 | 90+ |

### Performance - Métricas Detalladas

**Core Web Vitals:**

| Métrica | Descripción | Bueno | Aceptable | Pobre |
|---------|-------------|-------|-----------|-------|
| **FCP** (First Contentful Paint) | Primer contenido visible | < 1.8s | 1.8-3s | > 3s |
| **LCP** (Largest Contentful Paint) | Contenido principal visible | < 2.5s | 2.5-4s | > 4s |
| **TBT** (Total Blocking Time) | Tiempo bloqueado para interacción | < 200ms | 200-600ms | > 600ms |
| **CLS** (Cumulative Layout Shift) | Estabilidad visual | < 0.1 | 0.1-0.25 | > 0.25 |
| **SI** (Speed Index) | Rapidez de renderizado | < 3.4s | 3.4-5.8s | > 5.8s |

**Análisis de problemas comunes:**

**1. LCP alto (contenido tarda en aparecer)**

**Causas:**
- Imágenes sin optimizar
- Recursos bloqueantes en `<head>`
- Server response lento

**Soluciones:**

```html
<!-- Optimizar imágenes -->
<img src="messi-800w.webp"
     srcset="messi-400w.webp 400w,
             messi-800w.webp 800w,
             messi-1200w.webp 1200w"
     sizes="(max-width: 600px) 400px,
            (max-width: 1200px) 800px,
            1200px"
     alt="Messi"
     loading="lazy"
     width="800"
     height="600" />
```

```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/images/hero.webp" as="image">
```

**2. TBT alto (JavaScript bloquea interacción)**

**Causas:**
- JavaScript bundle muy grande
- Long tasks (> 50ms)

**Soluciones:**

```javascript
// Code splitting con dynamic imports
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Defer non-critical JavaScript
<script src="analytics.js" defer></script>
```

**3. CLS alto (layout shifts)**

**Causas:**
- Imágenes sin dimensiones
- Fuentes web causan FOUT/FOIT
- Anuncios dinámicos

**Soluciones:**

```html
<!-- Siempre especificar width/height -->
<img src="logo.png" width="200" height="50" alt="Logo">

<!-- Reservar espacio para contenido dinámico -->
<div style="min-height: 300px;">
    <!-- Contenido que carga dinámicamente -->
</div>
```

```css
/* Optimizar carga de fuentes */
@font-face {
    font-family: 'MyFont';
    src: url('myfont.woff2') format('woff2');
    font-display: swap; /* Usa fallback hasta que cargue */
}
```

### Accessibility - Issues Comunes

**Verificaciones automáticas de Lighthouse:**

✅ **Passed audits:**
- `[aria-*]` attributes are valid
- `[role]` values are valid
- `button` elements have discernible text
- Image elements have `[alt]` attributes
- Form elements have associated labels

❌ **Failed audits (corregir):**

**1. Background and foreground colors do not have sufficient contrast**

```css
/* ❌ ANTES: Contraste 2.5:1 */
.text {
    color: #777777;
    background-color: #FFFFFF;
}

/* ✅ DESPUÉS: Contraste 4.6:1 */
.text {
    color: #595959;
    background-color: #FFFFFF;
}
```

**2. Links do not have a discernible name**

```html
<!-- ❌ ANTES -->
<a href="/profile">
    <img src="profile-icon.svg">
</a>

<!-- ✅ DESPUÉS -->
<a href="/profile" aria-label="View profile">
    <img src="profile-icon.svg" alt="">
</a>
```

**3. Form elements do not have associated labels**

```html
<!-- ❌ ANTES -->
<input type="email" placeholder="Email">

<!-- ✅ DESPUÉS -->
<label for="email">Email</label>
<input type="email" id="email" name="email" placeholder="tu@email.com">
```

### Best Practices - Security Headers

**Verificar headers HTTP:**

```bash
curl -I https://cromos.com
```

**Headers requeridos:**

```
HTTP/2 200
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Verificar en código Next.js:**

```javascript
// next.config.js
module.exports = {
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    }
                ]
            }
        ]
    }
}
```

### SEO - Meta Tags

**Verificar en `<head>`:**

```html
<head>
    <!-- ✅ Title único por página -->
    <title>Marketplace de Cromos - Compra y Vende | Cromos.com</title>

    <!-- ✅ Meta description -->
    <meta name="description" content="Compra, vende e intercambia cromos de fútbol, Pokemon y más. Marketplace seguro con miles de coleccionistas.">

    <!-- ✅ Open Graph para redes sociales -->
    <meta property="og:title" content="Marketplace de Cromos">
    <meta property="og:description" content="...">
    <meta property="og:image" content="https://cromos.com/og-image.jpg">
    <meta property="og:url" content="https://cromos.com">

    <!-- ✅ Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">

    <!-- ✅ Canonical URL -->
    <link rel="canonical" href="https://cromos.com/marketplace">

    <!-- ✅ Robots -->
    <meta name="robots" content="index, follow">
</head>
```

### Criterios de Éxito

- ✅ Performance score ≥ 80 (desktop), ≥ 70 (mobile)
- ✅ Accessibility score ≥ 90
- ✅ Best Practices score ≥ 90
- ✅ SEO score ≥ 85
- ✅ Todas las Core Web Vitals en "Bueno"

### Reporte de Lighthouse

**Exportar reporte:**

1. En Lighthouse, click en icono de engranaje
2. "Save as HTML"
3. Guardar como `lighthouse-report-YYYYMMDD.html`
4. Commit en repo para tracking histórico

---

## CP-F09-Q08: Error Handling y Logging

### Objetivo

Verificar que la aplicación maneja errores gracefully y registra eventos críticos para debugging.

### Test 1: Error Boundaries (Frontend)

**Componente de Error Boundary:**

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log a servicio de monitoreo (Sentry, LogRocket, etc.)
        console.error('ErrorBoundary caught:', error, errorInfo);

        // Enviar a backend para logging
        fetch('/api/log-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: error.toString(),
                stack: error.stack,
                componentStack: errorInfo.componentStack
            })
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-fallback">
                    <h2>Algo salió mal 😔</h2>
                    <p>Estamos trabajando para solucionarlo.</p>
                    <button onClick={() => window.location.reload()}>
                        Recargar página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
```

**Test del Error Boundary:**

```typescript
// Componente que falla intencionalmente
function BuggyComponent() {
    throw new Error('Test error boundary');
}

// En desarrollo, verificar que ErrorBoundary captura el error
<ErrorBoundary>
    <BuggyComponent />
</ErrorBoundary>
```

**Verificar:**
- ✅ Error Boundary muestra UI de fallback
- ✅ Error se registra en consola (development)
- ✅ Error se envía a servicio de logging (production)

### Test 2: Manejo de Errores de API

**Wrapper para fetch con manejo de errores:**

```typescript
// lib/api.ts
export async function apiRequest<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        });

        // Manejo de errores HTTP
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new APIError(
                errorData.message || 'Request failed',
                response.status,
                errorData
            );
        }

        return await response.json();
    } catch (error) {
        // Manejo de errores de red
        if (error instanceof TypeError) {
            throw new NetworkError('No se pudo conectar al servidor');
        }

        throw error;
    }
}

// Custom error classes
export class APIError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public data?: any
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}
```

**Test de manejo de errores:**

```typescript
// Test diferentes escenarios de error
async function testErrorHandling() {
    // 1. Error 404
    try {
        await apiRequest('/api/listings/999999');
    } catch (error) {
        if (error instanceof APIError && error.statusCode === 404) {
            console.log('✅ 404 manejado correctamente');
        }
    }

    // 2. Error 500
    try {
        await apiRequest('/api/create-listing', {
            method: 'POST',
            body: JSON.stringify({ /* datos inválidos */ })
        });
    } catch (error) {
        if (error instanceof APIError && error.statusCode === 500) {
            console.log('✅ 500 manejado correctamente');
        }
    }

    // 3. Error de red (offline)
    try {
        // Simular offline
        await apiRequest('/api/listings');
    } catch (error) {
        if (error instanceof NetworkError) {
            console.log('✅ Error de red manejado');
        }
    }
}
```

### Test 3: Logging en Backend (Supabase Edge Functions)

**Función Edge con logging:**

```typescript
// supabase/functions/create-listing/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    const startTime = Date.now();

    try {
        // Log de request entrante
        console.log({
            level: 'info',
            message: 'Request received',
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        });

        const { title, price } = await req.json();

        // Validación
        if (!title || !price) {
            throw new Error('Missing required fields');
        }

        // Lógica de negocio
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data, error } = await supabase
            .from('trade_listings')
            .insert({ title, price })
            .select()
            .single();

        if (error) throw error;

        // Log de éxito
        const duration = Date.now() - startTime;
        console.log({
            level: 'info',
            message: 'Listing created successfully',
            listingId: data.id,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });

        return new Response(
            JSON.stringify(data),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        // Log de error
        const duration = Date.now() - startTime;
        console.error({
            level: 'error',
            message: error.message,
            stack: error.stack,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
```

**Ver logs en Supabase Dashboard:**

1. Ir a Supabase Dashboard → Edge Functions
2. Seleccionar función
3. Ver pestaña "Logs"
4. Filtrar por nivel: Info / Error

**Verificar:**
- ✅ Logs estructurados (JSON)
- ✅ Incluyen timestamp, nivel, mensaje
- ✅ Errores incluyen stack trace
- ✅ Logs de performance (duration)

### Test 4: Monitoreo con PostgreSQL Logs

**Habilitar logging de queries lentas:**

```sql
-- Ver configuración actual
SHOW log_min_duration_statement;

-- En Supabase Dashboard → Database → Settings → Query performance
-- Configurar: Log queries slower than 1000ms
```

**Ver logs de queries lentas:**

```sql
-- Supabase proporciona vista de queries lentas
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries con promedio > 100ms
ORDER BY total_exec_time DESC
LIMIT 20;
```

**Logs de errores de PostgreSQL:**

```sql
-- Ver errores recientes (si pg_stat_statements está habilitado)
SELECT
    datname,
    usename,
    application_name,
    state,
    query,
    state_change
FROM pg_stat_activity
WHERE state = 'idle in transaction (aborted)'
   OR state = 'idle in transaction'
ORDER BY state_change DESC;
```

### Criterios de Éxito

- ✅ Error Boundary captura errores de React
- ✅ API errors retornan mensajes claros (no stack traces en production)
- ✅ Errores se registran en logs estructurados
- ✅ Logs incluyen contexto suficiente para debugging

---

## CP-F09-Q09: Performance de Queries Críticas

### Objetivo

Identificar y optimizar las queries más críticas de la aplicación.

### Queries Críticas a Testear

**1. Búsqueda de listados con filtros**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    tl.id,
    tl.title,
    tl.price,
    tl.condition,
    tl.created_at,
    p.nickname AS seller_nickname,
    p.avatar_url,
    (SELECT AVG(rating) FROM ratings WHERE rated_user_id = tl.user_id) AS seller_rating
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'
  AND tl.price BETWEEN 10 AND 100
  AND tl.condition IN ('excellent', 'good')
  AND to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.description, ''))
      @@ to_tsquery('spanish', 'messi | ronaldo')
ORDER BY tl.created_at DESC
LIMIT 20;
```

**Plan esperado (optimizado):**

```
Limit  (cost=... rows=20) (actual time=15.234..15.567 rows=20 loops=1)
  ->  Sort  (cost=... rows=500) (actual time=15.232..15.305 rows=20 loops=1)
        Sort Key: tl.created_at DESC
        ->  Nested Loop  (cost=... rows=500) (actual time=0.234..14.876 rows=87 loops=1)
              ->  Bitmap Heap Scan on trade_listings tl  (cost=... rows=500)
                    Recheck Cond: (to_tsvector(...) @@ to_tsquery(...))
                    Filter: ((status = 'active') AND (price >= 10) AND (price <= 100) AND ...)
                    ->  Bitmap Index Scan on trade_listings_fts_idx
              ->  Index Scan using profiles_pkey on profiles p  (cost=... rows=1)
                    Index Cond: (id = tl.user_id)
Planning Time: 1.234 ms
Execution Time: 15.678 ms
```

**Criterios de performance:**
- ✅ Execution Time < 50ms
- ✅ Usa índices (no Seq Scan en tablas grandes)
- ✅ No usa temp files

**Índices necesarios:**

```sql
-- Índice GIN para full-text search
CREATE INDEX IF NOT EXISTS trade_listings_fts_idx
ON trade_listings
USING GIN (to_tsvector('spanish', title || ' ' || COALESCE(description, '')));

-- Índice compuesto para filtros comunes
CREATE INDEX IF NOT EXISTS trade_listings_active_price_idx
ON trade_listings (status, price, created_at DESC)
WHERE status = 'active';

-- Índice en condition
CREATE INDEX IF NOT EXISTS trade_listings_condition_idx
ON trade_listings (condition)
WHERE status = 'active';
```

**2. Feed de actividad (listados de seguidos)**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    tl.id,
    tl.title,
    tl.price,
    tl.created_at,
    p.nickname,
    p.avatar_url
FROM user_follows uf
JOIN trade_listings tl ON tl.user_id = uf.following_id
JOIN profiles p ON p.id = tl.user_id
WHERE uf.follower_id = '{current_user_id}'
  AND tl.status = 'active'
  AND tl.created_at > NOW() - INTERVAL '30 days'
ORDER BY tl.created_at DESC
LIMIT 50;
```

**Optimización:**

```sql
-- Índice en user_follows
CREATE INDEX IF NOT EXISTS user_follows_follower_id_idx
ON user_follows (follower_id);

-- Índice en trade_listings para feed
CREATE INDEX IF NOT EXISTS trade_listings_user_created_idx
ON trade_listings (user_id, created_at DESC)
WHERE status = 'active';
```

**Criterios:**
- ✅ Execution Time < 100ms con 100 seguidos
- ✅ Nested Loop Join (eficiente para pocos seguidos)

**3. Estadísticas de colección**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    uc.id,
    uc.name,
    COUNT(ui.id) AS total_items,
    COUNT(ui.id) FILTER (WHERE ui.owned_quantity > 0) AS owned_items,
    ROUND(
        COUNT(ui.id) FILTER (WHERE ui.owned_quantity > 0)::NUMERIC /
        NULLIF(COUNT(ui.id), 0) * 100,
        2
    ) AS progress_percentage
FROM user_collections uc
LEFT JOIN user_items ui ON ui.collection_id = uc.id
WHERE uc.user_id = '{user_id}'
GROUP BY uc.id
ORDER BY uc.created_at DESC;
```

**Criterios:**
- ✅ Execution Time < 200ms
- ✅ Usa índice en `user_items(collection_id)`

**Índice necesario:**

```sql
CREATE INDEX IF NOT EXISTS user_items_collection_id_idx
ON user_items (collection_id);
```

### Benchmark de Queries

**Script para benchmark:**

```sql
-- Función para correr query N veces y promediar
DO $$
DECLARE
    v_start TIMESTAMP;
    v_end TIMESTAMP;
    v_duration NUMERIC;
    v_iterations INT := 100;
    v_total_duration NUMERIC := 0;
BEGIN
    FOR i IN 1..v_iterations LOOP
        v_start := clock_timestamp();

        -- QUERY A TESTEAR
        PERFORM * FROM trade_listings
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 20;

        v_end := clock_timestamp();
        v_duration := EXTRACT(EPOCH FROM (v_end - v_start)) * 1000; -- ms
        v_total_duration := v_total_duration + v_duration;
    END LOOP;

    RAISE NOTICE 'Average execution time over % iterations: % ms',
        v_iterations,
        ROUND(v_total_duration / v_iterations, 2);
END $$;
```

### Monitoreo Continuo

**Crear vista de queries más lentas:**

```sql
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time,
    rows
FROM pg_stat_statements
WHERE mean_exec_time > 50  -- Promedio > 50ms
ORDER BY total_exec_time DESC;

-- Consultar regularmente
SELECT * FROM slow_queries LIMIT 10;
```

### Criterios de Éxito

- ✅ Top 10 queries críticas < 100ms
- ✅ Búsqueda full-text < 50ms
- ✅ Feed de actividad < 100ms
- ✅ Ninguna query usa Seq Scan en tablas con > 10,000 filas
- ✅ Índices apropiados en todas las FK y columnas filtradas frecuentemente

---

## 📊 Resumen - Fase 09

| Test ID | Nombre | Complejidad | Tiempo |
|---------|--------|-------------|--------|
| CP-F09-Q07 | Lighthouse audit completa | Alta | 60 min |
| CP-F09-Q08 | Error handling y logging | Alta | 90 min |
| CP-F09-Q09 | Performance queries críticas | Muy Alta | 120 min |

**Total:** ~4 horas 30 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
