-- Rename Badge System to Football-Themed Names
-- This migration updates badge display names to football-themed naming
-- while keeping all logic, thresholds, colors, icons, and IDs exactly the same

-- =====================================================
-- COLECCIONISTA (COLLECTOR) BADGES - Blue
-- =====================================================

UPDATE badge_definitions SET display_name_es = 'Archivista'
WHERE id = 'collector_bronze';

UPDATE badge_definitions SET display_name_es = 'Coleccionista'
WHERE id = 'collector_silver';

UPDATE badge_definitions SET display_name_es = 'Coleccionista Histórico'
WHERE id = 'collector_gold';

-- =====================================================
-- CREADOR (CREATOR) BADGES - Green
-- =====================================================

UPDATE badge_definitions SET display_name_es = 'Creador de Cantera'
WHERE id = 'creator_bronze';

UPDATE badge_definitions SET display_name_es = 'Entrenador'
WHERE id = 'creator_silver';

UPDATE badge_definitions SET display_name_es = 'Míster'
WHERE id = 'creator_gold';

-- =====================================================
-- OPINADOR (REVIEWER) BADGES - Indigo
-- =====================================================

UPDATE badge_definitions SET display_name_es = 'Comentarista'
WHERE id = 'reviewer_bronze';

UPDATE badge_definitions SET display_name_es = 'Analista'
WHERE id = 'reviewer_silver';

UPDATE badge_definitions SET display_name_es = 'Crítico de Grada'
WHERE id = 'reviewer_gold';

-- =====================================================
-- COMPLETISTA (COMPLETIONIST) BADGES - Emerald
-- =====================================================

UPDATE badge_definitions SET display_name_es = 'Rematador'
WHERE id = 'completionist_bronze';

UPDATE badge_definitions SET display_name_es = 'Goleador'
WHERE id = 'completionist_silver';

UPDATE badge_definitions SET display_name_es = 'Crack'
WHERE id = 'completionist_gold';

-- =====================================================
-- TRADER (INTERCAMBIADOR) BADGES - Orange
-- =====================================================

UPDATE badge_definitions SET display_name_es = 'Canjeador'
WHERE id = 'trader_bronze';

UPDATE badge_definitions SET display_name_es = 'Negociador'
WHERE id = 'trader_silver';

UPDATE badge_definitions SET display_name_es = 'Crack del Mercado'
WHERE id = 'trader_gold';

-- =====================================================
-- TOP VALORADO (TOP RATED) BADGE - Purple (Special)
-- =====================================================

UPDATE badge_definitions SET display_name_es = 'MVP'
WHERE id = 'top_rated_special';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify the core 16 badges were updated
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_updated_count
    FROM badge_definitions
    WHERE id IN (
        'collector_bronze', 'collector_silver', 'collector_gold',
        'creator_bronze', 'creator_silver', 'creator_gold',
        'reviewer_bronze', 'reviewer_silver', 'reviewer_gold',
        'completionist_bronze', 'completionist_silver', 'completionist_gold',
        'trader_bronze', 'trader_silver', 'trader_gold',
        'top_rated_special'
    );

    IF v_updated_count != 16 THEN
        RAISE EXCEPTION 'Badge update failed: Expected 16 core badges, found %', v_updated_count;
    END IF;

    RAISE NOTICE 'Successfully updated 16 badge names to football theme';
END $$;

-- Display updated badges
SELECT
    id,
    category,
    tier,
    display_name_es as new_name,
    threshold,
    icon_name
FROM badge_definitions
ORDER BY sort_order;
