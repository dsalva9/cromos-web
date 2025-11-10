# Tests No-Técnicos - Fase 02: Copias, Progreso y Ratings

## 📋 Información General

**Fase:** Fase-02
**Categoría:** Plantillas y Colecciones
**Archivo:** 02_Copias_Progreso_Ratings.md
**Cantidad de tests:** 5 casos de prueba
**Tiempo estimado total:** ~1.5 horas

---

## 🎯 Objetivo de Este Archivo

Este archivo contiene tests para verificar que los usuarios pueden:

1. ✅ Añadir una plantilla a su colección (crear copia personal)
2. ✅ Marcar cromos como "tengo" para trackear progreso
3. ✅ Ver progreso visual (ej: "45/670 cromos")
4. ✅ Valorar plantillas de otros usuarios (ratings)
5. ✅ Ver rating promedio de plantillas

---

## 📚 Prerequisitos

Antes de ejecutar estos tests, asegúrate de:

- ✅ Haber completado tests de `01_Plantillas_Creacion_Edicion.md`
- ✅ Tener plantilla pública disponible: "Mundial Qatar 2022 - Oficial" (creada por `qa.plantillas@cromos.test`)
- ✅ Tener segundo usuario disponible: `qa.coleccionista@cromos.test`

---

## Caso CP-F02-02A: Añadir plantilla a mi colección

### 🎯 Objetivo

Verificar que un usuario puede añadir una plantilla pública creada por otro usuario a su propia colección personal.

### 📋 Preparación (Setup)

**Usuarios necesarios:**

1. **Autor de plantilla:** `qa.plantillas@cromos.test`
   - Debe tener plantilla pública "Mundial Qatar 2022 - Oficial" con 670 cromos

2. **Coleccionista:** `qa.coleccionista@cromos.test`
   - Contraseña: `Test1234!`
   - Estado: Registrado y confirmado

**Pasos de preparación:**

1. **Hacer login** como `qa.coleccionista@cromos.test`
2. Verificar que estás logueado (ver avatar/nombre en esquina superior)

### 🧪 Pasos del Test

#### 1. Buscar plantilla pública

1. Ir a sección **"Explorar Plantillas"** o **"Plantillas Públicas"**
2. Buscar la plantilla **"Mundial Qatar 2022 - Oficial"**
3. Hacer clic para abrir la vista de detalle

**Verificar que ves:**
- ✅ Título: "Mundial Qatar 2022 - Oficial"
- ✅ Total de cromos: 670
- ✅ Badge "Pública"
- ✅ Nombre del autor (nickname de `qa.plantillas@cromos.test`)

#### 2. Añadir a mi colección

Buscar y hacer clic en uno de estos botones:
- **"+ Añadir a mi colección"**
- **"Empezar a coleccionar"**
- **"Usar esta plantilla"**

**Lo que DEBE pasar:**

- ✅ Aparece indicador de carga (spinner o "Añadiendo...")
- ✅ Mensaje de éxito: "Plantilla añadida a tu colección" o similar
- ✅ El botón cambia a:
  - **"✓ En mi colección"** (deshabilitado)
  - **"Ver mi progreso"**
  - O similar indicador de que ya está añadida

#### 3. Verificar en "Mis Colecciones"

1. Ir a sección **"Mis Colecciones"** o **"Mi Colección"**
2. Deberías ver la plantilla **"Mundial Qatar 2022 - Oficial"** listada
3. Debe mostrar:
   - ✅ Título
   - ✅ Progreso inicial: **"0/670"** o **"0%"**
   - ✅ Barra de progreso vacía (0%)

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar la copia personal que se creó
SELECT
    cc.id AS copia_id,
    cc.user_id,
    cc.template_id,
    cc.created_at,
    -- Datos de la plantilla
    ct.title AS plantilla_titulo,
    ct.total_items,
    ct.author_id AS autor_plantilla,
    -- Datos del usuario coleccionista
    p.nickname AS coleccionista
FROM collection_copies cc
JOIN collection_templates ct ON ct.id = cc.template_id
JOIN profiles p ON p.id = cc.user_id
WHERE cc.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial'
ORDER BY cc.created_at DESC
LIMIT 1;
```

**¿Qué hace esta consulta?**

- **Línea 2-11:** Seleccionamos campos de la copia, plantilla y usuario
- **Línea 12:** Buscamos en `collection_copies` (copias personales)
- **Línea 13-14:** Unimos con plantilla y perfil para obtener datos completos
- **Línea 15-17:** Filtramos por el usuario coleccionista
- **Línea 18:** Solo queremos la plantilla de Qatar
- **Línea 19-20:** Mostramos la más reciente

**Resultado esperado:**

Debes ver **1 fila** con estos valores:

| Campo | Valor Esperado |
|-------|----------------|
| `plantilla_titulo` | `Mundial Qatar 2022 - Oficial` |
| `total_items` | `670` |
| `coleccionista` | Nickname de `qa.coleccionista@cromos.test` |
| `created_at` | Timestamp reciente (hace pocos minutos) |

**Si ves 0 filas:** ❌ La copia NO se creó en la base de datos

#### Verificar progreso inicial (debe ser 0)

```sql
-- Contar cuántos cromos están marcados como "tengo"
SELECT
    cc.id AS copia_id,
    COUNT(ci.id) AS cromos_marcados,
    ct.total_items AS total_cromos,
    -- Calcular porcentaje de progreso
    ROUND(
        (COUNT(ci.id)::DECIMAL / ct.total_items) * 100,
        2
    ) AS porcentaje_progreso
FROM collection_copies cc
JOIN collection_templates ct ON ct.id = cc.template_id
LEFT JOIN collection_items ci ON ci.copy_id = cc.id AND ci.owned = true
WHERE cc.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial'
GROUP BY cc.id, ct.total_items;
```

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `cromos_marcados` | `0` ← Sin cromos aún |
| `total_cromos` | `670` |
| `porcentaje_progreso` | `0.00` |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Añadir a mi colección" funciona
2. ✅ Mensaje de éxito aparece
3. ✅ Plantilla aparece en "Mis Colecciones"
4. ✅ SQL retorna 1 fila en `collection_copies`
5. ✅ Progreso inicial es 0/670 (0%)

Marca el test como **Failed** ❌ si:

- ❌ SQL retorna 0 filas (copia no se creó)
- ❌ Plantilla no aparece en "Mis Colecciones"
- ❌ Error al intentar añadir

**Actualizar en:** `Test_Tracking_Spreadsheet.csv` → Test_ID: `CP-F02-02A`

---

## Caso CP-F02-02B: Marcar cromos como "tengo"

### 🎯 Objetivo

Verificar que el usuario puede marcar cromos individuales como "tengo" y el progreso se actualiza correctamente.

### 📋 Preparación (Setup)

**Usuario:** `qa.coleccionista@cromos.test` (el mismo del test anterior)

**Prerequisito:** Debe tener la plantilla "Mundial Qatar 2022 - Oficial" en su colección (CP-F02-02A completado)

### 🧪 Pasos del Test

#### 1. Abrir mi colección

1. Ir a **"Mis Colecciones"**
2. Buscar **"Mundial Qatar 2022 - Oficial"**
3. Hacer clic para abrir vista de detalle/gestión

#### 2. Vista de gestión de cromos

Deberías ver una interfaz para gestionar cromos, puede ser:
- Lista numerada de cromos (1, 2, 3... 670)
- Grid de casillas/checkboxes
- Tabla con números de cromo

**Cada cromo debe tener:**
- ✅ Número del cromo (ej: "Cromo #1", "Cromo #2")
- ✅ Checkbox o toggle para marcar como "tengo"
- ✅ Estado visual (vacío = no tengo, marcado = tengo)

#### 3. Marcar varios cromos

**Marca exactamente estos 5 cromos como "tengo":**

- Cromo #1
- Cromo #7
- Cromo #10
- Cromo #23
- Cromo #100

**Para cada uno:**
1. Hacer clic en checkbox o toggle
2. Verificar que cambia visualmente (ej: ✓ aparece, color cambia)
3. Debe guardarse automáticamente (o botón "Guardar" si es necesario)

#### 4. Verificar actualización de progreso

**En la misma página o en "Mis Colecciones", buscar:**

- ✅ Contador actualizado: **"5/670"**
- ✅ Porcentaje: **"0.75%"** (aproximadamente)
- ✅ Barra de progreso con pequeño avance (casi imperceptible con 670 cromos)

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Listar los cromos marcados como "tengo"
SELECT
    ci.id,
    ci.item_number,          -- Número del cromo
    ci.owned,                -- ¿Lo tengo? (debe ser TRUE)
    ci.created_at,
    ci.copy_id
FROM collection_items ci
JOIN collection_copies cc ON cc.id = ci.copy_id
JOIN collection_templates ct ON ct.id = cc.template_id
WHERE cc.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial'
  AND ci.owned = true        -- Solo los que tengo
ORDER BY ci.item_number;
```

**Resultado esperado:**

Debes ver **5 filas** con estos números:

| item_number | owned |
|-------------|-------|
| 1 | true |
| 7 | true |
| 10 | true |
| 23 | true |
| 100 | true |

**Si ves menos de 5 filas:** ❌ Algunos cromos no se guardaron

**Si ves más de 5 filas:** ⚠️ Se marcaron cromos de más (posible bug)

#### Verificar cálculo de progreso

```sql
-- Calcular progreso actual
SELECT
    COUNT(ci.id) FILTER (WHERE ci.owned = true) AS cromos_tengo,
    ct.total_items AS total_cromos,
    ROUND(
        (COUNT(ci.id) FILTER (WHERE ci.owned = true)::DECIMAL / ct.total_items) * 100,
        2
    ) AS porcentaje
FROM collection_copies cc
JOIN collection_templates ct ON ct.id = cc.template_id
LEFT JOIN collection_items ci ON ci.copy_id = cc.id
WHERE cc.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial'
GROUP BY ct.total_items;
```

**Resultado esperado:**

| cromos_tengo | total_cromos | porcentaje |
|--------------|--------------|------------|
| 5 | 670 | 0.75 |

**Cálculo:** (5 / 670) × 100 = 0.746... → redondeado a 0.75%

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Checkboxes de cromos funcionan
2. ✅ Cambios se guardan (automático o con botón)
3. ✅ SQL muestra exactamente 5 cromos con `owned = true`
4. ✅ Contador muestra "5/670"
5. ✅ Porcentaje es ~0.75%

Marca el test como **Failed** ❌ si:

- ❌ SQL muestra menos de 5 cromos
- ❌ Progreso no se actualiza
- ❌ Cromos marcados se desmarcan al recargar página

---

## Caso CP-F02-02C: Persistencia de progreso (refresh de página)

### 🎯 Objetivo

Verificar que el progreso (cromos marcados) se mantiene después de recargar la página.

### 📋 Preparación (Setup)

**Usuario:** `qa.coleccionista@cromos.test`

**Prerequisito:** Debe haber completado CP-F02-02B (5 cromos marcados)

### 🧪 Pasos del Test

#### 1. Antes de recargar

1. Estar en la vista de gestión de **"Mundial Qatar 2022 - Oficial"**
2. **Verificar visualmente** que los cromos #1, #7, #10, #23 y #100 están marcados
3. Anotar el progreso mostrado: "5/670"

#### 2. Recargar página

1. Presionar **F5** o hacer clic en botón de recargar del navegador
2. Esperar que la página cargue completamente

#### 3. Verificar persistencia

**Lo que DEBE pasar:**

- ✅ Los 5 cromos marcados SIGUEN marcados (✓ visible)
- ✅ Progreso sigue siendo "5/670"
- ✅ No hay errores en consola

**Lo que NO debe pasar:**

- ❌ Cromos marcados aparecen desmarcados
- ❌ Progreso vuelve a "0/670"
- ❌ Error al cargar datos

---

### 🔍 Validaciones Técnicas

#### Verificación en Consola de Chrome

1. Abrir DevTools (F12) → Pestaña **"Network"**
2. Recargar página (F5)
3. Buscar request a API que carga los cromos (ej: `/collection_items` o `/collection_copies`)

**Verificar en la respuesta:**

1. Hacer clic en el request
2. Ir a pestaña **"Response"** o **"Preview"**
3. Buscar un array de items con campo `owned`

**Debe contener:**

```json
[
  { "item_number": 1, "owned": true },
  { "item_number": 7, "owned": true },
  { "item_number": 10, "owned": true },
  { "item_number": 23, "owned": true },
  { "item_number": 100, "owned": true }
  // ... más items con owned: false
]
```

**Si `owned` es `false` para esos números:** ❌ Datos no se guardaron correctamente

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Cromos marcados persisten después de F5
2. ✅ Progreso sigue siendo 5/670
3. ✅ API response contiene `owned: true` para los 5 cromos
4. ✅ No hay errores en consola

Marca el test como **Failed** ❌ si:

- ❌ Cromos aparecen desmarcados después de recargar
- ❌ Progreso vuelve a 0
- ❌ API response muestra `owned: false`

---

## Caso CP-F02-02D: Desmarcar cromo (quitar de "tengo")

### 🎯 Objetivo

Verificar que el usuario puede desmarcar un cromo previamente marcado y el progreso se actualiza correctamente.

### 📋 Preparación (Setup)

**Usuario:** `qa.coleccionista@cromos.test`

**Prerequisito:** Tener 5 cromos marcados (CP-F02-02B completado)

### 🧪 Pasos del Test

#### 1. Desmarcar 2 cromos

1. Ir a gestión de **"Mundial Qatar 2022 - Oficial"**
2. Buscar el **Cromo #7** (debe estar marcado)
3. Hacer clic en el checkbox para **desmarcarlo**
4. Verificar que la marca ✓ desaparece
5. Repetir con **Cromo #23**

**Estado esperado ahora:**

- Marcados: #1, #10, #100 (3 cromos)
- Desmarcados: #7, #23

#### 2. Verificar actualización de progreso

**Debe mostrar:**

- ✅ Contador: **"3/670"** (era 5, ahora 3)
- ✅ Porcentaje: **"0.45%"** (aproximadamente)
- ✅ Barra de progreso levemente menor

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Listar solo los cromos que SIGUEN marcados
SELECT
    ci.item_number,
    ci.owned
FROM collection_items ci
JOIN collection_copies cc ON cc.id = ci.copy_id
JOIN collection_templates ct ON ct.id = cc.template_id
WHERE cc.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial'
  AND ci.owned = true
ORDER BY ci.item_number;
```

**Resultado esperado:**

Ahora solo debes ver **3 filas:**

| item_number | owned |
|-------------|-------|
| 1 | true |
| 10 | true |
| 100 | true |

**Los números 7 y 23 NO deben aparecer** (fueron desmarcados)

#### Verificar que registros existen pero con owned=false

```sql
-- Ver TODOS los registros de collection_items (marcados y no)
SELECT
    ci.item_number,
    ci.owned
FROM collection_items ci
JOIN collection_copies cc ON cc.id = ci.copy_id
JOIN collection_templates ct ON ct.id = cc.template_id
WHERE cc.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial'
  AND ci.item_number IN (1, 7, 10, 23, 100)
ORDER BY ci.item_number;
```

**Resultado esperado:**

| item_number | owned |
|-------------|-------|
| 1 | true |
| 7 | **false** ← Desmarcado |
| 10 | true |
| 23 | **false** ← Desmarcado |
| 100 | true |

**Nota:** Dependiendo de implementación, registros con `owned=false` podrían no existir (solo se guardan los `true`). Ambas opciones son válidas.

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Desmarcar checkbox funciona visualmente
2. ✅ Progreso se actualiza a 3/670
3. ✅ SQL muestra solo 3 cromos con `owned = true`
4. ✅ Cromos #7 y #23 tienen `owned = false` o no existen en la tabla

Marca el test como **Failed** ❌ si:

- ❌ Progreso sigue siendo 5/670
- ❌ SQL muestra 5 cromos con `owned = true`
- ❌ Cromos desmarcados siguen marcados después de recargar

---

## Caso CP-F02-02E: Valorar plantilla (rating)

### 🎯 Objetivo

Verificar que un usuario puede dar rating (valoración) a una plantilla pública creada por otro usuario.

### 📋 Preparación (Setup)

**Usuarios:**

1. **Autor:** `qa.plantillas@cromos.test` (creó la plantilla)
2. **Valorador:** `qa.coleccionista@cromos.test` (va a valorar)

**Prerequisito:** Plantilla "Mundial Qatar 2022 - Oficial" debe estar en colección del valorador

**Estado inicial:** La plantilla NO tiene ratings aún (es nueva)

### 🧪 Pasos del Test

#### 1. Ir a la plantilla a valorar

1. Como usuario `qa.coleccionista@cromos.test`
2. Ir a **"Mis Colecciones"**
3. Abrir **"Mundial Qatar 2022 - Oficial"**
4. O bien, ir a la página pública de la plantilla

#### 2. Buscar sección de valoración

Debe haber una sección con:
- ✅ Título: "Valorar esta plantilla" o "Rating"
- ✅ Sistema de estrellas: ⭐⭐⭐⭐⭐ (1-5 estrellas)
- ✅ O bien, números del 1 al 5
- ✅ Rating actual: Puede mostrar "Sin valoraciones" o "0 valoraciones"

#### 3. Dar valoración de 5 estrellas

1. Hacer clic en la **quinta estrella** (⭐⭐⭐⭐⭐)
2. O seleccionar **"5"** si es numérico
3. Puede aparecer botón **"Enviar valoración"** o guardarse automáticamente

**Lo que DEBE pasar:**

- ✅ Mensaje de confirmación: "Valoración enviada" o "Gracias por tu valoración"
- ✅ Las 5 estrellas quedan resaltadas/llenas
- ✅ Aparece tu valoración reflejada

#### 4. Verificar rating promedio

1. Cerrar sesión
2. Abrir plantilla como **usuario no logueado** o como otro usuario
3. Buscar el rating promedio de la plantilla

**Debe mostrar:**

- ✅ **"5.0 ⭐"** o **"⭐⭐⭐⭐⭐ (5.0)"**
- ✅ **"1 valoración"** o **"(1)"**

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar el rating que acabas de dar
SELECT
    tr.id,
    tr.template_id,
    tr.user_id,
    tr.rating,               -- Debe ser 5
    tr.created_at,
    -- Datos del usuario que valoró
    p.nickname AS valorador,
    -- Datos de la plantilla valorada
    ct.title AS plantilla
FROM template_ratings tr
JOIN profiles p ON p.id = tr.user_id
JOIN collection_templates ct ON ct.id = tr.template_id
WHERE tr.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial'
ORDER BY tr.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `rating` | `5` ← **Importante: debe ser 5** |
| `valorador` | Nickname de `qa.coleccionista@cromos.test` |
| `plantilla` | `Mundial Qatar 2022 - Oficial` |
| `created_at` | Timestamp reciente |

**Si ves 0 filas:** ❌ El rating NO se guardó

#### Calcular rating promedio

```sql
-- Calcular promedio de ratings de la plantilla
SELECT
    ct.title,
    COUNT(tr.id) AS total_valoraciones,
    AVG(tr.rating) AS rating_promedio,
    MIN(tr.rating) AS rating_minimo,
    MAX(tr.rating) AS rating_maximo
FROM collection_templates ct
LEFT JOIN template_ratings tr ON tr.template_id = ct.id
WHERE ct.title = 'Mundial Qatar 2022 - Oficial'
GROUP BY ct.id, ct.title;
```

**Resultado esperado:**

| total_valoraciones | rating_promedio | rating_minimo | rating_maximo |
|--------------------|-----------------|---------------|---------------|
| 1 | 5.00 | 5 | 5 |

**Si solo hay tu valoración, promedio debe ser exactamente 5.0**

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Sistema de estrellas funciona
2. ✅ Mensaje de confirmación aparece
3. ✅ SQL muestra rating = 5 para tu usuario
4. ✅ Rating promedio mostrado es 5.0
5. ✅ Contador muestra "1 valoración"

Marca el test como **Failed** ❌ si:

- ❌ SQL retorna 0 filas (rating no se guardó)
- ❌ Rating promedio no se actualiza
- ❌ No aparece contador de valoraciones

---

## 📊 Resumen de Tests - Archivo 02

| Test ID | Nombre | Complejidad | Tiempo Est. | Estado |
|---------|--------|-------------|-------------|--------|
| CP-F02-02A | Añadir plantilla a colección | Baja | 20 min | - |
| CP-F02-02B | Marcar cromos como "tengo" | Media | 20 min | - |
| CP-F02-02C | Persistencia tras refresh | Baja | 15 min | - |
| CP-F02-02D | Desmarcar cromos | Baja | 15 min | - |
| CP-F02-02E | Valorar plantilla (rating) | Media | 20 min | - |

**Total:** ~1 hora 30 minutos

---

## 🧹 Limpieza de Datos (Opcional)

Si necesitas resetear el progreso para volver a ejecutar tests:

```sql
-- CUIDADO: Esto elimina TODO tu progreso en la plantilla de Qatar
-- Solo ejecutar en entorno de testing

-- Eliminar cromos marcados
DELETE FROM collection_items
WHERE copy_id IN (
    SELECT cc.id
    FROM collection_copies cc
    JOIN collection_templates ct ON ct.id = cc.template_id
    WHERE cc.user_id = (SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test')
      AND ct.title = 'Mundial Qatar 2022 - Oficial'
);

-- Eliminar la copia completa (si quieres empezar desde cero)
DELETE FROM collection_copies
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'qa.coleccionista@cromos.test')
  AND template_id IN (
      SELECT id FROM collection_templates WHERE title = 'Mundial Qatar 2022 - Oficial'
  );
```

---

## ✅ Checklist Post-Tests

- [ ] Actualicé `Test_Tracking_Spreadsheet.csv` con resultados
- [ ] Verifiqué que los 5 tests pasaron
- [ ] Reporté bugs encontrados (si los hay)
- [ ] Entiendo cómo funciona el sistema de progreso (owned = true/false)

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
