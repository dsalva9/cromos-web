# Tests Técnicos - Fase 08: End-to-End

## 📋 Información General

**Fase:** Fase-08
**Categoría:** End-to-End - Integridad y Performance
**Audiencia:** David (tester técnico)

---

## 🎯 Cobertura

**3 tests técnicos** verificando:
- Consistencia de datos en flujos E2E
- Performance bajo carga
- Stress testing con múltiples usuarios concurrentes

---

## CP-F08-E2E-07: Consistencia de datos - Flujo completo de intercambio

### Objetivo

Verificar que un flujo E2E completo mantiene la integridad referencial y consistencia de datos en todas las tablas relacionadas.

### Escenario

Simular intercambio completo entre Usuario A y Usuario B y verificar que TODOS los datos relacionados son consistentes.

### Setup Inicial

```sql
-- Crear usuarios de prueba
INSERT INTO auth.users (id, email) VALUES
    (gen_random_uuid(), 'e2e.user.a@test.com'),
    (gen_random_uuid(), 'e2e.user.b@test.com')
RETURNING id;

-- User A: {user_a_id}
-- User B: {user_b_id}

-- Crear perfiles
INSERT INTO profiles (id, nickname, status) VALUES
    ('{user_a_id}', 'UserA_E2E', 'active'),
    ('{user_b_id}', 'UserB_E2E', 'active');

-- User A crea listado
INSERT INTO trade_listings (id, user_id, title, price, status) VALUES
    (gen_random_uuid(), '{user_a_id}', 'Messi 2022', 50.00, 'active')
RETURNING id;
-- listing_a_id = ...

-- User B crea listado
INSERT INTO trade_listings (id, user_id, title, price, status) VALUES
    (gen_random_uuid(), '{user_b_id}', 'Ronaldo 2021', 45.00, 'active')
RETURNING id;
-- listing_b_id = ...
```

### Paso 1: Crear Propuesta de Intercambio

```sql
-- User A propone intercambio
INSERT INTO trade_proposals (
    id,
    sender_id,
    receiver_id,
    status,
    money_compensation
) VALUES (
    gen_random_uuid(),
    '{user_a_id}',
    '{user_b_id}',
    'pending',
    5.00 -- User A ofrece 5€ adicionales
)
RETURNING id;
-- proposal_id = ...

-- Agregar ítems al intercambio
INSERT INTO trade_proposal_items (proposal_id, listing_id, direction) VALUES
    ('{proposal_id}', '{listing_a_id}', 'offered'),
    ('{proposal_id}', '{listing_b_id}', 'requested');
```

**Verificación de integridad:**

```sql
-- Verificar que Foreign Keys son válidos
SELECT
    tp.id AS proposal_id,
    tp.sender_id,
    tp.receiver_id,
    p_sender.nickname AS sender_nickname,
    p_receiver.nickname AS receiver_nickname,
    (SELECT COUNT(*) FROM trade_proposal_items WHERE proposal_id = tp.id) AS items_count
FROM trade_proposals tp
JOIN profiles p_sender ON p_sender.id = tp.sender_id
JOIN profiles p_receiver ON p_receiver.id = tp.receiver_id
WHERE tp.id = '{proposal_id}';
```

**Resultado esperado:**

| proposal_id | sender_nickname | receiver_nickname | items_count |
|-------------|-----------------|-------------------|-------------|
| {proposal_id} | UserA_E2E | UserB_E2E | 2 |

### Paso 2: Aceptar Propuesta

```sql
-- User B acepta propuesta
UPDATE trade_proposals
SET
    status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
WHERE id = '{proposal_id}';
```

**Verificación de trigger (si existe):**

```sql
-- Verificar que se crearon notificaciones para ambos usuarios
SELECT
    n.user_id,
    n.type,
    n.title,
    p.nickname
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.type IN ('trade_proposal_sent', 'trade_proposal_accepted')
  AND (n.user_id = '{user_a_id}' OR n.user_id = '{user_b_id}')
ORDER BY n.created_at DESC
LIMIT 2;
```

**Resultado esperado:** 2 filas (notificación para cada usuario)

### Paso 3: Marcar Listados como Vendidos

```sql
-- Marcar ambos listados como vendidos
UPDATE trade_listings
SET
    status = 'sold',
    sold_at = NOW()
WHERE id IN ('{listing_a_id}', '{listing_b_id}');
```

**Verificación:**

```sql
SELECT
    tl.id,
    tl.title,
    tl.status,
    tl.sold_at
FROM trade_listings tl
WHERE tl.id IN ('{listing_a_id}', '{listing_b_id}');
```

**Resultado esperado:**

| title | status | sold_at |
|-------|--------|---------|
| Messi 2022 | sold | [timestamp] |
| Ronaldo 2021 | sold | [timestamp] |

### Paso 4: Completar Intercambio

```sql
-- Marcar propuesta como completada
UPDATE trade_proposals
SET
    status = 'completed',
    completed_at = NOW()
WHERE id = '{proposal_id}';
```

### Paso 5: Valoraciones Mutuas

```sql
-- User A valora a User B
INSERT INTO ratings (rater_id, rated_user_id, rating, comment) VALUES
    ('{user_a_id}', '{user_b_id}', 5, 'Excelente trader');

-- User B valora a User A
INSERT INTO ratings (rater_id, rated_user_id, rating, comment) VALUES
    ('{user_b_id}', '{user_a_id}', 5, 'Muy recomendado');
```

### Verificación Final de Consistencia

**1. Verificar que NO hay datos huérfanos:**

```sql
-- Verificar que todos los proposal_items apuntan a propuestas existentes
SELECT
    tpi.id,
    tpi.proposal_id,
    tpi.listing_id
FROM trade_proposal_items tpi
LEFT JOIN trade_proposals tp ON tp.id = tpi.proposal_id
WHERE tp.id IS NULL;
```

**Resultado esperado:** 0 filas (no hay items huérfanos)

**2. Verificar integridad referencial completa:**

```sql
-- Query compleja que verifica toda la cadena de relaciones
SELECT
    tp.id AS proposal_id,
    tp.status AS proposal_status,
    tp.completed_at,
    COUNT(DISTINCT tpi.id) AS items_en_propuesta,
    COUNT(DISTINCT tl.id) AS listados_validos,
    COUNT(DISTINCT r.id) AS ratings_asociados
FROM trade_proposals tp
LEFT JOIN trade_proposal_items tpi ON tpi.proposal_id = tp.id
LEFT JOIN trade_listings tl ON tl.id = tpi.listing_id
LEFT JOIN ratings r ON (
    (r.rater_id = tp.sender_id AND r.rated_user_id = tp.receiver_id)
    OR (r.rater_id = tp.receiver_id AND r.rated_user_id = tp.sender_id)
)
WHERE tp.id = '{proposal_id}'
GROUP BY tp.id;
```

**Resultado esperado:**

| proposal_status | items_en_propuesta | listados_validos | ratings_asociados |
|-----------------|-------------------|------------------|-------------------|
| completed | 2 | 2 | 2 |

**3. Verificar que ratings actualizaron perfiles:**

```sql
SELECT
    p.nickname,
    (SELECT COUNT(*) FROM ratings WHERE rated_user_id = p.id) AS total_ratings,
    (SELECT AVG(rating) FROM ratings WHERE rated_user_id = p.id) AS rating_promedio
FROM profiles p
WHERE p.id IN ('{user_a_id}', '{user_b_id}')
ORDER BY p.nickname;
```

**Resultado esperado:**

| nickname | total_ratings | rating_promedio |
|----------|---------------|-----------------|
| UserA_E2E | 1 | 5.00 |
| UserB_E2E | 1 | 5.00 |

### Criterios de Éxito

- ✅ Todas las relaciones Foreign Key son válidas
- ✅ No hay registros huérfanos
- ✅ Triggers crearon notificaciones apropiadas
- ✅ Ratings se vinculan correctamente a usuarios
- ✅ Estados de propuesta y listados son consistentes

### Cleanup

```sql
-- Limpiar datos de prueba
DELETE FROM auth.users WHERE email IN ('e2e.user.a@test.com', 'e2e.user.b@test.com');
-- Cascade debe eliminar todos los datos relacionados
```

---

## CP-F08-E2E-08: Performance - Carga con 100 usuarios concurrentes

### Objetivo

Medir performance del sistema con múltiples usuarios realizando acciones simultáneamente.

### Herramientas

- **pgbench** (incluido con PostgreSQL)
- **Apache JMeter** (opcional, para frontend)
- **k6** (opcional, para API testing)

### Test con pgbench

**Crear script de carga:**

```sql
-- Archivo: test_load.sql

\set user_id random(1, 1000)

BEGIN;

-- Simular búsqueda de listados
SELECT
    tl.id,
    tl.title,
    tl.price,
    p.nickname
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'
  AND tl.price BETWEEN 10 AND 100
ORDER BY tl.created_at DESC
LIMIT 20;

-- Simular consulta de perfil
SELECT
    p.nickname,
    (SELECT COUNT(*) FROM trade_listings WHERE user_id = p.id) AS num_listings,
    (SELECT AVG(rating) FROM ratings WHERE rated_user_id = p.id) AS rating
FROM profiles p
WHERE p.id = (SELECT id FROM profiles ORDER BY random() LIMIT 1);

-- Simular inserción de mensaje
INSERT INTO chat_messages (chat_id, sender_id, message_text)
SELECT
    c.id,
    :user_id,
    'Test message from load test'
FROM chats c
ORDER BY random()
LIMIT 1;

COMMIT;
```

**Ejecutar test de carga:**

```bash
pgbench -h localhost -U postgres -d cromos_db \
    -c 100 \           # 100 clientes concurrentes
    -j 10 \            # 10 threads
    -T 60 \            # Duración: 60 segundos
    -f test_load.sql \
    --progress=5
```

**Métricas esperadas:**

```
transaction type: Custom query
scaling factor: 1
query mode: simple
number of clients: 100
number of threads: 10
duration: 60 s
number of transactions actually processed: 15000
latency average = 400 ms
latency stddev = 50 ms
tps = 250.000000 (including connections establishing)
```

**Criterios de aceptación:**

- **TPS (transacciones por segundo):** > 200
- **Latencia promedio:** < 500ms
- **Latencia p95:** < 800ms
- **Errores:** < 1%

### Análisis de Queries Lentas

Durante el test de carga, capturar queries lentas:

```sql
-- Habilitar log de queries lentas (en postgresql.conf)
-- log_min_duration_statement = 500  # Log queries > 500ms

-- Ver queries más lentas durante el test
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Más de 100ms en promedio
ORDER BY total_exec_time DESC
LIMIT 10;
```

**Acción:**
- Optimizar queries que aparecen en top 10
- Agregar índices faltantes
- Revisar EXPLAIN ANALYZE de queries problemáticas

### Test de Carga en API (con k6)

```javascript
// script.js para k6
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '1m', target: 50 },  // Ramp up a 50 usuarios
        { duration: '3m', target: 100 }, // Mantener 100 usuarios
        { duration: '1m', target: 0 },   // Ramp down
    ],
};

export default function () {
    // Test: Buscar listados
    let res = http.get('https://api.cromos.com/listings?search=messi');
    check(res, {
        'status 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);

    // Test: Ver perfil
    res = http.get('https://api.cromos.com/profiles/random');
    check(res, {
        'status 200': (r) => r.status === 200,
    });

    sleep(1);
}
```

**Ejecutar:**

```bash
k6 run script.js
```

**Criterios de éxito:**
- ✅ 95% de requests < 500ms
- ✅ Tasa de error < 1%
- ✅ Sistema estable durante todo el test

### Criterios de Éxito

- ✅ Sistema maneja 100 usuarios concurrentes sin degradación
- ✅ Latencia promedio < 500ms bajo carga
- ✅ No hay deadlocks o errores de concurrencia
- ✅ Base de datos usa índices apropiados

---

## CP-F08-E2E-09: Stress Testing - Límites del sistema

### Objetivo

Determinar los límites del sistema y puntos de fallo bajo carga extrema.

### Test 1: Inserción masiva de listados

**Escenario:** 1000 usuarios crean 10 listados cada uno simultáneamente.

```sql
-- Script para generar carga
DO $$
DECLARE
    v_user_id UUID;
    v_listing_count INT := 0;
BEGIN
    FOR i IN 1..1000 LOOP
        -- Seleccionar usuario random
        SELECT id INTO v_user_id
        FROM profiles
        ORDER BY random()
        LIMIT 1;

        -- Crear 10 listados
        FOR j IN 1..10 LOOP
            INSERT INTO trade_listings (
                user_id,
                title,
                price,
                status,
                condition
            ) VALUES (
                v_user_id,
                'Test Listing ' || (i * 10 + j),
                (random() * 100)::NUMERIC(10,2),
                'active',
                'excellent'
            );

            v_listing_count := v_listing_count + 1;

            -- Log progreso cada 1000 inserciones
            IF v_listing_count % 1000 = 0 THEN
                RAISE NOTICE 'Inserted % listings', v_listing_count;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Total listings inserted: %', v_listing_count;
END $$;
```

**Métricas a monitorear:**

```sql
-- Tamaño de la tabla trade_listings
SELECT
    pg_size_pretty(pg_total_relation_size('trade_listings')) AS table_size,
    COUNT(*) AS total_rows
FROM trade_listings;
```

```sql
-- Performance de índices
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'trade_listings'
ORDER BY idx_scan DESC;
```

**Criterios:**
- Inserción completa en < 5 minutos
- Índices se mantienen eficientes (idx_scan > 0)
- No hay bloqueos prolongados

### Test 2: Búsquedas concurrentes con full-text search

```sql
-- 100 búsquedas concurrentes simultáneas
-- Usar pgbench o cliente Python con threads

-- Query a probar:
EXPLAIN ANALYZE
SELECT
    tl.id,
    tl.title,
    tl.price,
    ts_rank(
        to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.description, '')),
        to_tsquery('spanish', 'messi | ronaldo')
    ) AS rank
FROM trade_listings tl
WHERE to_tsvector('spanish', tl.title || ' ' || COALESCE(tl.description, ''))
    @@ to_tsquery('spanish', 'messi | ronaldo')
  AND tl.status = 'active'
ORDER BY rank DESC
LIMIT 50;
```

**Optimización necesaria:**

```sql
-- Crear índice GIN para full-text search
CREATE INDEX IF NOT EXISTS trade_listings_fts_idx
ON trade_listings
USING GIN (to_tsvector('spanish', title || ' ' || COALESCE(description, '')));
```

**Verificar performance:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM trade_listings
WHERE to_tsvector('spanish', title || ' ' || COALESCE(description, ''))
    @@ to_tsquery('spanish', 'messi');
```

**Plan esperado:**

```
Bitmap Heap Scan on trade_listings
  Recheck Cond: ...
  ->  Bitmap Index Scan on trade_listings_fts_idx
        Index Cond: ...
Planning Time: 0.5 ms
Execution Time: 15 ms
```

**Criterios:**
- Búsqueda full-text < 50ms con índice GIN
- Soporta 100 búsquedas concurrentes sin timeout

### Test 3: Actualización masiva con locks

**Escenario:** 50 admins intentan actualizar el mismo usuario simultáneamente.

```sql
-- Desde 50 conexiones simultáneas:
BEGIN;

UPDATE profiles
SET status = 'suspended'
WHERE id = '{target_user_id}';

-- Simular trabajo adicional
SELECT pg_sleep(2);

COMMIT;
```

**Verificar comportamiento:**

```sql
-- Monitorear locks activos
SELECT
    pid,
    usename,
    pg_blocking_pids(pid) AS blocked_by,
    query
FROM pg_stat_activity
WHERE datname = 'cromos_db'
  AND state = 'active'
  AND query NOT LIKE '%pg_stat_activity%';
```

**Resultado esperado:**
- Row-level locks funcionan correctamente
- Transacciones se serializan sin deadlock
- Tiempo de espera < 5 segundos por transacción

### Test 4: Realtime con 1000 suscripciones

**Escenario:** 1000 clientes WebSocket suscritos a notificaciones.

**Setup (en cliente JavaScript):**

```javascript
// Simular 1000 conexiones WebSocket
for (let i = 0; i < 1000; i++) {
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    client
        .from('notifications')
        .on('INSERT', payload => {
            console.log(`Client ${i} received:`, payload);
        })
        .eq('user_id', randomUserId())
        .subscribe();
}

// Generar eventos
setInterval(() => {
    // Insertar notificación
    supabase.from('notifications').insert({
        user_id: randomUserId(),
        type: 'test',
        title: 'Test notification',
        message: 'Stress test'
    });
}, 100); // 10 notificaciones por segundo
```

**Métricas esperadas:**
- Latencia de entrega de notificación < 2 segundos
- CPU del servidor < 80%
- Memoria estable (no memory leak)
- Todas las conexiones WebSocket estables

### Monitoreo del Sistema

**Conexiones activas:**

```sql
SELECT
    COUNT(*) AS active_connections,
    MAX(state) AS max_state
FROM pg_stat_activity
WHERE datname = 'cromos_db';
```

**Límite de conexiones:**

```sql
SHOW max_connections;
-- Típicamente 100-200

-- Verificar uso actual
SELECT
    (SELECT COUNT(*) FROM pg_stat_activity) AS current,
    (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') AS max,
    ROUND(
        (SELECT COUNT(*) FROM pg_stat_activity)::NUMERIC /
        (SELECT setting::INT FROM pg_settings WHERE name = 'max_connections') * 100,
        2
    ) AS percent_used;
```

**Tamaño de base de datos:**

```sql
SELECT
    pg_size_pretty(pg_database_size('cromos_db')) AS db_size;
```

### Criterios de Éxito

- ✅ Sistema maneja 10,000 listados sin degradación
- ✅ Búsquedas full-text < 50ms con índice GIN
- ✅ No hay deadlocks en actualizaciones concurrentes
- ✅ Realtime soporta 1000 conexiones WebSocket simultáneas
- ✅ Uso de CPU < 80% bajo carga máxima
- ✅ Memoria estable (no memory leaks)

---

## 📊 Resumen - Fase 08

| Test ID | Nombre | Complejidad | Tiempo |
|---------|--------|-------------|--------|
| CP-F08-E2E-07 | Consistencia datos E2E | Alta | 60 min |
| CP-F08-E2E-08 | Performance 100 usuarios | Alta | 90 min |
| CP-F08-E2E-09 | Stress testing límites | Muy Alta | 120 min |

**Total:** ~4 horas 30 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
