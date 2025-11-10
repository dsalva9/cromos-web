# Tests No-Técnicos - Fase 02: Plantillas (Creación y Edición)

## 📋 Información General

**Fase:** Fase-02
**Categoría:** Plantillas y Colecciones
**Archivo:** 01_Plantillas_Creacion_Edicion.md
**Cantidad de tests:** 7 casos de prueba
**Tiempo estimado total:** ~2 horas

---

## 🎯 Objetivo de Este Archivo

Este archivo contiene tests para verificar que los usuarios pueden:

1. ✅ Crear nuevas plantillas de colección
2. ✅ Editar plantillas existentes
3. ✅ Cambiar la visibilidad (pública/privada)
4. ✅ Eliminar plantillas propias
5. ✅ Ver plantillas de otros usuarios sin poder editarlas

---

## 📚 Prerequisitos

Antes de ejecutar estos tests, asegúrate de haber:

- ✅ Leído `GUIA_DE_CONSULTAS_SQL.md`
- ✅ Leído `GUIA_DE_CONSOLA_CHROME.md`
- ✅ Completado tests de Fase-01 (autenticación)
- ✅ Tienes acceso a Supabase Dashboard

---

## Caso CP-F02-01A: Crear plantilla pública

### 🎯 Objetivo

Verificar que un usuario autenticado puede crear una nueva plantilla de colección con visibilidad pública.

### 📋 Preparación (Setup)

**Usuario necesario:**
- Email: `qa.plantillas@cromos.test`
- Contraseña: `Test1234!`
- Estado: Registrado y con email confirmado

**Pasos de preparación:**

1. **Abrir navegador en modo incógnito** (Ctrl + Shift + N)
2. **Ir a** `https://cambio-cromos.vercel.app`
3. **Hacer login** con el usuario `qa.plantillas@cromos.test`
4. **Verificar que estás logueado:** Debe aparecer tu nombre/avatar en esquina superior derecha

### 🧪 Pasos del Test

#### 1. Navegar a creación de plantilla

1. En la página principal, buscar el botón **"Mis Plantillas"** o **"Colecciones"**
2. Hacer clic en **"+ Nueva Plantilla"** o **"Crear Plantilla"**
3. Deberías ver un formulario con los siguientes campos:
   - **Título** (obligatorio)
   - **Descripción** (opcional)
   - **Visibilidad:** Pública / Privada (por defecto: Pública)
   - **Total de cromos** (número, obligatorio)

#### 2. Rellenar el formulario

Introduce los siguientes datos **exactamente como aparecen:**

- **Título:** `Mundial Qatar 2022 - Completa`
- **Descripción:** `Colección oficial de la Copa del Mundo Qatar 2022 con 670 cromos numerados.`
- **Visibilidad:** Seleccionar **"Pública"** (debe estar marcado por defecto)
- **Total de cromos:** `670`

#### 3. Guardar la plantilla

1. Hacer clic en el botón **"Crear Plantilla"** o **"Guardar"**
2. El botón debe mostrar un indicador de carga (spinner o "Guardando...")
3. Esperar 2-3 segundos

#### 4. Verificar feedback visual

**Lo que DEBE pasar:**

- ✅ Aparece mensaje de éxito: "Plantilla creada exitosamente" o similar
- ✅ Eres redirigido a la página de detalle de la plantilla
- ✅ La URL cambia a algo como: `/templates/{template_id}` o `/colecciones/{template_id}`
- ✅ Ves el título "Mundial Qatar 2022 - Completa" en la página
- ✅ Ves la descripción completa
- ✅ Ves "670 cromos" o similar
- ✅ Hay un badge/etiqueta que dice "Pública"

**Lo que NO debe pasar:**

- ❌ Mensaje de error
- ❌ Formulario se queda en la misma página sin hacer nada
- ❌ Errores rojos en la consola de Chrome

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

**Abre Supabase Dashboard → SQL Editor** y ejecuta:

```sql
-- Esta consulta busca la plantilla que acabas de crear
SELECT
    ct.id,                    -- ID único de la plantilla
    ct.title,                 -- Título que pusiste
    ct.description,           -- Descripción
    ct.is_public,             -- ¿Es pública? (debe ser TRUE)
    ct.total_items,           -- Total de cromos (670)
    ct.author_id,             -- Tu ID de usuario
    ct.created_at,            -- Fecha de creación
    p.nickname AS autor       -- Tu nickname
FROM collection_templates ct
JOIN profiles p ON p.id = ct.author_id
WHERE ct.title = 'Mundial Qatar 2022 - Completa'
  AND ct.author_id = (
      SELECT id FROM auth.users WHERE email = 'qa.plantillas@cromos.test'
  )
ORDER BY ct.created_at DESC
LIMIT 1;
```

**¿Qué hace cada línea?**

- **Línea 2-8:** Seleccionamos los campos que queremos ver
- **Línea 9:** Buscamos en la tabla `collection_templates` (plantillas)
- **Línea 10:** Unimos con `profiles` para obtener el nickname del autor
- **Línea 11:** Filtramos por el título exacto que pusiste
- **Línea 12-14:** Solo mostramos plantillas creadas por tu usuario
- **Línea 15-16:** Ordenamos por fecha (más reciente primero) y mostramos solo 1 resultado

**Resultado esperado:**

Debes ver **1 fila** con estos valores:

| Campo | Valor Esperado |
|-------|----------------|
| `title` | `Mundial Qatar 2022 - Completa` |
| `description` | `Colección oficial de la Copa del Mundo Qatar 2022 con 670 cromos numerados.` |
| `is_public` | `true` ← **Importante: debe ser TRUE** |
| `total_items` | `670` |
| `created_at` | Fecha y hora de hace pocos minutos |
| `autor` | Tu nickname (o NULL si no has configurado uno) |

**Si ves 0 filas:** La plantilla NO se guardó. Reporta este error.

#### Verificación en Consola de Chrome

1. **Abrir Chrome DevTools:** Presiona `F12`
2. **Ir a pestaña "Console"**
3. **Buscar errores rojos**

**Lo que debes ver:**

- ✅ No hay errores rojos (excepto warnings amarillos que son normales)
- ✅ Puede haber mensajes como `[Supabase] POST /rest/v1/collection_templates` (es correcto)

**Lo que NO debes ver:**

- ❌ Errores rojos con palabras clave: `401`, `403`, `500`, `error`, `failed`
- ❌ Mensaje como `RLS policy violation` (error de permisos)

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ El formulario se envió sin errores
2. ✅ Aparece mensaje de éxito en la UI
3. ✅ La consulta SQL retorna **1 fila** con datos correctos
4. ✅ `is_public = true` en la base de datos
5. ✅ No hay errores rojos en la consola de Chrome

Marca el test como **Failed** ❌ si:

- ❌ La consulta SQL retorna 0 filas
- ❌ `is_public = false` (debería ser TRUE)
- ❌ Hay errores rojos en consola
- ❌ No aparece mensaje de éxito

**Actualizar en:** `Test_Tracking_Spreadsheet.csv`

- **Test_ID:** `CP-F02-01A`
- **Estado:** `Passed` o `Failed`
- **Notas:** (Si falló, describe el problema)

---

## Caso CP-F02-01B: Crear plantilla privada

### 🎯 Objetivo

Verificar que un usuario puede crear una plantilla con visibilidad **privada** (solo visible para él).

### 📋 Preparación (Setup)

**Usuario:** El mismo del test anterior (`qa.plantillas@cromos.test`)

**Pasos de preparación:**

1. **Asegúrate de seguir logueado** del test anterior
2. Si cerraste sesión, vuelve a hacer login

### 🧪 Pasos del Test

#### 1. Ir a crear nueva plantilla

1. Navegar a **"Mis Plantillas"**
2. Hacer clic en **"+ Nueva Plantilla"**

#### 2. Rellenar formulario con plantilla privada

Introduce los siguientes datos:

- **Título:** `Mi Colección Pokémon Personal`
- **Descripción:** `Colección privada de cartas Pokémon raras que estoy coleccionando.`
- **Visibilidad:** Seleccionar **"Privada"** ← **¡Importante!**
- **Total de cromos:** `150`

**⚠️ Importante:** Asegúrate de cambiar la visibilidad a **"Privada"**. Puede estar en forma de:
- Checkbox: ☑ Hacer pública / ☐ Hacer privada
- Toggle switch: Público 🔘 Privado
- Radio buttons: ⚪ Pública / ⚫ Privada

#### 3. Guardar y verificar

1. Clic en **"Crear Plantilla"**
2. Esperar mensaje de éxito
3. Verificar que fuiste redirigido a la página de detalle
4. **Buscar indicador visual de privacidad:**
   - Badge que diga "Privada" o "Private"
   - Icono de candado 🔒
   - Mensaje: "Solo tú puedes ver esta plantilla"

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar la plantilla privada recién creada
SELECT
    ct.id,
    ct.title,
    ct.description,
    ct.is_public,            -- Debe ser FALSE
    ct.total_items,
    ct.created_at,
    p.nickname AS autor
FROM collection_templates ct
JOIN profiles p ON p.id = ct.author_id
WHERE ct.title = 'Mi Colección Pokémon Personal'
  AND ct.author_id = (
      SELECT id FROM auth.users WHERE email = 'qa.plantillas@cromos.test'
  )
ORDER BY ct.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `title` | `Mi Colección Pokémon Personal` |
| `is_public` | `false` ← **Debe ser FALSE (privada)** |
| `total_items` | `150` |

**⚠️ CRÍTICO:** Si `is_public = true`, el test FALLÓ. La plantilla debería ser privada.

#### Verificación adicional: Plantilla NO aparece en búsqueda pública

**En otra ventana de incógnito (sin login):**

1. Abrir nueva ventana incógnito (Ctrl + Shift + N)
2. Ir a `https://cambio-cromos.vercel.app`
3. **NO hacer login**
4. Buscar sección de "Plantillas Públicas" o "Explorar Colecciones"
5. Buscar la plantilla "Mi Colección Pokémon Personal"

**Resultado esperado:**

- ✅ La plantilla **NO debe aparecer** en la lista pública
- ✅ Si hay buscador, buscar "Pokémon Personal" debe retornar 0 resultados

**Si la plantilla aparece en búsqueda pública:** ❌ **Test FALLIDO** - Hay problema de privacidad

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Plantilla se creó exitosamente
2. ✅ SQL muestra `is_public = false`
3. ✅ Badge/icono indica que es privada
4. ✅ Plantilla NO aparece en búsqueda pública (sin login)

Marca el test como **Failed** ❌ si:

- ❌ `is_public = true` (debería ser FALSE)
- ❌ Plantilla aparece en búsqueda pública
- ❌ No hay indicador visual de privacidad

**Actualizar en:** `Test_Tracking_Spreadsheet.csv`

---

## Caso CP-F02-01C: Editar título y descripción

### 🎯 Objetivo

Verificar que el autor de una plantilla puede editar el título y descripción de su propia plantilla.

### 📋 Preparación (Setup)

**Usuario:** Mismo del test anterior (`qa.plantillas@cromos.test`)

**Prerequisito:** La plantilla "Mundial Qatar 2022 - Completa" debe existir (creada en CP-F02-01A)

### 🧪 Pasos del Test

#### 1. Ir a detalle de plantilla

1. Navegar a **"Mis Plantillas"**
2. Buscar la plantilla **"Mundial Qatar 2022 - Completa"**
3. Hacer clic en ella para abrir la vista de detalle

#### 2. Abrir modo edición

Buscar y hacer clic en uno de estos botones:
- **"Editar"**
- **"✏️ Editar Plantilla"**
- Icono de lápiz ✏️

Deberías ver el formulario de edición con los valores actuales pre-cargados.

#### 3. Modificar título y descripción

**Cambiar:**

- **Título:** `Mundial Qatar 2022 - Oficial` ← (cambiar "Completa" por "Oficial")
- **Descripción:** `Álbum oficial de la FIFA World Cup Qatar 2022. Incluye 670 cromos de selecciones y estadios.` ← (nueva descripción)
- **NO cambiar** la visibilidad ni el total de cromos

#### 4. Guardar cambios

1. Hacer clic en **"Guardar"** o **"Actualizar"**
2. Esperar mensaje de confirmación: "Plantilla actualizada" o similar
3. Verificar que los cambios aparecen en la página

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que título y descripción se actualizaron
SELECT
    ct.id,
    ct.title,
    ct.description,
    ct.is_public,
    ct.total_items,
    ct.updated_at,           -- Fecha de última actualización
    -- Calcular segundos desde la actualización
    EXTRACT(EPOCH FROM (NOW() - ct.updated_at)) AS segundos_desde_update
FROM collection_templates ct
WHERE ct.author_id = (
    SELECT id FROM auth.users WHERE email = 'qa.plantillas@cromos.test'
)
  AND ct.title = 'Mundial Qatar 2022 - Oficial'  -- Título NUEVO
ORDER BY ct.updated_at DESC
LIMIT 1;
```

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `title` | `Mundial Qatar 2022 - Oficial` ← Título actualizado |
| `description` | `Álbum oficial de la FIFA World Cup Qatar 2022. Incluye 670 cromos de selecciones y estadios.` |
| `is_public` | `true` (sin cambios) |
| `total_items` | `670` (sin cambios) |
| `segundos_desde_update` | < 120 (menos de 2 minutos) |

**Si ves el título antiguo "Completa":** ❌ El update no funcionó

#### Verificación en Consola de Chrome

1. Abrir DevTools (F12) → Pestaña **"Network"**
2. Filtrar por `PATCH` o `PUT` (métodos HTTP de actualización)
3. Buscar request a `/collection_templates` o `/templates`

**Resultado esperado:**

- ✅ Debe haber un request `PATCH` o `PUT` con status **200** (éxito)
- ✅ En la pestaña "Response" debe aparecer el objeto actualizado con el nuevo título

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Editar" es visible y funciona
2. ✅ Formulario muestra valores actuales pre-cargados
3. ✅ Cambios se guardan exitosamente
4. ✅ SQL muestra título y descripción actualizados
5. ✅ `updated_at` es reciente (<2 minutos)

Marca el test como **Failed** ❌ si:

- ❌ No hay botón de editar
- ❌ SQL muestra título antiguo ("Completa")
- ❌ Error en consola al guardar

---

## Caso CP-F02-01D: Cambiar visibilidad de pública a privada

### 🎯 Objetivo

Verificar que el autor puede cambiar una plantilla pública a privada.

### 📋 Preparación (Setup)

**Usuario:** `qa.plantillas@cromos.test`

**Prerequisito:** Plantilla "Mundial Qatar 2022 - Oficial" debe ser pública (`is_public = true`)

### 🧪 Pasos del Test

#### 1. Editar plantilla

1. Ir a **"Mis Plantillas"**
2. Abrir **"Mundial Qatar 2022 - Oficial"**
3. Clic en **"Editar"**

#### 2. Cambiar visibilidad

1. Buscar el control de visibilidad:
   - Toggle switch: Público → **Privado**
   - Checkbox: Desmarcar "Hacer pública"
   - Radio button: Seleccionar "Privada"
2. **NO cambiar ningún otro campo**
3. Hacer clic en **"Guardar"**

#### 3. Verificar cambio visual

- ✅ Badge cambia de "Pública" a "Privada"
- ✅ Icono de candado 🔒 aparece
- ✅ Mensaje indica: "Solo tú puedes ver esta plantilla"

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que is_public cambió a FALSE
SELECT
    ct.id,
    ct.title,
    ct.is_public,            -- Debe ser FALSE ahora
    ct.updated_at
FROM collection_templates ct
WHERE ct.title = 'Mundial Qatar 2022 - Oficial'
  AND ct.author_id = (
      SELECT id FROM auth.users WHERE email = 'qa.plantillas@cromos.test'
  );
```

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `is_public` | `false` ← **CRÍTICO: debe ser FALSE** |
| `updated_at` | Timestamp reciente |

#### Test adicional: Verificar que desapareció de búsqueda pública

**En ventana de incógnito (sin login):**

1. Ir a sección de plantillas públicas
2. Buscar "Mundial Qatar 2022"

**Resultado esperado:**

- ✅ La plantilla **NO debe aparecer** en resultados
- ✅ Solo debería aparecer si el autor hace búsqueda estando logueado

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Toggle de visibilidad funciona
2. ✅ SQL muestra `is_public = false`
3. ✅ Badge indica "Privada"
4. ✅ Plantilla NO aparece en búsqueda pública

Marca el test como **Failed** ❌ si:

- ❌ `is_public` sigue siendo `true`
- ❌ Plantilla sigue apareciendo públicamente

---

## Caso CP-F02-01E: Eliminar plantilla propia

### 🎯 Objetivo

Verificar que el autor puede eliminar su propia plantilla.

### 📋 Preparación (Setup)

**Usuario:** `qa.plantillas@cromos.test`

**Prerequisito:** Plantilla "Mi Colección Pokémon Personal" debe existir

**⚠️ Importante:** Vamos a eliminar la plantilla privada de Pokémon (no la de Qatar que usaremos en otros tests)

### 🧪 Pasos del Test

#### 1. Ir a la plantilla a eliminar

1. Navegar a **"Mis Plantillas"**
2. Buscar **"Mi Colección Pokémon Personal"**
3. Abrir vista de detalle

#### 2. Buscar botón de eliminar

El botón de eliminar puede estar en:
- Vista de detalle: Botón **"Eliminar"** o icono de basura 🗑️
- Menú de tres puntos ⋮ → "Eliminar"
- Modo edición: Botón rojo **"Eliminar Plantilla"**

#### 3. Confirmar eliminación

1. Hacer clic en **"Eliminar"**
2. **Debe aparecer un diálogo de confirmación:**
   - "¿Estás seguro de eliminar esta plantilla?"
   - "Esta acción no se puede deshacer"
3. Hacer clic en **"Confirmar"** o **"Sí, eliminar"**

#### 4. Verificar feedback

**Lo que DEBE pasar:**

- ✅ Mensaje de éxito: "Plantilla eliminada correctamente"
- ✅ Eres redirigido a "Mis Plantillas"
- ✅ La plantilla de Pokémon **ya NO aparece** en la lista

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar la plantilla eliminada (NO debería existir)
SELECT
    ct.id,
    ct.title,
    ct.author_id,
    ct.created_at,
    ct.updated_at
FROM collection_templates ct
WHERE ct.title = 'Mi Colección Pokémon Personal'
  AND ct.author_id = (
      SELECT id FROM auth.users WHERE email = 'qa.plantillas@cromos.test'
  );
```

**Resultado esperado:**

- ✅ **0 filas** (la plantilla fue eliminada completamente)

**Si ves 1 fila:** ❌ La plantilla NO se eliminó de la base de datos

#### Verificación de integridad referencial

**Si la plantilla tenía copias asociadas, también deben eliminarse:**

```sql
-- Buscar copias huérfanas (sin plantilla)
-- Reemplaza {template_id} con el ID que viste antes de eliminar
SELECT
    cc.id,
    cc.template_id,
    cc.user_id
FROM collection_copies cc
LEFT JOIN collection_templates ct ON ct.id = cc.template_id
WHERE cc.template_id = '{template_id}'  -- ID de plantilla Pokémon
  AND ct.id IS NULL;  -- Plantilla ya no existe
```

**Resultado esperado:**

- ✅ **0 filas** (las copias también se eliminaron en cascada)

**Si ves filas:** ❌ Hay copias huérfanas (error de integridad)

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Eliminar" existe y funciona
2. ✅ Aparece diálogo de confirmación
3. ✅ Mensaje de éxito después de confirmar
4. ✅ SQL retorna 0 filas (plantilla eliminada)
5. ✅ No quedan copias huérfanas

Marca el test como **Failed** ❌ si:

- ❌ No hay botón de eliminar
- ❌ No aparece confirmación
- ❌ SQL retorna 1 fila (plantilla sigue existiendo)
- ❌ Hay copias huérfanas

---

## Caso CP-F02-01F: Intentar editar plantilla de otro usuario (debe fallar)

### 🎯 Objetivo

Verificar que un usuario **NO puede editar** plantillas creadas por otros usuarios, incluso si son públicas.

### 📋 Preparación (Setup)

**Usuarios necesarios:**

1. **Usuario A (autor):** `qa.plantillas@cromos.test`
   - Debe tener plantilla "Mundial Qatar 2022 - Oficial" creada

2. **Usuario B (intruso):** `qa.otro_usuario@cromos.test`
   - Contraseña: `Test1234!`
   - Estado: Registrado

**Pasos de preparación:**

1. **Cerrar sesión** del Usuario A
2. **Hacer login** con Usuario B (`qa.otro_usuario@cromos.test`)

### 🧪 Pasos del Test

#### 1. Como Usuario B, buscar plantilla de Usuario A

1. Ir a sección de **"Plantillas Públicas"** o **"Explorar Colecciones"**
2. Buscar la plantilla **"Mundial Qatar 2022 - Oficial"** (creada por Usuario A)
3. Hacer clic para abrir vista de detalle

#### 2. Intentar editar (debe estar bloqueado)

**Lo que DEBE pasar:**

- ✅ **NO debe aparecer** botón "Editar"
- ✅ **NO debe aparecer** icono de lápiz ✏️
- ✅ Solo debe haber botones de visualización: "Ver detalles", "Usar plantilla", etc.

**Lo que NO debe pasar:**

- ❌ Botón "Editar" visible
- ❌ Poder acceder a `/templates/{id}/edit` directamente

#### 3. Intentar acceso directo a URL de edición (bypass UI)

**Test avanzado de seguridad:**

1. En la barra de direcciones, copiar la URL actual (ej: `/templates/abc123`)
2. Agregar `/edit` al final: `/templates/abc123/edit`
3. Presionar Enter

**Resultado esperado:**

- ✅ Error 403 (Forbidden) o "No tienes permiso"
- ✅ Redirigido a página de error
- ✅ Mensaje: "Solo el autor puede editar esta plantilla"

**Resultado NO esperado:**

- ❌ Aparece formulario de edición (grave error de seguridad)

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

**Primero, obtener IDs de ambos usuarios:**

```sql
-- Ver IDs de Usuario A y Usuario B
SELECT
    email,
    id
FROM auth.users
WHERE email IN ('qa.plantillas@cromos.test', 'qa.otro_usuario@cromos.test');
```

**Anotar los IDs:**
- Usuario A (autor): `{user_a_id}`
- Usuario B (intruso): `{user_b_id}`

**Verificar que Usuario B NO es el autor:**

```sql
-- Confirmar que plantilla pertenece a Usuario A, no a Usuario B
SELECT
    ct.id,
    ct.title,
    ct.author_id,
    p.nickname AS autor,
    CASE
        WHEN ct.author_id = '{user_b_id}' THEN '❌ ERROR: Usuario B es autor'
        WHEN ct.author_id = '{user_a_id}' THEN '✅ OK: Usuario A es autor'
        ELSE '⚠️ Otro usuario'
    END AS verificacion
FROM collection_templates ct
JOIN profiles p ON p.id = ct.author_id
WHERE ct.title = 'Mundial Qatar 2022 - Oficial';
```

**Resultado esperado:**

| Campo | Valor |
|-------|-------|
| `author_id` | `{user_a_id}` (ID de Usuario A) |
| `verificacion` | `✅ OK: Usuario A es autor` |

**Si `author_id = {user_b_id}`:** ❌ **ERROR GRAVE** - Usuario B se apropió de la plantilla

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Editar" NO es visible para Usuario B
2. ✅ Acceso a `/templates/{id}/edit` retorna error 403
3. ✅ Mensaje de error adecuado aparece
4. ✅ SQL confirma que `author_id` sigue siendo Usuario A

Marca el test como **Failed** ❌ si:

- ❌ Botón "Editar" es visible para Usuario B
- ❌ Usuario B puede acceder al formulario de edición
- ❌ No hay error 403 al intentar URL directa
- ❌ SQL muestra que `author_id` cambió

**⚠️ Nota crítica:** Si este test falla, hay un **problema de seguridad grave**. Reportar inmediatamente a David.

---

## Caso CP-F02-01H: Validación de campos obligatorios

### 🎯 Objetivo

Verificar que el formulario valida correctamente los campos obligatorios antes de enviar.

### 📋 Preparación (Setup)

**Usuario:** `qa.plantillas@cromos.test`

### 🧪 Pasos del Test

#### Test 1: Título vacío

1. Ir a **"+ Nueva Plantilla"**
2. Dejar campo **Título** vacío
3. Rellenar **Total de cromos:** `100`
4. Intentar hacer clic en **"Crear"**

**Resultado esperado:**

- ✅ Botón "Crear" está deshabilitado (gris, no clickeable)
- ✅ O bien, al hacer clic aparece mensaje: "El título es obligatorio"
- ✅ Campo "Título" debe tener borde rojo o mensaje de error debajo

#### Test 2: Total de cromos inválido

1. Rellenar **Título:** `Test Validación`
2. **Total de cromos:** Dejar vacío o poner `0`
3. Intentar hacer clic en **"Crear"**

**Resultado esperado:**

- ✅ Error: "El total de cromos debe ser al menos 1"
- ✅ Campo "Total de cromos" con borde rojo

#### Test 3: Total de cromos negativo

1. **Total de cromos:** Poner `-50`
2. Intentar guardar

**Resultado esperado:**

- ✅ Error: "El total debe ser un número positivo"
- ✅ O bien, el input no permite números negativos (depende de implementación)

---

### 🔍 Validaciones Técnicas

#### Verificación en Consola de Chrome

1. Abrir DevTools (F12) → Pestaña **"Network"**
2. Intentar enviar formulario con título vacío
3. Verificar que **NO se hace request** a la API

**Resultado esperado:**

- ✅ NO debe aparecer request `POST /collection_templates`
- ✅ Validación ocurre en el cliente (JavaScript) antes de enviar

**Si hay request a API con datos inválidos:** ❌ Validación no funciona correctamente

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Campo título vacío es rechazado
2. ✅ Total de cromos = 0 es rechazado
3. ✅ Números negativos son rechazados
4. ✅ Mensajes de error son claros
5. ✅ NO se hace request a API con datos inválidos

Marca el test como **Failed** ❌ si:

- ❌ Formulario se envía con título vacío
- ❌ Se acepta total = 0 o negativo
- ❌ No hay mensajes de error

---

## 📊 Resumen de Tests - Archivo 01

| Test ID | Nombre | Complejidad | Tiempo Est. | Estado |
|---------|--------|-------------|-------------|--------|
| CP-F02-01A | Crear plantilla pública | Baja | 15 min | - |
| CP-F02-01B | Crear plantilla privada | Baja | 15 min | - |
| CP-F02-01C | Editar título y descripción | Baja | 20 min | - |
| CP-F02-01D | Cambiar visibilidad | Media | 20 min | - |
| CP-F02-01E | Eliminar plantilla propia | Media | 20 min | - |
| CP-F02-01F | Intentar editar plantilla ajena | Alta | 25 min | - |
| CP-F02-01H | Validación de campos | Baja | 15 min | - |

**Total:** ~2 horas 10 minutos

---

## ✅ Checklist Post-Tests

Después de completar todos los tests de este archivo:

- [ ] Actualicé `Test_Tracking_Spreadsheet.csv` con todos los resultados
- [ ] Capturé pantallas de los errores encontrados
- [ ] Reporté bugs críticos (si los hay) en Slack #testing
- [ ] Limpié datos de prueba si es necesario (plantillas de testing)

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
