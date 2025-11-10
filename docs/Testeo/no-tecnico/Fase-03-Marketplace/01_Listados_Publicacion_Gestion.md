# Tests No-Técnicos - Fase 03: Marketplace (Publicación y Gestión)

## 📋 Información General

**Fase:** Fase-03
**Categoría:** Marketplace - Publicación de Listados
**Archivo:** 01_Listados_Publicacion_Gestion.md
**Cantidad de tests:** 8 casos de prueba
**Tiempo estimado total:** ~2.5 horas

---

## 🎯 Objetivo de Este Archivo

Este archivo contiene tests para verificar que los usuarios pueden:

1. ✅ Publicar cromos individuales para venta/intercambio
2. ✅ Editar listados activos
3. ✅ Marcar listados como vendidos/completados
4. ✅ Eliminar listados
5. ✅ Ver listados propios organizados por estado
6. ✅ Validación de campos obligatorios (título, precio, tipo)

---

## 📚 Prerequisitos

Antes de ejecutar estos tests:

- ✅ Completar tests de Fase-01 (autenticación) y Fase-02 (plantillas)
- ✅ Tener usuario registrado: `qa.vendedor@cromos.test`
- ✅ Usuario debe tener al menos 1 colección con cromos marcados

---

## Caso CP-F03-01A: Publicar cromo para venta

### 🎯 Objetivo

Verificar que un usuario puede publicar un cromo individual para venta en el marketplace.

### 📋 Preparación (Setup)

**Usuario necesario:**
- Email: `qa.vendedor@cromos.test`
- Contraseña: `Test1234!`
- Estado: Registrado, con colección "Mundial Qatar 2022 - Oficial"

**Pasos de preparación:**

1. **Hacer login** como `qa.vendedor@cromos.test`
2. Verificar que estás logueado
3. Ir a **"Mis Colecciones"**
4. Abrir **"Mundial Qatar 2022 - Oficial"**
5. Asegurarte de tener al menos 1 cromo marcado como "tengo"

### 🧪 Pasos del Test

#### 1. Navegar a creación de listado

Desde la colección, buscar botón o sección:
- **"Vender/Intercambiar cromos"**
- **"+ Publicar en Marketplace"**
- **"Crear listado"**

Hacer clic para abrir formulario de publicación.

#### 2. Rellenar el formulario

**Datos a introducir:**

- **Título:** `Cromo Messi #10 - Qatar 2022`
- **Descripción:** `Cromo oficial de Lionel Messi, edición Copa del Mundo Qatar 2022. Estado: Nuevo, sin doblar.`
- **Tipo de listado:** Seleccionar **"Venta"**
- **Precio:** `15.00` (euros o moneda configurada)
- **Número de cromo:** `10` (si aplica, depende de implementación)
- **Cantidad disponible:** `1`
- **Estado del cromo:** Seleccionar **"Nuevo"** o **"Como nuevo"**

**Campos opcionales (si existen):**
- Fotos: Subir imagen (opcional para test, dejar vacío si no es obligatorio)
- Ubicación: Puede autocompletarse o dejarse como está

#### 3. Publicar listado

1. Hacer clic en **"Publicar"** o **"Crear listado"**
2. Esperar indicador de carga (spinner)
3. Observar feedback

**Lo que DEBE pasar:**

- ✅ Mensaje de éxito: "Listado publicado correctamente" o similar
- ✅ Redirigido a vista de detalle del listado
- ✅ O redirigido a "Mis Listados"
- ✅ URL cambia (ej: `/marketplace/listings/{listing_id}`)

**Lo que NO debe pasar:**

- ❌ Error o validación fallida
- ❌ Formulario se queda en blanco sin hacer nada

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar el listado recién publicado
SELECT
    tl.id,
    tl.title,
    tl.description,
    tl.listing_type,         -- Debe ser 'sale' (venta)
    tl.price,
    tl.quantity,
    tl.status,               -- Debe ser 'active' (activo)
    tl.user_id,
    tl.created_at,
    p.nickname AS vendedor
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test'
)
  AND tl.title = 'Cromo Messi #10 - Qatar 2022'
ORDER BY tl.created_at DESC
LIMIT 1;
```

**¿Qué hace esta consulta?**

- **Línea 2-10:** Campos del listado que queremos verificar
- **Línea 11:** Buscamos en tabla `trade_listings` (listados del marketplace)
- **Línea 12:** Unimos con `profiles` para obtener el nickname del vendedor
- **Línea 13-15:** Filtramos por tu usuario
- **Línea 16:** Buscamos el título exacto que pusiste
- **Línea 17-18:** Ordenamos por fecha y mostramos el más reciente

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `title` | `Cromo Messi #10 - Qatar 2022` |
| `description` | (La descripción que pusiste) |
| `listing_type` | `sale` ← **Importante: venta** |
| `price` | `15.00` |
| `quantity` | `1` |
| `status` | `active` ← **Debe estar activo** |
| `vendedor` | Tu nickname |
| `created_at` | Hace pocos minutos |

**Si ves 0 filas:** ❌ El listado NO se guardó

#### Verificación en Consola de Chrome

1. Abrir DevTools (F12) → Pestaña **"Console"**
2. Verificar que no hay errores rojos

**Lo que debes ver:**

- ✅ No hay errores rojos
- ✅ Puede haber request: `POST /rest/v1/trade_listings` (es correcto)

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Formulario se envió sin errores
2. ✅ Mensaje de éxito aparece
3. ✅ SQL retorna 1 fila con datos correctos
4. ✅ `listing_type = 'sale'`
5. ✅ `status = 'active'`
6. ✅ No hay errores en consola

Marca el test como **Failed** ❌ si:

- ❌ SQL retorna 0 filas
- ❌ `listing_type` incorrecto
- ❌ `status != 'active'`

**Actualizar en:** `Test_Tracking_Spreadsheet.csv` → Test_ID: `CP-F03-01A`

---

## Caso CP-F03-01B: Publicar cromo para intercambio

### 🎯 Objetivo

Verificar que un usuario puede publicar un cromo para intercambio (sin precio, solo trade).

### 📋 Preparación (Setup)

**Usuario:** `qa.vendedor@cromos.test` (mismo del test anterior)

### 🧪 Pasos del Test

#### 1. Crear nuevo listado

1. Ir a **"+ Publicar en Marketplace"**
2. Rellenar formulario:

- **Título:** `Cambio Cristiano Ronaldo #7 por Neymar`
- **Descripción:** `Busco intercambiar cromo de Cristiano Ronaldo por cualquier cromo de Neymar Jr. Ambos en buen estado.`
- **Tipo de listado:** Seleccionar **"Intercambio"** o **"Trade"**
- **Precio:** Dejar vacío o en 0 (si es intercambio, precio no aplica)
- **Número de cromo:** `7`
- **Cantidad:** `1`

#### 2. Publicar y verificar

1. Clic en **"Publicar"**
2. Verificar mensaje de éxito

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar el listado de intercambio
SELECT
    tl.id,
    tl.title,
    tl.listing_type,         -- Debe ser 'trade' (intercambio)
    tl.price,                -- Debe ser NULL o 0
    tl.status
FROM trade_listings tl
WHERE tl.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test'
)
  AND tl.title LIKE '%Cristiano Ronaldo%'
ORDER BY tl.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `listing_type` | `trade` ← **Intercambio** |
| `price` | `NULL` o `0.00` |
| `status` | `active` |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Listado se publicó exitosamente
2. ✅ SQL muestra `listing_type = 'trade'`
3. ✅ Precio es NULL o 0 (no aplica para intercambios)
4. ✅ Status es 'active'

---

## Caso CP-F03-01C: Editar listado activo

### 🎯 Objetivo

Verificar que el usuario puede editar el título, descripción y precio de un listado activo.

### 📋 Preparación (Setup)

**Usuario:** `qa.vendedor@cromos.test`

**Prerequisito:** Tener listado "Cromo Messi #10 - Qatar 2022" publicado (CP-F03-01A)

### 🧪 Pasos del Test

#### 1. Ir a mis listados

1. Navegar a **"Mis Listados"** o **"Mis Publicaciones"**
2. Buscar el listado **"Cromo Messi #10 - Qatar 2022"**
3. Hacer clic para abrir detalle

#### 2. Abrir modo edición

Buscar y hacer clic en:
- Botón **"Editar"**
- Icono de lápiz ✏️
- Menú ⋮ → "Editar listado"

Deberías ver el formulario de edición con valores actuales.

#### 3. Modificar campos

**Cambiar:**

- **Título:** `Cromo Messi #10 - REBAJADO` ← (agregar "REBAJADO")
- **Precio:** `12.00` ← (bajar de 15.00 a 12.00)
- **Descripción:** Agregar al final: ` ¡Precio rebajado por tiempo limitado!`

**NO cambiar:** Tipo de listado, cantidad, estado del cromo

#### 4. Guardar cambios

1. Clic en **"Guardar"** o **"Actualizar"**
2. Esperar mensaje: "Listado actualizado correctamente"
3. Verificar que cambios aparecen en la vista de detalle

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que cambios se guardaron
SELECT
    tl.id,
    tl.title,
    tl.price,
    tl.description,
    tl.updated_at,
    -- Segundos desde la última actualización
    EXTRACT(EPOCH FROM (NOW() - tl.updated_at)) AS segundos_desde_update
FROM trade_listings tl
WHERE tl.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test'
)
  AND tl.title LIKE '%REBAJADO%'
ORDER BY tl.updated_at DESC
LIMIT 1;
```

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `title` | `Cromo Messi #10 - REBAJADO` |
| `price` | `12.00` (rebajado de 15.00) |
| `description` | Contiene "¡Precio rebajado por tiempo limitado!" |
| `segundos_desde_update` | < 120 (menos de 2 minutos) |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Editar" funciona
2. ✅ Formulario muestra valores actuales
3. ✅ Cambios se guardan correctamente
4. ✅ SQL muestra título y precio actualizados
5. ✅ `updated_at` es reciente

---

## Caso CP-F03-01D: Marcar listado como vendido/completado

### 🎯 Objetivo

Verificar que el usuario puede cambiar el estado de un listado activo a "vendido" o "completado".

### 📋 Preparación (Setup)

**Usuario:** `qa.vendedor@cromos.test`

**Prerequisito:** Tener listado activo (cualquiera de los anteriores)

### 🧪 Pasos del Test

#### 1. Ir al listado

1. Navegar a **"Mis Listados"**
2. Abrir listado **"Cromo Messi #10 - REBAJADO"**

#### 2. Marcar como completado

Buscar opción para cambiar estado:
- Botón **"Marcar como vendido"**
- Dropdown: **Estado: Activo → Vendido**
- Checkbox: ☑ **"Ya vendí este cromo"**

Hacer clic o seleccionar "Vendido" / "Completado"

**Puede aparecer confirmación:**
- "¿Estás seguro? El listado dejará de ser visible en el marketplace"
- Confirmar

**Lo que DEBE pasar:**

- ✅ Mensaje: "Listado marcado como vendido"
- ✅ Badge cambia de "Activo" a "Vendido" o "Completado"
- ✅ Puede aparecer en sección separada: "Listados completados"

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que status cambió
SELECT
    tl.id,
    tl.title,
    tl.status,               -- Debe ser 'sold' o 'completed'
    tl.updated_at
FROM trade_listings tl
WHERE tl.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test'
)
  AND tl.title LIKE '%REBAJADO%'
LIMIT 1;
```

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `status` | `sold` o `completed` ← **Ya NO es 'active'** |
| `updated_at` | Timestamp reciente |

#### Verificar que NO aparece en marketplace público

**En ventana de incógnito (sin login):**

1. Ir a **"Marketplace"** o **"Explorar cromos"**
2. Buscar "Messi REBAJADO"

**Resultado esperado:**

- ✅ El listado **NO debe aparecer** en resultados de búsqueda pública
- ✅ Solo listados con `status = 'active'` deben ser visibles

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón/opción "Marcar como vendido" funciona
2. ✅ SQL muestra `status = 'sold'` o `'completed'`
3. ✅ Badge visual cambia a "Vendido"
4. ✅ Listado NO aparece en búsqueda pública del marketplace

---

## Caso CP-F03-01E: Reactivar listado vendido

### 🎯 Objetivo

Verificar que el usuario puede volver a activar un listado marcado como vendido (por si se equivocó o la venta cayó).

### 📋 Preparación (Setup)

**Usuario:** `qa.vendedor@cromos.test`

**Prerequisito:** Tener listado con `status = 'sold'` (del test anterior)

### 🧪 Pasos del Test

#### 1. Ir a listados completados/vendidos

1. Navegar a **"Mis Listados"**
2. Buscar sección o filtro: **"Vendidos"** / **"Completados"**
3. Abrir listado **"Cromo Messi #10 - REBAJADO"**

#### 2. Reactivar listado

Buscar opción:
- Botón **"Reactivar listado"**
- **"Volver a publicar"**
- Dropdown: **Estado: Vendido → Activo**

Hacer clic y confirmar (si hay diálogo)

**Lo que DEBE pasar:**

- ✅ Mensaje: "Listado reactivado"
- ✅ Badge vuelve a "Activo"
- ✅ Listado aparece nuevamente en marketplace público

---

### 🔍 Validaciones Técnicas

```sql
-- Verificar que status volvió a 'active'
SELECT
    tl.id,
    tl.title,
    tl.status,               -- Debe ser 'active' nuevamente
    tl.updated_at
FROM trade_listings tl
WHERE tl.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test'
)
  AND tl.title LIKE '%REBAJADO%';
```

**Resultado esperado:**

| status |
|--------|
| `active` ← Reactivado |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Reactivar" funciona
2. ✅ SQL muestra `status = 'active'`
3. ✅ Listado vuelve a aparecer en marketplace público

---

## Caso CP-F03-01F: Eliminar listado

### 🎯 Objetivo

Verificar que el usuario puede eliminar permanentemente un listado.

### 📋 Preparación (Setup)

**Usuario:** `qa.vendedor@cromos.test`

**Prerequisito:** Tener al menos 2 listados (para no quedarnos sin ninguno)

### 🧪 Pasos del Test

#### 1. Ir al listado de intercambio

1. **"Mis Listados"**
2. Abrir **"Cambio Cristiano Ronaldo #7 por Neymar"** (el de intercambio)

#### 2. Eliminar listado

Buscar:
- Botón **"Eliminar"** o icono de basura 🗑️
- Menú ⋮ → **"Eliminar listado"**

Hacer clic

**Debe aparecer confirmación:**

- "¿Estás seguro de eliminar este listado?"
- "Esta acción no se puede deshacer"

Confirmar eliminación

**Lo que DEBE pasar:**

- ✅ Mensaje: "Listado eliminado correctamente"
- ✅ Redirigido a "Mis Listados"
- ✅ El listado de Cristiano Ronaldo **ya NO aparece**

---

### 🔍 Validaciones Técnicas

```sql
-- Buscar el listado eliminado (NO debería existir)
SELECT
    tl.id,
    tl.title,
    tl.status
FROM trade_listings tl
WHERE tl.user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test'
)
  AND tl.title LIKE '%Cristiano Ronaldo%';
```

**Resultado esperado:**

- ✅ **0 filas** (listado eliminado completamente)

**O bien, si usan soft delete:**

- 1 fila con `status = 'deleted'` o campo `deleted_at` NOT NULL

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Eliminar" funciona
2. ✅ Aparece confirmación
3. ✅ SQL retorna 0 filas (hard delete) O status = 'deleted' (soft delete)
4. ✅ Listado no aparece en "Mis Listados"

---

## Caso CP-F03-01G: Validación de campos obligatorios

### 🎯 Objetivo

Verificar que el formulario de publicación valida correctamente campos obligatorios.

### 📋 Preparación (Setup)

**Usuario:** `qa.vendedor@cromos.test`

### 🧪 Pasos del Test

#### Test 1: Título vacío

1. Ir a **"+ Publicar en Marketplace"**
2. Dejar **Título** vacío
3. Rellenar otros campos:
   - Precio: `10`
   - Tipo: Venta
4. Intentar clic en **"Publicar"**

**Resultado esperado:**

- ✅ Botón deshabilitado (gris, no clickeable)
- ✅ O error: "El título es obligatorio"
- ✅ Campo "Título" con borde rojo

#### Test 2: Precio inválido para venta

1. **Título:** `Test Validación`
2. **Tipo:** Venta
3. **Precio:** Dejar vacío o poner `0`
4. Intentar publicar

**Resultado esperado:**

- ✅ Error: "El precio es obligatorio para ventas"
- ✅ O: "El precio debe ser mayor a 0"

#### Test 3: Precio negativo

1. **Precio:** `-10`
2. Intentar publicar

**Resultado esperado:**

- ✅ Error: "El precio no puede ser negativo"
- ✅ O el input no permite números negativos

#### Test 4: Cantidad 0

1. **Cantidad:** `0`
2. Intentar publicar

**Resultado esperado:**

- ✅ Error: "La cantidad debe ser al menos 1"

---

### 🔍 Validaciones Técnicas

#### Verificación en Consola de Chrome

1. DevTools (F12) → **"Network"**
2. Intentar enviar con título vacío
3. Verificar que **NO se hace request** a la API

**Resultado esperado:**

- ✅ NO debe haber request `POST /trade_listings`
- ✅ Validación ocurre en cliente antes de enviar

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Título vacío es rechazado
2. ✅ Precio = 0 para ventas es rechazado
3. ✅ Números negativos son rechazados
4. ✅ Cantidad = 0 es rechazada
5. ✅ Mensajes de error son claros
6. ✅ NO se hace request con datos inválidos

---

## Caso CP-F03-01H: Filtrar mis listados por estado

### 🎯 Objetivo

Verificar que el usuario puede filtrar sus listados por estado (activos, vendidos, todos).

### 📋 Preparación (Setup)

**Usuario:** `qa.vendedor@cromos.test`

**Prerequisito:** Tener al menos:
- 1 listado activo
- 1 listado vendido/completado

### 🧪 Pasos del Test

#### 1. Ver todos los listados

1. Ir a **"Mis Listados"**
2. Verificar que hay al menos 2 listados visibles

#### 2. Filtrar por "Activos"

Buscar filtro/tabs:
- Tab **"Activos"**
- Dropdown: **Estado: Activos**
- Checkbox: ☑ **"Solo activos"**

Seleccionar "Activos"

**Resultado esperado:**

- ✅ Solo aparecen listados con badge "Activo"
- ✅ Listados vendidos NO se muestran

#### 3. Filtrar por "Vendidos"

Cambiar a tab/filtro **"Vendidos"** o **"Completados"**

**Resultado esperado:**

- ✅ Solo aparecen listados marcados como vendidos
- ✅ Listados activos NO se muestran

#### 4. Ver todos

Seleccionar **"Todos"** o quitar filtro

**Resultado esperado:**

- ✅ Aparecen TODOS los listados (activos + vendidos)

---

### 🔍 Validaciones Técnicas

```sql
-- Contar listados por estado
SELECT
    status,
    COUNT(*) AS cantidad
FROM trade_listings
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test'
)
GROUP BY status;
```

**Resultado esperado (ejemplo):**

| status | cantidad |
|--------|----------|
| active | 1 |
| sold | 1 |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Filtro/tabs de estado existen y funcionan
2. ✅ Filtrar por "Activos" muestra solo activos
3. ✅ Filtrar por "Vendidos" muestra solo vendidos
4. ✅ "Todos" muestra ambos tipos

---

## 📊 Resumen de Tests - Archivo 01

| Test ID | Nombre | Complejidad | Tiempo Est. | Estado |
|---------|--------|-------------|-------------|--------|
| CP-F03-01A | Publicar para venta | Baja | 20 min | - |
| CP-F03-01B | Publicar para intercambio | Baja | 15 min | - |
| CP-F03-01C | Editar listado activo | Baja | 20 min | - |
| CP-F03-01D | Marcar como vendido | Media | 20 min | - |
| CP-F03-01E | Reactivar listado | Baja | 15 min | - |
| CP-F03-01F | Eliminar listado | Media | 20 min | - |
| CP-F03-01G | Validación de campos | Baja | 20 min | - |
| CP-F03-01H | Filtrar por estado | Baja | 15 min | - |

**Total:** ~2 horas 25 minutos

---

## ✅ Checklist Post-Tests

- [ ] Actualicé `Test_Tracking_Spreadsheet.csv` con resultados
- [ ] Verifiqué que listados se crean con `status = 'active'`
- [ ] Comprobé que listados vendidos NO aparecen en marketplace público
- [ ] Confirmé que validaciones funcionan antes de enviar formulario

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
