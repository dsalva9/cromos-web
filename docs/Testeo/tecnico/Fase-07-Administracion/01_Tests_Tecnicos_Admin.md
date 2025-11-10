# Tests Técnicos - Fase 07: Administración

## 📋 Información General

**Fase:** Fase-07
**Categoría:** Administración y Moderación
**Audiencia:** David (tester técnico)

---

## 🎯 Cobertura

**12 tests técnicos** verificando:
- RLS para funciones administrativas
- Audit logging de acciones admin
- Triggers para moderación automática
- Performance de queries admin
- Seguridad de funciones privilegiadas

---

## CP-F07-01E: RLS - Solo admins acceden a funciones admin

### Objetivo

Verificar que funciones administrativas solo son ejecutables por usuarios con rol `admin`.

### Verificación de Funciones Admin

```sql
-- Listar funciones con prefijo admin_
SELECT
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'admin_%'
ORDER BY p.proname;
```

**Funciones esperadas:**
- `admin_suspend_user(user_id UUID, reason TEXT, until TIMESTAMP)`
- `admin_delete_user(user_id UUID, reason TEXT)`
- `admin_approve_template(template_id UUID, notes TEXT)`
- `admin_reject_template(template_id UUID, reason TEXT, notes TEXT)`

### Test de Seguridad

**Como usuario normal:**

```sql
SET request.jwt.claim.sub = '{normal_user_id}';

-- Intentar suspender otro usuario (debe fallar)
SELECT admin_suspend_user(
    '{target_user_id}'::UUID,
    'spam',
    NOW() + INTERVAL '30 days'
);
```

**Resultado esperado:** ERROR: `permission denied` o `must be admin`

**Como admin:**

```sql
SET request.jwt.claim.sub = '{admin_user_id}';

-- Debe funcionar
SELECT admin_suspend_user(
    '{target_user_id}'::UUID,
    'spam',
    NOW() + INTERVAL '30 days'
);
```

**Resultado esperado:** Ejecución exitosa

### Verificación de la Función

```sql
-- Ver implementación de la función admin
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'admin_suspend_user';
```

**Debe contener verificación:**

```sql
-- Dentro de la función
IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can suspend users';
END IF;
```

### Criterios de Éxito

- ✅ Funciones admin verifican rol antes de ejecutar
- ✅ Usuarios normales reciben error al intentar usar funciones admin
- ✅ Solo admins pueden ejecutar acciones privilegiadas

---

## CP-F07-02D: Audit Log - Registro de acciones administrativas

### Objetivo

Verificar que todas las acciones administrativas se registran en `admin_logs`.

### Estructura de la Tabla

```sql
-- Verificar estructura de admin_logs
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_logs'
ORDER BY ordinal_position;
```

**Columnas esperadas:**

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| admin_id | uuid | NO |
| action_type | text | NO |
| target_user_id | uuid | YES |
| target_resource_type | text | YES |
| target_resource_id | text | YES |
| details | jsonb | YES |
| created_at | timestamp | NO |

### Test de Logging

```sql
-- Suspender usuario y verificar log
SELECT admin_suspend_user(
    '{user_id}'::UUID,
    'spam',
    NOW() + INTERVAL '7 days'
);

-- Verificar que se creó log
SELECT
    al.action_type,
    al.admin_id,
    al.target_user_id,
    al.details,
    al.created_at
FROM admin_logs al
WHERE al.action_type = 'user_suspended'
  AND al.target_user_id = '{user_id}'::UUID
ORDER BY al.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| action_type | admin_id | target_user_id | details |
|-------------|----------|----------------|---------|
| user_suspended | {admin_id} | {user_id} | {"reason": "spam", "duration_days": 7, ...} |

### Verificar Índices

```sql
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'admin_logs';
```

**Índices esperados:**
- `admin_logs_admin_id_idx` en `admin_id`
- `admin_logs_action_type_idx` en `action_type`
- `admin_logs_created_at_idx` en `created_at`
- `admin_logs_target_user_id_idx` en `target_user_id`

### Test de Performance

```sql
EXPLAIN ANALYZE
SELECT
    al.action_type,
    al.created_at,
    p.nickname AS admin_nickname
FROM admin_logs al
JOIN profiles p ON p.id = al.admin_id
WHERE al.admin_id = '{admin_id}'
ORDER BY al.created_at DESC
LIMIT 50;
```

**Criterios:**
- Execution Time: < 100ms
- Usa índice en `admin_id` y `created_at`

### Criterios de Éxito

- ✅ Todas las acciones admin se registran en `admin_logs`
- ✅ Campos JSONB contienen detalles completos
- ✅ Índices optimizan queries de auditoría
- ✅ Logs son inmutables (solo INSERT, sin UPDATE/DELETE)

---

## CP-F07-02E: RLS - Logs solo visibles para admins

### Objetivo

Verificar que solo admins pueden leer `admin_logs`.

### Verificación de Políticas RLS

```sql
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'admin_logs'
ORDER BY cmd;
```

**Políticas esperadas:**

```
policyname: admin_logs_select_policy
cmd: SELECT
qual: is_admin(auth.uid())
```

### Test de Penetración

```sql
-- Como usuario normal
SET request.jwt.claim.sub = '{normal_user_id}';

SELECT * FROM admin_logs
LIMIT 10;
```

**Resultado esperado:** 0 filas (RLS bloqueó)

```sql
-- Como admin
SET request.jwt.claim.sub = '{admin_user_id}';

SELECT * FROM admin_logs
LIMIT 10;
```

**Resultado esperado:** Logs visibles

### Criterios de Éxito

- ✅ RLS habilitado en `admin_logs`
- ✅ Solo admins pueden leer logs
- ✅ Nadie puede modificar/eliminar logs (solo INSERT permitido para triggers)

---

## CP-F07-03E: Trigger - Auto-logging en acciones admin

### Objetivo

Verificar que triggers crean logs automáticamente cuando un admin modifica datos.

### Verificación de Triggers

```sql
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('profiles', 'template_collections', 'trade_listings')
  AND trigger_name LIKE '%admin%'
ORDER BY event_object_table;
```

**Triggers esperados:**

| trigger_name | event_object_table | action_statement |
|--------------|-------------------|------------------|
| log_admin_profile_changes | profiles | EXECUTE FUNCTION log_admin_action() |
| log_admin_template_moderation | template_collections | EXECUTE FUNCTION log_admin_action() |

### Test del Trigger

```sql
-- Admin suspende usuario
UPDATE profiles
SET
    status = 'suspended',
    suspension_reason = 'spam',
    suspended_until = NOW() + INTERVAL '30 days'
WHERE id = '{user_id}';

-- Verificar que trigger creó log
SELECT
    al.action_type,
    al.admin_id,
    al.target_user_id,
    al.details->>'old_status' AS status_anterior,
    al.details->>'new_status' AS status_nuevo
FROM admin_logs al
WHERE al.target_user_id = '{user_id}'
  AND al.action_type = 'user_status_changed'
ORDER BY al.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| action_type | admin_id | old_status | new_status |
|-------------|----------|------------|------------|
| user_status_changed | {admin_id} | active | suspended |

### Verificar Función del Trigger

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'log_admin_action';
```

**Debe incluir:**

```sql
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si el usuario actual es admin
    IF is_admin(auth.uid()) THEN
        INSERT INTO admin_logs (
            admin_id,
            action_type,
            target_user_id,
            target_resource_type,
            target_resource_id,
            details
        ) VALUES (
            auth.uid(),
            TG_ARGV[0], -- action_type pasado como argumento
            NEW.id,
            TG_TABLE_NAME,
            NEW.id::TEXT,
            jsonb_build_object(
                'old', row_to_json(OLD),
                'new', row_to_json(NEW)
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Criterios de Éxito

- ✅ Triggers existen en tablas críticas
- ✅ Logs se crean automáticamente al modificar datos
- ✅ JSONB `details` incluye estado anterior y nuevo
- ✅ Solo se registra si quien modifica es admin

---

## CP-F07-04B: Function - is_admin() correctamente implementada

### Objetivo

Verificar que la función `is_admin()` valida correctamente el rol de administrador.

### Verificación de la Función

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'is_admin';
```

**Implementación esperada:**

```sql
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = user_id
          AND role = 'admin'
          AND status = 'active' -- Admin suspendido no tiene permisos
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Tests

**Test 1: Usuario admin activo**

```sql
SELECT is_admin('{admin_user_id}'::UUID) AS es_admin;
```

**Resultado esperado:** `es_admin = true`

**Test 2: Usuario normal**

```sql
SELECT is_admin('{normal_user_id}'::UUID) AS es_admin;
```

**Resultado esperado:** `es_admin = false`

**Test 3: Admin suspendido**

```sql
-- Suspender admin
UPDATE profiles
SET status = 'suspended'
WHERE id = '{admin_user_id}';

-- Verificar que pierde permisos
SELECT is_admin('{admin_user_id}'::UUID) AS es_admin;
```

**Resultado esperado:** `es_admin = false`

**Test 4: Sin parámetro (usa auth.uid())**

```sql
SET request.jwt.claim.sub = '{admin_user_id}';

SELECT is_admin() AS soy_admin;
```

**Resultado esperado:** `soy_admin = true`

### Performance

```sql
EXPLAIN ANALYZE
SELECT is_admin('{user_id}'::UUID);
```

**Criterios:**
- Execution Time: < 5ms
- Usa índice en `profiles(id)`

### Criterios de Éxito

- ✅ Función retorna `true` solo para admins activos
- ✅ Admin suspendido retorna `false`
- ✅ Usuarios normales retornan `false`
- ✅ Performance < 5ms

---

## CP-F07-05G: Performance - Query de reportes pendientes

### Objetivo

Optimizar query que lista reportes pendientes para moderación.

### Query Original (potencialmente lenta)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    ur.id,
    ur.reason,
    ur.description,
    ur.created_at,
    p_reported.nickname AS reportado,
    p_reporter.nickname AS reportador,
    (SELECT COUNT(*) FROM user_reports WHERE reported_user_id = ur.reported_user_id) AS total_reportes_usuario
FROM user_reports ur
JOIN profiles p_reported ON p_reported.id = ur.reported_user_id
JOIN profiles p_reporter ON p_reporter.id = ur.reporter_id
WHERE ur.status = 'pending'
ORDER BY ur.created_at ASC;
```

**Problemas potenciales:**
- Subconsulta correlacionada en SELECT (ineficiente)
- Sin índice en `user_reports(status)`

### Query Optimizada

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    ur.id,
    ur.reason,
    ur.description,
    ur.created_at,
    p_reported.nickname AS reportado,
    p_reporter.nickname AS reportador,
    report_counts.total AS total_reportes_usuario
FROM user_reports ur
JOIN profiles p_reported ON p_reported.id = ur.reported_user_id
JOIN profiles p_reporter ON p_reporter.id = ur.reporter_id
LEFT JOIN (
    SELECT
        reported_user_id,
        COUNT(*) AS total
    FROM user_reports
    GROUP BY reported_user_id
) report_counts ON report_counts.reported_user_id = ur.reported_user_id
WHERE ur.status = 'pending'
ORDER BY ur.created_at ASC;
```

**Mejoras:**
- Subconsulta movida a LEFT JOIN (más eficiente)
- Agregación una sola vez por usuario

### Índices Necesarios

```sql
-- Índice en status para filtrado
CREATE INDEX IF NOT EXISTS user_reports_status_idx
ON user_reports(status);

-- Índice compuesto para ordenamiento
CREATE INDEX IF NOT EXISTS user_reports_status_created_idx
ON user_reports(status, created_at);

-- Índice para JOIN
CREATE INDEX IF NOT EXISTS user_reports_reported_user_id_idx
ON user_reports(reported_user_id);
```

### Verificar Uso de Índices

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    ur.id,
    ur.reason,
    p_reported.nickname,
    p_reporter.nickname
FROM user_reports ur
JOIN profiles p_reported ON p_reported.id = ur.reported_user_id
JOIN profiles p_reporter ON p_reporter.id = ur.reporter_id
WHERE ur.status = 'pending'
ORDER BY ur.created_at ASC
LIMIT 50;
```

**Plan esperado:**
```
Index Scan using user_reports_status_created_idx on user_reports
  Index Cond: (status = 'pending')
  ->  Index Scan using profiles_pkey on profiles p_reported
  ->  Index Scan using profiles_pkey on profiles p_reporter
```

### Criterios de Performance

- **Execution Time:** < 150ms con 1000 reportes
- **Buffers:** Debe usar shared buffers, no temp files
- **Usa índices:** Sin Sequential Scan en tablas grandes

### Criterios de Éxito

- ✅ Query optimizada con JOINs en vez de subconsultas
- ✅ Índices apropiados creados
- ✅ Execution time < 150ms
- ✅ Plan usa Index Scan, no Seq Scan

---

## CP-F07-05H: Constraint - Evitar auto-reportes

### Objetivo

Verificar que un usuario no puede reportarse a sí mismo.

### Verificación del Constraint

```sql
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'user_reports'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%reporter%';
```

**Constraint esperado:**

```
conname: user_reports_no_self_report
definition: CHECK (reporter_id <> reported_user_id)
```

### Test

```sql
-- Intentar auto-reportarse (debe fallar)
INSERT INTO user_reports (reporter_id, reported_user_id, reason, description)
VALUES (
    '{user_id}'::UUID,
    '{user_id}'::UUID, -- Mismo usuario
    'spam',
    'Test auto-reporte'
);
```

**Resultado esperado:** ERROR 23514 (check_violation)

### Mismo Test para listing_reports

```sql
-- Verificar constraint en listing_reports
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'listing_reports'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%reporter%';
```

**Constraint esperado:**

```sql
CHECK (reporter_id <> (SELECT user_id FROM trade_listings WHERE id = listing_id))
```

**Test:**

```sql
-- Usuario intenta reportar su propio listado
INSERT INTO listing_reports (reporter_id, listing_id, reason, description)
VALUES (
    '{user_id}'::UUID,
    (SELECT id FROM trade_listings WHERE user_id = '{user_id}' LIMIT 1),
    'spam',
    'Test auto-reporte'
);
```

**Resultado esperado:** ERROR 23514 (check_violation)

### Criterios de Éxito

- ✅ Constraint impide auto-reportes de usuarios
- ✅ Constraint impide reportar propio listado
- ✅ Intentos de auto-reporte son rechazados con error claro

---

## CP-F07-06A: RLS - Plantillas pendientes solo visibles para creador y admins

### Objetivo

Verificar que plantillas con `moderation_status = 'pending'` solo son visibles para su creador y admins.

### Verificación de Política

```sql
SELECT
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'template_collections'
  AND policyname LIKE '%moderation%'
ORDER BY cmd;
```

**Política esperada:**

```sql
policyname: template_collections_select_policy
cmd: SELECT
qual: (
    visibility = 'private' AND user_id = auth.uid()
    OR
    visibility = 'public' AND moderation_status = 'approved'
    OR
    visibility = 'public' AND moderation_status = 'pending' AND user_id = auth.uid()
    OR
    is_admin(auth.uid())
)
```

### Test de Penetración

**Setup:**

```sql
-- Usuario A crea plantilla pública pendiente
INSERT INTO template_collections (user_id, name, visibility, moderation_status)
VALUES (
    '{user_a_id}'::UUID,
    'Test Plantilla Pendiente',
    'public',
    'pending'
)
RETURNING id;
-- Supongamos id = 999
```

**Como Usuario B (otro usuario):**

```sql
SET request.jwt.claim.sub = '{user_b_id}';

SELECT * FROM template_collections
WHERE id = 999;
```

**Resultado esperado:** 0 filas (RLS bloqueó)

**Como Usuario A (creador):**

```sql
SET request.jwt.claim.sub = '{user_a_id}';

SELECT * FROM template_collections
WHERE id = 999;
```

**Resultado esperado:** 1 fila (puede ver su propia plantilla pendiente)

**Como Admin:**

```sql
SET request.jwt.claim.sub = '{admin_id}';

SELECT * FROM template_collections
WHERE moderation_status = 'pending';
```

**Resultado esperado:** Todas las plantillas pendientes visibles

### Criterios de Éxito

- ✅ RLS filtra plantillas pendientes para usuarios no autorizados
- ✅ Creador puede ver su plantilla pendiente
- ✅ Admins ven todas las plantillas pendientes
- ✅ Plantillas aprobadas son visibles públicamente

---

## CP-F07-06B: Trigger - Notificar creador al aprobar/rechazar plantilla

### Objetivo

Verificar que se crea notificación cuando admin aprueba o rechaza plantilla.

### Verificación de Trigger

```sql
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'template_collections'
  AND trigger_name LIKE '%notif%'
ORDER BY trigger_name;
```

**Trigger esperado:**

```
trigger_name: notify_template_moderation
event: UPDATE
action: EXECUTE FUNCTION create_template_moderation_notification()
```

### Test

**Aprobar plantilla:**

```sql
UPDATE template_collections
SET
    moderation_status = 'approved',
    approved_by = '{admin_id}'::UUID,
    approved_at = NOW(),
    moderation_notes = 'Plantilla verificada'
WHERE id = 999;

-- Verificar notificación creada
SELECT
    n.type,
    n.title,
    n.message,
    n.user_id
FROM notifications n
WHERE n.user_id = (SELECT user_id FROM template_collections WHERE id = 999)
  AND n.type = 'template_approved'
ORDER BY n.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| type | title | message |
|------|-------|---------|
| template_approved | Plantilla aprobada | Tu plantilla "Test..." fue aprobada |

**Rechazar plantilla:**

```sql
UPDATE template_collections
SET
    moderation_status = 'rejected',
    rejection_reason = 'duplicate',
    reviewed_by = '{admin_id}'::UUID,
    reviewed_at = NOW()
WHERE id = 999;

-- Verificar notificación
SELECT
    n.type,
    n.title,
    n.message
FROM notifications n
WHERE n.user_id = (SELECT user_id FROM template_collections WHERE id = 999)
  AND n.type = 'template_rejected'
ORDER BY n.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| type | title | message |
|------|-------|---------|
| template_rejected | Plantilla rechazada | Tu plantilla fue rechazada. Motivo: duplicate |

### Verificar Función del Trigger

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'create_template_moderation_notification';
```

**Debe incluir:**

```sql
CREATE OR REPLACE FUNCTION create_template_moderation_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo notificar si cambió el moderation_status
    IF OLD.moderation_status <> NEW.moderation_status THEN
        IF NEW.moderation_status = 'approved' THEN
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (
                NEW.user_id,
                'template_approved',
                'Plantilla aprobada',
                'Tu plantilla "' || NEW.name || '" fue aprobada y ahora es pública.'
            );
        ELSIF NEW.moderation_status = 'rejected' THEN
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (
                NEW.user_id,
                'template_rejected',
                'Plantilla rechazada',
                'Tu plantilla "' || NEW.name || '" fue rechazada. Motivo: ' || NEW.rejection_reason
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Criterios de Éxito

- ✅ Trigger se dispara al cambiar `moderation_status`
- ✅ Notificación creada para aprobación
- ✅ Notificación creada para rechazo con motivo
- ✅ Usuario recibe notificación en tiempo real

---

## CP-F07-07A: Function - Estadísticas de moderación

### Objetivo

Crear función optimizada que retorne métricas de moderación para dashboard admin.

### Implementación de la Función

```sql
CREATE OR REPLACE FUNCTION admin_get_moderation_stats()
RETURNS TABLE (
    pending_templates INT,
    pending_user_reports INT,
    pending_listing_reports INT,
    avg_moderation_time_hours NUMERIC,
    templates_approved_today INT,
    templates_rejected_today INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INT FROM template_collections WHERE moderation_status = 'pending'),
        (SELECT COUNT(*)::INT FROM user_reports WHERE status = 'pending'),
        (SELECT COUNT(*)::INT FROM listing_reports WHERE status = 'pending'),
        (
            SELECT AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600)::NUMERIC(10,2)
            FROM template_collections
            WHERE moderation_status = 'approved'
              AND approved_at > NOW() - INTERVAL '30 days'
        ),
        (SELECT COUNT(*)::INT FROM template_collections WHERE moderation_status = 'approved' AND approved_at::DATE = CURRENT_DATE),
        (SELECT COUNT(*)::INT FROM template_collections WHERE moderation_status = 'rejected' AND reviewed_at::DATE = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Test de la Función

```sql
SELECT * FROM admin_get_moderation_stats();
```

**Resultado esperado:**

| pending_templates | pending_user_reports | pending_listing_reports | avg_moderation_time_hours | templates_approved_today | templates_rejected_today |
|-------------------|---------------------|------------------------|---------------------------|-------------------------|-------------------------|
| 12 | 3 | 5 | 4.25 | 8 | 2 |

### Performance

```sql
EXPLAIN ANALYZE
SELECT * FROM admin_get_moderation_stats();
```

**Criterios:**
- Execution Time: < 200ms
- Usa índices en todas las subconsultas
- Estable (STABLE) para cacheo

### Criterios de Éxito

- ✅ Función retorna todas las métricas en una llamada
- ✅ Performance < 200ms
- ✅ Solo admins pueden ejecutarla (RLS o SECURITY DEFINER con check interno)

---

## CP-F07-07B: Cascade Delete - Eliminar usuario borra sus datos

### Objetivo

Verificar que al eliminar un usuario, sus datos relacionados se manejan correctamente (CASCADE o SET NULL).

### Verificación de Foreign Keys

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
  AND ccu.column_name = 'id'
ORDER BY tc.table_name;
```

**Reglas esperadas:**

| table_name | column_name | delete_rule |
|------------|-------------|-------------|
| template_collections | user_id | CASCADE |
| trade_listings | user_id | CASCADE |
| user_reports | reporter_id | SET NULL |
| user_reports | reported_user_id | CASCADE |
| ratings | rater_id | SET NULL |
| ratings | rated_user_id | CASCADE |

**Lógica:**
- `CASCADE`: Si se elimina el usuario, eliminar estos registros
- `SET NULL`: Mantener el registro pero anonimizar (ej: reportes históricos)

### Test de Cascade

```sql
-- Crear usuario de prueba con datos
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test.delete@example.com') RETURNING id;
-- id = {test_user_id}

INSERT INTO profiles (id, nickname) VALUES ('{test_user_id}', 'TestUser');

INSERT INTO template_collections (user_id, name) VALUES ('{test_user_id}', 'Template Test');

INSERT INTO trade_listings (user_id, title, price) VALUES ('{test_user_id}', 'Listing Test', 100);

-- Eliminar usuario
DELETE FROM auth.users WHERE id = '{test_user_id}';

-- Verificar que sus plantillas fueron eliminadas
SELECT COUNT(*) AS plantillas_huerfanas
FROM template_collections
WHERE user_id = '{test_user_id}';
```

**Resultado esperado:** `plantillas_huerfanas = 0`

```sql
-- Verificar que sus listados fueron eliminados
SELECT COUNT(*) AS listados_huerfanos
FROM trade_listings
WHERE user_id = '{test_user_id}';
```

**Resultado esperado:** `listados_huerfanos = 0`

### Test de SET NULL

```sql
-- Crear reporte donde el reportador será eliminado
INSERT INTO user_reports (reporter_id, reported_user_id, reason)
VALUES (
    '{test_user_id}'::UUID,
    '{otro_user_id}'::UUID,
    'spam'
)
RETURNING id;
-- id = 456

-- Eliminar reportador
DELETE FROM auth.users WHERE id = '{test_user_id}';

-- Verificar que el reporte aún existe pero con reporter_id NULL
SELECT
    id,
    reporter_id,
    reported_user_id,
    reason
FROM user_reports
WHERE id = 456;
```

**Resultado esperado:**

| id | reporter_id | reported_user_id | reason |
|----|-------------|------------------|--------|
| 456 | NULL | {otro_user_id} | spam |

### Criterios de Éxito

- ✅ CASCADE elimina datos propiedad del usuario
- ✅ SET NULL preserva datos históricos pero anonimiza
- ✅ No quedan registros huérfanos sin manejar

---

## CP-F07-08A: Atomic Transaction - Suspender usuario y resolver reportes

### Objetivo

Verificar que suspender usuario y resolver sus reportes ocurre en una transacción atómica.

### Función Atómica

```sql
CREATE OR REPLACE FUNCTION admin_suspend_user_and_resolve_reports(
    p_user_id UUID,
    p_reason TEXT,
    p_duration_days INT,
    p_admin_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_reports_resolved INT;
    v_result JSONB;
BEGIN
    -- Verificar permisos
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can suspend users';
    END IF;

    -- Suspender usuario
    UPDATE profiles
    SET
        status = 'suspended',
        suspension_reason = p_reason,
        suspended_until = NOW() + (p_duration_days || ' days')::INTERVAL,
        suspension_notes = p_admin_notes
    WHERE id = p_user_id;

    -- Resolver todos los reportes pendientes de este usuario
    UPDATE user_reports
    SET
        status = 'resolved',
        resolution = 'user_suspended',
        resolution_notes = 'Usuario suspendido por admin',
        resolved_by = auth.uid(),
        resolved_at = NOW()
    WHERE reported_user_id = p_user_id
      AND status = 'pending';

    GET DIAGNOSTICS v_reports_resolved = ROW_COUNT;

    -- Crear notificación
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
        p_user_id,
        'account_suspended',
        'Cuenta suspendida',
        'Tu cuenta ha sido suspendida. Razón: ' || p_reason
    );

    -- Retornar resultado
    v_result := jsonb_build_object(
        'user_id', p_user_id,
        'suspended', true,
        'reports_resolved', v_reports_resolved,
        'suspended_until', (SELECT suspended_until FROM profiles WHERE id = p_user_id)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Test de Atomicidad

**Test exitoso:**

```sql
BEGIN;

SELECT admin_suspend_user_and_resolve_reports(
    '{user_id}'::UUID,
    'spam',
    30,
    'Múltiples reportes confirmados'
);

-- Verificar cambios
SELECT status FROM profiles WHERE id = '{user_id}';
-- Esperado: 'suspended'

SELECT COUNT(*) FROM user_reports WHERE reported_user_id = '{user_id}' AND status = 'resolved';
-- Esperado: > 0

COMMIT;
```

**Test de rollback (si algo falla):**

```sql
BEGIN;

-- Simular error (ej: user_id no existe)
SELECT admin_suspend_user_and_resolve_reports(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'spam',
    30,
    'Test'
);
-- ERROR

ROLLBACK;

-- Verificar que NINGÚN cambio se aplicó
SELECT COUNT(*) FROM admin_logs WHERE action_type = 'user_suspended';
-- No debe haber incrementado
```

### Criterios de Éxito

- ✅ Todas las operaciones ocurren en una transacción
- ✅ Si una falla, todas hacen rollback
- ✅ Función retorna resultado completo (user_id, reports_resolved, etc.)

---

## 📊 Resumen - Fase 07

| Test ID | Nombre | Complejidad | Tiempo |
|---------|--------|-------------|--------|
| CP-F07-01E | RLS funciones admin | Alta | 30 min |
| CP-F07-02D | Audit logging | Alta | 35 min |
| CP-F07-02E | RLS admin_logs | Media | 20 min |
| CP-F07-03E | Trigger auto-logging | Alta | 40 min |
| CP-F07-04B | Function is_admin() | Media | 25 min |
| CP-F07-05G | Performance reportes | Alta | 45 min |
| CP-F07-05H | Constraint auto-reportes | Baja | 15 min |
| CP-F07-06A | RLS plantillas pendientes | Alta | 30 min |
| CP-F07-06B | Trigger notif moderación | Media | 30 min |
| CP-F07-07A | Function stats moderación | Media | 30 min |
| CP-F07-07B | Cascade delete usuario | Alta | 40 min |
| CP-F07-08A | Atomic transaction suspend | Alta | 45 min |

**Total:** ~6 horas 25 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
