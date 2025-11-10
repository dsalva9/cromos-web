# Tests Técnicos - Fase 04: Integración

## 📋 Información General

**Fase:** Fase-04
**Categoría:** Integración entre Plantillas y Marketplace
**Audiencia:** David (tester técnico)
**Herramientas requeridas:** Supabase Dashboard (SQL Editor), Chrome DevTools

---

## 🎯 Cobertura de Tests Técnicos

Esta fase incluye **4 tests técnicos** que verifican:

1. **Foreign Keys** - Relación entre trade_listings y collection_copies
2. **Data Integrity** - Prevención de listados huérfanos
3. **Triggers** - Actualización automática de progreso al vender
4. **Cascadas** - Comportamiento al eliminar plantilla con listados

---

## CP-F04-01H: Integridad - Foreign key trade_listings → collection_copies

### Objetivo

Verificar que existe foreign key entre `trade_listings.collection_copy_id` y `collection_copies.id`, y que tiene regla de cascada apropiada.

### Setup

- **Herramientas:** SQL Editor
- **Prerequisito:** Tablas `trade_listings` y `collection_copies` existen

### Pasos

1. Verificar existencia y configuración de foreign key
2. Intentar insertar listado con `collection_copy_id` inválido (debe fallar)
3. Verificar regla de cascada al eliminar copia

### Verificación Principal

**Consulta SQL - Ver foreign key:**

```sql
-- Listar foreign keys de trade_listings
SELECT
    tc.table_name AS tabla_dependiente,
    kcu.column_name AS columna_fk,
    ccu.table_name AS tabla_referenciada,
    ccu.column_name AS columna_referenciada,
    rc.update_rule AS regla_update,
    rc.delete_rule AS regla_delete,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'trade_listings'
  AND ccu.table_name = 'collection_copies';
```

**Resultado esperado:**

| columna_fk | tabla_referenciada | regla_delete |
|------------|-------------------|--------------|
| collection_copy_id | collection_copies | **CASCADE** o **SET NULL** |

**Decisión de diseño:**

- **CASCADE:** Al eliminar copia, listados se eliminan también
- **SET NULL:** Al eliminar copia, listados quedan huérfanos (collection_copy_id = NULL)

**Recomendación:** Depende de regla de negocio:
- Si usuario elimina su colección, ¿deben eliminarse sus listados? → CASCADE
- Si listados son independientes una vez publicados → SET NULL

### Test de Integridad

**Intentar insertar listado con collection_copy_id inválido:**

```sql
-- Intentar referenciar copia que no existe
INSERT INTO trade_listings (
    user_id,
    title,
    price,
    listing_type,
    status,
    collection_copy_id,
    item_number
)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test'),
    'Test FK Invalido',
    10.00,
    'sale',
    'active',
    '00000000-0000-0000-0000-000000000000',  -- UUID inválido (no existe)
    999
);
```

**Resultado esperado:**

- Error: `violates foreign key constraint`
- Código: `23503` (foreign_key_violation)
- Mensaje: `Key (collection_copy_id)=(00000000...) is not present in table "collection_copies"`

### Test de Cascada

**Si regla es CASCADE:**

```sql
-- Crear copia de prueba
INSERT INTO collection_copies (user_id, template_id)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test'),
    (SELECT id FROM collection_templates WHERE title = 'Mundial Qatar 2022 - Oficial')
)
RETURNING id;
-- {test_copy_id}

-- Crear listado vinculado
INSERT INTO trade_listings (
    user_id, title, price, listing_type, status,
    collection_copy_id, item_number
)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test'),
    'Test Cascada',
    5.00,
    'sale',
    'active',
    '{test_copy_id}',
    50
)
RETURNING id;
-- {test_listing_id}

-- ELIMINAR copia
DELETE FROM collection_copies WHERE id = '{test_copy_id}';

-- Verificar que listado se eliminó en cascada
SELECT id, title FROM trade_listings WHERE id = '{test_listing_id}';
```

**Resultado esperado (CASCADE):**

- 0 filas (listado eliminado automáticamente)

**Resultado esperado (SET NULL):**

- 1 fila, pero `collection_copy_id = NULL`

### Criterios de Éxito

- ✅ Foreign key existe en `collection_copy_id`
- ✅ Insertar con FK inválido es rechazado (error 23503)
- ✅ Regla de cascada está definida (CASCADE o SET NULL)
- ✅ Cascada funciona correctamente según regla
- ✅ No hay listados con `collection_copy_id` apuntando a copias inexistentes

### Notas Técnicas

- **NULL permitido:** Campo `collection_copy_id` debería ser NULLABLE para permitir listados sin vinculación
- **Índice:** Debe haber índice en `collection_copy_id` para performance de JOINs
- Verificar índice:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'trade_listings'
  AND indexdef LIKE '%collection_copy_id%';
```

---

## CP-F04-01I: Prevención de listados huérfanos

### Objetivo

Verificar que no existen listados con `collection_copy_id` apuntando a copias que ya no existen.

### Setup

- **Herramientas:** SQL Editor
- **Prerequisito:** Base de datos con datos de producción/staging

### Pasos

1. Ejecutar query para buscar listados huérfanos
2. Si existen, analizar causa
3. Verificar que constraint FK previene nuevos huérfanos

### Verificación Principal

**Consulta SQL - Buscar listados huérfanos:**

```sql
-- Listados que referencian copias inexistentes
SELECT
    tl.id AS listado_id,
    tl.title,
    tl.collection_copy_id,
    tl.status,
    tl.created_at
FROM trade_listings tl
LEFT JOIN collection_copies cc ON cc.id = tl.collection_copy_id
WHERE tl.collection_copy_id IS NOT NULL  -- Solo los que deberían tener copia
  AND cc.id IS NULL;                     -- Pero la copia no existe
```

**Resultado esperado:**

- **0 filas** (no hay huérfanos)

**Si hay filas (huérfanos):**

Posibles causas:
1. FK se agregó después de tener datos inconsistentes
2. Regla de cascada es SET NULL pero hay bugs
3. Eliminación manual de copias sin actualizar listados

**Solución - Limpiar huérfanos:**

```sql
-- Opción 1: Poner collection_copy_id a NULL
UPDATE trade_listings
SET collection_copy_id = NULL
WHERE collection_copy_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM collection_copies
      WHERE id = trade_listings.collection_copy_id
  );

-- Opción 2: Eliminar listados huérfanos (más drástico)
DELETE FROM trade_listings
WHERE collection_copy_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM collection_copies
      WHERE id = trade_listings.collection_copy_id
  );
```

### Verificación Preventiva

**Query para encontrar copias sin plantilla (también huérfanas):**

```sql
SELECT
    cc.id AS copia_id,
    cc.template_id,
    cc.user_id,
    cc.created_at
FROM collection_copies cc
LEFT JOIN collection_templates ct ON ct.id = cc.template_id
WHERE ct.id IS NULL;
```

**Resultado esperado:** 0 filas

### Criterios de Éxito

- ✅ No hay listados huérfanos (0 filas)
- ✅ No hay copias huérfanas (sin plantilla)
- ✅ FK constraints previenen creación de nuevos huérfanos
- ✅ Si se encontraron huérfanos, fueron limpiados

### Notas Técnicas

- Ejecutar esta query periódicamente en producción (ej: job semanal)
- Alertar si se encuentran huérfanos (indica bug en lógica de eliminación)
- Considerar trigger que previene eliminación de copias con listados activos

---

## CP-F04-01J: Trigger - Actualizar progreso al vender

### Objetivo

Verificar que cuando un listado se marca como vendido, el cromo correspondiente en la colección se desmarca como "owned" automáticamente.

**Nota:** Este comportamiento depende de la decisión de diseño. Verificar con David si debe implementarse.

### Setup

- **Usuario:** `qa.integrador@cromos.test`
- **Prerequisito:** Trigger o lógica que sincroniza venta con colección

### Pasos

1. Verificar si existe trigger en `trade_listings` para evento UPDATE
2. Marcar listado como vendido
3. Verificar que `collection_items.owned` cambia a FALSE

### Verificación Principal

**Consulta SQL - Buscar trigger:**

```sql
SELECT
    trigger_name,
    event_manipulation AS evento,
    action_timing AS momento,
    action_statement AS funcion
FROM information_schema.triggers
WHERE event_object_table = 'trade_listings'
  AND event_object_schema = 'public'
ORDER BY trigger_name;
```

**Buscar trigger relacionado con UPDATE de status:**

- Nombre puede ser: `on_listing_sold`, `update_collection_on_sale`, etc.
- Debe ejecutarse `AFTER UPDATE`
- Función debe modificar `collection_items`

**Ver código del trigger:**

```sql
-- Buscar función asociada
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname LIKE '%listing%' OR proname LIKE '%sold%'
ORDER BY proname;
```

**Lógica esperada en función:**

```sql
-- Ejemplo de función trigger
CREATE OR REPLACE FUNCTION handle_listing_sold()
RETURNS TRIGGER AS $$
BEGIN
    -- Si status cambió a 'sold'
    IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
        -- Desmarcar el item en la colección
        UPDATE collection_items
        SET owned = false
        WHERE copy_id = NEW.collection_copy_id
          AND item_number = NEW.item_number;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Test de Funcionalidad

**Preparar datos:**

```sql
-- Crear listado vinculado a colección
-- (Asumiendo que ya existe copia y item owned=true)
SELECT cc.id AS copy_id
FROM collection_copies cc
JOIN collection_templates ct ON ct.id = cc.template_id
WHERE cc.user_id = (SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test')
  AND ct.title = 'Mundial Qatar 2022 - Oficial';
-- {copy_id}

-- Asegurar que item #40 está owned=true
INSERT INTO collection_items (copy_id, item_number, owned)
VALUES ('{copy_id}', 40, true)
ON CONFLICT (copy_id, item_number) DO UPDATE SET owned = true;

-- Crear listado para ese item
INSERT INTO trade_listings (
    user_id, title, price, listing_type, status,
    collection_copy_id, item_number
)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test'),
    'Test Trigger Venta #40',
    7.00,
    'sale',
    'active',
    '{copy_id}',
    40
)
RETURNING id;
-- {listing_id}
```

**Marcar como vendido:**

```sql
UPDATE trade_listings
SET status = 'sold'
WHERE id = '{listing_id}';
```

**Verificar que owned cambió a false:**

```sql
SELECT
    ci.item_number,
    ci.owned,
    tl.status
FROM collection_items ci
JOIN trade_listings tl ON tl.collection_copy_id = ci.copy_id
    AND tl.item_number = ci.item_number
WHERE ci.copy_id = '{copy_id}'
  AND ci.item_number = 40;
```

**Resultado esperado (si trigger existe):**

| owned | status |
|-------|--------|
| false | sold |

**Resultado (si NO hay trigger):**

| owned | status |
|-------|--------|
| true | sold | ← Owned sigue TRUE (no se actualizó)

### Criterios de Éxito

**Si trigger se implementó:**
- ✅ Trigger existe en `trade_listings` para UPDATE
- ✅ Al marcar como sold, `owned` cambia a FALSE
- ✅ Función tiene lógica correcta (verificar status cambió)

**Si NO se implementó:**
- ⚠️ Marcar como **"Not Implemented"** en tracking
- ⚠️ Reportar a David como posible mejora UX
- ✅ Test pasa si comportamiento es intencional

### Notas Técnicas

- Alternativa: Lógica en aplicación (no trigger)
- Trigger es más robusto (no se puede olvidar)
- Edge case: ¿Qué pasa si venta se cancela? (owned debería volver a TRUE)
- Considerar tabla de historial: `item_transactions`

---

## CP-F04-01K: Performance - JOIN de marketplace con colecciones

### Objetivo

Verificar que queries que joinean `trade_listings` con `collection_templates` están optimizadas.

### Setup

- **Prerequisito:** Base de datos con al menos 100 listados vinculados a colecciones
- **Herramientas:** SQL Editor, EXPLAIN ANALYZE

### Pasos

1. Ejecutar query típica de marketplace con información de plantilla
2. Analizar plan de ejecución
3. Verificar uso de índices

### Verificación Principal

**Query típica - Marketplace con filtro por plantilla:**

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    tl.id,
    tl.title,
    tl.price,
    tl.item_number,
    tl.status,
    -- Info de la plantilla
    ct.title AS plantilla_nombre,
    ct.total_items,
    -- Info del vendedor
    p.nickname AS vendedor
FROM trade_listings tl
LEFT JOIN collection_copies cc ON cc.id = tl.collection_copy_id
LEFT JOIN collection_templates ct ON ct.id = cc.template_id
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'
  AND ct.title = 'Mundial Qatar 2022 - Oficial'  -- Filtro por plantilla
ORDER BY tl.created_at DESC
LIMIT 20;
```

**Criterios de performance:**

- **Execution Time:** < 400ms (con 1000 listados)
- **Planning Time:** < 20ms
- **Uso de índices:**
  - ✅ Index Scan en `tl.status`
  - ✅ Index Scan en `tl.collection_copy_id` (FK)
  - ✅ Index Scan en `cc.template_id` (FK)
  - ✅ Index Scan en `ct.title` (si existe índice)

### Verificación de Índices

**Listar índices relevantes:**

```sql
-- Índices en trade_listings
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'trade_listings'
  AND (indexdef LIKE '%status%' OR indexdef LIKE '%collection_copy_id%')
ORDER BY indexname;

-- Índices en collection_copies
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'collection_copies'
  AND indexdef LIKE '%template_id%';

-- Índices en collection_templates
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'collection_templates'
  AND indexdef LIKE '%title%';
```

**Índices esperados:**

- `trade_listings_status_idx` en `status`
- `trade_listings_collection_copy_id_idx` en `collection_copy_id`
- `collection_copies_template_id_idx` en `template_id`
- Opcional: `collection_templates_title_idx` en `title` (para filtros frecuentes)

**Crear índice faltante si es necesario:**

```sql
-- Si falta índice en title
CREATE INDEX IF NOT EXISTS collection_templates_title_idx
ON collection_templates (title);

-- Índice en collection_copy_id
CREATE INDEX IF NOT EXISTS trade_listings_collection_copy_id_idx
ON trade_listings (collection_copy_id);
```

### Análisis de EXPLAIN

**Buscar en output:**

✅ **Buenas señales:**
```
-> Nested Loop
   -> Index Scan using trade_listings_status_idx
   -> Index Scan using collection_copies_pkey
   -> Index Scan using collection_templates_pkey
```

❌ **Malas señales:**
```
-> Seq Scan on collection_templates ct
   Filter: (title = 'Mundial Qatar 2022 - Oficial')
   Rows Removed by Filter: 5000
```

### Criterios de Éxito

- ✅ Query ejecuta en < 400ms
- ✅ Todos los JOINs usan índices (no Seq Scan)
- ✅ Índices existen en FKs (collection_copy_id, template_id)
- ✅ Performance consistente con múltiples plantillas

### Notas Técnicas

- LEFT JOIN apropiado (listados pueden no tener collection_copy_id)
- Si filtros por plantilla son frecuentes, considerar índice compuesto:

```sql
CREATE INDEX trade_listings_status_collection_idx
ON trade_listings (status, collection_copy_id)
WHERE collection_copy_id IS NOT NULL;
```

- Para búsquedas textuales en plantilla, considerar full-text search en `ct.title`

---

## 📊 Resumen de Tests Técnicos - Fase 04

| Test ID | Nombre | Complejidad | Tiempo Est. | Categoría |
|---------|--------|-------------|-------------|-----------|
| CP-F04-01H | FK listados → copias | Media | 30 min | Integridad |
| CP-F04-01I | Prevención huérfanos | Baja | 20 min | Integridad |
| CP-F04-01J | Trigger venta actualiza colección | Alta | 40 min | Automatización |
| CP-F04-01K | Performance JOIN marketplace | Alta | 35 min | Rendimiento |

**Total estimado:** ~2 horas

---

## 🔧 Queries Útiles de Debugging

### Ver listados con su plantilla

```sql
SELECT
    tl.id,
    tl.title,
    tl.price,
    ct.title AS plantilla,
    p.nickname AS vendedor
FROM trade_listings tl
LEFT JOIN collection_copies cc ON cc.id = tl.collection_copy_id
LEFT JOIN collection_templates ct ON ct.id = cc.template_id
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'
ORDER BY tl.created_at DESC
LIMIT 10;
```

### Estadísticas de vinculación

```sql
-- Porcentaje de listados vinculados a colecciones
SELECT
    COUNT(*) AS total_listados,
    COUNT(collection_copy_id) AS vinculados,
    COUNT(*) - COUNT(collection_copy_id) AS sin_vincular,
    ROUND(
        (COUNT(collection_copy_id)::DECIMAL / COUNT(*)) * 100,
        2
    ) AS porcentaje_vinculados
FROM trade_listings
WHERE status = 'active';
```

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Autor:** David
