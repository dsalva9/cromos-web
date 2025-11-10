# Tests Técnicos - Fase 05: Intercambios

## 📋 Información General

**Fase:** Fase-05
**Categoría:** Sistema de Propuestas de Intercambio
**Audiencia:** David (tester técnico)
**Herramientas requeridas:** Supabase Dashboard (SQL Editor), Chrome DevTools

---

## 🎯 Cobertura de Tests Técnicos

Esta fase incluye **3 tests técnicos** que verifican:

1. **Data Integrity** - Transacciones atómicas al aceptar propuesta
2. **RLS Policies** - Solo participantes ven sus propuestas
3. **Constraints** - Prevención de propuestas duplicadas

---

## CP-F05-02F: Transacción atómica al aceptar propuesta

### Objetivo

Verificar que al aceptar una propuesta de intercambio, todos los cambios se realizan de forma atómica (todo o nada), previniendo estados inconsistentes.

### Setup

- **Usuarios:**
  - Usuario A: `qa.trader_a@cromos.test` (ofrece cromo #10)
  - Usuario B: `qa.trader_b@cromos.test` (ofrece cromo #11)
- **Prerequisito:** Propuesta activa entre ambos usuarios
- **Herramientas:** SQL Editor, psql

### Pasos

1. Identificar operaciones que deben ser atómicas
2. Simular fallo intermedio para verificar rollback
3. Verificar que transacción completa o no hace nada

### Verificación Principal

**Operaciones que deben ocurrir al aceptar propuesta:**

1. UPDATE `trade_proposals` SET `status = 'accepted'`, `accepted_at = NOW()`
2. UPDATE `collection_items` SET `owned = false` WHERE usuario A, cromo #10
3. UPDATE `collection_items` SET `owned = false` WHERE usuario B, cromo #11
4. UPDATE `collection_items` SET `owned = true` WHERE usuario A, cromo #11 (recibe)
5. INSERT INTO `collection_items` SET `owned = true` WHERE usuario B, cromo #10 (recibe) - si no existía

**⚠️ CRÍTICO:** Si alguna operación falla, TODAS deben revertirse (ROLLBACK).

### Test de Transacción

**Simular aceptación manual con transacción:**

```sql
-- Obtener IDs
SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test';
-- {user_a_id}
SELECT id FROM auth.users WHERE email = 'qa.trader_b@cromos.test';
-- {user_b_id}

-- Obtener collection_copy_id de cada usuario
SELECT cc.id FROM collection_copies cc
JOIN collection_templates ct ON ct.id = cc.template_id
WHERE cc.user_id = '{user_a_id}' AND ct.title = 'Mundial Qatar 2022 - Oficial';
-- {copy_a_id}

SELECT cc.id FROM collection_copies cc
JOIN collection_templates ct ON ct.id = cc.template_id
WHERE cc.user_id = '{user_b_id}' AND ct.title = 'Mundial Qatar 2022 - Oficial';
-- {copy_b_id}

-- Crear propuesta de prueba
INSERT INTO trade_proposals (
    sender_id, receiver_id,
    offered_item_number, requested_item_number,
    status
)
VALUES (
    '{user_a_id}', '{user_b_id}',
    10, 11,
    'pending'
)
RETURNING id;
-- {proposal_id}
```

**Simular aceptación con transacción:**

```sql
BEGIN;

-- 1. Actualizar propuesta
UPDATE trade_proposals
SET status = 'accepted', accepted_at = NOW()
WHERE id = '{proposal_id}';

-- 2. Usuario A entrega cromo #10
UPDATE collection_items
SET owned = false
WHERE copy_id = '{copy_a_id}' AND item_number = 10;

-- 3. Usuario B entrega cromo #11
UPDATE collection_items
SET owned = false
WHERE copy_id = '{copy_b_id}' AND item_number = 11;

-- 4. Usuario A recibe cromo #11
INSERT INTO collection_items (copy_id, item_number, owned)
VALUES ('{copy_a_id}', 11, true)
ON CONFLICT (copy_id, item_number) DO UPDATE SET owned = true;

-- 5. Usuario B recibe cromo #10
INSERT INTO collection_items (copy_id, item_number, owned)
VALUES ('{copy_b_id}', 10, true)
ON CONFLICT (copy_id, item_number) DO UPDATE SET owned = true;

-- Si todo está bien, COMMIT
COMMIT;

-- Si hubo error, ROLLBACK (automático en caso de error)
```

**Verificar resultado:**

```sql
-- Propuesta debe estar aceptada
SELECT status, accepted_at FROM trade_proposals WHERE id = '{proposal_id}';

-- Usuario A: perdió #10, ganó #11
SELECT item_number, owned FROM collection_items
WHERE copy_id = '{copy_a_id}' AND item_number IN (10, 11)
ORDER BY item_number;

-- Usuario B: perdió #11, ganó #10
SELECT item_number, owned FROM collection_items
WHERE copy_id = '{copy_b_id}' AND item_number IN (10, 11)
ORDER BY item_number;
```

**Resultado esperado:**

| Usuario | item_number | owned |
|---------|-------------|-------|
| A | 10 | false |
| A | 11 | true |
| B | 10 | true |
| B | 11 | false |

### Test de Rollback

**Simular fallo intermedio:**

```sql
BEGIN;

-- Actualizar propuesta
UPDATE trade_proposals SET status = 'accepted' WHERE id = '{proposal_id}';

-- Usuario A entrega cromo
UPDATE collection_items SET owned = false
WHERE copy_id = '{copy_a_id}' AND item_number = 10;

-- SIMULAR ERROR (constraint violation, etc.)
-- Por ejemplo, intentar insertar con FK inválido
INSERT INTO collection_items (copy_id, item_number, owned)
VALUES ('00000000-0000-0000-0000-000000000000', 999, true);
-- Esto fallará

COMMIT;  -- No llegará aquí, auto-ROLLBACK
```

**Verificar que todo se revirtió:**

```sql
-- Propuesta debe seguir 'pending' (no cambió)
SELECT status FROM trade_proposals WHERE id = '{proposal_id}';

-- Usuario A debe seguir teniendo cromo #10
SELECT owned FROM collection_items
WHERE copy_id = '{copy_a_id}' AND item_number = 10;
```

**Resultado esperado:**

| status | owned (#10 de A) |
|--------|------------------|
| pending | true |

✅ Todo se revirtió correctamente

### Criterios de Éxito

- ✅ Transacción completa ejecuta todos los UPDATE/INSERT
- ✅ Si hay error, ROLLBACK automático revierte todo
- ✅ No existen estados intermedios (propuesta aceptada pero cromos sin actualizar)
- ✅ Función o procedimiento que maneja aceptación usa BEGIN/COMMIT
- ✅ Logs de errores capturan fallos de transacción

### Notas Técnicas

- **Isolation Level:** Por defecto READ COMMITTED es suficiente
- **Deadlocks:** Considerar orden consistente de UPDATE para evitarlos
- **Función stored procedure recomendada:**

```sql
CREATE OR REPLACE FUNCTION accept_trade_proposal(proposal_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    proposal RECORD;
BEGIN
    -- Obtener datos de propuesta
    SELECT * INTO proposal FROM trade_proposals WHERE id = proposal_id;

    -- Verificar que está pendiente
    IF proposal.status != 'pending' THEN
        RAISE EXCEPTION 'Proposal already processed';
    END IF;

    -- Actualizar propuesta
    UPDATE trade_proposals SET status = 'accepted', accepted_at = NOW()
    WHERE id = proposal_id;

    -- Actualizar items (lógica de intercambio)
    -- ...

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        RAISE NOTICE 'Error accepting proposal: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

---

## CP-F05-02J: RLS - Solo participantes ven propuestas

### Objetivo

Verificar que las políticas RLS impiden que usuarios vean propuestas de intercambio en las que no participan.

### Setup

- **Usuarios:**
  - Usuario A y B: tienen propuesta activa
  - Usuario C: `qa.espia@cromos.test` (NO participa)
- **Herramientas:** SQL Editor

### Pasos

1. Verificar políticas RLS en `trade_proposals`
2. Como Usuario C, intentar ver propuesta de A-B (debe fallar)
3. Verificar que solo participantes pueden actualizar

### Verificación Principal

**Consulta SQL - Ver políticas RLS:**

```sql
SELECT
    policyname,
    cmd AS comando,
    qual AS clausula_WHERE
FROM pg_policies
WHERE tablename = 'trade_proposals'
ORDER BY cmd, policyname;
```

**Políticas esperadas:**

```
SELECT: (sender_id = auth.uid() OR receiver_id = auth.uid())
UPDATE: (sender_id = auth.uid() OR receiver_id = auth.uid())
INSERT: (sender_id = auth.uid())  -- Solo el sender puede crear
DELETE: (sender_id = auth.uid())  -- Solo el sender puede cancelar
```

### Test de Penetración

**Obtener ID de propuesta entre A y B:**

```sql
-- Como Usuario A, ver propuestas
SET request.jwt.claim.sub = '{user_a_id}';

SELECT id FROM trade_proposals
WHERE sender_id = '{user_a_id}'
   OR receiver_id = '{user_a_id}'
ORDER BY created_at DESC
LIMIT 1;
-- {proposal_id}
```

**Como Usuario C (espía), intentar ver:**

```sql
SET request.jwt.claim.sub = '{user_c_id}';

SELECT * FROM trade_proposals WHERE id = '{proposal_id}';
```

**Resultado esperado:** 0 filas (RLS bloqueó)

**Intentar actualizar propuesta ajena:**

```sql
SET request.jwt.claim.sub = '{user_c_id}';

UPDATE trade_proposals
SET status = 'HACKED'
WHERE id = '{proposal_id}';
```

**Resultado esperado:**
- UPDATE afecta 0 filas
- RLS impidió modificación

### Test Positivo

**Como Usuario B (receptor), SÍ puede ver:**

```sql
SET request.jwt.claim.sub = '{user_b_id}';

SELECT id, status, sender_id, receiver_id
FROM trade_proposals
WHERE id = '{proposal_id}';
```

**Resultado esperado:** 1 fila (es participante)

**Como Usuario B, SÍ puede aceptar (UPDATE):**

```sql
SET request.jwt.claim.sub = '{user_b_id}';

UPDATE trade_proposals
SET status = 'accepted', accepted_at = NOW()
WHERE id = '{proposal_id}'
  AND receiver_id = '{user_b_id}';  -- Verificación adicional
```

**Resultado esperado:** UPDATE afecta 1 fila

### Criterios de Éxito

- ✅ RLS habilitado en `trade_proposals`
- ✅ Política SELECT verifica `sender_id = auth.uid() OR receiver_id = auth.uid()`
- ✅ Usuario C NO puede ver propuestas de A-B
- ✅ Usuario C NO puede modificar propuestas ajenas
- ✅ Usuarios A y B SÍ pueden ver y modificar su propuesta

### Notas Técnicas

- Política UPDATE debe verificar también que solo receiver puede aceptar:

```sql
CREATE POLICY "receiver_can_accept" ON trade_proposals
FOR UPDATE USING (
    receiver_id = auth.uid()
    AND status = 'pending'
);
```

- Política INSERT permite solo crear propuestas donde tú eres sender:

```sql
CREATE POLICY "users_create_own_proposals" ON trade_proposals
FOR INSERT WITH CHECK (sender_id = auth.uid());
```

---

## CP-F05-02K: Prevención de propuestas duplicadas

### Objetivo

Verificar que no se pueden crear múltiples propuestas activas entre los mismos usuarios para los mismos cromos.

### Setup

- **Usuarios:** A y B
- **Herramientas:** SQL Editor

### Pasos

1. Verificar si existe constraint o trigger que previene duplicados
2. Intentar crear segunda propuesta idéntica
3. Verificar comportamiento (error o retorna existente)

### Verificación Principal

**Consulta SQL - Buscar constraint UNIQUE:**

```sql
SELECT
    conname AS nombre_constraint,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'trade_proposals'::regclass
  AND contype = 'u'  -- UNIQUE
ORDER BY conname;
```

**Constraint esperado (opcional):**

Puede no haber constraint DB si lógica está en aplicación.

**Alternativa:** Unique index parcial para propuestas pendientes:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS trade_proposals_unique_pending
ON trade_proposals (sender_id, receiver_id, offered_item_number, requested_item_number)
WHERE status = 'pending';
```

Esto permite:
- ✅ Solo 1 propuesta pendiente con mismos parámetros
- ✅ Múltiples propuestas históricas (aceptadas/rechazadas)

### Test de Duplicados

**Crear primera propuesta:**

```sql
INSERT INTO trade_proposals (
    sender_id, receiver_id,
    offered_item_number, requested_item_number,
    status
)
VALUES (
    '{user_a_id}', '{user_b_id}',
    25, 30,
    'pending'
)
RETURNING id;
-- {proposal_1_id}
```

**Resultado esperado:** INSERT exitoso

**Intentar crear segunda propuesta idéntica:**

```sql
INSERT INTO trade_proposals (
    sender_id, receiver_id,
    offered_item_number, requested_item_number,
    status
)
VALUES (
    '{user_a_id}', '{user_b_id}',
    25, 30,  -- Mismos cromos
    'pending'
);
```

**Resultado esperado (si hay unique index):**

- Error: `duplicate key violates unique constraint`
- Código: `23505`

**Resultado esperado (si lógica en app):**

- Puede insertar (malo) o
- Aplicación verifica antes y retorna propuesta existente

### Verificación de Duplicados Existentes

```sql
-- Buscar propuestas duplicadas actualmente
SELECT
    sender_id,
    receiver_id,
    offered_item_number,
    requested_item_number,
    COUNT(*) AS cantidad
FROM trade_proposals
WHERE status = 'pending'
GROUP BY sender_id, receiver_id, offered_item_number, requested_item_number
HAVING COUNT(*) > 1;
```

**Resultado esperado:** 0 filas (no hay duplicados)

### Lógica de Aplicación (si no hay constraint)

```sql
-- Antes de INSERT, aplicación debe verificar:
SELECT id FROM trade_proposals
WHERE sender_id = '{user_a_id}'
  AND receiver_id = '{user_b_id}'
  AND offered_item_number = 25
  AND requested_item_number = 30
  AND status = 'pending';

-- Si retorna ID: Mostrar mensaje "Ya tienes una propuesta pendiente"
-- Si retorna 0 filas: Proceder con INSERT
```

### Criterios de Éxito

- ✅ Unique index parcial previene duplicados pendientes (recomendado)
- ✅ O aplicación verifica antes de INSERT
- ✅ Segunda propuesta idéntica es rechazada
- ✅ No existen duplicados en BD actualmente
- ✅ Propuestas históricas (aceptadas/rechazadas) SÍ pueden duplicarse

### Notas Técnicas

- **Partial unique index** es mejor que constraint total (permite histórico)
- Edge case: ¿Qué pasa si A propone a B y B propone a A simultáneamente? (orden inverso)
  - Solución: Normalizar orden (sender siempre menor UUID)
- Considerar timeout de propuestas: Auto-expirar después de 7 días sin respuesta

---

## 📊 Resumen de Tests Técnicos - Fase 05

| Test ID | Nombre | Complejidad | Tiempo Est. | Categoría |
|---------|--------|-------------|-------------|-----------|
| CP-F05-02F | Transacción atómica | Alta | 40 min | Integridad |
| CP-F05-02J | RLS propuestas | Media | 30 min | Seguridad |
| CP-F05-02K | Prevención duplicados | Media | 25 min | Integridad |

**Total estimado:** ~1.5 horas

---

## 🔧 Función Stored Procedure Recomendada

```sql
CREATE OR REPLACE FUNCTION accept_trade_proposal(
    p_proposal_id UUID,
    p_user_id UUID  -- ID del usuario que acepta (verificación)
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_proposal RECORD;
    v_sender_copy_id UUID;
    v_receiver_copy_id UUID;
BEGIN
    -- Obtener propuesta
    SELECT * INTO v_proposal
    FROM trade_proposals
    WHERE id = p_proposal_id
      AND receiver_id = p_user_id  -- Verificar que es el receptor
      AND status = 'pending';

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Proposal not found or already processed';
        RETURN;
    END IF;

    -- Obtener collection_copy_id de ambos usuarios
    -- (Lógica para obtener v_sender_copy_id y v_receiver_copy_id)

    -- Iniciar transacción implícita (función ya está en transacción)

    -- 1. Actualizar propuesta
    UPDATE trade_proposals
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = p_proposal_id;

    -- 2. Sender entrega cromo ofrecido
    UPDATE collection_items
    SET owned = false
    WHERE copy_id = v_sender_copy_id
      AND item_number = v_proposal.offered_item_number;

    -- 3. Receiver entrega cromo solicitado
    UPDATE collection_items
    SET owned = false
    WHERE copy_id = v_receiver_copy_id
      AND item_number = v_proposal.requested_item_number;

    -- 4. Sender recibe cromo solicitado
    INSERT INTO collection_items (copy_id, item_number, owned)
    VALUES (v_sender_copy_id, v_proposal.requested_item_number, true)
    ON CONFLICT (copy_id, item_number) DO UPDATE SET owned = true;

    -- 5. Receiver recibe cromo ofrecido
    INSERT INTO collection_items (copy_id, item_number, owned)
    VALUES (v_receiver_copy_id, v_proposal.offered_item_number, true)
    ON CONFLICT (copy_id, item_number) DO UPDATE SET owned = true;

    RETURN QUERY SELECT TRUE, 'Trade proposal accepted successfully';

EXCEPTION
    WHEN OTHERS THEN
        -- Auto-rollback en caso de error
        RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Uso:
SELECT * FROM accept_trade_proposal('{proposal_id}', '{user_id}');
```

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Autor:** David
