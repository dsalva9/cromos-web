# Tests Técnicos - Fase 01: Autenticación y Perfil

## 📋 Información General

**Fase:** Fase-01
**Categoría:** Autenticación y Perfil de Usuario
**Audiencia:** David (tester técnico)
**Herramientas requeridas:** Supabase Dashboard (SQL Editor), Chrome DevTools, psql (opcional)

---

## 🎯 Cobertura de Tests Técnicos

Esta fase incluye **7 tests técnicos** que verifican:

1. **Row Level Security (RLS)** - Políticas de acceso a perfiles
2. **Storage Policies** - Seguridad de avatares en Supabase Storage
3. **Database Triggers** - Creación automática de perfiles
4. **Auth API** - Funcionalidad de Supabase Auth
5. **Data Integrity** - Prevención de duplicados y consistencia
6. **Performance** - Tiempos de respuesta aceptables
7. **Audit Trail** - Registro de acciones críticas

---

## CP-F01-03: Prevención de registro duplicado (email)

### Objetivo

Verificar que el sistema impide el registro de usuarios con el mismo email, tanto a nivel de aplicación como de base de datos.

### Setup

- **Prerequisito:** Usuario existente `qa.original@cromos.test` ya registrado
- **Herramientas:** Supabase Dashboard (Auth), SQL Editor
- **Datos necesarios:** Email de usuario existente

### Pasos

1. Intentar registrar nuevo usuario con email `qa.original@cromos.test`
2. Verificar que la aplicación muestra error antes de hacer request
3. Intentar INSERT directo en `auth.users` (bypass de aplicación)

### Verificación Principal

**Consulta SQL - Verificar constraint de unicidad:**

```sql
-- Verificar que existe constraint UNIQUE en auth.users.email
SELECT
    conname AS nombre_constraint,
    contype AS tipo,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass
  AND contype = 'u'
  AND conname LIKE '%email%';
```

**Resultado esperado:**
- 1 fila con constraint `users_email_key` o similar
- `tipo = 'u'` (UNIQUE)
- Definición: `UNIQUE (email)`

**Intentar bypass (debe fallar):**

```sql
-- Este INSERT debe ser rechazado por la base de datos
INSERT INTO auth.users (
    instance_id,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'qa.original@cromos.test',  -- Email duplicado
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
);
```

**Resultado esperado:**
- Error: `duplicate key value violates unique constraint "users_email_key"`
- Código de error: `23505` (unique_violation)

### Verificaciones Adicionales

**Verificar que no hay emails duplicados actualmente:**

```sql
SELECT email, COUNT(*) AS cantidad
FROM auth.users
GROUP BY email
HAVING COUNT(*) > 1;
```

**Resultado esperado:** 0 filas (no hay duplicados)

### Criterios de Éxito

- ✅ Constraint UNIQUE existe en `auth.users.email`
- ✅ INSERT directo con email duplicado es rechazado
- ✅ Error retornado es `23505` (unique_violation)
- ✅ No existen emails duplicados en la base de datos actual

### Notas Técnicas

- Supabase Auth maneja esto automáticamente, pero debemos verificar que la constraint DB existe
- La aplicación debe mostrar mensaje amigable antes de hacer request
- Edge case: Emails con mayúsculas/minúsculas diferentes (deberían normalizarse a lowercase)

---

## CP-F01-02D: RLS - Usuario no puede modificar perfil ajeno

### Objetivo

Verificar que las políticas RLS impiden que un usuario lea o modifique el perfil de otro usuario.

### Setup

- **Usuarios necesarios:**
  - Usuario A: `qa.user_a@cromos.test` (id: `{user_a_id}`)
  - Usuario B: `qa.user_b@cromos.test` (id: `{user_b_id}`)
- **Prerequisito:** Ambos usuarios registrados con perfiles creados
- **Herramientas:** Supabase Dashboard (SQL Editor), psql con autenticación

### Pasos

1. Autenticarse como Usuario A
2. Intentar leer perfil de Usuario B
3. Intentar modificar nickname de Usuario B
4. Verificar que ambas operaciones fallan o retornan 0 filas

### Verificación Principal

**Consulta SQL - Revisar políticas RLS activas:**

```sql
-- Ver todas las políticas RLS en tabla profiles
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
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
```

**Resultado esperado:**
- Al menos 2 políticas: una para SELECT y otra para UPDATE
- `qual` debe contener algo como `(id = auth.uid())` o similar
- `roles` debe ser `{authenticated}` o `{public}`

**Test de penetración - Como Usuario A intentar ver Usuario B:**

```sql
-- Ejecutar con JWT de Usuario A en header Authorization
-- Esto simula request desde la app
SET request.jwt.claim.sub = '{user_a_id}';

SELECT id, nickname, bio
FROM profiles
WHERE id = '{user_b_id}';  -- ID de Usuario B
```

**Resultado esperado:** 0 filas retornadas (RLS bloquea)

**Test de penetración - Como Usuario A intentar modificar Usuario B:**

```sql
-- Ejecutar con JWT de Usuario A
SET request.jwt.claim.sub = '{user_a_id}';

UPDATE profiles
SET nickname = 'HACKED_BY_USER_A'
WHERE id = '{user_b_id}';

-- Verificar que no se modificó
SELECT nickname
FROM profiles
WHERE id = '{user_b_id}';
```

**Resultado esperado:**
- UPDATE afecta 0 filas
- Nickname de Usuario B permanece sin cambios

### Verificaciones Adicionales

**Verificar que RLS está habilitado en la tabla:**

```sql
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_habilitado
FROM pg_tables
WHERE tablename = 'profiles';
```

**Resultado esperado:** `rls_habilitado = true`

**Test positivo - Usuario puede modificar su propio perfil:**

```sql
SET request.jwt.claim.sub = '{user_a_id}';

UPDATE profiles
SET nickname = 'UserA_Updated'
WHERE id = '{user_a_id}';

SELECT nickname
FROM profiles
WHERE id = '{user_a_id}';
```

**Resultado esperado:**
- UPDATE afecta 1 fila
- Nickname es `'UserA_Updated'`

### Criterios de Éxito

- ✅ RLS está habilitado en tabla `profiles`
- ✅ Políticas SELECT y UPDATE verifican `id = auth.uid()`
- ✅ Usuario A no puede leer perfil de Usuario B (0 filas)
- ✅ Usuario A no puede modificar perfil de Usuario B (0 filas afectadas)
- ✅ Usuario A SÍ puede modificar su propio perfil (test positivo)

### Notas Técnicas

- Usar `SET request.jwt.claim.sub` para simular diferentes usuarios en SQL Editor
- En producción, el JWT viene en header `Authorization: Bearer {token}`
- Edge case: Admin users pueden necesitar política separada con bypass

---

## CP-F01-02E: Trigger de creación automática de perfil

### Objetivo

Verificar que al crear un usuario en `auth.users`, automáticamente se crea un registro correspondiente en `profiles` mediante un trigger.

### Setup

- **Prerequisito:** Trigger `on_auth_user_created` debe existir
- **Herramientas:** Supabase Dashboard (SQL Editor)
- **Datos:** Email de prueba único

### Pasos

1. Registrar nuevo usuario vía UI
2. Verificar que perfil se creó automáticamente
3. Inspeccionar definición del trigger
4. Verificar que trigger se ejecuta AFTER INSERT

### Verificación Principal

**Consulta SQL - Verificar que trigger existe:**

```sql
-- Listar triggers en tabla auth.users
SELECT
    trigger_name,
    event_manipulation AS evento,
    event_object_table AS tabla,
    action_statement AS funcion_ejecutada,
    action_timing AS momento
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'
ORDER BY trigger_name;
```

**Resultado esperado:**
- Al menos 1 trigger con nombre similar a `on_auth_user_created`
- `evento = 'INSERT'`
- `momento = 'AFTER'`
- `funcion_ejecutada` contiene referencia a función de creación de perfil

**Ver código de la función del trigger:**

```sql
-- Ver definición completa de la función
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname LIKE '%handle_new_user%' OR proname LIKE '%create_profile%'
LIMIT 1;
```

**Resultado esperado:**
- Función contiene `INSERT INTO public.profiles`
- Usa `NEW.id` para el id del perfil
- Usa `NEW.email` u otros campos de `auth.users`

### Test de Integración

**Crear usuario de prueba y verificar creación de perfil:**

```sql
-- 1. Crear usuario en auth.users (simula registro)
INSERT INTO auth.users (
    instance_id,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'qa.trigger_test@cromos.test',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
)
RETURNING id;

-- 2. Inmediatamente verificar que perfil existe
SELECT
    p.id,
    p.nickname,
    p.created_at,
    u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'qa.trigger_test@cromos.test';
```

**Resultado esperado:**
- 1 fila retornada
- `p.id = u.id` (mismo UUID)
- `p.created_at` está a pocos segundos de `u.created_at`
- `p.nickname` puede estar NULL o tener valor por defecto

### Verificaciones Adicionales

**Verificar que no hay usuarios huérfanos (sin perfil):**

```sql
SELECT
    u.id,
    u.email,
    u.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
  AND u.created_at > NOW() - INTERVAL '30 days';  -- Usuarios recientes
```

**Resultado esperado:** 0 filas (todos tienen perfil)

**Verificar que no hay perfiles huérfanos (sin usuario):**

```sql
SELECT
    p.id,
    p.nickname,
    p.created_at
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL;
```

**Resultado esperado:** 0 filas (todos los perfiles tienen usuario)

### Criterios de Éxito

- ✅ Trigger existe en `auth.users` para evento INSERT
- ✅ Trigger se ejecuta AFTER INSERT (no BEFORE)
- ✅ Función del trigger inserta en `public.profiles`
- ✅ Al crear usuario, perfil se crea automáticamente
- ✅ No hay usuarios huérfanos (sin perfil)
- ✅ No hay perfiles huérfanos (sin usuario)

### Notas Técnicas

- Trigger debe ser AFTER INSERT para que `NEW.id` ya exista
- Si trigger falla, el INSERT en `auth.users` debe hacer rollback (transacción)
- Edge case: ¿Qué pasa si se borra un usuario? Verificar CASCADE en foreign key

---

## CP-F01-02I: Storage Policy - Acceso a avatares

### Objetivo

Verificar que las políticas de Supabase Storage permiten:
1. Usuarios autenticados subir avatares a su propia carpeta
2. Cualquiera (incluso no autenticados) puede leer avatares
3. Usuarios NO pueden sobrescribir avatares de otros

### Setup

- **Prerequisito:** Bucket `avatars` debe existir en Supabase Storage
- **Usuarios necesarios:**
  - Usuario A: `qa.storage_a@cromos.test`
  - Usuario B: `qa.storage_b@cromos.test`
- **Herramientas:** Supabase Dashboard (Storage), API requests con cURL o Postman

### Pasos

1. Verificar políticas de Storage para bucket `avatars`
2. Como Usuario A, subir avatar a `/avatars/{user_a_id}/avatar.png`
3. Como Usuario B, intentar leer avatar de Usuario A (debe funcionar)
4. Como Usuario B, intentar sobrescribir avatar de Usuario A (debe fallar)

### Verificación Principal

**Consulta SQL - Ver políticas de Storage:**

```sql
-- Listar todas las políticas del bucket avatars
SELECT
    name AS nombre_politica,
    definition AS definicion,
    allowed_operations AS operaciones_permitidas,
    created_at
FROM storage.policies
WHERE bucket_id = (
    SELECT id FROM storage.buckets WHERE name = 'avatars'
)
ORDER BY name;
```

**Resultado esperado:**
- Al menos 2 políticas:
  - Una para `SELECT` (lectura pública)
  - Una para `INSERT/UPDATE` (escritura autenticada)
- Política de escritura debe verificar que `auth.uid() = user_id` en la ruta

**Verificar configuración del bucket:**

```sql
SELECT
    id,
    name,
    public AS es_publico,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'avatars';
```

**Resultado esperado:**
- `es_publico = true` (permite lectura sin autenticación)
- `file_size_limit` razonable (ej: 2MB = 2097152 bytes)
- `allowed_mime_types` incluye `['image/png', 'image/jpeg', 'image/webp']`

### Test con API

**Upload como Usuario A (debe funcionar):**

```bash
# Usar token JWT de Usuario A
curl -X POST \
  'https://{project}.supabase.co/storage/v1/object/avatars/{user_a_id}/avatar.png' \
  -H "Authorization: Bearer {jwt_user_a}" \
  -H "Content-Type: image/png" \
  --data-binary "@test-avatar.png"
```

**Resultado esperado:** Status 200, archivo subido exitosamente

**Lectura pública (sin autenticación, debe funcionar):**

```bash
curl -X GET \
  'https://{project}.supabase.co/storage/v1/object/public/avatars/{user_a_id}/avatar.png'
```

**Resultado esperado:** Status 200, imagen retornada

**Upload como Usuario B a carpeta de Usuario A (debe fallar):**

```bash
# Usar token JWT de Usuario B
curl -X POST \
  'https://{project}.supabase.co/storage/v1/object/avatars/{user_a_id}/hacked.png' \
  -H "Authorization: Bearer {jwt_user_b}" \
  -H "Content-Type: image/png" \
  --data-binary "@test-avatar.png"
```

**Resultado esperado:** Status 403 (Forbidden) o 401 (Unauthorized)

### Verificaciones Adicionales

**Verificar objetos en Storage:**

```sql
SELECT
    name AS nombre_archivo,
    bucket_id,
    owner AS propietario,
    created_at,
    updated_at,
    last_accessed_at,
    metadata->>'size' AS tamaño_bytes
FROM storage.objects
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'avatars')
ORDER BY created_at DESC
LIMIT 10;
```

**Criterios:**
- `owner` debe coincidir con user_id en la ruta
- Tamaño razonable (<2MB)
- MIME type correcto en metadata

### Criterios de Éxito

- ✅ Bucket `avatars` existe y es público para lectura
- ✅ Políticas de Storage verifican `auth.uid()` para escritura
- ✅ Usuario A puede subir avatar a su carpeta
- ✅ Usuarios no autenticados pueden leer avatares
- ✅ Usuario B NO puede subir a carpeta de Usuario A (403/401)
- ✅ Tamaño de archivo está limitado (ej: 2MB)

### Notas Técnicas

- Storage policies son diferentes a RLS de tablas PostgreSQL
- Path pattern en policies: `{user_id}/*` debe matchear con `auth.uid()`
- Edge case: Verificar que usuarios no pueden usar `../` para escapar su carpeta
- Rendimiento: CDN caching para avatares públicos

---

## CP-F01-06: API de Auth - Password Reset Flow

### Objetivo

Verificar que el flujo completo de recuperación de contraseña funciona correctamente, incluyendo generación de token, envío de email, y actualización de contraseña.

### Setup

- **Prerequisito:** Usuario existente `qa.reset@cromos.test` con email confirmado
- **Herramientas:** Supabase Dashboard (Auth, Logs), Mailhog o servicio de email de testing
- **Configuración:** SMTP configurado en Supabase (o usar Supabase Auth emails en development)

### Pasos

1. Solicitar password reset via UI
2. Verificar que se genera token de recuperación en BD
3. Verificar que email es enviado (logs)
4. Usar link de recuperación para cambiar contraseña
5. Verificar que token se marca como usado

### Verificación Principal

**Consulta SQL - Verificar que usuario existe y está confirmado:**

```sql
SELECT
    id,
    email,
    email_confirmed_at,
    recovery_sent_at,
    recovery_token,
    updated_at
FROM auth.users
WHERE email = 'qa.reset@cromos.test';
```

**Resultado antes de solicitar reset:**
- `email_confirmed_at` NO NULL
- `recovery_token` NULL o expirado

**Después de solicitar reset:**

```sql
SELECT
    id,
    email,
    recovery_sent_at,
    LENGTH(recovery_token) AS token_length,
    EXTRACT(EPOCH FROM (NOW() - recovery_sent_at)) AS segundos_desde_envio
FROM auth.users
WHERE email = 'qa.reset@cromos.test';
```

**Resultado esperado:**
- `recovery_sent_at` actualizado (hace pocos segundos)
- `token_length` > 0 (token generado, típicamente hash)
- `segundos_desde_envio` < 60 (recién solicitado)

### Verificaciones en Logs

**Revisar Supabase Logs - Auth:**

```sql
-- Si Supabase expone tabla de logs (depende de versión)
SELECT
    timestamp,
    event_type,
    user_id,
    metadata
FROM auth.audit_log_entries
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'qa.reset@cromos.test')
  AND event_type = 'user_recovery_requested'
ORDER BY timestamp DESC
LIMIT 5;
```

**Resultado esperado:**
- 1 evento reciente de tipo `user_recovery_requested`
- `metadata` contiene info del request (IP, user agent, etc.)

### Test de Expiración de Token

**Verificar que tokens expiran después de tiempo configurado:**

```sql
-- Supabase usa JWT con exp claim
-- Verificar configuración de expiración (típicamente 3600s = 1 hora)
SELECT
    id,
    email,
    recovery_sent_at,
    recovery_sent_at + INTERVAL '1 hour' AS expira_en,
    CASE
        WHEN recovery_sent_at + INTERVAL '1 hour' < NOW() THEN 'EXPIRADO'
        ELSE 'VALIDO'
    END AS estado_token
FROM auth.users
WHERE email = 'qa.reset@cromos.test';
```

**Después de usar el token:**

```sql
-- Token debe ser limpiado o marcado como usado
SELECT
    recovery_sent_at,
    recovery_token,
    updated_at
FROM auth.users
WHERE email = 'qa.reset@cromos.test';
```

**Resultado esperado:**
- `recovery_token` NULL (limpiado después de uso)
- `updated_at` actualizado (contraseña cambiada)

### Test de Seguridad

**Intentar usar token expirado (debe fallar):**

1. Solicitar password reset
2. Esperar > 1 hora (o modificar `recovery_sent_at` en BD para simular)
3. Intentar usar link de recuperación
4. Verificar que muestra error "Token expirado"

**Intentar reusar token ya utilizado (debe fallar):**

1. Solicitar password reset
2. Cambiar contraseña exitosamente
3. Intentar usar el mismo link nuevamente
4. Verificar que muestra error "Token inválido"

### Criterios de Éxito

- ✅ Solicitar reset genera `recovery_token` en BD
- ✅ `recovery_sent_at` se actualiza con timestamp correcto
- ✅ Email de recuperación es enviado (verificar logs o bandeja)
- ✅ Link de recuperación permite cambiar contraseña
- ✅ Token se limpia después de uso exitoso
- ✅ Tokens expirados (>1 hora) son rechazados
- ✅ Tokens ya usados no pueden reutilizarse
- ✅ Evento queda registrado en `auth.audit_log_entries`

### Notas Técnicas

- Supabase Auth maneja esto automáticamente, pero debemos verificar flujo completo
- En desarrollo, emails pueden ir a Mailhog o logs
- En producción, usar SMTP real (SendGrid, AWS SES, etc.)
- Edge case: ¿Qué pasa si usuario solicita reset múltiples veces? (solo último token debe ser válido)
- Rate limiting: Verificar que no se pueden solicitar +5 resets por minuto

---

## CP-F01-07: Performance - Carga de página de perfil

### Objetivo

Verificar que la carga de la página de perfil es eficiente, con queries optimizadas y uso de índices.

### Setup

- **Prerequisito:** Usuario con datos de prueba (listados activos, colecciones, ratings)
- **Herramientas:** Supabase Dashboard (SQL Editor), Chrome DevTools (Network, Performance)
- **Datos:** Usuario con al menos 10 listados y 3 colecciones

### Pasos

1. Limpiar cache del navegador
2. Abrir página de perfil `/users/{user_id}`
3. Medir tiempo de carga en Network tab
4. Analizar queries ejecutadas en Performance
5. Ejecutar EXPLAIN ANALYZE en queries críticas

### Verificación Principal

**Query principal de perfil con EXPLAIN ANALYZE:**

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    p.id,
    p.nickname,
    p.bio,
    p.avatar_url,
    p.created_at,
    -- Contar listados activos
    COUNT(DISTINCT tl.id) FILTER (WHERE tl.status = 'active') AS listados_activos,
    -- Contar colecciones
    COUNT(DISTINCT ct.id) AS total_colecciones,
    -- Rating promedio
    AVG(r.rating) AS rating_promedio,
    COUNT(DISTINCT r.id) AS total_ratings
FROM profiles p
LEFT JOIN trade_listings tl ON tl.user_id = p.id
LEFT JOIN collection_templates ct ON ct.author_id = p.id
LEFT JOIN ratings r ON r.rated_user_id = p.id
WHERE p.id = '{user_id}'
GROUP BY p.id, p.nickname, p.bio, p.avatar_url, p.created_at;
```

**Criterios de rendimiento esperados:**

- **Execution Time:** < 200ms
- **Planning Time:** < 10ms
- **Buffers:** Uso eficiente, sin excesivos "Heap Blocks Scanned"
- **Joins:** Deben usar índices (Index Scan o Bitmap Index Scan), NO Seq Scan en tablas grandes

**Análisis de output de EXPLAIN:**

Buscar líneas como:
- ✅ `Index Scan using profiles_pkey on profiles p` (usa índice PK)
- ✅ `Index Scan using trade_listings_user_id_idx on trade_listings tl` (usa índice FK)
- ❌ `Seq Scan on trade_listings tl` (malo si tabla es grande)

### Verificación de Índices

**Listar índices relevantes para query de perfil:**

```sql
-- Verificar índices en profiles
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
ORDER BY indexname;

-- Verificar índices en trade_listings
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'trade_listings'
  AND indexdef LIKE '%user_id%' OR indexdef LIKE '%status%'
ORDER BY indexname;

-- Verificar índices en collection_templates
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'collection_templates'
  AND indexdef LIKE '%author_id%'
ORDER BY indexname;
```

**Índices esperados:**

- `profiles_pkey` en `profiles.id`
- `trade_listings_user_id_idx` en `trade_listings.user_id`
- `trade_listings_status_idx` en `trade_listings.status` (o índice compuesto)
- `collection_templates_author_id_idx` en `collection_templates.author_id`

### Test de Carga con Múltiples Usuarios

**Simular carga concurrente:**

```sql
-- Ejecutar esta query 10 veces en paralelo (usar pgbench o script)
SELECT
    p.nickname,
    COUNT(tl.id) AS listados
FROM profiles p
LEFT JOIN trade_listings tl ON tl.user_id = p.id
WHERE p.id = '{user_id}'
GROUP BY p.id, p.nickname;
```

**Criterios:**
- Tiempo promedio debe mantenerse < 200ms incluso con 10 queries concurrentes
- No debe haber lock contention (verificar en `pg_stat_activity`)

### Verificaciones en Chrome DevTools

**Network Tab:**

1. Abrir `/users/{user_id}`
2. Verificar request a Supabase API
3. Tiempo total de request debe ser < 500ms
4. Payload response debe ser razonable (<100KB)

**Performance Tab:**

1. Grabar timeline durante carga de página
2. Verificar que no hay "Long Tasks" (>50ms)
3. First Contentful Paint (FCP) < 1.5s
4. Largest Contentful Paint (LCP) < 2.5s

### Criterios de Éxito

- ✅ Query principal ejecuta en < 200ms (EXPLAIN ANALYZE)
- ✅ Todos los JOINs usan índices (no Seq Scan en tablas grandes)
- ✅ Índices existen en todas las foreign keys relevantes
- ✅ Request API completa en < 500ms
- ✅ Payload response < 100KB
- ✅ LCP en página de perfil < 2.5s
- ✅ No hay queries N+1 (verificar en logs de Supabase)

### Notas Técnicas

- Si `trade_listings` tiene >10,000 registros, Seq Scan es inaceptable
- Considerar índice compuesto en `(user_id, status)` para filtros frecuentes
- Cache de resultados: ¿Usar Redis para ratings promedio?
- Edge case: Usuarios con +1000 listados pueden necesitar paginación

---

## CP-F01-02J: Integridad - Cascada de eliminación de usuario

### Objetivo

Verificar que al eliminar un usuario, todos sus datos relacionados se eliminan correctamente (o se mantienen según reglas de negocio) mediante foreign keys con ON DELETE CASCADE.

### Setup

- **Prerequisito:** Usuario de prueba con datos completos
  - Perfil con nickname y bio
  - 2 listados activos
  - 1 colección
  - 3 copias en colecciones
- **Herramientas:** Supabase Dashboard (SQL Editor)
- **Usuario de prueba:** `qa.delete_test@cromos.test`

### Pasos

1. Crear usuario con datos relacionados completos
2. Documentar IDs de todos los registros relacionados
3. Eliminar usuario de `auth.users`
4. Verificar que datos relacionados se eliminan (o se mantienen según regla)

### Verificación Principal

**Consulta SQL - Ver foreign keys y reglas de cascada:**

```sql
-- Listar todas las foreign keys que apuntan a profiles.id
SELECT
    tc.table_name AS tabla_dependiente,
    kcu.column_name AS columna_fk,
    rc.update_rule AS regla_update,
    rc.delete_rule AS regla_delete
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.table_schema = 'public'
  AND rc.unique_constraint_name IN (
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'profiles' AND constraint_type = 'PRIMARY KEY'
  )
ORDER BY tc.table_name;
```

**Resultado esperado:**

Tablas con FK a `profiles.id`:
- `trade_listings` (user_id) → `delete_rule = 'CASCADE'`
- `collection_templates` (author_id) → `delete_rule = 'CASCADE'`
- `collection_copies` (user_id) → `delete_rule = 'CASCADE'`
- `ratings` (rater_id, rated_user_id) → `delete_rule = 'CASCADE'` o `SET NULL` según diseño
- `chats` (participant_id) → Regla a definir (¿CASCADE o SET NULL?)

### Test de Eliminación

**1. Documentar estado antes de eliminar:**

```sql
-- Guardar ID del usuario
SELECT id FROM auth.users WHERE email = 'qa.delete_test@cromos.test';
-- Asumir resultado: user_id = '{delete_test_id}'

-- Contar registros relacionados
SELECT
    (SELECT COUNT(*) FROM profiles WHERE id = '{delete_test_id}') AS perfiles,
    (SELECT COUNT(*) FROM trade_listings WHERE user_id = '{delete_test_id}') AS listados,
    (SELECT COUNT(*) FROM collection_templates WHERE author_id = '{delete_test_id}') AS plantillas,
    (SELECT COUNT(*) FROM collection_copies WHERE user_id = '{delete_test_id}') AS copias,
    (SELECT COUNT(*) FROM ratings WHERE rater_id = '{delete_test_id}') AS ratings_dados,
    (SELECT COUNT(*) FROM ratings WHERE rated_user_id = '{delete_test_id}') AS ratings_recibidos;
```

**Resultado esperado:** Números > 0 (usuario tiene datos)

**2. Eliminar usuario:**

```sql
-- Eliminar de auth.users (trigger debe eliminar perfil automáticamente)
DELETE FROM auth.users WHERE id = '{delete_test_id}';
```

**3. Verificar eliminación en cascada:**

```sql
-- Repetir query de conteo
SELECT
    (SELECT COUNT(*) FROM profiles WHERE id = '{delete_test_id}') AS perfiles,
    (SELECT COUNT(*) FROM trade_listings WHERE user_id = '{delete_test_id}') AS listados,
    (SELECT COUNT(*) FROM collection_templates WHERE author_id = '{delete_test_id}') AS plantillas,
    (SELECT COUNT(*) FROM collection_copies WHERE user_id = '{delete_test_id}') AS copias,
    (SELECT COUNT(*) FROM ratings WHERE rater_id = '{delete_test_id}') AS ratings_dados,
    (SELECT COUNT(*) FROM ratings WHERE rated_user_id = '{delete_test_id}') AS ratings_recibidos;
```

**Resultado esperado:** Todos los conteos = 0 (datos eliminados)

### Verificaciones Adicionales

**Verificar que no quedan registros huérfanos:**

```sql
-- Buscar listados sin usuario
SELECT id, title, user_id
FROM trade_listings
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Buscar plantillas sin autor
SELECT id, title, author_id
FROM collection_templates
WHERE author_id NOT IN (SELECT id FROM profiles);

-- Buscar copias sin usuario
SELECT id, user_id
FROM collection_copies
WHERE user_id NOT IN (SELECT id FROM profiles);
```

**Resultado esperado:** 0 filas en todas las queries (no hay huérfanos)

**Caso especial - Chats:**

Regla de negocio: ¿Los chats deben eliminarse o mantenerse para histórico?

```sql
-- Si se mantienen, verificar que user_id se pone NULL
SELECT
    id,
    participant_a_id,
    participant_b_id,
    listing_id
FROM chats
WHERE participant_a_id = '{delete_test_id}'
   OR participant_b_id = '{delete_test_id}';
```

**Resultado depende de regla:**
- **Si CASCADE:** 0 filas (chats eliminados)
- **Si SET NULL:** Filas existen pero `participant_X_id` es NULL

### Criterios de Éxito

- ✅ Todas las tablas relacionadas tienen FK con regla de eliminación definida
- ✅ Al eliminar usuario de `auth.users`, perfil se elimina automáticamente
- ✅ Listados del usuario eliminado desaparecen (CASCADE)
- ✅ Plantillas del usuario eliminado desaparecen (CASCADE)
- ✅ Copias del usuario eliminado desaparecen (CASCADE)
- ✅ Ratings dados/recibidos se manejan según regla (CASCADE o SET NULL)
- ✅ No quedan registros huérfanos en ninguna tabla
- ✅ Chats se manejan según regla de negocio definida

### Notas Técnicas

- **Cuidado:** Ejecutar este test solo en entorno de desarrollo/staging
- **Backup:** Antes de eliminar, hacer snapshot de datos
- **Soft delete:** Considerar usar `deleted_at` en vez de DELETE físico
- Edge case: ¿Qué pasa con transacciones completadas? ¿Mantener para histórico fiscal?
- Compliance: GDPR requiere eliminar datos personales, pero transacciones pueden requerirse por ley

---

## 📊 Resumen de Tests Técnicos - Fase 01

| Test ID | Nombre | Complejidad | Tiempo Estimado | Categoría Principal |
|---------|--------|-------------|-----------------|---------------------|
| CP-F01-03 | Prevención duplicados | Baja | 20 min | Integridad |
| CP-F01-02D | RLS perfiles | Media | 30 min | Seguridad (RLS) |
| CP-F01-02E | Trigger creación perfil | Media | 25 min | Automatización |
| CP-F01-02I | Storage policies avatares | Alta | 35 min | Seguridad (Storage) |
| CP-F01-06 | Password reset flow | Media | 30 min | Auth API |
| CP-F01-07 | Performance carga perfil | Alta | 40 min | Rendimiento |
| CP-F01-02J | Cascada eliminación | Alta | 35 min | Integridad |

**Total estimado:** ~3.5 horas

---

## 🔧 Herramientas de Debugging

### Ver queries activas en tiempo real

```sql
SELECT
    pid,
    usename,
    application_name,
    state,
    query,
    query_start,
    EXTRACT(EPOCH FROM (NOW() - query_start)) AS duracion_segundos
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start DESC;
```

### Analizar uso de índices

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS veces_usado,
    idx_tup_read AS filas_leidas,
    idx_tup_fetch AS filas_obtenidas
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Ver tamaño de tablas

```sql
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS tamaño_total,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS tamaño_tabla,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS tamaño_indices
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ✅ Checklist Pre-Ejecución

Antes de ejecutar tests técnicos de Fase-01:

- [ ] Tengo acceso admin a Supabase Dashboard
- [ ] Puedo ejecutar queries en SQL Editor
- [ ] Entiendo las políticas RLS de la tabla `profiles`
- [ ] Sé cómo usar EXPLAIN ANALYZE
- [ ] Tengo usuarios de prueba creados (qa.test@cromos.test)
- [ ] Entiendo la diferencia entre CASCADE y SET NULL
- [ ] Sé cómo revisar logs de Supabase Auth
- [ ] Tengo herramienta para hacer requests HTTP (cURL/Postman)

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Autor:** David
