# Tests No Técnicos - Fase 01: Perfil y Avatar

## 📋 Información General

**Fase:** 01 - Autenticación y Perfil
**Archivo:** 02_Perfil_y_Avatar.md
**Cantidad de tests:** 6 tests
**Tiempo estimado total:** ~1.5 horas

## 🎯 Objetivo

Validar que los usuarios pueden visualizar y editar su perfil personal, incluyendo nickname, bio, ubicación, y avatar, tanto en vista privada como pública.

## 📚 Pre-requisitos Generales

### Herramientas Necesarias

- ✅ **Navegador:** Google Chrome (versión 120+)
- ✅ **Usuario autenticado:** Debes haber completado CP-F01-04 (login exitoso)
- ✅ **Acceso a Supabase Dashboard:** Para verificaciones SQL

### Usuario de Prueba

```
Email: qa.registrado@cromos.test
Contraseña: Registrado#123
```

**Este usuario debe estar autenticado antes de ejecutar estos tests.**

### Preparación Inicial

1. **Inicia sesión** con el usuario de prueba (si no lo has hecho)
2. **Abre DevTools:** Presiona `F12`
3. **Limpia la consola:** Clic en 🚫 "Clear console"

---

## Caso CP-F01-02A: Visualización de perfil propio en escritorio

### 🎯 Objetivo
Verificar que un usuario autenticado puede ver su página de perfil personal con todos los datos correctos.

### 📋 Preparación (Setup)

**Asegúrate de estar autenticado:**
1. Ve a: `https://cambio-cromos.vercel.app`
2. Si no estás autenticado, inicia sesión con:
   - Email: `qa.registrado@cromos.test`
   - Contraseña: `Registrado#123`
3. Verifica que ves tu avatar o nombre en el header

### 🧪 Pasos del Test

#### 1. Navegar al perfil

**Opción A - Desde el menú de usuario:**
1. En el header (parte superior de la página), busca tu avatar o nombre de usuario
2. Haz clic sobre él
3. En el menú desplegable que aparece, busca **"Mi Perfil"** o **"Ver perfil"**
4. Haz clic

**Opción B - URL directa:**
1. En la barra de direcciones, escribe: `https://cambio-cromos.vercel.app/profile`
2. Presiona Enter

**✅ Deberías ver:**
- Una página con el título "Mi Perfil" o "Perfil"
- Tu información personal (nickname, bio, ubicación)
- Tu avatar (imagen de perfil)
- Botones de edición (lápiz o "Editar perfil")

#### 2. Verificar elementos visibles

**Información básica:**
- [ ] **Avatar** - Imagen circular o cuadrada en la parte superior
- [ ] **Nickname** - Tu nombre de usuario (puede estar vacío si es nuevo)
- [ ] **Bio** - Tu descripción personal (puede estar vacío)
- [ ] **Código Postal** - Tu ubicación (puede estar vacío)
- [ ] **Fecha de registro** - "Miembro desde [fecha]"

**Secciones adicionales:**
- [ ] **Pestañas de anuncios** - "Activos", "Reservados", "Completados", etc.
- [ ] **Estadísticas** - Número de anuncios, valoraciones, etc.
- [ ] **Botón "Editar perfil"** - Debe ser visible y clickeable

**✅ Verificar:**
- Todos los elementos están alineados correctamente
- No hay textos cortados o superpuestos
- El avatar se muestra completo (no pixelado excesivamente)
- Los botones tienen el estilo retro-comic característico

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

**¿Qué vamos a verificar?** Que los datos mostrados en pantalla coinciden con la base de datos.

**Instrucciones paso a paso:**

1. Abre Supabase Dashboard: https://app.supabase.com
2. Ve a SQL Editor
3. Copia esta consulta:

```sql
-- Obtener información del perfil del usuario autenticado
SELECT
    nickname,
    bio,
    avatar_url,
    postcode AS codigo_postal,
    created_at AS fecha_registro,
    updated_at AS ultima_actualizacion
FROM profiles
WHERE id = (
    SELECT id
    FROM auth.users
    WHERE email = 'qa.registrado@cromos.test'
);
```

4. Haz clic en **"Run"**

**Resultado esperado:**

```
┌──────────┬──────┬─────────────────┬────────────────┬─────────────────────┬─────────────────────┐
│ nickname │ bio  │ avatar_url      │ codigo_postal  │ fecha_registro      │ ultima_actualizacion│
├──────────┼──────┼─────────────────┼────────────────┼─────────────────────┼─────────────────────┤
│ QAUser   │ NULL │ /avatars/1.png  │ 28001          │ 2025-01-15 10:00:00 │ 2025-01-15 10:00:00 │
└──────────┴──────┴─────────────────┴────────────────┴─────────────────────┴─────────────────────┘
```

**Comparar con lo que ves en pantalla:**

- **nickname** en BD = Nickname en pantalla ✅
- **bio** en BD = Bio en pantalla (o vacío si es NULL) ✅
- **codigo_postal** en BD = Código postal en pantalla ✅
- **fecha_registro** en BD = "Miembro desde" en pantalla ✅

**Si algo NO coincide:**
- Toma captura de pantalla de la página
- Toma captura del resultado SQL
- Reporta la discrepancia

#### Verificación en Consola de Chrome

1. Presiona `F12` → Pestaña **"Console"**
2. Verifica que NO hay errores rojos
3. Puedes ver mensajes azules o blancos (son normales)

**✅ Test exitoso si:**
- No hay errores rojos al cargar la página
- No hay warnings sobre "failed to load"

### 📊 Resultado del Test

**Criterios para PASSED:**
- ✅ Página de perfil carga correctamente
- ✅ Avatar se muestra (o placeholder si no hay avatar)
- ✅ Nickname coincide con BD (o vacío si es NULL)
- ✅ Elementos visuales están bien alineados
- ✅ Botón "Editar perfil" es visible
- ✅ No hay errores en consola

**Actualizar spreadsheet:**
- Estado: `Passed` / `Failed`
- Notas: Cualquier discrepancia encontrada

---

## Caso CP-F01-02B: Edición de nickname y bio

### 🎯 Objetivo
Verificar que un usuario puede editar su nickname y bio, y que los cambios se guardan correctamente en la base de datos.

### 📋 Preparación (Setup)

**Pre-requisito:** Debes haber completado CP-F01-02A (visualización de perfil)

**Datos que usaremos:**
- **Nuevo nickname:** `QATest_[tu_nombre]` (ejemplo: `QATest_Maria`)
- **Nueva bio:** `Bio de prueba actualizada el [fecha_hoy]`

**✏️ Anota aquí:**
- Nickname actual antes del test: `_________________`
- Bio actual antes del test: `_________________`

### 🧪 Pasos del Test

#### 1. Abrir modo de edición

1. Estando en tu página de perfil (`/profile`)
2. Busca el botón **"Editar perfil"** (usualmente con ícono de lápiz ✏️)
3. Haz clic en él

**✅ Debe aparecer:**
- Formulario de edición con campos editables
- Campos pre-poblados con tus datos actuales
- Botones "Guardar" y "Cancelar"

#### 2. Editar nickname

1. Busca el campo **"Nickname"** o **"Nombre de usuario"**
2. Haz triple clic para seleccionar todo el texto actual
3. Escribe el nuevo nickname: `QATest_[tu_nombre]`
   - Ejemplo: `QATest_Maria`

**Validaciones visuales inmediatas:**
- [ ] El campo permite escribir
- [ ] Hay un contador de caracteres (ej: "15/50")
- [ ] No hay mensaje de error mientras escribes un nombre válido

#### 3. Editar bio

1. Busca el campo **"Bio"** o **"Biografía"**
2. Haz triple clic para seleccionar todo el texto actual
3. Escribe: `Bio de prueba actualizada el [fecha_hoy]`
   - Ejemplo: `Bio de prueba actualizada el 09 de noviembre`

**Validaciones visuales:**
- [ ] El campo permite múltiples líneas (es un textarea)
- [ ] Hay un contador de caracteres (ej: "45/500")
- [ ] El texto se muestra completo, sin cortes

#### 4. Guardar cambios

1. Busca el botón **"Guardar"** o **"Guardar cambios"**
2. Haz clic en él
3. Espera 2-3 segundos

**✅ Debe aparecer:**
- Mensaje de éxito (toast verde): "Perfil actualizado" o similar
- El formulario de edición se cierra
- Vuelves a la vista de perfil (no edición)
- Los nuevos valores se muestran en pantalla

**❌ NO debe aparecer:**
- Mensaje de error rojo
- El formulario sigue en modo edición
- Los valores antiguos siguen mostrándose

#### 5. Verificar persistencia

**Prueba que los cambios se guardaron:**

1. Recarga la página: Presiona `F5`
2. Espera a que cargue completamente

**✅ Después de recargar:**
- El nuevo nickname sigue mostrándose
- La nueva bio sigue mostrándose
- Los cambios NO se perdieron

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

**¿Qué vamos a verificar?** Que los cambios se guardaron en la BD y que `updated_at` se actualizó.

1. Abre Supabase Dashboard → SQL Editor
2. Copia esta consulta:

```sql
-- Verificar que el nickname y bio se actualizaron
SELECT
    nickname,
    bio,
    updated_at,
    -- Calcular cuántos segundos hace que se actualizó
    EXTRACT(EPOCH FROM (NOW() - updated_at)) AS segundos_desde_actualizacion
FROM profiles
WHERE id = (
    SELECT id
    FROM auth.users
    WHERE email = 'qa.registrado@cromos.test'
);
```

3. Haz clic en **"Run"**

**Resultado esperado:**

```
┌──────────────────┬────────────────────────────────────┬─────────────────────┬─────────────────────────────┐
│ nickname         │ bio                                │ updated_at          │ segundos_desde_actualizacion│
├──────────────────┼────────────────────────────────────┼─────────────────────┼─────────────────────────────┤
│ QATest_Maria     │ Bio de prueba actualizada el 09... │ 2025-11-09 14:35:22 │ 45                          │
└──────────────────┴────────────────────────────────────┴─────────────────────┴─────────────────────────────┘
```

**Verificar:**
- ✅ `nickname` = El nuevo nickname que pusiste
- ✅ `bio` = La nueva bio que pusiste
- ✅ `updated_at` = Fecha y hora reciente (últimos 5 minutos)
- ✅ `segundos_desde_actualizacion` = Número pequeño (menos de 300 = 5 minutos)

**Si `updated_at` es muy antiguo:**
- Significa que el cambio NO se guardó en la BD
- ❌ Test FALLIDO - Reportar

#### Verificación en Consola de Chrome

1. Presiona `F12` → Console
2. Busca mensajes relacionados con "update" o "profile"

**✅ Es normal ver:**
```
> PATCH /api/profile 200 OK
> Profile updated successfully
```

**❌ NO debe verse:**
```
❌ PATCH /api/profile 500 Internal Server Error
❌ Failed to update profile
```

### 📊 Resultado del Test

**Criterios para PASSED:**
- ✅ Formulario de edición se abre correctamente
- ✅ Campos permiten edición
- ✅ Cambios se guardan al hacer clic en "Guardar"
- ✅ Mensaje de éxito aparece
- ✅ Valores nuevos se muestran en pantalla
- ✅ Al recargar, los cambios persisten
- ✅ Consulta SQL muestra valores actualizados
- ✅ Campo `updated_at` se actualizó recientemente
- ✅ No hay errores en consola

**Actualizar spreadsheet:**
- Estado: `Passed` / `Failed`
- Notas: Valores usados (nickname, bio) si pasó; error específico si falló

---

## Caso CP-F01-02C: Selección de avatar predefinido

### 🎯 Objetivo
Verificar que un usuario puede seleccionar un avatar predefinido de la galería y que se guarda correctamente.

### 📋 Preparación (Setup)

**Pre-requisito:** Usuario autenticado en su perfil

**Nota:** Este test asume que la aplicación tiene avatares predefinidos. Si no los hay, marca este test como "Not Applicable" y continúa.

### 🧪 Pasos del Test

#### 1. Abrir selector de avatar

1. En tu página de perfil (`/profile`)
2. Haz clic en el botón **"Editar perfil"**
3. Busca la sección de **Avatar** (usualmente con tu imagen actual)
4. Busca un botón **"Cambiar avatar"** o **"Seleccionar avatar"**
5. Haz clic en él

**✅ Debe aparecer:**
- Modal o sección con galería de avatares predefinidos
- Múltiples opciones visuales (6-12 avatares)
- Indicador de cuál es tu avatar actual

#### 2. Seleccionar nuevo avatar

1. Examina los avatares disponibles
2. Haz clic en uno diferente al que tienes actualmente
3. **Anota cuál seleccionaste:** (ej: "Avatar 3 - Cara feliz amarilla")

**✅ Al hacer clic:**
- El avatar seleccionado se resalta o marca con un check ✓
- Tu avatar antiguo se desmarca

#### 3. Confirmar selección

1. Busca el botón **"Guardar"** o **"Confirmar"**
2. Haz clic en él

**✅ Debe suceder:**
- El modal se cierra
- Tu avatar en la página se actualiza INMEDIATAMENTE (sin recargar)
- Mensaje de éxito: "Avatar actualizado" o similar

#### 4. Verificar en diferentes ubicaciones

**Verifica que el nuevo avatar aparece en:**

1. **Página de perfil** - El avatar grande en tu perfil
2. **Header** - El avatar pequeño en la esquina superior
3. **Si tienes anuncios** - En tus listados del marketplace

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

1. Abre Supabase Dashboard → SQL Editor
2. Copia esta consulta:

```sql
-- Verificar la URL del avatar actualizado
SELECT
    nickname,
    avatar_url,
    updated_at
FROM profiles
WHERE id = (
    SELECT id
    FROM auth.users
    WHERE email = 'qa.registrado@cromos.test'
);
```

**Resultado esperado:**

```
┌──────────────┬──────────────────────────┬─────────────────────┐
│ nickname     │ avatar_url               │ updated_at          │
├──────────────┼──────────────────────────┼─────────────────────┤
│ QATest_Maria │ /avatars/predefined/3.png│ 2025-11-09 14:45:00 │
└──────────────┴──────────────────────────┴─────────────────────┘
```

**Verificar:**
- ✅ `avatar_url` cambió (no es el valor anterior)
- ✅ `avatar_url` contiene una ruta válida (ej: `/avatars/...` o URL completa)
- ✅ `updated_at` es reciente (últimos minutos)

**También verificar en Storage (Opcional):**

```sql
-- Si los avatares se almacenan en Supabase Storage
-- Esta consulta verifica que el archivo existe
SELECT name, metadata
FROM storage.objects
WHERE bucket_id = 'avatars'
  AND name LIKE '%predefined%'
LIMIT 5;
```

#### Verificación Visual

**Inspeccionar la imagen del avatar:**

1. Haz clic derecho sobre tu avatar en la página
2. Selecciona **"Inspeccionar"**
3. En DevTools, busca la etiqueta `<img>`
4. Verifica el atributo `src`:

```html
<img src="/avatars/predefined/3.png" alt="Avatar de usuario" />
```

**✅ Verificar:**
- El `src` apunta a una URL válida
- La URL coincide con `avatar_url` de la BD

### 📊 Resultado del Test

**Criterios para PASSED:**
- ✅ Galería de avatares se muestra correctamente
- ✅ Selección de avatar funciona (visual feedback)
- ✅ Guardar actualiza el avatar inmediatamente
- ✅ Avatar nuevo aparece en perfil, header, y listados
- ✅ Consulta SQL muestra `avatar_url` actualizado
- ✅ `updated_at` se actualizó
- ✅ No hay errores en consola

**Si NO hay avatares predefinidos:**
- Estado: `Not Applicable`
- Notas: "La app no tiene galería de avatares predefinidos"

---

## Caso CP-F01-02F2: Pestañas de anuncios en perfil propio

### 🎯 Objetivo
Verificar que un usuario puede ver las pestañas de sus propios anuncios (Activos, Reservados, Completados, Removidos) y que solo aparecen en su perfil, no en perfiles públicos de otros usuarios.

### 📋 Preparación (Setup)

**Pre-requisito:**
- Usuario autenticado: `qa.registrado@cromos.test`
- Idealmente, este usuario debe tener al menos 1 anuncio creado (de tests anteriores o crear uno nuevo)

**Si no tienes anuncios:**
- Puedes crear uno rápido en `/marketplace/new`
- O marcar las secciones de tabs como "vacío" (lo cual también se debe probar)

### 🧪 Pasos del Test

#### 1. Navegar a tu perfil propio

1. Estando autenticado, ve a: `https://cambio-cromos.vercel.app/profile`
2. Asegúrate de que estás viendo TU perfil (debe decir "Mi Perfil" o similar)

#### 2. Localizar las pestañas de anuncios

**Busca en la página las pestañas:**

En **escritorio** (pantalla grande):
- Deberías ver botones o tabs horizontales:
  - **"Activos"** (o "Active")
  - **"Reservados"** (o "Reserved")
  - **"Completados"** (o "Completed")
  - **"Removidos"** (o "Removed")

En **móvil** (pantalla pequeña):
- Puede ser un selector desplegable (dropdown)
- Con las mismas opciones

**✅ Verificar:**
- Las 4 pestañas están visibles
- La pestaña "Activos" está seleccionada por defecto
- Cada pestaña muestra un contador (ej: "Activos (3)")

#### 3. Navegar entre pestañas

**Haz clic en cada pestaña y verifica:**

**Pestaña "Activos":**
1. Haz clic
2. ✅ Debe mostrar: Listados con estado `active`
3. ✅ O mensaje: "No tienes anuncios activos" si está vacío

**Pestaña "Reservados":**
1. Haz clic
2. ✅ Debe mostrar: Listados con estado `reserved`
3. ✅ O mensaje: "No tienes anuncios reservados"

**Pestaña "Completados":**
1. Haz clic
2. ✅ Debe mostrar: Listados con estado `completed`
3. ✅ O mensaje: "No tienes anuncios completados"

**Pestaña "Removidos":**
1. Haz clic
2. ✅ Debe mostrar: Listados con estado `removed`
3. ✅ O mensaje: "No tienes anuncios removidos"

**Comportamiento visual:**
- La pestaña activa se resalta (diferente color o estilo)
- El contenido cambia al hacer clic (sin recargar toda la página)
- Los contadores son correctos (coinciden con lo que se muestra)

#### 4. Verificar que NO aparece en perfiles públicos

**Este es el paso crítico:**

1. **Cierra sesión** (Logout)
2. **Vuelve a iniciar sesión** con otro usuario (o abre modo incógnito sin autenticar)
3. **Navega al perfil público de qa.registrado:**
   - URL: `https://cambio-cromos.vercel.app/users/[user_id]`
   - O busca un listado de ese usuario y haz clic en su nombre

**✅ En perfil público de OTRO usuario debe verse:**
- Solo la pestaña **"Activos"** (anuncios públicos)
- NO deben verse las pestañas: Reservados, Completados, Removidos

**¿Por qué?**
- Por privacidad, solo el dueño del perfil puede ver sus anuncios reservados/completados
- Otros usuarios solo ven los anuncios activos disponibles

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

**Contar anuncios por estado:**

```sql
-- Contar cuántos anuncios tiene el usuario en cada estado
SELECT
    status AS estado,
    COUNT(*) AS cantidad
FROM trade_listings
WHERE user_id = (
    SELECT id
    FROM auth.users
    WHERE email = 'qa.registrado@cromos.test'
)
GROUP BY status
ORDER BY status;
```

**Resultado esperado:**

```
┌───────────┬──────────┐
│ estado    │ cantidad │
├───────────┼──────────┤
│ active    │ 3        │
│ completed │ 1        │
│ removed   │ 0        │
│ reserved  │ 2        │
└───────────┴──────────┘
```

**Comparar con la UI:**
- ✅ "Activos (3)" en la pestaña = 3 en la consulta
- ✅ "Reservados (2)" = 2 en la consulta
- ✅ "Completados (1)" = 1 en la consulta
- ✅ "Removidos (0)" = 0 en la consulta (o no aparece fila)

**Si los números NO coinciden:**
- Toma captura de la UI
- Toma captura del resultado SQL
- Reporta la discrepancia

### 📊 Resultado del Test

**Criterios para PASSED:**
- ✅ Las 4 pestañas son visibles en perfil propio
- ✅ Pestañas funcionan al hacer clic (cambia contenido)
- ✅ Contadores coinciden con consulta SQL
- ✅ Estados vacíos muestran mensaje apropiado
- ✅ En perfil público de OTRO usuario, solo se ve pestaña "Activos"
- ✅ Responsive: funciona en escritorio y móvil
- ✅ No hay errores en consola

**Actualizar spreadsheet:**
- Estado: `Passed` / `Failed`
- Notas: Contadores encontrados o discrepancias

---

## Caso CP-F01-02G: Protección para usuarios sin sesión

### 🎯 Objetivo
Verificar que usuarios NO autenticados no pueden acceder a rutas protegidas y son redirigidos al login.

### 📋 Preparación (Setup)

**Importante:** Para este test debes estar **SIN sesión iniciada**.

**Cerrar sesión si estás autenticado:**
1. Haz clic en tu avatar/menú de usuario
2. Selecciona "Cerrar sesión" o "Logout"
3. Verifica que ya NO ves tu avatar en el header

**O usa modo incógnito:**
1. Presiona `Ctrl + Shift + N` (Windows) / `Cmd + Shift + N` (Mac)
2. Ve a la URL de la app en esta ventana

### 🧪 Pasos del Test

#### 1. Intentar acceder a /profile (Mi Perfil)

1. **Sin estar autenticado**, en la barra de direcciones escribe:
   ```
   https://cambio-cromos.vercel.app/profile
   ```
2. Presiona Enter

**✅ Debe suceder:**
- Te redirige AUTOMÁTICAMENTE a `/auth/login` o `/login`
- Ves el formulario de inicio de sesión
- Aparece un mensaje: "Inicia sesión para continuar" o "Debes autenticarte"

**❌ NO debe suceder:**
- Ver la página de perfil
- Ver información personal de algún usuario
- Ver página en blanco o error 404

#### 2. Intentar acceder a /profile/edit (Editar Perfil)

1. Escribe en la barra:
   ```
   https://cambio-cromos.vercel.app/profile/edit
   ```
2. Presiona Enter

**✅ Debe suceder:**
- Redirige al login (igual que antes)
- Mensaje de autenticación requerida

#### 3. Intentar acceder a /marketplace/new (Crear Anuncio)

1. Escribe:
   ```
   https://cambio-cromos.vercel.app/marketplace/new
   ```
2. Presiona Enter

**✅ Debe suceder:**
- Redirige al login
- NO permite ver el formulario de creación

#### 4. Intentar acceder a /chats (Conversaciones)

1. Escribe:
   ```
   https://cambio-cromos.vercel.app/chats
   ```
2. Presiona Enter

**✅ Debe suceder:**
- Redirige al login
- NO muestra conversaciones

### 🔍 Validaciones Técnicas

#### Verificación en Consola de Chrome

1. Presiona `F12` → Console
2. Intenta acceder a una ruta protegida
3. Observa los mensajes

**✅ Es normal ver:**
```
> GET /profile 302 Found
> Redirecting to /auth/login
```
- Código `302` significa redirección (es correcto)

**❌ NO debe verse:**
```
❌ GET /profile 200 OK  (permite acceso sin auth)
❌ GET /profile 500 Internal Server Error
```

#### Verificación en DevTools → Network

1. Abre DevTools → Pestaña **"Network"**
2. Intenta acceder a `/profile`
3. Busca la petición `profile` en la lista

**✅ Debe mostrar:**
- Status: `302` (redirección)
- O Status: `401` (no autorizado)
- NO `200` (que permitiría acceso)

### 📊 Resultado del Test

**Criterios para PASSED:**
- ✅ `/profile` redirige a login
- ✅ `/profile/edit` redirige a login
- ✅ `/marketplace/new` redirige a login
- ✅ `/chats` redirige a login
- ✅ Aparece mensaje explicativo ("Inicia sesión para continuar")
- ✅ NO se muestra contenido protegido
- ✅ Códigos de respuesta son 302 o 401 (no 200)
- ✅ No hay errores 500 en consola

**Actualizar spreadsheet:**
- Estado: `Passed` / `Failed`
- Notas: Si alguna ruta permitió acceso sin auth, especificar cuál

---

## Caso CP-F01-02H: Menú desplegable del usuario en header

### 🎯 Objetivo
Verificar que el menú desplegable del usuario en el header funciona correctamente y muestra todas las opciones de navegación.

### 📋 Preparación (Setup)

**Usuario autenticado:** `qa.registrado@cromos.test`

### 🧪 Pasos del Test

#### 1. Localizar el menú de usuario

1. Estando autenticado, mira la parte superior derecha del header
2. Busca tu avatar o iniciales
3. Haz clic sobre él

**✅ Debe aparecer:**
- Un menú desplegable (dropdown)
- Con varias opciones de navegación
- Con estilo retro-comic coherente

#### 2. Verificar opciones del menú

**El menú debe incluir (puede variar el orden):**

- [ ] **Mi Perfil** - Te lleva a `/profile`
- [ ] **Mis Anuncios** - Te lleva a `/marketplace/my-listings` o `/mis-anuncios`
- [ ] **Mis Colecciones** - Te lleva a `/templates/my-templates` o similar
- [ ] **Chats** - Te lleva a `/chats`
- [ ] **Notificaciones** - Te lleva a `/profile/notifications` o muestra badge con contador
- [ ] **Configuración** (opcional)
- [ ] **Cerrar Sesión** - Logout

**✅ Cada opción debe:**
- Ser clickeable
- Tener un ícono (opcional pero recomendado)
- Tener texto legible

#### 3. Probar navegación

**Haz clic en cada opción y verifica:**

1. **Mi Perfil** → Navega a tu perfil ✅
2. **Mis Anuncios** → Navega a tus listados ✅
3. **Mis Colecciones** → Navega a tus plantillas ✅
4. **Cerrar Sesión** → Hace logout y redirige al login ✅

**Cada navegación debe:**
- Funcionar sin errores
- Cerrar el menú desplegable automáticamente
- Llevar a la página correcta

#### 4. Probar en móvil

1. Presiona `F12` → Activa vista dispositivo (ícono celular)
2. Selecciona "iPhone 13" o similar
3. Busca el menú de usuario (puede ser en menú hamburguesa)
4. Verifica que las mismas opciones están disponibles

### 📊 Resultado del Test

**Criterios para PASSED:**
- ✅ Menú desplegable se abre al hacer clic
- ✅ Todas las opciones esperadas están presentes
- ✅ Navegación funciona para cada opción
- ✅ Menú se cierra después de seleccionar una opción
- ✅ Funciona en escritorio y móvil
- ✅ No hay errores en consola

**Actualizar spreadsheet:**
- Estado: `Passed` / `Failed`
- Notas: Opciones faltantes si las hay

---

## ✅ Checklist Final

Después de completar todos los tests de este archivo:

- [ ] CP-F01-02A: Visualización de perfil propio - Completado
- [ ] CP-F01-02B: Edición de nickname y bio - Completado
- [ ] CP-F01-02C: Selección de avatar predefinido - Completado
- [ ] CP-F01-02F2: Pestañas de anuncios en perfil - Completado
- [ ] CP-F01-02G: Protección para usuarios sin sesión - Completado
- [ ] CP-F01-02H: Menú desplegable del usuario - Completado

**Tiempo total invertido:** __________ horas

**Tests pasados:** ______ / 6

**Próxima fase:** Fase-02 - Plantillas y Colecciones

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
