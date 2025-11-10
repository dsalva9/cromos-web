# Tests No-Técnicos - Fase 04: Integración Plantillas-Marketplace

## 📋 Información General

**Fase:** Fase-04
**Categoría:** Integración entre Plantillas y Marketplace
**Archivo:** 01_Flujo_Plantilla_A_Marketplace.md
**Cantidad de tests:** 6 casos de prueba
**Tiempo estimado total:** ~2 horas

---

## 🎯 Objetivo de Este Archivo

Este archivo contiene tests para verificar la **integración completa** entre el sistema de plantillas/colecciones y el marketplace. Verificamos que:

1. ✅ Desde una colección, puedes publicar cromos directamente en marketplace
2. ✅ El listado mantiene referencia a la colección original
3. ✅ Al vender un cromo, se actualiza el estado en la colección
4. ✅ Puedes ver listados activos desde tu colección
5. ✅ Filtrar marketplace por plantilla específica

---

## 📚 Prerequisitos

Antes de ejecutar estos tests:

- ✅ Completar tests de Fase-02 (Plantillas) y Fase-03 (Marketplace)
- ✅ Usuario con colección activa: `qa.integrador@cromos.test`
- ✅ Colección debe tener al menos 5 cromos marcados como "tengo"

---

## Caso CP-F04-01A: Publicar cromo desde mi colección

### 🎯 Objetivo

Verificar que desde la vista de mi colección puedo publicar un cromo directamente en el marketplace sin tener que ir a "Crear listado" por separado.

### 📋 Preparación (Setup)

**Usuario necesario:**
- Email: `qa.integrador@cromos.test`
- Contraseña: `Test1234!`
- Estado: Registrado, con colección "Mundial Qatar 2022 - Oficial" y 5 cromos marcados

**Pasos de preparación:**

1. **Hacer login** como `qa.integrador@cromos.test`
2. Ir a **"Mis Colecciones"**
3. Abrir colección **"Mundial Qatar 2022 - Oficial"**
4. Verificar que tienes al menos el **Cromo #25** marcado como "tengo"

### 🧪 Pasos del Test

#### 1. Desde vista de colección, publicar cromo

1. En la vista de gestión de cromos de la colección
2. Buscar el **Cromo #25** (debe estar marcado como "tengo")
3. Buscar botón o acción junto al cromo:
   - **"Vender"** 💰
   - **"Publicar en marketplace"**
   - Menú desplegable: **"..."** → "Vender en marketplace"

4. Hacer clic en la opción de vender

**Lo que DEBE pasar:**

- ✅ Abre formulario de publicación de listado
- ✅ **Campos pre-rellenados:**
  - Título: "Cromo #25 - Mundial Qatar 2022" (o similar)
  - Número de cromo: 25 (automático)
  - Plantilla: "Mundial Qatar 2022 - Oficial" (bloqueado o readonly)
- ✅ Campos a rellenar:
  - Precio
  - Tipo (venta/intercambio)
  - Descripción adicional (opcional)

#### 2. Completar y publicar

**Rellenar:**

- **Precio:** `8.50`
- **Tipo:** Venta
- **Descripción:** `Cromo del grupo B, excelente estado`

**Hacer clic en:** "Publicar" o "Crear listado"

**Resultado esperado:**

- ✅ Mensaje: "Listado publicado correctamente"
- ✅ Vuelves a la vista de colección
- ✅ **El Cromo #25 ahora muestra indicador:**
  - Badge: "En venta" o "Publicado"
  - Icono: 💰 o 📤
  - Link directo: "Ver en marketplace"

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que listado se creó con referencia a la colección
SELECT
    tl.id AS listado_id,
    tl.title,
    tl.price,
    tl.item_number,              -- Debe ser 25
    tl.status,
    -- Referencia a colección (si existe)
    tl.collection_copy_id,       -- ID de la copia personal
    cc.template_id,              -- ID de la plantilla
    ct.title AS plantilla_nombre,
    -- Verificar usuario
    tl.user_id,
    p.nickname AS vendedor
FROM trade_listings tl
LEFT JOIN collection_copies cc ON cc.id = tl.collection_copy_id
LEFT JOIN collection_templates ct ON ct.id = cc.template_id
JOIN profiles p ON p.id = tl.user_id
WHERE tl.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test'
)
  AND tl.item_number = 25
  AND tl.status = 'active'
ORDER BY tl.created_at DESC
LIMIT 1;
```

**¿Qué hace esta consulta?**

- **Línea 8:** `collection_copy_id` debe tener valor (referencia a la colección)
- **Línea 9-10:** Obtenemos la plantilla asociada
- **Línea 19:** Filtramos por número de cromo 25

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `title` | Cromo #25 - Mundial Qatar 2022 (o similar) |
| `price` | 8.50 |
| `item_number` | 25 |
| `status` | active |
| `collection_copy_id` | (UUID, NOT NULL) ← **Importante** |
| `plantilla_nombre` | Mundial Qatar 2022 - Oficial |

**⚠️ CRÍTICO:** Si `collection_copy_id` es **NULL**, el listado NO está vinculado a la colección. Esto puede ser un problema de integración.

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Vender" aparece en vista de colección
2. ✅ Formulario se abre con campos pre-rellenados
3. ✅ Listado se publica exitosamente
4. ✅ SQL muestra `collection_copy_id` NOT NULL
5. ✅ Cromo #25 en colección muestra badge "En venta"

Marca el test como **Failed** ❌ si:

- ❌ No hay forma de publicar desde colección
- ❌ `collection_copy_id` es NULL (no hay vinculación)
- ❌ Campos no se pre-rellenan

**Actualizar en:** `Test_Tracking_Spreadsheet.csv` → Test_ID: `CP-F04-01A`

---

## Caso CP-F04-01B: Ver mis listados activos desde colección

### 🎯 Objetivo

Verificar que desde la vista de mi colección puedo ver qué cromos tengo publicados en el marketplace.

### 📋 Preparación (Setup)

**Usuario:** `qa.integrador@cromos.test`

**Prerequisito:** Tener al menos 1 cromo publicado (Cromo #25 del test anterior)

### 🧪 Pasos del Test

#### 1. Ver cromos en venta desde colección

1. Ir a **"Mis Colecciones"**
2. Abrir **"Mundial Qatar 2022 - Oficial"**
3. Buscar sección o tab:
   - **"En venta"**
   - **"Mis listados"**
   - Filtro: `☑ Solo cromos publicados`

**Resultado esperado:**

- ✅ Aparece lista/grid de cromos publicados
- ✅ Se muestra el **Cromo #25** con:
  - Badge "En venta"
  - Precio: 8.50€
  - Link: "Ver en marketplace"
  - Botón: "Editar listado"
  - Botón: "Despublicar" o "Quitar de venta"

#### 2. Acceder al listado desde colección

1. Hacer clic en **"Ver en marketplace"** del Cromo #25

**Resultado esperado:**

- ✅ Abre página de detalle del listado en nueva pestaña o misma ventana
- ✅ URL es algo como: `/marketplace/listings/{listing_id}`
- ✅ Muestra toda la información del listado publicado

---

### 🔍 Validaciones Técnicas

```sql
-- Contar cuántos cromos de mi colección están publicados
SELECT
    COUNT(tl.id) AS total_publicados,
    COUNT(tl.id) FILTER (WHERE tl.status = 'active') AS activos,
    COUNT(tl.id) FILTER (WHERE tl.status = 'sold') AS vendidos
FROM collection_copies cc
JOIN collection_templates ct ON ct.id = cc.template_id
LEFT JOIN trade_listings tl ON tl.collection_copy_id = cc.id
WHERE cc.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial';
```

**Resultado esperado:**

| total_publicados | activos | vendidos |
|------------------|---------|----------|
| 1 | 1 | 0 |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Hay forma de ver listados desde colección
2. ✅ Cromo #25 aparece con badge "En venta"
3. ✅ Link "Ver en marketplace" funciona
4. ✅ SQL muestra 1 listado activo vinculado

---

## Caso CP-F04-01C: Marcar como vendido actualiza colección

### 🎯 Objetivo

Verificar que cuando marcas un listado como "vendido", el estado del cromo en tu colección se actualiza (ya no lo tienes).

### 📋 Preparación (Setup)

**Usuario:** `qa.integrador@cromos.test`

**Prerequisito:** Listado del Cromo #25 activo en marketplace

### 🧪 Pasos del Test

#### 1. Estado inicial - Verificar en colección

1. Ir a **"Mis Colecciones"** → **"Mundial Qatar 2022 - Oficial"**
2. Buscar el **Cromo #25**
3. Verificar estado actual:
   - ✅ Marcado como "tengo" ✓
   - ✅ Badge "En venta"

#### 2. Marcar listado como vendido

1. Desde colección, hacer clic en **"Ver en marketplace"** del Cromo #25
2. O ir a **"Mis Listados"** y buscar el Cromo #25
3. Hacer clic en **"Marcar como vendido"** o **"Completado"**
4. Confirmar acción

**Resultado esperado:**

- ✅ Mensaje: "Listado marcado como vendido"
- ✅ Estado del listado cambia a "Vendido"

#### 3. Verificar actualización en colección

1. Volver a **"Mis Colecciones"** → **"Mundial Qatar 2022 - Oficial"**
2. Buscar el **Cromo #25**

**Lo que DEBE pasar (2 opciones según implementación):**

**Opción A - Desmarcado automáticamente:**
- ✅ El cromo ya **NO está marcado** como "tengo" (checkbox vacío)
- ✅ Badge "En venta" desaparece
- ✅ Puede aparecer badge "Vendido" con fecha

**Opción B - Sigue marcado pero con indicador:**
- ✅ Cromo sigue marcado como "tengo"
- ✅ Badge cambia a "Vendido" (en gris o tachado)
- ✅ No se puede volver a publicar (botón deshabilitado)

**Nota:** La opción A es más realista (vendiste el cromo, ya no lo tienes). Verificar con David cuál es el comportamiento esperado.

---

### 🔍 Validaciones Técnicas

#### Opción A - Cromo desmarcado

```sql
-- Verificar que item ya NO está marcado como owned
SELECT
    ci.item_number,
    ci.owned,                    -- Debe ser FALSE o registro no debe existir
    tl.status AS listado_status
FROM collection_items ci
LEFT JOIN trade_listings tl ON tl.collection_copy_id = ci.copy_id
    AND tl.item_number = ci.item_number
WHERE ci.copy_id = (
    SELECT cc.id
    FROM collection_copies cc
    JOIN collection_templates ct ON ct.id = cc.template_id
    WHERE cc.user_id = (SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test')
      AND ct.title = 'Mundial Qatar 2022 - Oficial'
)
  AND ci.item_number = 25;
```

**Resultado esperado (Opción A):**

| owned | listado_status |
|-------|----------------|
| false | sold |

**O bien:** 0 filas (registro eliminado cuando se desmarcó)

#### Opción B - Cromo sigue marcado

```sql
-- Similar query, pero owned = true
```

**Resultado esperado (Opción B):**

| owned | listado_status |
|-------|----------------|
| true | sold |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Listado cambia a estado "sold"
2. ✅ Colección refleja el cambio (opción A o B según diseño)
3. ✅ SQL confirma actualización de estado

Marca el test como **Failed** ❌ si:

- ❌ Listado marca como vendido pero colección no se actualiza
- ❌ Cromo sigue apareciendo como "disponible para vender"

**⚠️ Nota:** Si no hay actualización automática, reportar como **mejora de UX** a David.

---

## Caso CP-F04-01D: Buscar en marketplace por plantilla

### 🎯 Objetivo

Verificar que en el marketplace puedes filtrar/buscar listados de una plantilla específica.

### 📋 Preparación (Setup)

**Usuario:** Cualquiera (puede no estar logueado)

**Prerequisito:** Al menos 2 plantillas diferentes con listados publicados

### 🧪 Pasos del Test

#### 1. Ir a marketplace

1. Navegar a **"Marketplace"** o **"Explorar cromos"**

#### 2. Buscar filtro por plantilla/colección

Buscar control de filtro:
- Dropdown: **"Plantilla: Todas"**
- Búsqueda: **"Filtrar por colección"**
- Tags: **#MundialQatar2022**

#### 3. Filtrar por "Mundial Qatar 2022"

Seleccionar o buscar **"Mundial Qatar 2022 - Oficial"**

**Resultado esperado:**

- ✅ Solo aparecen listados de cromos de esa plantilla
- ✅ Listado del Cromo #25 (si no está vendido) aparece
- ✅ Listados de otras plantillas NO aparecen
- ✅ Contador: "X resultados de Mundial Qatar 2022"

---

### 🔍 Validaciones Técnicas

```sql
-- Buscar listados filtrados por plantilla
SELECT
    tl.id,
    tl.title,
    tl.item_number,
    tl.price,
    ct.title AS plantilla
FROM trade_listings tl
JOIN collection_copies cc ON cc.id = tl.collection_copy_id
JOIN collection_templates ct ON ct.id = cc.template_id
WHERE tl.status = 'active'
  AND ct.title = 'Mundial Qatar 2022 - Oficial'
ORDER BY tl.created_at DESC;
```

**Resultado esperado:**

- Todas las filas tienen `plantilla = 'Mundial Qatar 2022 - Oficial'`

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Filtro por plantilla existe
2. ✅ Filtrar funciona correctamente
3. ✅ Solo aparecen listados de la plantilla seleccionada
4. ✅ SQL confirma que todos tienen misma plantilla

---

## Caso CP-F04-01E: Despublicar cromo (quitar de venta)

### 🎯 Objetivo

Verificar que puedes despublicar un cromo desde tu colección, eliminando el listado del marketplace.

### 📋 Preparación (Setup)

**Usuario:** `qa.integrador@cromos.test`

**Prerequisito:**
- Publicar otro cromo (ej: Cromo #30) para tener un listado activo
- **NO usar el Cromo #25** (ya lo marcamos como vendido)

**Pasos de preparación:**

1. Desde colección, publicar **Cromo #30**:
   - Precio: 5.00
   - Tipo: Venta

### 🧪 Pasos del Test

#### 1. Desde colección, despublicar cromo

1. Ir a **"Mis Colecciones"** → **"Mundial Qatar 2022 - Oficial"**
2. Buscar **Cromo #30** (debe tener badge "En venta")
3. Buscar botón:
   - **"Despublicar"**
   - **"Quitar de venta"**
   - **"Eliminar listado"**
   - Menú: **"..."** → "Quitar de marketplace"

4. Hacer clic y confirmar (si hay diálogo)

**Resultado esperado:**

- ✅ Mensaje: "Listado eliminado del marketplace"
- ✅ Badge "En venta" del Cromo #30 desaparece
- ✅ Cromo sigue marcado como "tengo" (solo se quitó del marketplace)
- ✅ Ya NO aparece en marketplace público

---

### 🔍 Validaciones Técnicas

```sql
-- Verificar que listado fue eliminado o marcado como inactivo
SELECT
    tl.id,
    tl.item_number,
    tl.status,
    tl.deleted_at           -- Si usan soft delete
FROM trade_listings tl
WHERE tl.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test'
)
  AND tl.item_number = 30
ORDER BY tl.created_at DESC
LIMIT 1;
```

**Resultado esperado (Hard delete):**

- 0 filas (listado eliminado completamente)

**Resultado esperado (Soft delete):**

| status | deleted_at |
|--------|------------|
| deleted | (timestamp reciente) |

**Verificar que cromo sigue marcado como "tengo":**

```sql
-- El item debe seguir owned = true
SELECT
    ci.item_number,
    ci.owned
FROM collection_items ci
WHERE ci.copy_id = (
    SELECT cc.id
    FROM collection_copies cc
    JOIN collection_templates ct ON ct.id = cc.template_id
    WHERE cc.user_id = (SELECT id FROM auth.users WHERE email = 'qa.integrador@cromos.test')
      AND ct.title = 'Mundial Qatar 2022 - Oficial'
)
  AND ci.item_number = 30;
```

**Resultado esperado:**

| owned |
|-------|
| true ← Sigue teniéndolo |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Despublicar" funciona desde colección
2. ✅ Listado desaparece del marketplace
3. ✅ SQL muestra listado eliminado o con status = 'deleted'
4. ✅ Cromo sigue marcado como "tengo" en colección

---

## Caso CP-F04-01H: Integridad - Eliminar plantilla afecta listados

### 🎯 Objetivo

Verificar el comportamiento cuando se elimina una plantilla que tiene listados asociados en marketplace.

**⚠️ ADVERTENCIA:** Este test debe ejecutarse con **datos de prueba**, NO con plantillas reales.

### 📋 Preparación (Setup)

**Usuario:** `qa.integrador@cromos.test`

**Pasos:**

1. Crear plantilla de prueba: **"Test Eliminación"** con 10 cromos
2. Añadir a mi colección
3. Marcar 2 cromos como "tengo"
4. Publicar esos 2 cromos en marketplace (activos)

### 🧪 Pasos del Test

#### 1. Intentar eliminar plantilla

1. Ir a **"Mis Plantillas"**
2. Buscar **"Test Eliminación"**
3. Intentar eliminar

**Lo que PUEDE pasar (depende de implementación):**

**Opción A - Bloqueo:**
- ❌ Error: "No puedes eliminar esta plantilla porque tienes listados activos asociados"
- ❌ Sugerencia: "Primero despublica los cromos del marketplace"

**Opción B - Cascada:**
- ✅ Confirmación: "Al eliminar esta plantilla también se eliminarán tus copias y listados asociados. ¿Continuar?"
- ✅ Usuario confirma
- ✅ Plantilla, copias Y listados se eliminan en cascada

**Opción C - Soft delete:**
- ✅ Plantilla se marca como eliminada pero datos persisten
- ✅ Listados siguen activos (vinculados a plantilla eliminada)

---

### 🔍 Validaciones Técnicas

**Obtener IDs:**

```sql
SELECT id FROM collection_templates WHERE title = 'Test Eliminación';
-- {template_id}
```

**Intentar eliminar:**

```sql
DELETE FROM collection_templates WHERE id = '{template_id}';
```

**Si Opción A (Bloqueo):**

- Error de constraint o trigger que impide eliminación
- Listados activos bloquean el DELETE

**Si Opción B (Cascada):**

- DELETE exitoso
- Verificar que listados también se eliminaron:

```sql
SELECT COUNT(*) FROM trade_listings
WHERE collection_copy_id IN (
    SELECT id FROM collection_copies WHERE template_id = '{template_id}'
);
```

**Resultado esperado:** 0 filas (todos eliminados)

**Si Opción C (Soft delete):**

```sql
SELECT deleted_at FROM collection_templates WHERE id = '{template_id}';
```

**Resultado esperado:** `deleted_at` NOT NULL

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Comportamiento es consistente (A, B o C)
2. ✅ NO hay listados huérfanos en marketplace
3. ✅ Si cascada, verifica que todo se eliminó
4. ✅ Si bloqueo, mensaje de error es claro

**Reportar a David:** Cuál de las 3 opciones se implementó para documentar en manual de usuario.

---

## 📊 Resumen de Tests - Archivo 01

| Test ID | Nombre | Complejidad | Tiempo Est. | Estado |
|---------|--------|-------------|-------------|--------|
| CP-F04-01A | Publicar desde colección | Media | 25 min | - |
| CP-F04-01B | Ver listados desde colección | Baja | 15 min | - |
| CP-F04-01C | Venta actualiza colección | Media | 20 min | - |
| CP-F04-01D | Filtrar por plantilla | Baja | 15 min | - |
| CP-F04-01E | Despublicar cromo | Media | 20 min | - |
| CP-F04-01H | Integridad al eliminar | Alta | 25 min | - |

**Total:** ~2 horas

---

## ✅ Checklist Post-Tests

- [ ] Verifiqué que listados tienen `collection_copy_id` NOT NULL
- [ ] Confirmé el comportamiento al vender (desmarca o no el cromo)
- [ ] Probé despublicar y verificar que cromo sigue "tengo"
- [ ] Documenté qué opción (A/B/C) se usa al eliminar plantilla con listados

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
