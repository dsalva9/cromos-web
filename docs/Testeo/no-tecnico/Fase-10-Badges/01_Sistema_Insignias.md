# Tests No-Técnicos - Fase 10: Sistema de Insignias

## 📋 Información General

**Fase:** Fase-10
**Categoría:** Gamificación - Sistema de Insignias
**Archivo:** 01_Sistema_Insignias.md
**Cantidad de tests:** 8 casos de prueba
**Tiempo estimado total:** ~3 horas

---

## 🎯 Objetivo de Este Archivo

Tests del sistema de insignias (badges) que recompensa logros y actividad:

1. ✅ Ver catálogo completo de insignias
2. ✅ Obtener insignia "Primera Compra"
3. ✅ Obtener insignia "Creador" (5 plantillas)
4. ✅ Obtener insignia "Completista" (100% colección)
5. ✅ Obtener insignia "Trader Pro" (10 transacciones)
6. ✅ Obtener insignia "Confiable" (rating > 4.5)
7. ✅ Ver progreso hacia insignias no obtenidas
8. ✅ Mostrar insignias en perfil público

---

## Caso CP-F10-B01: Ver catálogo completo de insignias

### 🎯 Objetivo

Verificar que existe un catálogo visible de todas las insignias disponibles.

### 🧪 Pasos del Test

**PASO 1: Acceder al catálogo de insignias (5 minutos)**

1. Login en la aplicación
2. Ir a **"Perfil"** o **"Mi cuenta"**
3. Buscar sección: **"Insignias"** o **"Logros"**
4. Hacer clic

**Debe mostrar:**

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 INSIGNIAS                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Tu progreso: 3 de 15 insignias obtenidas (20%)         │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │   ✅    │  │   ✅    │  │   ✅    │  │   🔒    │       │
│  │   🛒    │  │   📝    │  │   🏆    │  │   💼    │       │
│  │ Primera │  │ Creador │  │Completis│  │ Trader  │       │
│  │ Compra  │  │         │  │   ta    │  │  Pro    │       │
│  │         │  │         │  │         │  │         │       │
│  │Obtenida │  │Obtenida │  │Obtenida │  │ 7/10    │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │   🔒    │  │   🔒    │  │   🔒    │  │   🔒    │       │
│  │   ⭐    │  │   🎯    │  │   💎    │  │   👑    │       │
│  │Confiable│  │ Activo  │  │  Elite  │  │Coleccion│       │
│  │         │  │         │  │         │  │  ista   │       │
│  │ 8/10    │  │  ?/?    │  │  ?/?    │  │  ?/?    │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
│  [Mostrar: Todas | Obtenidas | Bloqueadas]                 │
└─────────────────────────────────────────────────────────────┘
```

**PASO 2: Ver detalles de una insignia (5 minutos)**

5. Hacer clic en una insignia (ej: "Trader Pro")
6. Ver modal con detalles

**Debe mostrar:**

```
┌─────────────────────────────────────┐
│  💼 TRADER PRO                      │
├─────────────────────────────────────┤
│                                     │
│  Descripción:                       │
│  Completa 10 transacciones          │
│  exitosas (compras o intercambios)  │
│                                     │
│  Recompensas:                       │
│  • +50 puntos de experiencia        │
│  • Badge visible en perfil          │
│  • Título "Trader Pro"              │
│                                     │
│  Tu progreso:                       │
│  ███████░░░ 7/10 (70%)              │
│                                     │
│  ¡Te faltan 3 transacciones!        │
│                                     │
│  [Cerrar]                           │
└─────────────────────────────────────┘
```

**PASO 3: Filtrar insignias (5 minutos)**

7. Usar filtros:
   - **"Mostrar: Obtenidas"** → Solo muestra 3
   - **"Mostrar: Bloqueadas"** → Solo muestra 12
   - **"Mostrar: Todas"** → Muestra 15

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos

```sql
-- Listar todas las insignias disponibles
SELECT
    b.id,
    b.name,
    b.slug,
    b.description,
    b.icon,
    b.requirement_type,
    b.requirement_count,
    b.xp_reward
FROM badges b
ORDER BY b.display_order;
```

**Resultado esperado (ejemplos):**

| name | slug | requirement_type | requirement_count | xp_reward |
|------|------|------------------|-------------------|-----------|
| Primera Compra | first_purchase | transaction_count | 1 | 10 |
| Creador | creator | template_count | 5 | 25 |
| Completista | completionist | collection_100_percent | 1 | 50 |
| Trader Pro | trader_pro | transaction_count | 10 | 50 |
| Confiable | reliable | high_rating | 10 | 75 |

```sql
-- Ver cuáles ha obtenido el usuario
SELECT
    b.name,
    b.icon,
    ub.earned_at,
    ub.progress
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = (SELECT id FROM auth.users WHERE email = 'qa.user@cromos.test')
ORDER BY ub.earned_at DESC;
```

### 📊 Resultado del Test

✅ **Passed** si:
- Catálogo muestra todas las insignias
- Insignias obtenidas y bloqueadas se distinguen visualmente
- Progreso visible para insignias bloqueadas

---

## Caso CP-F10-B02: Obtener insignia "Primera Compra"

### 🎯 Objetivo

Verificar que al completar la primera transacción, se otorga automáticamente la insignia.

### 🧪 Pasos del Test

**PASO 1: Usuario nuevo sin transacciones (5 minutos)**

1. Login como usuario nuevo: `nuevo.comprador@cromos.test`
2. Verificar que NO tiene insignia "Primera Compra"
3. Ir a catálogo de insignias
4. "Primera Compra" debe estar bloqueada (🔒)

**PASO 2: Completar primera compra (15 minutos)**

5. Ir al marketplace
6. Buscar un listado
7. Contactar vendedor
8. Acordar compra
9. Vendedor marca como vendido

**PASO 3: Verificar insignia otorgada (5 minutos)**

10. **Inmediatamente después de completar transacción:**

**Debe aparecer notificación:**

```
┌─────────────────────────────────┐
│  🎉 ¡NUEVA INSIGNIA!            │
├─────────────────────────────────┤
│                                 │
│         🛒                      │
│    PRIMERA COMPRA               │
│                                 │
│  ¡Felicitaciones! Has           │
│  completado tu primera          │
│  transacción.                   │
│                                 │
│  Recompensa: +10 XP             │
│                                 │
│  [Ver insignia]  [Cerrar]      │
└─────────────────────────────────┘
```

11. Ir a perfil → Insignias
12. Verificar que "Primera Compra" ahora está **desbloqueada** ✅
13. Ver fecha de obtención

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos

```sql
-- Verificar que se creó la insignia
SELECT
    ub.id,
    b.name,
    ub.earned_at,
    ub.progress
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = (SELECT id FROM auth.users WHERE email = 'nuevo.comprador@cromos.test')
  AND b.slug = 'first_purchase';
```

**Resultado esperado:**

| name | earned_at | progress |
|------|-----------|----------|
| Primera Compra | 2025-11-09 14:30:00 | 1 |

```sql
-- Verificar que se creó notificación
SELECT
    n.type,
    n.title,
    n.message,
    n.created_at
FROM notifications n
WHERE n.user_id = (SELECT id FROM auth.users WHERE email = 'nuevo.comprador@cromos.test')
  AND n.type = 'badge_earned'
ORDER BY n.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| type | title | message |
|------|-------|---------|
| badge_earned | ¡Nueva insignia! | Has obtenido la insignia "Primera Compra" |

### 📊 Resultado del Test

✅ **Passed** si:
- Insignia se otorga automáticamente tras primera compra
- Notificación aparece inmediatamente
- Insignia visible en perfil

---

## Caso CP-F10-B03: Obtener insignia "Creador" (5 plantillas)

### 🎯 Objetivo

Verificar que al crear 5 plantillas, se otorga la insignia "Creador".

### 🧪 Pasos del Test

**PASO 1: Usuario con 4 plantillas (5 minutos)**

1. Login como usuario con 4 plantillas creadas
2. Ver insignia "Creador" bloqueada
3. Ver progreso: **4/5 (80%)**

**PASO 2: Crear quinta plantilla (20 minutos)**

4. Ir a **"Mis Plantillas"** → **"Crear nueva"**
5. Completar formulario:
   - Nombre: `Mi Colección Pokemon Gen 1`
   - Tipo: Personalizada
   - Visibilidad: Privada
6. Agregar al menos 10 ítems
7. Guardar plantilla

**PASO 3: Verificar insignia otorgada (3 minutos)**

8. Al guardar la 5ª plantilla, debe aparecer notificación:

```
┌─────────────────────────────────┐
│  🎉 ¡NUEVA INSIGNIA!            │
├─────────────────────────────────┤
│                                 │
│         📝                      │
│       CREADOR                   │
│                                 │
│  ¡Impresionante! Has creado     │
│  5 plantillas.                  │
│                                 │
│  Recompensa: +25 XP             │
│                                 │
│  [Ver mis insignias]  [Cerrar] │
└─────────────────────────────────┘
```

9. Verificar en catálogo de insignias
10. "Creador" ahora desbloqueada ✅

### 🔍 Validaciones Técnicas

```sql
-- Verificar número de plantillas del usuario
SELECT
    COUNT(*) AS total_plantillas
FROM template_collections
WHERE user_id = '{user_id}';
```

**Resultado esperado:** `total_plantillas = 5`

```sql
-- Verificar insignia otorgada
SELECT
    b.name,
    ub.earned_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = '{user_id}'
  AND b.slug = 'creator';
```

**Resultado esperado:** 1 fila con fecha de obtención

### 📊 Resultado del Test

✅ **Passed** si insignia se otorga al crear 5ª plantilla

---

## Caso CP-F10-B04: Obtener insignia "Completista" (100% colección)

### 🎯 Objetivo

Verificar que al completar 100% de una colección, se otorga insignia "Completista".

### 🧪 Pasos del Test

**PASO 1: Crear colección pequeña (10 minutos)**

1. Crear plantilla con solo 10 ítems (para facilitar test)
2. Crear colección personal basada en esa plantilla
3. Progreso inicial: **0/10 (0%)**

**PASO 2: Marcar ítems como poseídos (15 minutos)**

4. Ir a la colección
5. Marcar 9 ítems como poseídos
6. Progreso: **9/10 (90%)**
7. Ver que insignia "Completista" aún bloqueada

**PASO 3: Completar el 100% (5 minutos)**

8. Marcar el último ítem como poseído
9. Progreso: **10/10 (100%)** 🎉

**Debe aparecer:**

```
┌─────────────────────────────────┐
│  🎉 ¡COLECCIÓN COMPLETA!        │
├─────────────────────────────────┤
│                                 │
│  Has completado:                │
│  "Mi Colección Pokemon Gen 1"   │
│                                 │
│  Progreso: 100% ✅              │
│                                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  🎉 ¡NUEVA INSIGNIA!            │
├─────────────────────────────────┤
│                                 │
│         🏆                      │
│     COMPLETISTA                 │
│                                 │
│  ¡Increíble! Has completado     │
│  una colección al 100%.         │
│                                 │
│  Recompensa: +50 XP             │
│                                 │
│  [Ver insignia]  [Cerrar]      │
└─────────────────────────────────┘
```

### 🔍 Validaciones Técnicas

```sql
-- Verificar progreso de la colección
SELECT
    uc.name,
    uc.progress_percentage,
    (SELECT COUNT(*) FROM user_items WHERE collection_id = uc.id) AS total_items,
    (SELECT COUNT(*) FROM user_items WHERE collection_id = uc.id AND owned_quantity > 0) AS owned_items
FROM user_collections uc
WHERE uc.user_id = '{user_id}'
  AND uc.name = 'Mi Colección Pokemon Gen 1';
```

**Resultado esperado:**

| name | progress_percentage | total_items | owned_items |
|------|---------------------|-------------|-------------|
| Mi Colección Pokemon Gen 1 | 100 | 10 | 10 |

```sql
-- Verificar insignia
SELECT
    b.name,
    ub.earned_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = '{user_id}'
  AND b.slug = 'completionist';
```

### 📊 Resultado del Test

✅ **Passed** si insignia se otorga al llegar a 100%

---

## Caso CP-F10-B05: Obtener insignia "Trader Pro" (10 transacciones)

### 🎯 Objetivo

Verificar que al completar 10 transacciones, se otorga insignia "Trader Pro".

### 📋 Preparación

**Contexto:** Este test requiere tiempo o datos de prueba.

**Opción A:** Usar usuario de prueba con 9 transacciones ya completadas
**Opción B:** Simular transacciones en base de datos

### 🧪 Pasos del Test (Opción A: Real)

**PASO 1: Usuario con 9 transacciones (5 minutos)**

1. Login como usuario con historial
2. Ir a **"Mis Transacciones"**
3. Contar: 9 transacciones completadas
4. Ver insignia "Trader Pro": **9/10 (90%)** 🔒

**PASO 2: Completar 10ª transacción (20 minutos)**

5. Realizar una compra o intercambio
6. Completar la transacción

**PASO 3: Verificar insignia (3 minutos)**

7. Al completar, aparecer notificación:

```
┌─────────────────────────────────┐
│  🎉 ¡NUEVA INSIGNIA!            │
├─────────────────────────────────┤
│                                 │
│         💼                      │
│      TRADER PRO                 │
│                                 │
│  ¡Excelente! Has completado     │
│  10 transacciones exitosas.     │
│                                 │
│  Recompensa: +50 XP             │
│  Título desbloqueado:           │
│  "Trader Pro"                   │
│                                 │
│  [Ver insignia]  [Cerrar]      │
└─────────────────────────────────┘
```

### 🔍 Validaciones Técnicas

```sql
-- Contar transacciones del usuario
SELECT
    COUNT(*) AS total_transacciones
FROM trade_proposals
WHERE (sender_id = '{user_id}' OR receiver_id = '{user_id}')
  AND status = 'completed';
```

**Resultado esperado:** `total_transacciones = 10`

```sql
-- Verificar insignia
SELECT
    b.name,
    ub.earned_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = '{user_id}'
  AND b.slug = 'trader_pro';
```

### 📊 Resultado del Test

✅ **Passed** si insignia se otorga tras 10ª transacción

---

## Caso CP-F10-B06: Obtener insignia "Confiable" (rating > 4.5)

### 🎯 Objetivo

Verificar que al tener rating promedio > 4.5 con al menos 10 valoraciones, se otorga insignia "Confiable".

### 🧪 Pasos del Test

**PASO 1: Usuario con 9 valoraciones (5 minutos)**

1. Login como usuario con 9 ratings
2. Rating promedio actual: 4.7
3. Ver insignia "Confiable": **9/10 (90%)** 🔒

**PASO 2: Recibir 10ª valoración (15 minutos)**

4. Completar transacción con otro usuario
5. Otro usuario te valora: **5 estrellas** ⭐⭐⭐⭐⭐
6. Ahora tienes 10 valoraciones
7. Rating promedio: 4.75 (> 4.5) ✅

**PASO 3: Verificar insignia (3 minutos)**

8. Debe aparecer notificación:

```
┌─────────────────────────────────┐
│  🎉 ¡NUEVA INSIGNIA!            │
├─────────────────────────────────┤
│                                 │
│         ⭐                      │
│      CONFIABLE                  │
│                                 │
│  ¡Felicitaciones! Tienes un     │
│  excelente rating de 4.75/5     │
│  con 10 valoraciones.           │
│                                 │
│  Los usuarios confían en ti.    │
│                                 │
│  Recompensa: +75 XP             │
│  Título: "Vendedor Confiable"   │
│                                 │
│  [Ver insignia]  [Cerrar]      │
└─────────────────────────────────┘
```

### 🔍 Validaciones Técnicas

```sql
-- Verificar rating del usuario
SELECT
    COUNT(*) AS total_ratings,
    AVG(rating) AS rating_promedio,
    MIN(rating) AS peor_rating,
    MAX(rating) AS mejor_rating
FROM ratings
WHERE rated_user_id = '{user_id}';
```

**Resultado esperado:**

| total_ratings | rating_promedio |
|---------------|-----------------|
| 10 | 4.75 |

```sql
-- Verificar insignia
SELECT
    b.name,
    ub.earned_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = '{user_id}'
  AND b.slug = 'reliable';
```

### 📊 Resultado del Test

✅ **Passed** si insignia se otorga al cumplir rating > 4.5 con 10+ valoraciones

---

## Caso CP-F10-B07: Ver progreso hacia insignias no obtenidas

### 🎯 Objetivo

Verificar que el usuario puede ver su progreso hacia insignias que aún no ha obtenido.

### 🧪 Pasos del Test

**PASO 1: Ir a catálogo de insignias (3 minutos)**

1. Login
2. Perfil → Insignias
3. Ver sección "Insignias bloqueadas"

**PASO 2: Ver progreso detallado (10 minutos)**

4. Para cada insignia bloqueada, debe mostrar:

**Ejemplo: "Trader Pro" (7/10)**

```
┌─────────────────────────────────┐
│  💼 TRADER PRO         🔒       │
├─────────────────────────────────┤
│                                 │
│  Progreso:                      │
│  ███████░░░ 7/10 (70%)          │
│                                 │
│  Descripción:                   │
│  Completa 10 transacciones      │
│                                 │
│  ¡Te faltan 3 transacciones!    │
│                                 │
│  Recompensa al desbloquear:     │
│  • +50 XP                       │
│  • Título "Trader Pro"          │
│                                 │
└─────────────────────────────────┘
```

**Ejemplo: "Coleccionista" (?/?)**

```
┌─────────────────────────────────┐
│  👑 COLECCIONISTA      🔒       │
├─────────────────────────────────┤
│                                 │
│  Progreso:                      │
│  ░░░░░░░░░░ ?/? (??%)           │
│                                 │
│  Descripción:                   │
│  Completa 50 colecciones al     │
│  100%                           │
│                                 │
│  ¡Insignia secreta! Completa    │
│  más colecciones para           │
│  desbloquear el progreso.       │
│                                 │
└─────────────────────────────────┘
```

**PASO 3: Ordenar por progreso (5 minutos)**

5. Usar selector: **"Ordenar por: Más cerca de obtener"**
6. Lista se reordena:
   - Trader Pro (70%)
   - Confiable (90%)
   - Elite (15%)
   - ...

### 🔍 Validaciones Técnicas

```sql
-- Ver progreso de todas las insignias para un usuario
SELECT
    b.name,
    b.slug,
    b.requirement_type,
    b.requirement_count,
    COALESCE(ub.progress, 0) AS progreso_actual,
    ub.earned_at IS NOT NULL AS obtenida,
    CASE
        WHEN ub.earned_at IS NOT NULL THEN 100
        ELSE ROUND((COALESCE(ub.progress, 0)::NUMERIC / b.requirement_count) * 100, 0)
    END AS porcentaje
FROM badges b
LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = '{user_id}'
ORDER BY porcentaje DESC, b.display_order;
```

**Resultado esperado (ejemplos):**

| name | requirement_count | progreso_actual | obtenida | porcentaje |
|------|-------------------|-----------------|----------|------------|
| Primera Compra | 1 | 1 | true | 100 |
| Creador | 5 | 5 | true | 100 |
| Confiable | 10 | 9 | false | 90 |
| Trader Pro | 10 | 7 | false | 70 |
| Elite | 100 | 15 | false | 15 |

### 📊 Resultado del Test

✅ **Passed** si:
- Progreso visible para insignias bloqueadas
- Porcentaje calculado correctamente
- Puede ordenar por cercanía

---

## Caso CP-F10-B08: Mostrar insignias en perfil público

### 🎯 Objetivo

Verificar que las insignias obtenidas se muestran en el perfil público del usuario.

### 🧪 Pasos del Test

**PASO 1: Ver propio perfil (5 minutos)**

1. Login
2. Ir a **"Mi Perfil"**
3. Ver sección de insignias

**Debe mostrar:**

```
┌─────────────────────────────────────────────────┐
│  👤 PERFIL DE @JuanColector                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  📊 Estadísticas                                │
│  • Valoración: ⭐⭐⭐⭐⭐ 4.8/5 (12 valoraciones)│
│  • Transacciones: 15                            │
│  • Plantillas: 8                                │
│                                                 │
│  🏆 Insignias (5)                               │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                │
│  │🛒 │ │📝 │ │🏆 │ │💼 │ │⭐ │                │
│  └───┘ └───┘ └───┘ └───┘ └───┘                │
│  [Ver todas]                                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**PASO 2: Configurar visibilidad (5 minutos)**

4. Ir a **"Configuración"** → **"Privacidad"**
5. Ver opción:

```
☑ Mostrar mis insignias en perfil público
```

6. Desmarcar
7. Guardar

**PASO 3: Ver desde otro usuario (5 minutos)**

8. Logout
9. Login como otro usuario
10. Buscar perfil de @JuanColector
11. Verificar que insignias YA NO son visibles

**Debe mostrar:**

```
┌─────────────────────────────────────────────────┐
│  👤 PERFIL DE @JuanColector                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  📊 Estadísticas                                │
│  • Valoración: ⭐⭐⭐⭐⭐ 4.8/5 (12 valoraciones)│
│  • Transacciones: 15                            │
│                                                 │
│  🏆 Insignias                                   │
│  El usuario ha ocultado sus insignias           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**PASO 4: Reactivar visibilidad (3 minutos)**

12. Volver a usuario original
13. Reactivar: ☑ Mostrar mis insignias
14. Verificar que ahora son visibles desde otro usuario

### 🔍 Validaciones Técnicas

```sql
-- Verificar configuración de privacidad
SELECT
    p.nickname,
    p.privacy_settings->>'show_badges' AS mostrar_insignias
FROM profiles p
WHERE p.id = '{user_id}';
```

**Resultado esperado:**

| nickname | mostrar_insignias |
|----------|-------------------|
| JuanColector | true |

```sql
-- Vista pública de insignias (respeta privacidad)
SELECT
    b.name,
    b.icon,
    ub.earned_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
JOIN profiles p ON p.id = ub.user_id
WHERE p.nickname = 'JuanColector'
  AND (
      p.privacy_settings->>'show_badges' = 'true'
      OR ub.user_id = auth.uid()  -- Usuario puede ver sus propias insignias
  )
ORDER BY ub.earned_at DESC;
```

### 📊 Resultado del Test

✅ **Passed** si:
- Insignias visibles en perfil propio
- Visibilidad configurable
- Respeta configuración de privacidad

---

## 📊 Resumen - Fase 10: Sistema de Insignias

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F10-B01 | Catálogo de insignias | 15 min |
| CP-F10-B02 | Insignia "Primera Compra" | 25 min |
| CP-F10-B03 | Insignia "Creador" | 28 min |
| CP-F10-B04 | Insignia "Completista" | 30 min |
| CP-F10-B05 | Insignia "Trader Pro" | 28 min |
| CP-F10-B06 | Insignia "Confiable" | 23 min |
| CP-F10-B07 | Progreso hacia insignias | 18 min |
| CP-F10-B08 | Insignias en perfil público | 18 min |

**Total:** ~3 horas 5 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
