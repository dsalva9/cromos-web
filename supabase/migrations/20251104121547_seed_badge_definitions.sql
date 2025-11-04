-- Seed Badge Definitions
-- This migration populates the badge_definitions table with all 19 badges

-- Clear existing data (in case of re-seeding)
TRUNCATE TABLE badge_definitions CASCADE;

-- =====================================================
-- COLECCIONISTA (COLLECTOR) BADGES
-- =====================================================

INSERT INTO badge_definitions (id, category, tier, display_name_es, description_es, icon_name, threshold, sort_order) VALUES
('collector_bronze', 'collector', 'bronze', 'Coleccionista Novato', 'Copia tu primera colección y comienza tu viaje', 'BookCopy', 1, 1),
('collector_silver', 'collector', 'silver', 'Coleccionista Dedicado', 'Copia 3 colecciones y demuestra tu interés', 'BookMarked', 3, 2),
('collector_gold', 'collector', 'gold', 'Coleccionista Experto', 'Copia 10 colecciones y conviértete en un maestro', 'Library', 10, 3);

-- =====================================================
-- CREADOR (CREATOR) BADGES
-- =====================================================

INSERT INTO badge_definitions (id, category, tier, display_name_es, description_es, icon_name, threshold, sort_order) VALUES
('creator_bronze', 'creator', 'bronze', 'Creador Principiante', 'Crea tu primera colección y compártela', 'Pencil', 1, 4),
('creator_silver', 'creator', 'silver', 'Creador Activo', 'Crea 3 colecciones y inspira a otros', 'PenTool', 3, 5),
('creator_gold', 'creator', 'gold', 'Creador Legendario', 'Crea 10 colecciones y lidera la comunidad', 'Sparkles', 10, 6);

-- =====================================================
-- OPINADOR (REVIEWER) BADGES
-- =====================================================

INSERT INTO badge_definitions (id, category, tier, display_name_es, description_es, icon_name, threshold, sort_order) VALUES
('reviewer_bronze', 'reviewer', 'bronze', 'Opinador Novato', 'Califica tu primera colección', 'MessageSquare', 1, 7),
('reviewer_silver', 'reviewer', 'silver', 'Opinador Activo', 'Califica 3 colecciones y ayuda a la comunidad', 'MessageCircle', 3, 8),
('reviewer_gold', 'reviewer', 'gold', 'Crítico Experto', 'Califica 10 colecciones con tu experiencia', 'MessagesSquare', 10, 9);

-- =====================================================
-- COMPLETISTA (COMPLETIONIST) BADGES
-- =====================================================

INSERT INTO badge_definitions (id, category, tier, display_name_es, description_es, icon_name, threshold, sort_order) VALUES
('completionist_bronze', 'completionist', 'bronze', 'Completista Inicial', 'Completa tu primera colección al 100%', 'CheckCircle', 1, 10),
('completionist_silver', 'completionist', 'silver', 'Completista Dedicado', 'Completa 3 colecciones al 100%', 'CheckCircle2', 3, 11),
('completionist_gold', 'completionist', 'gold', 'Completista Maestro', 'Completa 10 colecciones al 100%', 'Award', 10, 12);

-- =====================================================
-- TRADER (INTERCAMBIADOR) BADGES
-- =====================================================

INSERT INTO badge_definitions (id, category, tier, display_name_es, description_es, icon_name, threshold, sort_order) VALUES
('trader_bronze', 'trader', 'bronze', 'Trader Novato', 'Completa tu primer intercambio exitoso', 'Repeat', 1, 13),
('trader_silver', 'trader', 'silver', 'Trader Activo', 'Completa 5 intercambios exitosos', 'RefreshCw', 5, 14),
('trader_gold', 'trader', 'gold', 'Trader Profesional', 'Completa 10 intercambios exitosos', 'TrendingUp', 10, 15);

-- =====================================================
-- TOP RATED (SPECIAL) BADGE
-- =====================================================

INSERT INTO badge_definitions (id, category, tier, display_name_es, description_es, icon_name, threshold, sort_order) VALUES
('top_rated_special', 'top_rated', 'special', 'Top Valorado', 'Alcanza 4.5⭐ con 5+ intercambios completados', 'Crown', 1, 16);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify all badges were inserted
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM badge_definitions;

    IF v_count != 19 THEN
        RAISE EXCEPTION 'Badge seeding failed: Expected 19 badges, got %', v_count;
    END IF;

    RAISE NOTICE 'Successfully seeded % badge definitions', v_count;
END $$;

-- Display summary
SELECT
    category,
    COUNT(*) as badge_count,
    STRING_AGG(tier, ', ' ORDER BY threshold) as tiers
FROM badge_definitions
GROUP BY category
ORDER BY MIN(sort_order);
