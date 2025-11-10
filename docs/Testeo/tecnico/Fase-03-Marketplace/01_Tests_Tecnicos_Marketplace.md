# Tests Técnicos - Fase 03: Marketplace

## 📋 Información General

**Fase:** Fase-03
**Categoría:** Marketplace y Transacciones
**Audiencia:** David (tester técnico)
**Herramientas requeridas:** Supabase Dashboard (SQL Editor), Chrome DevTools, psql (opcional)

---

## 🎯 Cobertura de Tests Técnicos

Esta fase incluye **5 tests técnicos** que verifican:

1. **RLS Policies** - Solo el autor puede editar/eliminar sus listados
2. **Chat Security** - Usuarios solo ven chats de los que participan
3. **Realtime Subscriptions** - Mensajes de chat en tiempo real
4. **Performance** - Búsqueda y filtrado optimizados
5. **Data Integrity** - Prevención de chats duplicados, validación de precios

---

## CP-F03-02H: RLS - Solo autor puede modificar listado

### Objetivo

Verificar que las políticas RLS impiden que usuarios modifiquen o eliminen listados de otros.

### Setup

- **Usuarios necesarios:**
  - Usuario A (vendedor): `qa.vendedor@cromos.test` (id: `{user_a_id}`)
  - Usuario B (intruso): `qa.comprador@cromos.test` (id: `{user_b_id}`)
- **Prerequisito:** Usuario A tiene listado "Cromo Messi #10 - REBAJADO" publicado
- **Herramientas:** Supabase Dashboard (SQL Editor)

### Pasos

1. Verificar políticas RLS en tabla `trade_listings`
2. Como Usuario B, intentar modificar listado de Usuario A
3. Como Usuario B, intentar eliminar listado de Usuario A
4. Verificar que ambas operaciones fallan

### Verificación Principal

**Consulta SQL - Revisar políticas RLS:**

```sql
-- Ver todas las políticas RLS en trade_listings
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS comando,
    qual AS clausula_WHERE,
    with_check AS clausula_WITH_CHECK
FROM pg_policies
WHERE tablename = 'trade_listings'
ORDER BY cmd, policyname;
```

**Resultado esperado:**

Debe haber políticas para:
- **SELECT:** Permitir lectura de listados activos (`status = 'active'`) + propios
- **INSERT:** Permitir crear listados (user_id = auth.uid())
- **UPDATE:** Solo si `user_id = auth.uid()`
- **DELETE:** Solo si `user_id = auth.uid()`

**Políticas esperadas:**

```
UPDATE policy: (user_id = auth.uid())
DELETE policy: (user_id = auth.uid())
SELECT policy: ((status = 'active') OR (user_id = auth.uid()))
```

### Test de Penetración

**Como Usuario B, intentar modificar listado de Usuario A:**

```sql
-- Simular request de Usuario B
SET request.jwt.claim.sub = '{user_b_id}';

-- Obtener ID de listado de Usuario A
SELECT id FROM trade_listings
WHERE title LIKE '%Messi%REBAJADO%'
  AND user_id = '{user_a_id}';
-- Anotar el ID: {listing_id}

-- Intentar modificar precio (debe fallar)
UPDATE trade_listings
SET price = 1.00  -- Intentar cambiar precio
WHERE id = '{listing_id}';

-- Verificar que no se modificó
SELECT price FROM trade_listings WHERE id = '{listing_id}';
```

**Resultado esperado:**
- UPDATE afecta **0 filas** (RLS bloqueó)
- Precio permanece 12.00 (sin cambios)

**Intentar eliminar (debe fallar):**

```sql
SET request.jwt.claim.sub = '{user_b_id}';

DELETE FROM trade_listings WHERE id = '{listing_id}';

-- Verificar que sigue existiendo
SELECT id, title FROM trade_listings WHERE id = '{listing_id}';
```

**Resultado esperado:**
- DELETE afecta **0 filas**
- Listado sigue existiendo

### Test Positivo

**Como Usuario A, SÍ puede modificar su propio listado:**

```sql
SET request.jwt.claim.sub = '{user_a_id}';

UPDATE trade_listings
SET price = 10.00
WHERE id = '{listing_id}';

SELECT price FROM trade_listings WHERE id = '{listing_id}';
```

**Resultado esperado:**
- UPDATE afecta **1 fila**
- `price = 10.00` (actualizado)

### Criterios de Éxito

- ✅ RLS está habilitado en `trade_listings`
- ✅ Política UPDATE verifica `user_id = auth.uid()`
- ✅ Usuario B NO puede modificar listado de Usuario A (0 filas)
- ✅ Usuario B NO puede eliminar listado de Usuario A (0 filas)
- ✅ Usuario A SÍ puede modificar su propio listado

### Notas Técnicas

- Política SELECT debe permitir: `status = 'active' OR user_id = auth.uid()`
- Esto permite que usuarios vean listados activos de otros, pero solo sus propios listados inactivos/vendidos
- Edge case: Admin users necesitan política separada con bypass

---

## CP-F03-02I: RLS - Chat Security (solo participantes)

### Objetivo

Verificar que las políticas RLS de chat impiden que usuarios lean mensajes de conversaciones de las que no participan.

### Setup

- **Usuarios necesarios:**
  - Usuario A: `qa.vendedor@cromos.test` (participa en chat)
  - Usuario B: `qa.comprador@cromos.test` (participa en chat)
  - Usuario C: `qa.espia@cromos.test` (NO participa, intentará espiar)
- **Prerequisito:** Chat activo entre Usuario A y Usuario B con al menos 2 mensajes
- **Herramientas:** SQL Editor

### Pasos

1. Verificar políticas RLS en `chats` y `chat_messages`
2. Como Usuario C, intentar leer chat de A-B (debe fallar)
3. Como Usuario C, intentar enviar mensaje al chat A-B (debe fallar)
4. Verificar que solo participantes pueden acceder

### Verificación Principal

**Consulta SQL - Ver políticas RLS en chats:**

```sql
-- Políticas en tabla chats
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'chats'
ORDER BY cmd, policyname;

-- Políticas en tabla chat_messages
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;
```

**Políticas esperadas en `chats`:**

```
SELECT: (participant_a_id = auth.uid() OR participant_b_id = auth.uid())
```

**Políticas esperadas en `chat_messages`:**

```
SELECT: Usuario debe ser participante del chat (verificar via JOIN con chats)
INSERT: sender_id = auth.uid() AND es participante del chat
```

### Test de Penetración

**Obtener IDs de usuarios:**

```sql
SELECT email, id FROM auth.users WHERE email IN (
    'qa.vendedor@cromos.test',
    'qa.comprador@cromos.test',
    'qa.espia@cromos.test'
);
-- Anotar: {vendedor_id}, {comprador_id}, {espia_id}
```

**Buscar chat entre vendedor y comprador:**

```sql
-- Como Usuario A (vendedor), ver sus chats
SET request.jwt.claim.sub = '{vendedor_id}';

SELECT id, participant_a_id, participant_b_id, listing_id
FROM chats
WHERE participant_a_id = '{vendedor_id}'
   OR participant_b_id = '{vendedor_id}'
ORDER BY created_at DESC
LIMIT 1;
-- Anotar: {chat_id}
```

**Como Usuario C (espía), intentar ver ese chat (debe fallar):**

```sql
SET request.jwt.claim.sub = '{espia_id}';

-- Intentar leer chat de otros
SELECT id, participant_a_id, participant_b_id
FROM chats
WHERE id = '{chat_id}';
```

**Resultado esperado:** 0 filas (RLS bloqueó)

**Intentar leer mensajes del chat (debe fallar):**

```sql
SET request.jwt.claim.sub = '{espia_id}';

SELECT id, message, sender_id
FROM chat_messages
WHERE chat_id = '{chat_id}';
```

**Resultado esperado:** 0 filas (RLS bloqueó acceso a mensajes)

**Intentar enviar mensaje al chat ajeno (debe fallar):**

```sql
SET request.jwt.claim.sub = '{espia_id}';

INSERT INTO chat_messages (chat_id, sender_id, message)
VALUES ('{chat_id}', '{espia_id}', 'HACKED - Mensaje espía');
```

**Resultado esperado:**
- Error de RLS violation
- 0 filas insertadas

### Test Positivo

**Como Usuario A (participante), SÍ puede ver mensajes:**

```sql
SET request.jwt.claim.sub = '{vendedor_id}';

SELECT id, message, sender_id
FROM chat_messages
WHERE chat_id = '{chat_id}'
ORDER BY created_at DESC;
```

**Resultado esperado:** Múltiples filas (mensajes del chat)

### Criterios de Éxito

- ✅ RLS habilitado en `chats` y `chat_messages`
- ✅ Política SELECT verifica participación: `participant_a_id = auth.uid() OR participant_b_id = auth.uid()`
- ✅ Usuario C NO puede leer chat de A-B (0 filas)
- ✅ Usuario C NO puede enviar mensajes al chat A-B
- ✅ Usuarios A y B SÍ pueden leer sus mensajes

### Notas Técnicas

- Política de `chat_messages` debe hacer JOIN con `chats` para verificar participación
- Ejemplo de política compleja:
```sql
CREATE POLICY "participants_read_messages" ON chat_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chats
        WHERE chats.id = chat_messages.chat_id
          AND (chats.participant_a_id = auth.uid()
               OR chats.participant_b_id = auth.uid())
    )
);
```
- Edge case: ¿Qué pasa si usuario es bloqueado después de iniciar chat?

---

## CP-F03-02J: Realtime - Mensajes de chat en tiempo real

### Objetivo

Verificar que Supabase Realtime está configurado correctamente para enviar mensajes de chat en tiempo real a través de WebSocket.

### Setup

- **Usuarios:** `qa.vendedor@cromos.test` y `qa.comprador@cromos.test`
- **Prerequisito:** Chat activo entre ellos
- **Herramientas:** 2 navegadores, Chrome DevTools, SQL Editor

### Pasos

1. Verificar que Realtime está habilitado en tabla `chat_messages`
2. Configurar suscripción WebSocket
3. Enviar mensaje y medir latencia de recepción
4. Verificar que solo participantes reciben eventos

### Verificación Principal

**Consulta SQL - Verificar configuración de Realtime:**

```sql
-- Ver si tabla tiene Realtime habilitado (específico de Supabase)
-- En Supabase Dashboard: Database → Replication
-- Verificar que 'chat_messages' está en la lista de tablas replicadas
```

**En Supabase Dashboard:**
1. Ir a **Database → Replication**
2. Buscar tabla `chat_messages`
3. Verificar que tiene columna **"Realtime enabled"** = ✅

### Test de Realtime

**Preparar 2 navegadores:**

**Navegador A (Vendedor):**
1. Login como `qa.vendedor@cromos.test`
2. Abrir chat con comprador
3. Abrir DevTools → Console
4. Ejecutar script de suscripción:

```javascript
// Suscribirse a nuevos mensajes en el chat
const chatId = 'REEMPLAZAR_CON_CHAT_ID'; // Obtener de URL o UI

const subscription = supabase
  .from('chat_messages')
  .on('INSERT', (payload) => {
    console.log('🔔 Nuevo mensaje recibido en tiempo real:', payload);
    console.log('⏱️ Timestamp recepción:', new Date().toISOString());
  })
  .eq('chat_id', chatId)
  .subscribe();

console.log('✅ Suscripción activa:', subscription);
```

**Navegador B (Comprador):**
1. Login como `qa.comprador@cromos.test`
2. Abrir el mismo chat
3. Escribir mensaje: `Mensaje de prueba Realtime`
4. Enviar (clic en botón o Enter)
5. **Anotar timestamp de envío** (ej: 14:35:42)

**Verificar en Navegador A:**

**⏱️ Esperar 1-5 segundos (sin recargar)**

**Lo que DEBE pasar:**

- ✅ En Console de Navegador A aparece log: `🔔 Nuevo mensaje recibido en tiempo real:`
- ✅ Payload contiene: `{ message: "Mensaje de prueba Realtime", sender_id: "...", ... }`
- ✅ Mensaje aparece en UI automáticamente
- ✅ **Latencia < 3 segundos** (ideal < 2s)

**Calcular latencia:**
- Timestamp envío (Navegador B): 14:35:42
- Timestamp recepción (Navegador A): 14:35:43
- **Latencia:** 1 segundo ✅

### Verificación en DevTools

**Pestaña Network → WS (WebSocket):**

1. Filtrar por protocolo WebSocket
2. Buscar conexión a: `wss://[project].supabase.co/realtime/v1/websocket`
3. Verificar estado: **"101 Switching Protocols"** (activo)
4. Click en conexión → sub-pestaña **"Messages"**
5. Ver eventos en tiempo real:

```json
{
  "topic": "realtime:public:chat_messages",
  "event": "INSERT",
  "payload": {
    "data": {
      "id": "...",
      "chat_id": "...",
      "sender_id": "...",
      "message": "Mensaje de prueba Realtime",
      "created_at": "2025-11-09T14:35:42Z"
    }
  }
}
```

### Test de Seguridad

**Usuario C (no participante) NO debe recibir eventos:**

**Navegador C:**
1. Login como `qa.espia@cromos.test`
2. Intentar suscribirse al mismo chat (con chat_id de A-B)
3. Enviar mensaje desde Navegador A o B

**Resultado esperado:**

- ✅ Navegador C NO recibe eventos del chat ajeno
- ✅ RLS bloquea suscripción a chat_messages donde usuario no es participante
- ✅ Console puede mostrar error de autorización (es correcto)

### Criterios de Éxito

- ✅ Realtime está habilitado en tabla `chat_messages`
- ✅ Suscripción WebSocket se establece correctamente
- ✅ Mensajes se reciben en < 3 segundos (idealmente < 2s)
- ✅ Eventos contienen payload completo
- ✅ Usuarios no participantes NO reciben eventos (RLS funciona)
- ✅ No hay mensajes duplicados

### Notas Técnicas

- **Supabase Realtime** usa PostgreSQL LISTEN/NOTIFY internamente
- Cada cliente mantiene conexión WebSocket persistente
- RLS policies se aplican también a suscripciones Realtime
- Performance: Con 1000 usuarios concurrentes, latencia típica 1-3s
- Edge case: ¿Qué pasa si usuario pierde conexión WiFi? (reconexión automática)

---

## CP-F03-03E: Performance - Búsqueda en marketplace

### Objetivo

Verificar que la búsqueda de listados en marketplace está optimizada con índices y full-text search.

### Setup

- **Prerequisito:** Al menos 100 listados en la base de datos
- **Herramientas:** SQL Editor, EXPLAIN ANALYZE

### Pasos

1. Ejecutar query de búsqueda con filtros
2. Analizar plan de ejecución
3. Verificar índices apropiados
4. Medir tiempo de ejecución

### Verificación Principal

**Query típica de búsqueda en marketplace:**

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    tl.id,
    tl.title,
    tl.description,
    tl.price,
    tl.listing_type,
    tl.created_at,
    p.nickname AS vendedor,
    p.avatar_url
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'
  AND (
      tl.title ILIKE '%Messi%'
      OR tl.description ILIKE '%Messi%'
  )
  AND tl.listing_type = 'sale'  -- Filtro por tipo
  AND tl.price BETWEEN 5.00 AND 20.00  -- Filtro por precio
ORDER BY tl.created_at DESC
LIMIT 20;
```

**Criterios de performance esperados:**

- **Execution Time:** < 500ms (con 1000 listados)
- **Planning Time:** < 20ms
- **Uso de índices:**
  - ✅ Index Scan en `status`
  - ✅ Index Scan en `listing_type`
  - ✅ Posible uso de GIN index para full-text search (si existe)

### Verificación de Índices

**Listar índices en trade_listings:**

```sql
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'trade_listings'
ORDER BY indexname;
```

**Índices esperados:**

- `trade_listings_pkey` en `id` (PK)
- `trade_listings_user_id_idx` en `user_id` (FK)
- `trade_listings_status_idx` en `status` (filtro frecuente)
- `trade_listings_listing_type_idx` en `listing_type`
- Opcional: `trade_listings_price_idx` en `price` (para rangos)

**Si falta índice crítico, crear:**

```sql
-- Índice en status (muy importante)
CREATE INDEX IF NOT EXISTS trade_listings_status_idx
ON trade_listings (status);

-- Índice en listing_type
CREATE INDEX IF NOT EXISTS trade_listings_listing_type_idx
ON trade_listings (listing_type);

-- Índice compuesto para filtros combinados (óptimo)
CREATE INDEX IF NOT EXISTS trade_listings_status_type_created_idx
ON trade_listings (status, listing_type, created_at DESC);
```

### Full-Text Search (Avanzado)

**Para búsquedas más rápidas, considerar full-text search:**

```sql
-- Crear columna tsvector para búsqueda full-text
ALTER TABLE trade_listings
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, ''))
) STORED;

-- Crear índice GIN para búsqueda rápida
CREATE INDEX IF NOT EXISTS trade_listings_search_idx
ON trade_listings USING GIN (search_vector);

-- Query optimizada con full-text search
EXPLAIN (ANALYZE, BUFFERS)
SELECT tl.id, tl.title, tl.price
FROM trade_listings tl
WHERE tl.status = 'active'
  AND tl.search_vector @@ to_tsquery('spanish', 'Messi')
  AND tl.listing_type = 'sale'
ORDER BY ts_rank(tl.search_vector, to_tsquery('spanish', 'Messi')) DESC
LIMIT 20;
```

**Ventajas de full-text search:**
- Mucho más rápido que ILIKE (100x+)
- Soporta búsqueda por palabras clave (no necesita % wildcards)
- Ranking de relevancia (`ts_rank`)
- Soporta sinónimos, stemming (Messi = Messis)

### Análisis de EXPLAIN Output

**Buscar en output:**

✅ **Buenas señales:**
```
-> Index Scan using trade_listings_status_idx
-> Bitmap Index Scan on trade_listings_status_type_created_idx
-> GIN Index Scan on trade_listings_search_idx (si full-text)
```

❌ **Malas señales:**
```
-> Seq Scan on trade_listings tl
   Filter: (status = 'active')
   Rows Removed by Filter: 5000
```

### Test de Carga

**Simular múltiples búsquedas concurrentes:**

```sql
-- Ejecutar 10 veces en paralelo (usar pgbench o script)
SELECT tl.id, tl.title, tl.price
FROM trade_listings tl
WHERE tl.status = 'active'
  AND (tl.title ILIKE '%Argentina%' OR tl.description ILIKE '%Argentina%')
ORDER BY tl.created_at DESC
LIMIT 20;
```

**Criterios:**
- Tiempo promedio < 500ms con 10 queries concurrentes
- No debe haber lock contention

### Criterios de Éxito

- ✅ Query ejecuta en < 500ms (EXPLAIN ANALYZE)
- ✅ Usa índice en `status` (no Seq Scan)
- ✅ Índices existen en columnas filtradas frecuentemente
- ✅ Full-text search implementado (opcional pero recomendado)
- ✅ Performance consistente con carga concurrente

### Notas Técnicas

- ILIKE es lento con tablas grandes (>10,000 filas)
- Full-text search es **crítico** para búsquedas en producción
- Índice compuesto `(status, listing_type, created_at DESC)` cubre múltiples filtros
- Considerar cache de resultados en Redis para queries frecuentes
- Edge case: Búsquedas de 1 letra pueden ser muy lentas (limitar a 3+ caracteres)

---

## CP-F03-03F: Prevención de chats duplicados

### Objetivo

Verificar que no se pueden crear múltiples chats entre los mismos 2 usuarios para el mismo listado.

### Setup

- **Usuarios:** `qa.vendedor@cromos.test` y `qa.comprador@cromos.test`
- **Prerequisito:** 1 listado activo del vendedor

### Pasos

1. Verificar constraint UNIQUE en `chats`
2. Crear primer chat entre usuarios para un listado
3. Intentar crear segundo chat (debe fallar o retornar existente)

### Verificación Principal

**Consulta SQL - Ver constraint UNIQUE:**

```sql
SELECT
    conname AS nombre_constraint,
    contype AS tipo,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'chats'::regclass
  AND contype = 'u'  -- UNIQUE constraint
ORDER BY conname;
```

**Resultado esperado:**

Debe haber constraint UNIQUE en combinación de participantes + listado:

```
UNIQUE (listing_id, participant_a_id, participant_b_id)
```

O similar que prevenga chats duplicados.

**Nota:** El orden de participantes (A/B) puede complicar esto. Mejor solución:

```sql
-- Function para ordenar participantes consistentemente
CREATE OR REPLACE FUNCTION ensure_participant_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.participant_a_id > NEW.participant_b_id THEN
        -- Swap para que A siempre sea el menor UUID
        DECLARE temp UUID;
        BEGIN
            temp := NEW.participant_a_id;
            NEW.participant_a_id := NEW.participant_b_id;
            NEW.participant_b_id := temp;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_participant_order_trigger
BEFORE INSERT ON chats
FOR EACH ROW EXECUTE FUNCTION ensure_participant_order();
```

### Test de Duplicados

**Crear primer chat:**

```sql
-- Obtener IDs
SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test';
-- {vendedor_id}
SELECT id FROM auth.users WHERE email = 'qa.comprador@cromos.test';
-- {comprador_id}
SELECT id FROM trade_listings WHERE title LIKE '%Messi%' AND status = 'active' LIMIT 1;
-- {listing_id}

-- Insertar primer chat
INSERT INTO chats (listing_id, participant_a_id, participant_b_id)
VALUES ('{listing_id}', '{comprador_id}', '{vendedor_id}')
RETURNING id;
-- {chat_id_1}
```

**Resultado esperado:** INSERT exitoso (1 fila)

**Intentar crear chat duplicado:**

```sql
-- Mismos participantes, mismo listado
INSERT INTO chats (listing_id, participant_a_id, participant_b_id)
VALUES ('{listing_id}', '{comprador_id}', '{vendedor_id}');
```

**Resultado esperado:**
- Error: `duplicate key value violates unique constraint`
- Código: `23505` (unique_violation)

**Intentar con participantes en orden inverso (también debe fallar):**

```sql
INSERT INTO chats (listing_id, participant_a_id, participant_b_id)
VALUES ('{listing_id}', '{vendedor_id}', '{comprador_id}');  -- Orden inverso
```

**Resultado esperado:**
- Si trigger `ensure_participant_order` existe: Error de duplicado
- Si no hay trigger: Puede insertarse (esto es un problema)

### Solución Alternativa (Aplicación)

Si no hay constraint DB, la aplicación debe:

```sql
-- Antes de INSERT, buscar chat existente
SELECT id FROM chats
WHERE listing_id = '{listing_id}'
  AND (
      (participant_a_id = '{user1}' AND participant_b_id = '{user2}')
      OR (participant_a_id = '{user2}' AND participant_b_id = '{user1}')
  );

-- Si retorna ID: Usar chat existente
-- Si retorna 0 filas: Crear nuevo
```

### Criterios de Éxito

- ✅ Constraint UNIQUE previene chats duplicados
- ✅ Trigger normaliza orden de participantes (o aplicación lo maneja)
- ✅ Segundo INSERT con mismos parámetros es rechazado
- ✅ Solo existe 1 chat por combinación (listado + 2 usuarios)

### Notas Técnicas

- Constraint DB es preferible a lógica de aplicación (última línea de defensa)
- Trigger para normalizar orden es elegante pero añade complejidad
- Alternativa: Usar pattern `LEAST(user1, user2)` y `GREATEST(user1, user2)`
- Edge case: ¿Qué pasa si mismo usuario es comprador Y vendedor? (improbable)

---

## 📊 Resumen de Tests Técnicos - Fase 03

| Test ID | Nombre | Complejidad | Tiempo Est. | Categoría |
|---------|--------|-------------|-------------|-----------|
| CP-F03-02H | RLS listados | Media | 30 min | Seguridad |
| CP-F03-02I | RLS chat security | Alta | 40 min | Seguridad |
| CP-F03-02J | Realtime chat | Alta | 45 min | Realtime |
| CP-F03-03E | Performance búsqueda | Alta | 50 min | Rendimiento |
| CP-F03-03F | Prevención chats duplicados | Media | 25 min | Integridad |

**Total estimado:** ~3.5 horas

---

## 🔧 Herramientas de Debugging

### Ver mensajes de chat en tiempo real (psql)

```sql
-- Escuchar eventos de PostgreSQL LISTEN/NOTIFY
LISTEN realtime:public:chat_messages;

-- En otra sesión, INSERT un mensaje
-- Deberías recibir notificación
```

### Analizar uso de WebSocket

En Chrome DevTools:
1. Network → WS
2. Click en conexión WebSocket
3. Messages → Ver flujo completo de eventos

### Medir latencia de Realtime

```javascript
// En navegador emisor
const sendTime = Date.now();
console.log('Enviando mensaje a las:', sendTime);

// En navegador receptor (suscrito)
supabase.from('chat_messages').on('INSERT', (payload) => {
    const receiveTime = Date.now();
    const latency = receiveTime - sendTime;
    console.log('Latencia:', latency, 'ms');
});
```

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Autor:** David
