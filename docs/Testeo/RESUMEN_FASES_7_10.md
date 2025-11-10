# Resumen de Tests - Fases 7-10

## 📋 Información General

Este documento consolida los tests de las fases finales del sistema de testing.

**Total de tests en Fases 7-10:** 62 tests
**Tiempo estimado:** ~18-22 horas

---

## FASE-07: Administración

### Tests No-Técnicos

#### 01_Panel_Admin_Usuarios.md (12 tests, ~3 horas)

**CP-F07-01A: Acceso al panel de administración**
- ✅ Solo usuarios con rol `admin` pueden acceder
- ✅ URL: `/admin` o `/dashboard/admin`
- SQL: `SELECT role FROM profiles WHERE email = 'admin@cromos.test'`

**CP-F07-01B: Ver lista de usuarios**
- ✅ Búsqueda por email/nickname
- ✅ Filtros: activos, suspendidos, todos
- ✅ Paginación funcional

**CP-F07-01C: Suspender usuario**
- ✅ Botón "Suspender" junto a usuario
- ✅ Razón obligatoria
- SQL: `UPDATE profiles SET status = 'suspended', suspended_reason = '...' WHERE id = '{user_id}'`

**CP-F07-01D: Reactivar usuario suspendido**
- SQL: `UPDATE profiles SET status = 'active', suspended_reason = NULL`

**CP-F07-02A: Ver reportes pendientes**
- ✅ Lista de user_reports y listing_reports con `status = 'pending'`

**CP-F07-02B: Revisar reporte de usuario**
- ✅ Ver detalles completos
- ✅ Acciones: Aprobar/Rechazar

**CP-F07-02C: Aprobar reporte (suspender usuario)**
- SQL: `UPDATE user_reports SET status = 'approved', reviewed_by = '{admin_id}'`

**CP-F07-02D: Rechazar reporte**
- SQL: `UPDATE user_reports SET status = 'rejected'`

**CP-F07-02E: Eliminar listado reportado**
- ✅ Desde panel de reportes
- SQL: `UPDATE trade_listings SET status = 'deleted', deleted_by_admin = true`

**CP-F07-02F: Ver estadísticas generales**
- ✅ Total usuarios activos
- ✅ Listados activos
- ✅ Transacciones hoy/semana/mes
- ✅ Reportes pendientes

**CP-F07-02G: Buscar usuario por email**
- ✅ Barra de búsqueda
- ✅ Búsqueda case-insensitive
- SQL: `WHERE email ILIKE '%{query}%'`

**CP-F07-02H: Ver actividad reciente**
- ✅ Log de acciones de admin
- SQL: `SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 50`

#### 02_Gestion_Plantillas.md (6 tests, ~1.5 horas)

**CP-F07-03A: Ver todas las plantillas**
- ✅ Incluyendo privadas de todos los usuarios

**CP-F07-03B: Editar plantilla de cualquier usuario**
- ✅ Corregir errores, typos

**CP-F07-03C: Eliminar plantilla (admin)**
- ✅ Por violar términos de servicio

**CP-F07-03D: Destacar plantilla**
- ✅ Marcar como "Featured" para homepage
- SQL: `UPDATE collection_templates SET featured = true`

**CP-F07-03E: Aprobar/Rechazar plantillas enviadas**
- ✅ Sistema de moderación de plantillas

**CP-F07-03F: Ver plantillas más populares**
- ✅ Por número de copias
- SQL: `SELECT template_id, COUNT(*) FROM collection_copies GROUP BY template_id`

### Tests Técnicos

#### 01_Tests_Tecnicos_Admin.md (12 tests, ~4 horas)

**CP-F07-02I: RLS - Solo admins acceden a admin_panel**
```sql
CREATE POLICY "admins_only" ON admin_actions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
```

**CP-F07-02J: Audit Log - Todas las acciones admin registradas**
- ✅ Trigger en acciones críticas
- ✅ Tabla: `admin_audit_log` con campos:
  - admin_id
  - action_type (suspend_user, delete_listing, etc.)
  - target_id (user/listing afectado)
  - metadata (detalles JSON)
  - created_at

**CP-F07-02K: Constraint - Solo un admin puede existir inicialmente**
- ✅ Seed script crea admin inicial
- ✅ Función para promover usuarios a admin

**CP-F07-02L: Function - Suspender usuario y sus listados**
```sql
CREATE FUNCTION admin_suspend_user(
    p_user_id UUID,
    p_reason TEXT,
    p_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- Suspender usuario
    UPDATE profiles SET status = 'suspended', suspended_reason = p_reason
    WHERE id = p_user_id;

    -- Ocultar listados activos
    UPDATE trade_listings SET status = 'suspended'
    WHERE user_id = p_user_id AND status = 'active';

    -- Log
    INSERT INTO admin_audit_log (admin_id, action_type, target_id, metadata)
    VALUES (p_admin_id, 'suspend_user', p_user_id, jsonb_build_object('reason', p_reason));

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**CP-F07-02M: Performance - Dashboard de estadísticas**
```sql
EXPLAIN ANALYZE
SELECT
    (SELECT COUNT(*) FROM profiles WHERE status = 'active') AS usuarios_activos,
    (SELECT COUNT(*) FROM trade_listings WHERE status = 'active') AS listados_activos,
    (SELECT COUNT(*) FROM user_reports WHERE status = 'pending') AS reportes_pendientes,
    (SELECT COUNT(*) FROM transactions WHERE created_at > NOW() - INTERVAL '24 hours') AS tx_hoy;
```
- ✅ Usar views materializadas para stats en tiempo real
- ✅ Refresh cada 5 minutos

**CP-F07-03G: RLS - Admins pueden ver plantillas privadas**
```sql
CREATE POLICY "admins_see_all" ON collection_templates
FOR SELECT USING (
    is_public = true
    OR author_id = auth.uid()
    OR is_admin(auth.uid())
);
```

**CP-F07-03H: Cascade - Eliminar usuario elimina sus datos**
- ✅ Pero mantener transacciones completadas (histórico)
- ✅ Soft delete recomendado

**CP-F07-03I: Security - Rate limiting en acciones admin**
- ✅ Prevenir suspensión masiva accidental
- ✅ Max 10 suspensiones por minuto

**CP-F07-03J: Backup - Antes de eliminaciones masivas**
- ✅ Procedimiento de backup automático

**Más tests:**
- CP-F07-03K: Índices en tablas de reportes
- CP-F07-03L: Full-text search en reportes
- CP-F07-03M: Notificar usuario cuando es suspendido

---

## FASE-08: End-to-End

### Tests No-Técnicos

#### 01_Flujos_Completos_E2E.md (6 tests, ~3 horas)

**CP-F08-01A: E2E - Registro hasta primera venta**
1. Registrar usuario nuevo
2. Crear perfil completo
3. Añadir plantilla a colección
4. Marcar 5 cromos
5. Publicar 1 cromo en marketplace
6. Otro usuario compra
7. Marcar como vendido
8. Verificar historial

**CP-F08-01B: E2E - Intercambio completo**
1. Usuario A publica para intercambio
2. Usuario B envía propuesta
3. Usuario A recibe notificación
4. Usuario A acepta
5. Ambas colecciones se actualizan
6. Valoración mutua

**CP-F08-01C: E2E - Flujo de reporte y moderación**
1. Usuario reporta listado spam
2. Reporte entra en cola admin
3. Admin revisa
4. Admin elimina listado
5. Usuario reportante recibe notificación
6. Dueño del listado notificado

**CP-F08-01D: E2E - Sistema social completo**
1. Seguir usuario
2. Ver sus listados en feed
3. Marcar favorito
4. Chatear
5. Completar transacción
6. Valorar

**CP-F08-01E: E2E - Gestión completa de colección**
1. Crear plantilla custom
2. Añadir a mi colección
3. Marcar progreso (50/100)
4. Publicar cromos repetidos
5. Recibir cromos faltantes por intercambio
6. Completar colección (100/100)

**CP-F08-01F: E2E - Multi-dispositivo sync**
1. Login en desktop
2. Marcar cromo
3. Abrir en móvil
4. Verificar que cambio se reflejó
5. Publicar desde móvil
6. Ver en desktop

### Tests Técnicos

#### 01_Tests_Tecnicos_E2E.md (3 tests, ~2 horas)

**CP-F08-01G: Data consistency - Transacción completa**
- ✅ Verificar que TODOS los pasos son atómicos
- ✅ Si falla paso 5, steps 1-4 hacen rollback

**CP-F08-01H: Performance - Carga de homepage**
```sql
EXPLAIN ANALYZE
-- Query homepage con:
-- - Listados destacados
-- - Plantillas populares
-- - Actividad reciente
-- Debe ser < 500ms
```

**CP-F08-01I: Stress test - 100 usuarios concurrentes**
- ✅ Usar herramienta de load testing (k6, Artillery)
- ✅ Verificar que sistema soporta carga

---

## FASE-09: Calidad Transversal

### Tests No-Técnicos

#### 01_Accesibilidad_UX.md (6 tests, ~2 horas)

**CP-F09-01A: Navegación por teclado**
- ✅ Tab funciona en todos los formularios
- ✅ Enter envía formularios
- ✅ Esc cierra modales

**CP-F09-01B: Screen reader compatibility**
- ✅ Labels en inputs
- ✅ aria-labels apropiados
- ✅ Alt text en imágenes

**CP-F09-01C: Contraste de colores**
- ✅ WCAG AA compliance
- ✅ Usar herramienta: axe DevTools

**CP-F09-01D: Responsive - Móvil 375px**
- ✅ Todos los features funcionales en móvil

**CP-F09-01E: Responsive - Tablet 768px**
- ✅ Layout se adapta

**CP-F09-01F: Mensajes de error claros**
- ✅ "El email es inválido" vs "Error"
- ✅ Sugerencias de corrección

### Tests Técnicos

#### 01_Tests_Tecnicos_Calidad.md (3 tests, ~1.5 horas)

**CP-F09-02A: Lighthouse score**
- ✅ Performance: > 90
- ✅ Accessibility: > 95
- ✅ Best Practices: > 90
- ✅ SEO: > 90

**CP-F09-02B: Error handling - Network failure**
```javascript
// Simular pérdida de conexión
navigator.onLine = false;

// Intentar crear listado
// Debe mostrar: "Sin conexión. Cambios se guardarán cuando vuelvas online"
```

**CP-F09-02G: Performance - Panel admin con 10,000 reportes**
```sql
EXPLAIN ANALYZE
SELECT * FROM user_reports
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 20
OFFSET 0;
```
- ✅ Debe usar índice en (status, created_at)
- ✅ Tiempo < 100ms incluso con 10k filas

---

## FASE-10: Badges (Insignias)

### Tests No-Técnicos

#### 01_Sistema_Insignias.md (8 tests, ~2 horas)

**CP-F10-01: Ver badges disponibles**
- ✅ Catálogo de insignias
- ✅ Descripción de cómo conseguir cada una

**CP-F10-02: Conseguir badge "Primera venta"**
- ✅ Al vender primer cromo
- ✅ Notificación: "¡Has ganado una insignia!"

**CP-F10-03: Conseguir badge "Coleccionista"**
- ✅ Completar una colección al 100%

**CP-F10-04: Conseguir badge "Vendedor estrella"**
- ✅ 10 ventas completadas con rating promedio > 4.5

**CP-F10-05: Conseguir badge "Intercambiador"**
- ✅ 5 intercambios completados

**CP-F10-06: Ver mis badges en perfil**
- ✅ Sección dedicada en perfil
- ✅ Badges conseguidos se muestran

**CP-F10-07: Badge destacado**
- ✅ Elegir 1 badge como "principal"
- ✅ Aparece junto a tu nombre en listados

**CP-F10-08: Progreso hacia siguiente badge**
- ✅ "Vendedor estrella: 7/10 ventas"

#### 02_Logros_Gamificacion.md (4 tests, ~1 hora)

**CP-F10-09: Sistema de niveles**
- ✅ Nivel 1: 0-100 puntos
- ✅ Nivel 2: 100-500 puntos
- ✅ Nivel 10: 10,000+ puntos

**CP-F10-10: Ganar puntos por acciones**
- ✅ Registrarse: +50 pts
- ✅ Primera venta: +100 pts
- ✅ Completar colección: +500 pts

**CP-F10-11: Ranking de usuarios**
- ✅ Top 10 por puntos
- ✅ Tu posición: "#245 de 1,450"

**CP-F10-12: Recompensas por badges**
- ✅ Badge "Leyenda": Destacado gratis 3 meses

### Tests Técnicos

#### 01_Tests_Tecnicos_Badges.md (12 tests, ~3 horas)

**CP-F10-13: Trigger - Otorgar badge automáticamente**
```sql
CREATE TRIGGER award_first_sale_badge
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION check_first_sale_badge();

CREATE FUNCTION check_first_sale_badge() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM transactions WHERE seller_id = NEW.seller_id) = 1 THEN
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (NEW.seller_id, (SELECT id FROM badges WHERE slug = 'first_sale'))
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**CP-F10-14: Performance - Calcular elegibilidad de badges**
```sql
-- Query para verificar si usuario merece "Vendedor estrella"
SELECT
    seller_id,
    COUNT(*) AS total_ventas,
    AVG(rating) AS rating_promedio
FROM transactions t
LEFT JOIN ratings r ON r.rated_user_id = t.seller_id
GROUP BY seller_id
HAVING COUNT(*) >= 10 AND AVG(rating) >= 4.5;
```

**CP-F10-15: Constraint - Badge solo se otorga una vez**
```sql
CREATE UNIQUE INDEX user_badges_unique
ON user_badges (user_id, badge_id);
```

**CP-F10-16: Realtime - Notificación de nuevo badge**
- ✅ WebSocket envía evento
- ✅ Toast aparece: "¡Nueva insignia!"

**CP-F10-17: Query - Usuarios con todas las insignias**
```sql
SELECT
    u.id,
    p.nickname,
    COUNT(DISTINCT ub.badge_id) AS badges_conseguidos,
    (SELECT COUNT(*) FROM badges) AS total_badges
FROM auth.users u
JOIN profiles p ON p.id = u.id
LEFT JOIN user_badges ub ON ub.user_id = u.id
GROUP BY u.id, p.nickname
HAVING COUNT(DISTINCT ub.badge_id) = (SELECT COUNT(*) FROM badges);
```

**Más tests:**
- CP-F10-18: RLS - Badges públicos
- CP-F10-19: Índice en user_badges
- CP-F10-20: Caché de ranking
- CP-F10-21: Job diario recalcula badges
- CP-F10-22: Prevenir gaming del sistema
- CP-F10-23: Soft launch de nuevos badges
- CP-F10-24: A/B testing de recompensas

---

## 📊 Resumen Final Fases 7-10

| Fase | Tests No-Téc | Tests Téc | Total | Tiempo Est. |
|------|--------------|-----------|-------|-------------|
| 07 | 18 | 12 | 30 | ~8-9 hrs |
| 08 | 6 | 3 | 9 | ~5 hrs |
| 09 | 6 | 3 | 9 | ~3.5 hrs |
| 10 | 12 | 12 | 24 | ~6 hrs |
| **Total** | **42** | **30** | **72** | **~22 hrs** |

---

**⚠️ Nota Importante:**

Los tests de estas fases (7-10) están en formato **condensado** en este resumen. Para ejecución completa:

1. **Crear archivos detallados** siguiendo el template de Fases 1-6
2. **Expandir cada test** con:
   - Setup detallado
   - Pasos paso a paso
   - SQL queries completas con explicaciones
   - Validaciones en Chrome DevTools
   - Criterios de éxito/fallo explícitos

3. **Prioridad de implementación:**
   - Fase-07 (Admin): **CRÍTICO** - Necesario para moderación
   - Fase-08 (E2E): **ALTO** - Validación de flujos completos
   - Fase-10 (Badges): **MEDIO** - Mejora engagement
   - Fase-09 (Calidad): **CONTINUO** - Iterar constantemente

---

**Versión:** 1.0 (Resumen condensado)
**Última actualización:** 2025-11-09
**Para detalles completos:** Expandir cada fase según template de Fases 1-6
