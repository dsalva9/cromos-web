# Tests No-Técnicos - Fase 07: Gestión de Plantillas Admin

## 📋 Información General

**Fase:** Fase-07
**Categoría:** Administración - Moderación de Plantillas
**Archivo:** 02_Gestion_Plantillas.md
**Cantidad de tests:** 6 casos de prueba
**Tiempo estimado total:** ~2 horas

---

## 🎯 Objetivo de Este Archivo

Tests para la moderación y gestión de plantillas por administradores:

1. ✅ Ver plantillas pendientes de moderación
2. ✅ Aprobar plantilla pública
3. ✅ Rechazar plantilla con motivo
4. ✅ Editar plantilla como admin
5. ✅ Eliminar plantilla inapropiada
6. ✅ Ver estadísticas de plantillas

---

## Caso CP-F07-05A: Ver plantillas pendientes de moderación

### 🎯 Objetivo

Verificar que el admin puede ver todas las plantillas públicas que requieren revisión antes de publicarse.

### 📋 Preparación

**Contexto:**
- Cuando un usuario crea una plantilla pública, puede requerir moderación antes de aparecer en el catálogo público
- Los admins deben revisar que no contenga contenido inapropiado

### 🧪 Pasos del Test

1. Como admin, ir al panel de administración
2. Menú → **"Plantillas"** → **"Pendientes de moderación"**
3. Ver lista de plantillas en espera

**Debe mostrar tabla:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 PLANTILLAS PENDIENTES DE MODERACIÓN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ID  │ Nombre              │ Creador    │ Items │ Fecha      │  │
│  ────┼─────────────────────┼────────────┼───────┼────────────┤  │
│  123 │ Panini Mundial 2026 │ @UserA     │ 640   │ Hace 2h    │  │
│  122 │ NBA Hoops 2024      │ @UserB     │ 330   │ Hace 5h    │  │
│  121 │ Pokemon Base Set    │ @UserC     │ 102   │ Hace 1d    │  │
│                                                                 │
│  [Ver] [Aprobar] [Rechazar]                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Filtros disponibles:**

- Por fecha de envío
- Por creador
- Por número de ítems

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Listar plantillas pendientes de moderación
SELECT
    tc.id,
    tc.name AS nombre,
    tc.visibility,               -- Debe ser 'public'
    tc.moderation_status,        -- 'pending'
    tc.created_at,
    p.nickname AS creador,
    (SELECT COUNT(*) FROM template_items WHERE collection_id = tc.id) AS num_items
FROM template_collections tc
JOIN profiles p ON p.id = tc.user_id
WHERE tc.visibility = 'public'
  AND tc.moderation_status = 'pending'
ORDER BY tc.created_at ASC;
```

**¿Qué significa cada campo?**

- `visibility = 'public'`: Plantilla destinada a ser pública
- `moderation_status = 'pending'`: Esperando revisión de admin
- `COUNT(*)`: Cuenta cuántos ítems tiene la plantilla
- `ORDER BY created_at ASC`: Muestra las más antiguas primero (FIFO)

**Resultado esperado:** Al menos 1 fila con plantillas pendientes

### 📊 Resultado del Test

✅ **Passed** si lista de plantillas pendientes se muestra correctamente

---

## Caso CP-F07-05B: Aprobar plantilla pública

### 🎯 Objetivo

Verificar que un admin puede revisar y aprobar una plantilla para que aparezca en el catálogo público.

### 🧪 Pasos del Test

1. En lista de plantillas pendientes, hacer clic en **"Ver"** en una plantilla
2. Revisar detalles completos:

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 REVISIÓN DE PLANTILLA #123                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Nombre: Panini Mundial 2026                                   │
│  Creador: @UserA (usera@cromos.test)                          │
│  Tipo: Panini                                                  │
│  Año: 2026                                                     │
│  País: Internacional                                           │
│                                                                 │
│  Descripción:                                                   │
│  "Colección oficial del Mundial de Fútbol 2026"               │
│                                                                 │
│  📊 ESTADÍSTICAS                                                │
│  ├─ Total ítems: 640                                           │
│  ├─ Con imagen: 580                                            │
│  ├─ Sin imagen: 60                                             │
│  └─ Categorías: 32 equipos                                     │
│                                                                 │
│  🔍 VISTA PREVIA DE ÍTEMS                                       │
│  [Tabla mostrando primeros 20 ítems]                           │
│                                                                 │
│  #   │ Nombre           │ Categoría │ Rareza │ Imagen          │
│  ────┼──────────────────┼───────────┼────────┼─────────────────┤
│  001 │ Escudo Argentina │ ARG       │ común  │ ✅              │
│  002 │ Lionel Messi     │ ARG       │ ⭐ oro │ ✅              │
│  003 │ Di María         │ ARG       │ común  │ ✅              │
│  ... │                  │           │        │                 │
│                                                                 │
│  ✅ VERIFICACIONES                                              │
│  ✓ No contiene palabras inapropiadas                          │
│  ✓ Todas las imágenes son apropiadas                          │
│  ✓ Datos completos y coherentes                               │
│                                                                 │
│  Notas de moderación (opcional):                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Plantilla verificada. Datos correctos del Mundial 2026.│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Rechazar]  [Aprobar y publicar]                              │
└─────────────────────────────────────────────────────────────────┘
```

3. Revisar todos los ítems (o muestra representativa)
4. Agregar notas: `Plantilla verificada. Datos correctos.`
5. Hacer clic en **"Aprobar y publicar"**

**Resultado esperado:**

- ✅ Mensaje: "Plantilla aprobada y publicada"
- ✅ Plantilla aparece en catálogo público
- ✅ Creador recibe notificación: "Tu plantilla fue aprobada"

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que la plantilla fue aprobada
SELECT
    tc.id,
    tc.name,
    tc.moderation_status,        -- Debe ser 'approved'
    tc.approved_by,              -- ID del admin que aprobó
    tc.approved_at,              -- Fecha de aprobación
    tc.moderation_notes          -- Notas del moderador
FROM template_collections tc
WHERE tc.id = 123;
```

**Resultado esperado:**

| moderation_status | approved_by | approved_at | moderation_notes |
|-------------------|-------------|-------------|------------------|
| approved | {admin_id} | 2025-11-09 14:30:00 | Plantilla verificada... |

```sql
-- Verificar que ahora aparece en búsquedas públicas
SELECT
    tc.id,
    tc.name,
    tc.visibility,
    tc.moderation_status
FROM template_collections tc
WHERE tc.visibility = 'public'
  AND tc.moderation_status = 'approved'
  AND tc.id = 123;
```

**Resultado esperado:** 1 fila (plantilla es visible públicamente)

```sql
-- Verificar que se creó notificación para el creador
SELECT
    n.type,
    n.title,
    n.message,
    n.read
FROM notifications n
WHERE n.user_id = (SELECT user_id FROM template_collections WHERE id = 123)
  AND n.type = 'template_approved'
ORDER BY n.created_at DESC
LIMIT 1;
```

### 📊 Resultado del Test

✅ **Passed** si plantilla queda aprobada y visible públicamente

---

## Caso CP-F07-05C: Rechazar plantilla con motivo

### 🎯 Objetivo

Verificar que un admin puede rechazar una plantilla inapropiada con un motivo claro.

### 🧪 Pasos del Test

1. En revisión de una plantilla problemática
2. Identificar problema (ej: nombres ofensivos, datos incorrectos, imágenes inapropiadas)
3. Hacer clic en **"Rechazar"**
4. Modal de rechazo:

```
┌─────────────────────────────────────────┐
│  ❌ RECHAZAR PLANTILLA                  │
├─────────────────────────────────────────┤
│                                         │
│  Plantilla: Panini Mundial 2026        │
│  Creador: @UserA                       │
│                                         │
│  Motivo del rechazo:                    │
│  [▼ Seleccionar motivo]                 │
│    ⚪ Contenido inapropiado             │
│    ⚪ Datos incorrectos                 │
│    ⚪ Imágenes de mala calidad          │
│    ⚫ Duplicado de plantilla existente  │
│    ⚪ Información incompleta            │
│    ⚪ Otro                              │
│                                         │
│  Explicación para el usuario:           │
│  ┌─────────────────────────────────┐   │
│  │ Esta plantilla es duplicada de  │   │
│  │ "Panini World Cup 2026" que ya  │   │
│  │ existe en el catálogo. Por favor│   │
│  │ usa la plantilla existente o    │   │
│  │ crea una privada para uso       │   │
│  │ personal.                        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ☑ Permitir que el usuario edite y     │
│     reenvíe para moderación             │
│                                         │
│  [Cancelar]  [Confirmar rechazo]       │
└─────────────────────────────────────────┘
```

5. Seleccionar motivo: **"Duplicado de plantilla existente"**
6. Agregar explicación clara para el usuario
7. Marcar: **"Permitir reenvío"** (si el usuario puede corregir)
8. Confirmar

**Resultado esperado:**

- ✅ Plantilla queda con estado "Rechazada"
- ✅ Usuario recibe notificación con el motivo y explicación
- ✅ No aparece en catálogo público

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que la plantilla fue rechazada
SELECT
    tc.id,
    tc.name,
    tc.moderation_status,        -- Debe ser 'rejected'
    tc.rejection_reason,         -- Motivo del rechazo
    tc.rejection_notes,          -- Explicación para el usuario
    tc.can_resubmit,             -- ¿Puede volver a enviar?
    tc.reviewed_by,              -- Admin que rechazó
    tc.reviewed_at               -- Fecha de rechazo
FROM template_collections tc
WHERE tc.id = 123;
```

**Resultado esperado:**

| moderation_status | rejection_reason | can_resubmit | reviewed_at |
|-------------------|------------------|--------------|-------------|
| rejected | duplicate | true | 2025-11-09 15:00:00 |

```sql
-- Verificar notificación enviada al creador
SELECT
    n.type,
    n.title,
    n.message,
    n.read
FROM notifications n
WHERE n.user_id = (SELECT user_id FROM template_collections WHERE id = 123)
  AND n.type = 'template_rejected'
ORDER BY n.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| type | title | read |
|------|-------|------|
| template_rejected | Plantilla rechazada | false |

### 📊 Resultado del Test

✅ **Passed** si plantilla es rechazada y usuario notificado

---

## Caso CP-F07-05D: Editar plantilla como admin

### 🎯 Objetivo

Verificar que un admin puede hacer correcciones menores a una plantilla sin rechazarla.

### 🧪 Pasos del Test

**Escenario:** Plantilla con errores menores (typos, datos incorrectos) que el admin puede corregir directamente.

1. En revisión de plantilla, hacer clic en **"Editar plantilla"**
2. Corregir errores:

```
┌─────────────────────────────────────────┐
│  ✏️ EDITAR PLANTILLA (COMO ADMIN)       │
├─────────────────────────────────────────┤
│                                         │
│  Nombre: Panini Mundial 2026           │
│  Tipo: Panini                          │
│  Año: [2026]                           │
│  País: [Internacional]                 │
│                                         │
│  Descripción:                           │
│  ┌─────────────────────────────────┐   │
│  │ Colección oficial del Mundial   │   │
│  │ de Fútbol 2026 (antes: "2024") │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Editar ítems:                          │
│  [Ver/Editar lista de ítems]           │
│                                         │
│  Notas de edición admin:                │
│  ┌─────────────────────────────────┐   │
│  │ Corregido año de 2024 a 2026.   │   │
│  │ Aprobada tras corrección.        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancelar]  [Guardar y aprobar]       │
└─────────────────────────────────────────┘
```

3. Hacer cambios menores (ej: año, descripción)
4. Agregar notas de lo editado
5. **"Guardar y aprobar"**

**Resultado esperado:**

- ✅ Cambios guardados
- ✅ Plantilla aprobada automáticamente
- ✅ Usuario recibe notificación: "Tu plantilla fue aprobada con pequeñas correcciones"

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que la plantilla fue editada y aprobada
SELECT
    tc.id,
    tc.year,                     -- Debe reflejar cambio
    tc.moderation_status,        -- 'approved'
    tc.admin_edited,             -- true
    tc.admin_edit_notes,         -- Notas de lo editado
    tc.approved_by,
    tc.approved_at
FROM template_collections tc
WHERE tc.id = 123;
```

**Resultado esperado:**

| year | moderation_status | admin_edited | admin_edit_notes |
|------|-------------------|--------------|------------------|
| 2026 | approved | true | Corregido año de 2024 a 2026 |

```sql
-- Verificar log de edición admin
SELECT
    al.action_type,
    al.admin_id,
    al.target_resource_type,
    al.target_resource_id,
    al.details,
    al.created_at
FROM admin_logs al
WHERE al.action_type = 'template_edited'
  AND al.target_resource_id = '123'
  AND al.target_resource_type = 'template_collection'
ORDER BY al.created_at DESC
LIMIT 1;
```

### 📊 Resultado del Test

✅ **Passed** si admin puede editar y aprobar en un solo paso

---

## Caso CP-F07-05E: Eliminar plantilla inapropiada

### 🎯 Objetivo

Verificar que un admin puede eliminar permanentemente una plantilla que viola las políticas.

### 🧪 Pasos del Test

**Escenario:** Plantilla con contenido ofensivo o que viola términos gravemente.

1. En detalles de la plantilla problemática
2. Hacer clic en **"Eliminar plantilla"**
3. Modal de confirmación:

```
┌─────────────────────────────────────────┐
│  🗑️ ELIMINAR PLANTILLA PERMANENTEMENTE  │
├─────────────────────────────────────────┤
│                                         │
│  ⚠️ ADVERTENCIA: Esta acción NO se     │
│     puede deshacer.                     │
│                                         │
│  Plantilla: [Nombre ofensivo]          │
│  Creador: @UserBad                     │
│                                         │
│  Se eliminará:                          │
│  ✓ La plantilla completa               │
│  ✓ Todos sus ítems (640)               │
│  ✓ Copias de usuarios (si las hay)     │
│                                         │
│  Motivo de eliminación:                 │
│  [▼ Seleccionar]                        │
│    ⚫ Contenido ofensivo                │
│    ⚪ Violación de copyright            │
│    ⚪ Spam                              │
│    ⚪ Otro                              │
│                                         │
│  Acción contra el creador:              │
│  ☐ Advertencia                         │
│  ☑ Suspender usuario                   │
│                                         │
│  Notas:                                 │
│  ┌─────────────────────────────────┐   │
│  │ Contenido altamente ofensivo.   │   │
│  │ Usuario suspendido 90 días.     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Para confirmar, escribe "ELIMINAR":    │
│  [ELIMINAR___________________]         │
│                                         │
│  [Cancelar]  [Eliminar permanentemente]│
└─────────────────────────────────────────┘
```

4. Seleccionar motivo: **"Contenido ofensivo"**
5. Marcar: **"Suspender usuario"**
6. Escribir "ELIMINAR" para confirmar
7. Confirmar eliminación

**Resultado esperado:**

- ✅ Plantilla eliminada completamente
- ✅ Usuario suspendido (si se marcó)
- ✅ Log de auditoría creado

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que la plantilla fue eliminada
SELECT COUNT(*) AS existe
FROM template_collections
WHERE id = 123;
```

**Resultado esperado:** `existe = 0`

```sql
-- Verificar que ítems fueron eliminados (si ON DELETE CASCADE)
SELECT COUNT(*) AS items_huerfanos
FROM template_items
WHERE collection_id = 123;
```

**Resultado esperado:** `items_huerfanos = 0`

```sql
-- Verificar que copias de usuarios fueron manejadas
SELECT
    uc.id,
    uc.status,
    uc.deletion_reason
FROM user_collections uc
WHERE uc.template_id = 123;
```

**Opciones esperadas:**
- Filas eliminadas (si ON DELETE CASCADE)
- O `status = 'template_deleted'` y `deletion_reason = 'admin_removed_template'`

```sql
-- Verificar log de eliminación
SELECT
    al.action_type,
    al.admin_id,
    al.details,
    al.created_at
FROM admin_logs al
WHERE al.action_type = 'template_deleted'
  AND al.target_resource_id = '123'
ORDER BY al.created_at DESC
LIMIT 1;
```

**Detalle esperado en JSON:**

```json
{
  "template_name": "[Nombre ofensivo]",
  "deletion_reason": "offensive_content",
  "items_deleted": 640,
  "user_copies_affected": 5,
  "user_suspended": true,
  "notes": "Contenido altamente ofensivo..."
}
```

### 📊 Resultado del Test

✅ **Passed** si plantilla es eliminada y se registra en logs

---

## Caso CP-F07-05F: Ver estadísticas de plantillas

### 🎯 Objetivo

Verificar que el admin puede ver métricas sobre plantillas en el sistema.

### 🧪 Pasos del Test

1. En panel admin → **"Plantillas"** → **"Estadísticas"**
2. Ver dashboard de métricas

**Debe mostrar:**

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 ESTADÍSTICAS DE PLANTILLAS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📈 OVERVIEW                                                    │
│  ├─ Total plantillas: 567                                      │
│  ├─ Públicas: 489                                              │
│  ├─ Privadas: 78                                               │
│  └─ Nuevas (últimos 30 días): 45                               │
│                                                                 │
│  ⏳ MODERACIÓN                                                  │
│  ├─ Pendientes de revisión: 12                                 │
│  ├─ Aprobadas (últimos 30 días): 38                            │
│  ├─ Rechazadas (últimos 30 días): 5                            │
│  └─ Tiempo promedio de revisión: 4.2 horas                     │
│                                                                 │
│  🏆 TOP PLANTILLAS PÚBLICAS (por copias)                        │
│  1. Panini Mundial 2022 - 1,234 copias                         │
│  2. Pokemon Base Set - 987 copias                              │
│  3. NBA Hoops 2023 - 654 copias                                │
│                                                                 │
│  👥 TOP CREADORES                                               │
│  1. @CollectorPro - 15 plantillas públicas                     │
│  2. @PokemonMaster - 12 plantillas                             │
│  3. @SportsFan - 8 plantillas                                  │
│                                                                 │
│  📊 GRÁFICO: Plantillas creadas por mes                         │
│  [Gráfico de barras mostrando tendencia]                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Estadísticas generales de plantillas
SELECT
    COUNT(*) AS total_plantillas,
    COUNT(*) FILTER (WHERE visibility = 'public') AS publicas,
    COUNT(*) FILTER (WHERE visibility = 'private') AS privadas,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS nuevas_ultimo_mes
FROM template_collections;
```

```sql
-- Estadísticas de moderación
SELECT
    COUNT(*) FILTER (WHERE moderation_status = 'pending') AS pendientes,
    COUNT(*) FILTER (WHERE moderation_status = 'approved' AND approved_at > NOW() - INTERVAL '30 days') AS aprobadas_mes,
    COUNT(*) FILTER (WHERE moderation_status = 'rejected' AND reviewed_at > NOW() - INTERVAL '30 days') AS rechazadas_mes,
    AVG(EXTRACT(EPOCH FROM (COALESCE(approved_at, reviewed_at) - created_at))/3600) AS horas_promedio_revision
FROM template_collections
WHERE visibility = 'public'
  AND moderation_status IN ('approved', 'rejected');
```

**¿Qué hace esta consulta compleja?**

- `COUNT(*) FILTER (WHERE ...)`: Cuenta solo filas que cumplen condición
- `EXTRACT(EPOCH FROM fecha)`: Convierte intervalo de tiempo a segundos
- `/3600`: Convierte segundos a horas
- `COALESCE(a, b)`: Usa `a` si no es NULL, sino usa `b`

```sql
-- Top plantillas por número de copias
SELECT
    tc.id,
    tc.name,
    COUNT(uc.id) AS num_copias
FROM template_collections tc
LEFT JOIN user_collections uc ON uc.template_id = tc.id
WHERE tc.visibility = 'public'
  AND tc.moderation_status = 'approved'
GROUP BY tc.id
ORDER BY num_copias DESC
LIMIT 10;
```

```sql
-- Top creadores de plantillas públicas
SELECT
    p.nickname,
    COUNT(tc.id) AS num_plantillas_publicas,
    SUM((SELECT COUNT(*) FROM user_collections WHERE template_id = tc.id)) AS total_copias
FROM profiles p
JOIN template_collections tc ON tc.user_id = p.id
WHERE tc.visibility = 'public'
  AND tc.moderation_status = 'approved'
GROUP BY p.id
ORDER BY num_plantillas_publicas DESC
LIMIT 10;
```

### 📊 Resultado del Test

✅ **Passed** si todas las estadísticas se calculan y muestran correctamente

---

## 📊 Resumen - Fase 07: Gestión de Plantillas Admin

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F07-05A | Ver plantillas pendientes | 15 min |
| CP-F07-05B | Aprobar plantilla | 25 min |
| CP-F07-05C | Rechazar plantilla | 20 min |
| CP-F07-05D | Editar plantilla como admin | 25 min |
| CP-F07-05E | Eliminar plantilla | 25 min |
| CP-F07-05F | Estadísticas plantillas | 20 min |

**Total:** ~2 horas 10 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
