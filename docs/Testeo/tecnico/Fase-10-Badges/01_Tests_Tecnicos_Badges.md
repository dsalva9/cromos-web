# Tests Técnicos - Fase 10: Badges y Gamificación

## 📋 Información General

**Fase:** Fase-10
**Categoría:** Gamificación - Badges, XP, Leaderboard
**Audiencia:** David (tester técnico)

---

## 🎯 Cobertura

**12 tests técnicos** verificando:
- Triggers automáticos para otorgar badges
- Cálculo de XP y niveles
- Performance de leaderboard
- Constraints para evitar duplicados
- Sistema de rachas con lógica correcta

---

## CP-F10-B09: Trigger - Otorgar badge automáticamente

### Objetivo

Verificar que triggers otorgan badges automáticamente cuando se cumplen condiciones.

### Implementación del Trigger

**Trigger para "Primera Compra":**

```sql
CREATE OR REPLACE FUNCTION check_and_award_first_purchase_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_badge_id UUID;
    v_user_id UUID;
BEGIN
    -- Determinar el comprador (puede ser sender o receiver)
    IF NEW.status = 'completed' THEN
        -- Otorgar badge al sender si es su primera transacción
        SELECT id INTO v_badge_id
        FROM badges
        WHERE slug = 'first_purchase';

        -- Verificar si sender ya tiene el badge
        IF NOT EXISTS (
            SELECT 1 FROM user_badges
            WHERE user_id = NEW.sender_id AND badge_id = v_badge_id
        ) THEN
            -- Verificar si es su primera transacción completada
            IF (
                SELECT COUNT(*)
                FROM trade_proposals
                WHERE (sender_id = NEW.sender_id OR receiver_id = NEW.sender_id)
                  AND status = 'completed'
            ) = 1 THEN
                INSERT INTO user_badges (user_id, badge_id, progress, earned_at)
                VALUES (NEW.sender_id, v_badge_id, 1, NOW());

                -- Crear notificación
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (
                    NEW.sender_id,
                    'badge_earned',
                    '¡Nueva insignia!',
                    'Has obtenido la insignia "Primera Compra"'
                );
            END IF;
        END IF;

        -- Mismo proceso para receiver
        IF NOT EXISTS (
            SELECT 1 FROM user_badges
            WHERE user_id = NEW.receiver_id AND badge_id = v_badge_id
        ) THEN
            IF (
                SELECT COUNT(*)
                FROM trade_proposals
                WHERE (sender_id = NEW.receiver_id OR receiver_id = NEW.receiver_id)
                  AND status = 'completed'
            ) = 1 THEN
                INSERT INTO user_badges (user_id, badge_id, progress, earned_at)
                VALUES (NEW.receiver_id, v_badge_id, 1, NOW());

                INSERT INTO notifications (user_id, type, title, message)
                VALUES (
                    NEW.receiver_id,
                    'badge_earned',
                    '¡Nueva insignia!',
                    'Has obtenido la insignia "Primera Compra"'
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
CREATE TRIGGER award_first_purchase_badge
    AFTER UPDATE OF status ON trade_proposals
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION check_and_award_first_purchase_badge();
```

### Test del Trigger

```sql
-- Setup: Usuario sin transacciones
INSERT INTO profiles (id, nickname) VALUES (gen_random_uuid(), 'NewUser');
-- user_id = {new_user_id}

-- Crear y completar propuesta
INSERT INTO trade_proposals (sender_id, receiver_id, status)
VALUES ('{new_user_id}', '{otro_user_id}', 'pending')
RETURNING id;
-- proposal_id = ...

-- Completar propuesta (dispara trigger)
UPDATE trade_proposals
SET status = 'completed', completed_at = NOW()
WHERE id = '{proposal_id}';

-- Verificar que badge fue otorgado
SELECT
    ub.id,
    b.name,
    ub.earned_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = '{new_user_id}'
  AND b.slug = 'first_purchase';
```

**Resultado esperado:** 1 fila (badge otorgado)

### Trigger para Badge "Creador" (5 plantillas)

```sql
CREATE OR REPLACE FUNCTION check_and_award_creator_badge()
RETURNS TRIGGER AS $$
DECLARE
    v_badge_id UUID;
    v_template_count INT;
BEGIN
    -- Contar plantillas del usuario
    SELECT COUNT(*) INTO v_template_count
    FROM template_collections
    WHERE user_id = NEW.user_id;

    -- Si alcanzó 5 plantillas
    IF v_template_count = 5 THEN
        SELECT id INTO v_badge_id
        FROM badges
        WHERE slug = 'creator';

        -- Otorgar badge si no lo tiene
        INSERT INTO user_badges (user_id, badge_id, progress, earned_at)
        VALUES (NEW.user_id, v_badge_id, 5, NOW())
        ON CONFLICT (user_id, badge_id) DO NOTHING;

        -- Notificar
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (
            NEW.user_id,
            'badge_earned',
            '¡Nueva insignia!',
            'Has obtenido la insignia "Creador"'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER award_creator_badge
    AFTER INSERT ON template_collections
    FOR EACH ROW
    EXECUTE FUNCTION check_and_award_creator_badge();
```

### Criterios de Éxito

- ✅ Trigger se dispara al completar acción
- ✅ Badge se otorga solo una vez (UNIQUE constraint)
- ✅ Notificación se crea automáticamente
- ✅ No otorga badge si ya existe

---

## CP-F10-B10: Constraint - Evitar badges duplicados

### Objetivo

Verificar que un usuario no puede obtener el mismo badge dos veces.

### Constraint en Tabla

```sql
-- Verificar estructura de user_badges
\d user_badges

-- Debe incluir:
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    progress INT DEFAULT 0,
    earned_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, badge_id)  -- ✅ CONSTRAINT CLAVE
);
```

### Test del Constraint

```sql
-- Intentar insertar badge duplicado
INSERT INTO user_badges (user_id, badge_id, progress, earned_at)
VALUES (
    '{user_id}',
    (SELECT id FROM badges WHERE slug = 'first_purchase'),
    1,
    NOW()
);
```

**Primera ejecución:** Exitosa

**Segunda ejecución:** ERROR 23505 (unique_violation)

```
ERROR:  duplicate key value violates unique constraint "user_badges_user_id_badge_id_key"
DETAIL:  Key (user_id, badge_id)=(..., ...) already exists.
```

### Usar ON CONFLICT para Idempotencia

```sql
-- Inserción segura (no falla si ya existe)
INSERT INTO user_badges (user_id, badge_id, progress, earned_at)
VALUES (
    '{user_id}',
    (SELECT id FROM badges WHERE slug = 'first_purchase'),
    1,
    NOW()
)
ON CONFLICT (user_id, badge_id) DO NOTHING;
```

**Resultado:** No error, simplemente no inserta si ya existe

### Criterios de Éxito

- ✅ UNIQUE constraint impide duplicados
- ✅ Triggers usan ON CONFLICT DO NOTHING
- ✅ Intentar otorgar badge duplicado no causa error

---

## CP-F10-B11: Function - Calcular XP y nivel

### Objetivo

Crear función que calcula el nivel basado en XP total.

### Implementación

**Función para calcular nivel:**

```sql
CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INT)
RETURNS INT AS $$
DECLARE
    v_level INT := 1;
    v_xp_required INT := 100;
    v_accumulated_xp INT := 0;
BEGIN
    WHILE v_accumulated_xp + v_xp_required <= total_xp LOOP
        v_accumulated_xp := v_accumulated_xp + v_xp_required;
        v_level := v_level + 1;

        -- Incrementar XP requerido por nivel
        IF v_level < 5 THEN
            v_xp_required := v_level * 100;
        ELSIF v_level < 10 THEN
            v_xp_required := v_level * 125;
        ELSE
            v_xp_required := v_level * 150;
        END IF;
    END LOOP;

    RETURN v_level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Test de la función:**

```sql
-- Test de diferentes cantidades de XP
SELECT
    xp,
    calculate_level_from_xp(xp) AS nivel
FROM (
    VALUES
        (0),
        (100),
        (200),
        (500),
        (1000),
        (5000),
        (10000)
) AS test_data(xp);
```

**Resultado esperado:**

| xp | nivel |
|----|-------|
| 0 | 1 |
| 100 | 2 |
| 200 | 3 |
| 500 | 5 |
| 1000 | 7 |
| 5000 | 15 |
| 10000 | 20 |

### Trigger para Actualizar Nivel Automáticamente

```sql
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
    v_new_level INT;
    v_old_level INT;
BEGIN
    -- Calcular nuevo nivel
    v_new_level := calculate_level_from_xp(NEW.xp_total);
    v_old_level := NEW.level;

    -- Si subió de nivel
    IF v_new_level > v_old_level THEN
        NEW.level := v_new_level;
        NEW.xp_current := NEW.xp_total - (
            SELECT SUM(
                CASE
                    WHEN lvl < 5 THEN lvl * 100
                    WHEN lvl < 10 THEN lvl * 125
                    ELSE lvl * 150
                END
            )
            FROM generate_series(1, v_new_level - 1) AS lvl
        );

        -- Crear notificación de level up
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (
            NEW.id,
            'level_up',
            '¡Level Up!',
            'Has alcanzado el nivel ' || v_new_level
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_update_level
    BEFORE UPDATE OF xp_total ON profiles
    FOR EACH ROW
    WHEN (NEW.xp_total <> OLD.xp_total)
    EXECUTE FUNCTION update_user_level();
```

### Test del Trigger

```sql
-- Otorgar XP a usuario
UPDATE profiles
SET xp_total = xp_total + 500
WHERE id = '{user_id}';

-- Verificar que nivel se actualizó
SELECT
    nickname,
    level,
    xp_current,
    xp_total
FROM profiles
WHERE id = '{user_id}';
```

### Criterios de Éxito

- ✅ Función calcula nivel correctamente
- ✅ Trigger actualiza nivel al sumar XP
- ✅ Notificación de level up se crea

---

## CP-F10-B12: Function - Otorgar XP por acción

### Objetivo

Función centralizada para otorgar XP y registrar en historial.

### Implementación

```sql
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_action_type TEXT,
    p_xp_amount INT,
    p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Actualizar XP total del usuario
    UPDATE profiles
    SET
        xp_total = xp_total + p_xp_amount,
        xp_current = xp_current + p_xp_amount
    WHERE id = p_user_id;

    -- Registrar en historial
    INSERT INTO xp_history (user_id, action_type, xp_earned, description)
    VALUES (p_user_id, p_action_type, p_xp_amount, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Uso de la función:**

```sql
-- Otorgar XP por crear plantilla
SELECT award_xp(
    '{user_id}'::UUID,
    'create_template',
    10,
    'Creó plantilla "Pokemon Gen 1"'
);

-- Otorgar XP por transacción completada
SELECT award_xp(
    '{user_id}'::UUID,
    'complete_transaction',
    15,
    'Transacción #456 completada'
);
```

### Trigger que Usa award_xp

**Ejemplo: XP por crear template:**

```sql
CREATE OR REPLACE FUNCTION award_xp_for_template()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM award_xp(
        NEW.user_id,
        'create_template',
        10,
        'Creó plantilla "' || NEW.name || '"'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER template_creation_xp
    AFTER INSERT ON template_collections
    FOR EACH ROW
    EXECUTE FUNCTION award_xp_for_template();
```

### Criterios de Éxito

- ✅ Función award_xp actualiza xp_total
- ✅ Registra en xp_history
- ✅ Trigger de level up se dispara automáticamente

---

## CP-F10-B13: Performance - Leaderboard query optimization

### Objetivo

Optimizar query de leaderboard para soportar miles de usuarios.

### Query Original (Lenta)

```sql
EXPLAIN ANALYZE
SELECT
    ROW_NUMBER() OVER (ORDER BY p.xp_total DESC) AS rank,
    p.nickname,
    p.level,
    p.xp_total,
    (SELECT COUNT(*) FROM user_badges WHERE user_id = p.id) AS badge_count,
    (SELECT COUNT(*) FROM trade_proposals WHERE sender_id = p.id AND status = 'completed') AS transaction_count
FROM profiles p
WHERE p.status = 'active'
ORDER BY p.xp_total DESC
LIMIT 100;
```

**Problema:** Subconsultas correlacionadas son ineficientes.

### Query Optimizada

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT
    ROW_NUMBER() OVER (ORDER BY p.xp_total DESC) AS rank,
    p.nickname,
    p.level,
    p.xp_total,
    COALESCE(ub.badge_count, 0) AS badge_count,
    COALESCE(tp.transaction_count, 0) AS transaction_count
FROM profiles p
LEFT JOIN (
    SELECT user_id, COUNT(*) AS badge_count
    FROM user_badges
    GROUP BY user_id
) ub ON ub.user_id = p.id
LEFT JOIN (
    SELECT sender_id AS user_id, COUNT(*) AS transaction_count
    FROM trade_proposals
    WHERE status = 'completed'
    GROUP BY sender_id
) tp ON tp.user_id = p.id
WHERE p.status = 'active'
ORDER BY p.xp_total DESC
LIMIT 100;
```

**Mejoras:**
- Subconsultas movidas a JOINs
- Agregaciones una sola vez por usuario

### Vista Materializada para Leaderboard

**Crear vista materializada:**

```sql
CREATE MATERIALIZED VIEW leaderboard_cache AS
SELECT
    ROW_NUMBER() OVER (ORDER BY p.xp_total DESC) AS rank,
    p.id AS user_id,
    p.nickname,
    p.avatar_url,
    p.level,
    p.xp_total,
    COALESCE(ub.badge_count, 0) AS badge_count,
    COALESCE(tp.transaction_count, 0) AS transaction_count,
    NOW() AS last_updated
FROM profiles p
LEFT JOIN (
    SELECT user_id, COUNT(*) AS badge_count
    FROM user_badges
    GROUP BY user_id
) ub ON ub.user_id = p.id
LEFT JOIN (
    SELECT
        CASE WHEN sender_id IS NOT NULL THEN sender_id ELSE receiver_id END AS user_id,
        COUNT(*) AS transaction_count
    FROM trade_proposals
    WHERE status = 'completed'
    GROUP BY user_id
) tp ON tp.user_id = p.id
WHERE p.status = 'active'
ORDER BY p.xp_total DESC;

-- Índice en la vista materializada
CREATE INDEX ON leaderboard_cache (rank);
CREATE INDEX ON leaderboard_cache (user_id);
```

**Refrescar cada hora:**

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
```

**Query simplificada:**

```sql
-- Ultra rápido: solo lee de vista materializada
SELECT * FROM leaderboard_cache
LIMIT 100;
```

**Performance esperada:**
- Query original: 500-1000ms
- Query optimizada: 50-100ms
- Vista materializada: < 10ms

### Criterios de Éxito

- ✅ Query optimizada < 100ms
- ✅ Vista materializada < 10ms
- ✅ Refresh automático cada hora

---

## CP-F10-B14: Logic - Sistema de rachas (streaks)

### Objetivo

Implementar lógica correcta para racha de logins diarios.

### Función para Actualizar Racha

```sql
CREATE OR REPLACE FUNCTION update_login_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_last_login_date DATE;
    v_current_streak INT;
BEGIN
    -- Obtener datos actuales
    SELECT last_login_date, login_streak_days
    INTO v_last_login_date, v_current_streak
    FROM profiles
    WHERE id = p_user_id;

    -- Si nunca ha hecho login
    IF v_last_login_date IS NULL THEN
        UPDATE profiles
        SET
            login_streak_days = 1,
            last_login_date = CURRENT_DATE,
            longest_login_streak = 1
        WHERE id = p_user_id;

    -- Si último login fue ayer (continúa racha)
    ELSIF v_last_login_date = CURRENT_DATE - INTERVAL '1 day' THEN
        UPDATE profiles
        SET
            login_streak_days = login_streak_days + 1,
            last_login_date = CURRENT_DATE,
            longest_login_streak = GREATEST(longest_login_streak, login_streak_days + 1)
        WHERE id = p_user_id;

        -- Otorgar XP bonus por racha
        PERFORM award_xp(
            p_user_id,
            'daily_login',
            2,
            'Login diario (Racha: ' || (v_current_streak + 1) || ' días)'
        );

        -- Verificar hitos de racha
        IF (v_current_streak + 1) IN (3, 7, 14, 30, 100) THEN
            PERFORM award_streak_bonus(p_user_id, v_current_streak + 1);
        END IF;

    -- Si último login fue hoy (no hacer nada)
    ELSIF v_last_login_date = CURRENT_DATE THEN
        -- Ya hizo login hoy, no actualizar
        NULL;

    -- Si último login fue hace 2+ días (racha rota)
    ELSE
        UPDATE profiles
        SET
            login_streak_days = 1,
            last_login_date = CURRENT_DATE
        WHERE id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Función para bonus de racha:**

```sql
CREATE OR REPLACE FUNCTION award_streak_bonus(
    p_user_id UUID,
    p_streak_days INT
)
RETURNS VOID AS $$
DECLARE
    v_bonus_xp INT;
    v_badge_slug TEXT;
BEGIN
    -- Determinar bonus según racha
    CASE p_streak_days
        WHEN 3 THEN v_bonus_xp := 10;
        WHEN 7 THEN
            v_bonus_xp := 25;
            v_badge_slug := 'active_7days';
        WHEN 14 THEN v_bonus_xp := 50;
        WHEN 30 THEN
            v_bonus_xp := 100;
            v_badge_slug := 'dedicated_30days';
        WHEN 100 THEN
            v_bonus_xp := 500;
            v_badge_slug := 'legend_100days';
    END CASE;

    -- Otorgar XP bonus
    PERFORM award_xp(
        p_user_id,
        'streak_bonus',
        v_bonus_xp,
        'Racha de ' || p_streak_days || ' días'
    );

    -- Otorgar badge si corresponde
    IF v_badge_slug IS NOT NULL THEN
        INSERT INTO user_badges (user_id, badge_id, progress, earned_at)
        SELECT
            p_user_id,
            b.id,
            p_streak_days,
            NOW()
        FROM badges b
        WHERE b.slug = v_badge_slug
        ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Test de Lógica de Racha

```sql
-- Día 1: Primer login
SELECT update_login_streak('{user_id}');
-- Esperado: streak = 1

-- Día 2: Login consecutivo
SELECT update_login_streak('{user_id}');
-- Esperado: streak = 2

-- Día 2 (más tarde): Segundo login mismo día
SELECT update_login_streak('{user_id}');
-- Esperado: streak = 2 (no cambia)

-- Día 4: Racha rota (saltó día 3)
SELECT update_login_streak('{user_id}');
-- Esperado: streak = 1 (reinicio)

-- Verificar datos
SELECT
    login_streak_days,
    last_login_date,
    longest_login_streak
FROM profiles
WHERE id = '{user_id}';
```

**Resultado esperado:**

| login_streak_days | last_login_date | longest_login_streak |
|-------------------|-----------------|----------------------|
| 1 | 2025-11-13 | 2 |

### Criterios de Éxito

- ✅ Racha incrementa con login diario consecutivo
- ✅ Racha no incrementa si login mismo día
- ✅ Racha se resetea si se salta un día
- ✅ Bonos se otorgan en hitos (3, 7, 14, 30, 100)

---

## CP-F10-B15: Trigger - Progreso incremental hacia badge

### Objetivo

Algunos badges requieren progreso gradual (ej: 10 transacciones). Implementar tracking de progreso.

### Tabla user_badges con Progreso

```sql
-- Estructura ya existente
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL,
    progress INT DEFAULT 0,  -- ✅ Progreso actual
    earned_at TIMESTAMP,     -- NULL si aún no obtenido
    ...
);
```

### Trigger para Actualizar Progreso

**Ejemplo: Badge "Trader Pro" (10 transacciones)**

```sql
CREATE OR REPLACE FUNCTION update_trader_pro_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_badge_id UUID;
    v_transaction_count INT;
BEGIN
    IF NEW.status = 'completed' THEN
        -- Obtener badge ID
        SELECT id INTO v_badge_id
        FROM badges
        WHERE slug = 'trader_pro';

        -- Para sender
        SELECT COUNT(*) INTO v_transaction_count
        FROM trade_proposals
        WHERE (sender_id = NEW.sender_id OR receiver_id = NEW.sender_id)
          AND status = 'completed';

        -- Insertar o actualizar progreso
        INSERT INTO user_badges (user_id, badge_id, progress)
        VALUES (NEW.sender_id, v_badge_id, v_transaction_count)
        ON CONFLICT (user_id, badge_id) DO UPDATE
        SET progress = EXCLUDED.progress;

        -- Si alcanzó 10, marcar como obtenido
        IF v_transaction_count >= 10 THEN
            UPDATE user_badges
            SET earned_at = NOW()
            WHERE user_id = NEW.sender_id
              AND badge_id = v_badge_id
              AND earned_at IS NULL;  -- Solo si aún no obtenido

            -- Notificar
            INSERT INTO notifications (user_id, type, title, message)
            SELECT
                NEW.sender_id,
                'badge_earned',
                '¡Nueva insignia!',
                'Has obtenido la insignia "Trader Pro"'
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications
                WHERE user_id = NEW.sender_id
                  AND type = 'badge_earned'
                  AND message LIKE '%Trader Pro%'
            );
        END IF;

        -- Mismo proceso para receiver...
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_badge_progress
    AFTER UPDATE OF status ON trade_proposals
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_trader_pro_progress();
```

### Test de Progreso

```sql
-- Usuario con 0 transacciones
-- Completar 5 transacciones

-- Verificar progreso
SELECT
    b.name,
    ub.progress,
    b.requirement_count,
    ub.earned_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = '{user_id}'
  AND b.slug = 'trader_pro';
```

**Resultado esperado:**

| name | progress | requirement_count | earned_at |
|------|----------|-------------------|-----------|
| Trader Pro | 5 | 10 | NULL |

**Después de 5 transacciones más:**

| name | progress | requirement_count | earned_at |
|------|----------|-------------------|-----------|
| Trader Pro | 10 | 10 | 2025-11-09 14:30:00 |

### Criterios de Éxito

- ✅ Progreso se actualiza con cada acción
- ✅ Badge se marca como obtenido al alcanzar requisito
- ✅ No se duplican notificaciones

---

## 📊 Resumen - Fase 10

| Test ID | Nombre | Complejidad | Tiempo |
|---------|--------|-------------|--------|
| CP-F10-B09 | Trigger otorgar badge | Alta | 60 min |
| CP-F10-B10 | Constraint duplicados | Baja | 15 min |
| CP-F10-B11 | Function calcular nivel | Media | 40 min |
| CP-F10-B12 | Function award XP | Media | 30 min |
| CP-F10-B13 | Performance leaderboard | Alta | 60 min |
| CP-F10-B14 | Logic rachas | Alta | 50 min |
| CP-F10-B15 | Trigger progreso incremental | Alta | 45 min |

**Total:** ~5 horas

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
