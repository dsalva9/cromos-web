# Tests No-Técnicos - Fase 10: Logros y Gamificación

## 📋 Información General

**Fase:** Fase-10
**Categoría:** Gamificación - Niveles, Puntos, Títulos
**Archivo:** 02_Logros_Gamificacion.md
**Cantidad de tests:** 4 casos de prueba
**Tiempo estimado total:** ~1.5 horas

---

## 🎯 Objetivo de Este Archivo

Tests del sistema de gamificación complementario a insignias:

1. ✅ Sistema de niveles y puntos de experiencia (XP)
2. ✅ Desbloquear títulos personalizados
3. ✅ Leaderboard (tabla de clasificación)
4. ✅ Recompensas por rachas de actividad

---

## Caso CP-F10-G01: Sistema de niveles y puntos de experiencia

### 🎯 Objetivo

Verificar que las acciones otorgan puntos de experiencia (XP) y que el usuario sube de nivel.

### 🧪 Pasos del Test

**PASO 1: Ver nivel y XP actual (5 minutos)**

1. Login
2. Ir a **"Perfil"** o ver barra superior

**Debe mostrar:**

```
┌─────────────────────────────────────────────┐
│  👤 @JuanColector                           │
│                                             │
│  Nivel 7  ⭐⭐⭐⭐⭐⭐⭐                      │
│  ████████░░░░░░ 325 / 500 XP (65%)          │
│                                             │
│  Siguiente nivel: 175 XP                    │
└─────────────────────────────────────────────┘
```

**PASO 2: Acciones que otorgan XP (20 minutos)**

3. Realizar diferentes acciones y verificar XP ganado:

| Acción | XP ganado |
|--------|-----------|
| Completar perfil (primera vez) | +20 XP |
| Crear plantilla | +10 XP |
| Publicar listado | +5 XP |
| Completar transacción | +15 XP |
| Recibir rating 5★ | +5 XP |
| Obtener insignia | +10-75 XP (según insignia) |
| Login diario | +2 XP |

**Ejemplo: Crear plantilla**

4. Crear una nueva plantilla
5. Al guardar, ver notificación:

```
┌─────────────────────────────────┐
│  ✅ Plantilla creada             │
│                                 │
│  +10 XP                         │
│  ████████░░░░░░ 335 / 500 XP    │
│                                 │
└─────────────────────────────────┘
```

**PASO 3: Subir de nivel (20 minutos)**

6. Acumular suficiente XP para alcanzar 500 XP
7. Al llegar a 500 XP, debe aparecer:

```
┌─────────────────────────────────────────┐
│  🎉 ¡LEVEL UP!                          │
├─────────────────────────────────────────┤
│                                         │
│         NIVEL 8                         │
│     ⭐⭐⭐⭐⭐⭐⭐⭐                        │
│                                         │
│  ¡Felicitaciones! Has alcanzado el      │
│  nivel 8.                               │
│                                         │
│  Recompensas:                           │
│  • Título desbloqueado: "Experto"       │
│  • Nuevo icono de perfil                │
│                                         │
│  XP para siguiente nivel: 0 / 600       │
│                                         │
│  [Continuar]                            │
└─────────────────────────────────────────┘
```

8. Verificar que nivel se actualiza en perfil
9. Nueva barra: **0 / 600 XP**

### 🔍 Validaciones Técnicas

```sql
-- Ver XP y nivel del usuario
SELECT
    p.nickname,
    p.level,
    p.xp_current,
    p.xp_total,
    CASE
        WHEN p.level < 5 THEN p.level * 100
        WHEN p.level < 10 THEN p.level * 125
        ELSE p.level * 150
    END AS xp_para_siguiente_nivel
FROM profiles p
WHERE p.id = '{user_id}';
```

**Resultado esperado (después de subir a nivel 8):**

| nickname | level | xp_current | xp_total | xp_para_siguiente_nivel |
|----------|-------|------------|----------|-------------------------|
| JuanColector | 8 | 25 | 1525 | 600 |

```sql
-- Ver historial de XP ganado
SELECT
    xh.action_type,
    xh.xp_earned,
    xh.description,
    xh.created_at
FROM xp_history xh
WHERE xh.user_id = '{user_id}'
ORDER BY xh.created_at DESC
LIMIT 10;
```

**Resultado esperado (ejemplos):**

| action_type | xp_earned | description |
|-------------|-----------|-------------|
| level_up | 0 | Alcanzó nivel 8 |
| badge_earned | 50 | Obtuvo insignia "Trader Pro" |
| create_template | 10 | Creó plantilla "Pokemon" |
| complete_transaction | 15 | Transacción #456 |

### 📊 Resultado del Test

✅ **Passed** si:
- Acciones otorgan XP correctamente
- Nivel sube al alcanzar umbral
- XP se resetea para próximo nivel

---

## Caso CP-F10-G02: Desbloquear títulos personalizados

### 🎯 Objetivo

Verificar que al alcanzar ciertos hitos, se desbloquean títulos que el usuario puede mostrar en su perfil.

### 🧪 Pasos del Test

**PASO 1: Ver títulos disponibles (5 minutos)**

1. Ir a **"Perfil"** → **"Títulos"**
2. Ver lista de títulos

**Debe mostrar:**

```
┌─────────────────────────────────────────────────────┐
│  🏅 TÍTULOS                                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Título actual: "Coleccionista" ✅                  │
│                                                     │
│  Títulos desbloqueados (5):                         │
│  ⚪ Novato (por defecto)                            │
│  ⚪ Coleccionista (nivel 5)                         │
│  ⚫ Experto (nivel 8)          [Seleccionado]       │
│  ⚪ Trader Pro (insignia)                           │
│  ⚪ Vendedor Confiable (insignia)                   │
│                                                     │
│  Títulos bloqueados (8):                            │
│  🔒 Maestro (nivel 15)                              │
│  🔒 Leyenda (nivel 25)                              │
│  🔒 Elite (100 transacciones)                       │
│  🔒 Completista (5 colecciones 100%)                │
│  ...                                                │
│                                                     │
│  [Guardar cambios]                                  │
└─────────────────────────────────────────────────────┘
```

**PASO 2: Cambiar título (5 minutos)**

3. Seleccionar título diferente: **"Trader Pro"** ⚫
4. Hacer clic en **"Guardar cambios"**
5. Ver confirmación: `Título actualizado`

**PASO 3: Verificar título en perfil (5 minutos)**

6. Ir a perfil público
7. Ver título mostrado:

```
┌─────────────────────────────────┐
│  👤 @JuanColector               │
│  🏅 Trader Pro                  │  <- Título
│                                 │
│  Nivel 8  ⭐⭐⭐⭐⭐⭐⭐⭐        │
│                                 │
└─────────────────────────────────┘
```

**PASO 4: Desbloquear nuevo título (15 minutos)**

8. Alcanzar nivel 10
9. Notificación:

```
┌─────────────────────────────────┐
│  🎉 ¡NIVEL 10 ALCANZADO!        │
├─────────────────────────────────┤
│                                 │
│  Título desbloqueado:           │
│  🏅 "Maestro Coleccionista"     │
│                                 │
│  [Ver títulos]  [Cerrar]       │
└─────────────────────────────────┘
```

10. Ir a **"Títulos"**
11. Verificar que "Maestro Coleccionista" ahora está desbloqueado

### 🔍 Validaciones Técnicas

```sql
-- Ver títulos desbloqueados del usuario
SELECT
    t.name,
    t.unlock_requirement,
    ut.unlocked_at,
    p.active_title_id = t.id AS es_activo
FROM user_titles ut
JOIN titles t ON t.id = ut.title_id
JOIN profiles p ON p.id = ut.user_id
WHERE ut.user_id = '{user_id}'
ORDER BY ut.unlocked_at DESC;
```

**Resultado esperado:**

| name | unlock_requirement | unlocked_at | es_activo |
|------|-------------------|-------------|-----------|
| Experto | level_8 | 2025-11-09 | false |
| Trader Pro | badge_trader_pro | 2025-11-08 | true |
| Coleccionista | level_5 | 2025-11-01 | false |

```sql
-- Ver título activo en perfil
SELECT
    p.nickname,
    t.name AS titulo_activo,
    t.icon
FROM profiles p
LEFT JOIN titles t ON t.id = p.active_title_id
WHERE p.id = '{user_id}';
```

**Resultado esperado:**

| nickname | titulo_activo |
|----------|---------------|
| JuanColector | Trader Pro |

### 📊 Resultado del Test

✅ **Passed** si:
- Títulos se desbloquean al cumplir requisitos
- Usuario puede seleccionar título activo
- Título se muestra en perfil público

---

## Caso CP-F10-G03: Leaderboard (tabla de clasificación)

### 🎯 Objetivo

Verificar que existe una tabla de clasificación que muestra los mejores usuarios.

### 🧪 Pasos del Test

**PASO 1: Acceder al leaderboard (3 minutos)**

1. Ir a **"Comunidad"** o **"Leaderboard"**
2. Ver tabla de clasificación

**Debe mostrar:**

```
┌───────────────────────────────────────────────────────────────┐
│  🏆 LEADERBOARD                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [Esta semana] [Este mes] [Todo el tiempo]                   │
│                                                               │
│  Puesto │ Usuario          │ Nivel │ XP Total │ Insignias   │
│  ───────┼──────────────────┼───────┼──────────┼─────────────┤
│  🥇 1   │ @SuperCollector  │ 25    │ 15,234   │ 15/15       │
│  🥈 2   │ @TradeMaster     │ 22    │ 12,987   │ 14/15       │
│  🥉 3   │ @PokemonKing     │ 20    │ 11,543   │ 13/15       │
│  4      │ @SportsFan       │ 18    │ 9,876    │ 12/15       │
│  5      │ @PaniniPro       │ 17    │ 9,234    │ 11/15       │
│  ...    │                  │       │          │             │
│  47     │ @JuanColector    │ 8     │ 1,525    │ 5/15  ⬅ Tú │
│  ...    │                  │       │          │             │
└───────────────────────────────────────────────────────────────┘
```

**PASO 2: Filtrar por período (5 minutos)**

3. Hacer clic en **"Esta semana"**
4. Ver tabla actualizada con XP ganado esta semana

**PASO 3: Ver diferentes categorías (10 minutos)**

5. Pestañas de categorías:
   - **"Por XP"** (predeterminado)
   - **"Por transacciones"**
   - **"Por plantillas creadas"**
   - **"Por colecciones completadas"**

**Ejemplo: "Por transacciones"**

```
│  Puesto │ Usuario          │ Transacciones │
│  ───────┼──────────────────┼───────────────┤
│  🥇 1   │ @TradeMaster     │ 156           │
│  🥈 2   │ @DealMaker       │ 143           │
│  🥉 3   │ @SwapKing        │ 128           │
│  ...    │                  │               │
│  32     │ @JuanColector    │ 15      ⬅ Tú │
```

**PASO 4: Ver perfil desde leaderboard (3 minutos)**

6. Hacer clic en un usuario del leaderboard
7. Ir a su perfil público
8. Ver sus insignias, nivel, estadísticas

### 🔍 Validaciones Técnicas

```sql
-- Leaderboard por XP total
SELECT
    ROW_NUMBER() OVER (ORDER BY p.xp_total DESC) AS puesto,
    p.nickname,
    p.level,
    p.xp_total,
    (SELECT COUNT(*) FROM user_badges WHERE user_id = p.id) AS num_insignias
FROM profiles p
WHERE p.status = 'active'
ORDER BY p.xp_total DESC
LIMIT 50;
```

**Resultado esperado:**

| puesto | nickname | level | xp_total | num_insignias |
|--------|----------|-------|----------|---------------|
| 1 | SuperCollector | 25 | 15234 | 15 |
| 2 | TradeMaster | 22 | 12987 | 14 |
| ... | ... | ... | ... | ... |

```sql
-- Leaderboard por transacciones este mes
SELECT
    ROW_NUMBER() OVER (ORDER BY COUNT(tp.id) DESC) AS puesto,
    p.nickname,
    COUNT(tp.id) AS transacciones_mes
FROM profiles p
LEFT JOIN trade_proposals tp ON (
    (tp.sender_id = p.id OR tp.receiver_id = p.id)
    AND tp.status = 'completed'
    AND tp.completed_at > DATE_TRUNC('month', NOW())
)
WHERE p.status = 'active'
GROUP BY p.id
ORDER BY transacciones_mes DESC
LIMIT 50;
```

### 📊 Resultado del Test

✅ **Passed** si:
- Leaderboard muestra top usuarios
- Puede filtrar por período
- Diferentes categorías disponibles
- Usuario puede ver su posición

---

## Caso CP-F10-G04: Recompensas por rachas de actividad

### 🎯 Objetivo

Verificar que el sistema recompensa la actividad consistente (logins diarios).

### 🧪 Pasos del Test

**PASO 1: Ver racha actual (5 minutos)**

1. Login
2. Ver indicador de racha

**Puede aparecer en dashboard:**

```
┌─────────────────────────────────┐
│  🔥 RACHA DE ACTIVIDAD          │
├─────────────────────────────────┤
│                                 │
│       🔥 7 días                 │
│                                 │
│  L  M  X  J  V  S  D           │
│  ✅ ✅ ✅ ✅ ✅ ✅ ✅           │
│                                 │
│  ¡Sigue así! Próxima            │
│  recompensa en 3 días (10 días)│
│                                 │
└─────────────────────────────────┘
```

**PASO 2: Login diario (5 días de seguimiento)**

**Día 1:**
3. Login
4. Ver notificación: `+2 XP - Login diario (Racha: 1 día)`

**Día 2:**
5. Login
6. Racha continúa: `Racha: 2 días 🔥`

**Días 3-6:**
7. Continuar login diario

**Día 7 (hito):**
8. Login del 7º día consecutivo
9. Notificación especial:

```
┌─────────────────────────────────┐
│  🎉 ¡RACHA DE 7 DÍAS!           │
├─────────────────────────────────┤
│                                 │
│         🔥🔥🔥                  │
│                                 │
│  ¡Increíble! Has iniciado       │
│  sesión 7 días consecutivos.    │
│                                 │
│  Recompensa:                    │
│  • +25 XP bonus                 │
│  • Título: "Activo"             │
│                                 │
│  [Continuar]                    │
└─────────────────────────────────┘
```

**PASO 3: Romper racha (simulación)**

10. No hacer login durante 2 días
11. Login en día 3
12. Racha se resetea: `Racha: 1 día`

**Recompensas por racha:**

| Racha | Recompensa |
|-------|------------|
| 3 días | +10 XP bonus |
| 7 días | +25 XP bonus + Título "Activo" |
| 14 días | +50 XP bonus |
| 30 días | +100 XP bonus + Insignia "Dedicado" |
| 100 días | +500 XP bonus + Insignia "Leyenda" |

### 🔍 Validaciones Técnicas

```sql
-- Ver racha actual del usuario
SELECT
    p.nickname,
    p.login_streak_days,
    p.last_login_date,
    p.longest_login_streak
FROM profiles p
WHERE p.id = '{user_id}';
```

**Resultado esperado:**

| nickname | login_streak_days | last_login_date | longest_login_streak |
|----------|-------------------|-----------------|----------------------|
| JuanColector | 7 | 2025-11-09 | 14 |

```sql
-- Ver historial de rachas
SELECT
    ls.streak_days,
    ls.bonus_xp_earned,
    ls.date
FROM login_streaks ls
WHERE ls.user_id = '{user_id}'
  AND ls.streak_days IN (3, 7, 14, 30, 100)  -- Hitos
ORDER BY ls.date DESC;
```

**Resultado esperado:**

| streak_days | bonus_xp_earned | date |
|-------------|-----------------|------|
| 7 | 25 | 2025-11-09 |
| 3 | 10 | 2025-11-05 |

### 📊 Resultado del Test

✅ **Passed** si:
- Racha se incrementa con login diario
- Recompensas se otorgan en hitos
- Racha se resetea al romperla

---

## 📊 Resumen - Fase 10: Logros y Gamificación

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F10-G01 | Sistema de niveles y XP | 45 min |
| CP-F10-G02 | Títulos personalizados | 30 min |
| CP-F10-G03 | Leaderboard | 21 min |
| CP-F10-G04 | Rachas de actividad | 15 min |

**Total:** ~1 hora 51 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
