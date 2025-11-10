# Tests No Técnicos - Fase 01: Autenticación y Onboarding

## 📋 Información General

**Fase:** 01 - Autenticación y Perfil
**Archivo:** 01_Autenticacion_Onboarding.md
**Cantidad de tests:** 8 tests
**Tiempo estimado total:** ~2 horas

## 🎯 Objetivo

Validar que el ciclo completo de registro, inicio de sesión, y recuperación de cuentas funcione correctamente con datos válidos e inválidos, manteniendo la seguridad y la localización en español.

## 📚 Pre-requisitos Generales

Antes de empezar con cualquier test de esta fase:

### Herramientas Necesarias

- ✅ **Navegador:** Google Chrome (versión 120+)
- ✅ **Acceso a la aplicación:** https://cambio-cromos.vercel.app
- ✅ **Acceso a Supabase Dashboard:** https://app.supabase.com (credenciales proporcionadas por David)
- ✅ **Spreadsheet de seguimiento:** Test_Tracking_Spreadsheet.csv abierto

### Usuarios de Prueba Pre-configurados

Estos usuarios ya existen en la base de datos para testing:

| Email | Contraseña | Estado | Uso |
|-------|------------|--------|-----|
| `qa.registrado@cromos.test` | `Registrado#123` | Activo | Tests de login |
| `qa.suspendido@cromos.test` | `Suspendido#123` | Suspendido | Tests de bloqueo |

### Preparación Antes de Cada Test

1. **Limpiar datos del navegador:**
   - Presiona `Ctrl + Shift + Delete` (Windows) o `Cmd + Shift + Delete` (Mac)
   - Selecciona "Todo el tiempo"
   - Marca "Cookies" y "Datos almacenados en caché"
   - Haz clic en "Borrar datos"

2. **Abrir modo incógnito (recomendado):**
   - Presiona `Ctrl + Shift + N` (Windows) or `Cmd + Shift + N` (Mac)
   - Esto asegura un estado limpio sin datos previos

3. **Tener Supabase Dashboard listo:**
   - En otra pestaña, abre https://app.supabase.com
   - Inicia sesión con las credenciales del equipo
   - Navega al proyecto "cromos-web"

---

## Caso CP-F01-02: Registro móvil (vista 375px)

### 🎯 Objetivo
Verificar que el registro de nuevos usuarios funciona correctamente en dispositivos móviles.

### 📋 Preparación (Setup)

#### Paso 1: Generar email único de prueba

Para evitar conflictos, usa este formato:

```
tester+[tu_nombre]_[fecha_hoy]@cromos.test
```

**Ejemplo:** Si te llamas María y hoy es 9 de noviembre:
```
tester+maria_09nov@cromos.test
```

**✏️ ANOTA tu email aquí:** `____________________________________`

#### Paso 2: Limpiar navegador y activar vista móvil

1. Cierra todas las ventanas de Chrome
2. Abre Chrome en modo incógnito:
   - Windows: `Ctrl + Shift + N`
   - Mac: `Cmd + Shift + N`
3. Abre las DevTools:
   - Presiona `F12` en tu teclado
4. Activa el modo dispositivo móvil:
   - Haz clic en el ícono del celular (arriba a la izquierda en DevTools)
   - O presiona `Ctrl + Shift + M` (Windows) / `Cmd + Shift + M` (Mac)
5. En el menú desplegable de arriba, selecciona **"iPhone 13"** o **"iPhone SE"**
6. Verifica que la resolución muestre **375 x 812** o similar

**Así debe verse:**
```
┌─────────────────────────────┐
│  [iPhone 13 ▼] 375 x 812   │ ← Selector de dispositivo
├─────────────────────────────┤
│                             │
│   [Vista móvil de la app]   │
│                             │
└─────────────────────────────┘
```

### 🧪 Pasos del Test

#### 1. Navegar al formulario de registro

1. En la barra de direcciones, escribe: `https://cambio-cromos.vercel.app`
2. Presiona `Enter`
3. Espera a que la página cargue completamente (2-3 segundos)
4. Busca el menú hamburguesa (☰) en la esquina superior
5. Haz clic en el menú hamburguesa
6. En el menú que se despliega, busca la opción **"Crear cuenta"** o **"Registrarse"**
7. Haz clic en "Crear cuenta"

**✅ Verificar:**
- El formulario de registro se muestra completo
- No hay scroll horizontal (puedes ver todo el formulario sin deslizar a los lados)
- Los campos son legibles (texto no demasiado pequeño)

#### 2. Completar el formulario de registro

**Campo Email:**
1. Haz clic en el campo "Email"
2. Escribe el email que anotaste en el Setup
3. Verifica que el teclado virtual muestra **tipo email** (con @ y .com visibles)

**Campo Contraseña:**
1. Haz clic en el campo "Contraseña"
2. Escribe: `MiPassword123!`
3. Verifica que el teclado virtual muestra **tipo password** (puede tener números visibles)

**¿Por qué esta contraseña?**
- Tiene más de 10 caracteres ✅
- Tiene mayúscula (M, P) ✅
- Tiene minúscula (i, a, s...) ✅
- Tiene números (1, 2, 3) ✅
- Tiene símbolo (!) ✅

**Aceptar términos:**
1. Busca la casilla "Acepto los términos y condiciones"
2. Haz clic para marcarla

**✅ Verificar:**
- El botón "Crear cuenta" cambia de gris a color (se activa)
- No hay mensajes de error debajo de los campos
- La casilla de términos tiene un check ✓

#### 3. Enviar formulario

1. Haz clic en el botón **"Crear cuenta"**
2. Espera 2-3 segundos

**✅ Debe verse:**
- Aparece un mensaje verde (toast) que dice "Revisa tu correo" o similar
- El mensaje está **centrado** y es **legible** en móvil
- La página no se rompe ni aparecen elementos desbordados

**❌ NO debe verse:**
- Mensajes de error rojos
- Página en blanco
- Elementos cortados o con scroll horizontal

#### 4. Verificar email de confirmación

**IMPORTANTE:** Para este test, simulamos que el email llegó correctamente. En un ambiente real, recibirías el email en tu bandeja.

**Para este test:**
- Asumimos que el email fue enviado ✅
- La verificación real del email la hace David en tests técnicos
- Continuamos con la validación en base de datos

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

**¿Qué vamos a verificar?** Que tu cuenta se creó correctamente en la base de datos.

**Instrucciones paso a paso:**

1. **Abrir Supabase Dashboard en otra pestaña**
   - Ve a: https://app.supabase.com
   - Inicia sesión con las credenciales del equipo
   - Si no las tienes, contacta a David en Slack

2. **Seleccionar el proyecto**
   - Busca y haz clic en el proyecto **"cromos-web"** o **"cambio-cromos"**

3. **Ir al SQL Editor**
   - En el menú de la izquierda, busca el ícono `</>`
   - Haz clic en **"SQL Editor"**
   - Verás una pantalla con un cuadro blanco grande

4. **Copiar esta consulta**
   ```sql
   -- Esta consulta busca tu cuenta recién creada
   -- Línea 1-2: Seleccionamos qué campos queremos ver
   -- Línea 3-4: Buscamos en las tablas de usuarios y perfiles
   -- Línea 5: Filtramos por el email que usaste

   SELECT
       u.email AS correo,           -- El email que registraste
       u.confirmed_at AS confirmado, -- Fecha de confirmación
       p.nickname AS apodo           -- Tu nickname (puede estar vacío)
   FROM auth.users u                -- Tabla de usuarios de autenticación
   JOIN profiles p ON p.id = u.id   -- Unimos con tabla de perfiles
   WHERE u.email = 'REEMPLAZAR_CON_TU_EMAIL';
   ```

5. **Reemplazar el email**
   - Busca donde dice `'REEMPLAZAR_CON_TU_EMAIL'`
   - Borra solo esas palabras, **mantén las comillas simples `'`**
   - Escribe el email que anotaste
   - **Ejemplo:** `'tester+maria_09nov@cromos.test'`

6. **Ejecutar la consulta**
   - Haz clic en el botón verde **"Run"**
   - Espera 1-2 segundos

7. **Leer el resultado**

Deberías ver una tabla como esta:

```
┌────────────────────────────────┬─────────────────────┬─────────┐
│ correo                         │ confirmado          │ apodo   │
├────────────────────────────────┼─────────────────────┼─────────┤
│ tester+maria_09nov@cromos.test │ NULL                │ NULL    │
└────────────────────────────────┴─────────────────────┴─────────┘

1 row returned
```

**¿Qué significa cada cosa?**

- **correo:** Tu email - debe aparecer exactamente como lo escribiste
- **confirmado:** Fecha de confirmación - estará `NULL` (vacío) porque aún no confirmamos el email
- **apodo:** Tu nickname - estará `NULL` (vacío) porque aún no lo configuraste

**✅ Test EXITOSO si:**
- Ves **exactamente 1 fila** (dice "1 row returned" abajo)
- El campo `correo` muestra tu email correcto
- Los demás campos pueden estar `NULL` (es normal en este punto)

**❌ Test FALLIDO si:**
- No aparece ninguna fila (dice "0 rows returned")
  - **Significa:** La cuenta NO se creó en la base de datos
  - **Reportar:** Este es un error crítico
- Aparecen varias filas (dice "2 rows returned" o más)
  - **Significa:** Hay datos duplicados (raro)
  - **Reportar:** Posible problema de integridad

#### Verificación en Consola de Chrome

**¿Qué vamos a verificar?** Que no hubo errores técnicos durante el proceso.

**Instrucciones paso a paso:**

1. **Asegúrate de que DevTools estén abiertas**
   - Si las cerraste, presiona `F12` de nuevo

2. **Ir a la pestaña Console**
   - En DevTools, busca las pestañas de arriba: Elements, Console, Network...
   - Haz clic en **"Console"**

3. **Limpiar mensajes anteriores**
   - Busca el ícono 🚫 que dice "Clear console"
   - Haz clic para borrar todo
   - Ahora la consola está vacía

4. **Repetir el registro** (si es necesario)
   - Si ya completaste el registro antes, puedes ver los mensajes que ya están
   - Si la consola está vacía, puedes hacer el registro de nuevo con otro email

5. **Revisar mensajes**

**Buscar líneas ROJAS:**
- Las líneas rojas son **ERRORES** críticos
- Si ves alguna línea roja, es un problema

**Ejemplos de lo que podrías ver:**

**✅ BIEN - Sin errores:**
```
> POST /api/auth/register 201 Created
> User registration initiated
```

**❌ MAL - Con error:**
```
❌ POST /api/auth/register 500 Internal Server Error
❌ TypeError: Cannot read property 'email' of undefined
```

6. **¿Hay errores rojos?**

**SI hay errores:**
1. Haz clic derecho sobre la línea roja
2. Selecciona **"Copy message"**
3. Abre Notepad o Bloc de notas
4. Pega el error (Ctrl+V)
5. Guarda como: `CP-F01-02_error_consola.txt`
6. Toma captura de pantalla:
   - Windows: `Win + Shift + S`
   - Mac: `Cmd + Shift + 4`
7. Guarda como: `CP-F01-02_captura.png`

**NO hay errores:**
- ¡Perfecto! La consola está limpia
- Continúa con el siguiente paso

### 📊 Resultado del Test

**Criterios finales para considerar el test EXITOSO:**

- ✅ El formulario se mostró correctamente en vista móvil (sin scroll horizontal)
- ✅ Los campos de entrada mostraron el teclado virtual adecuado
- ✅ El botón se activó solo después de completar todos los campos
- ✅ Apareció el mensaje "Revisa tu correo" centrado y legible
- ✅ La consulta SQL devolvió 1 fila con tu email
- ✅ No hubo errores rojos en la consola de Chrome

**Si TODOS los criterios se cumplieron:**
1. Abre `Test_Tracking_Spreadsheet.csv`
2. Busca la fila `CP-F01-02`
3. En la columna "Estado" escribe: `Passed`
4. En la columna "Notas" escribe: `OK` o deja vacío

**Si ALGÚN criterio falló:**
1. En la columna "Estado" escribe: `Failed`
2. En la columna "Notas" escribe una descripción breve:
   - Ejemplo: "No aparece en BD - 0 rows returned"
   - Ejemplo: "Error 500 en consola al enviar formulario"
3. Adjunta las capturas de pantalla si las tomaste
4. Reporta a David en Slack #testing

### 📞 ¿Necesitas ayuda?

- **Problemas con SQL:** Ver [GUIA_DE_CONSULTAS_SQL.md](../../GUIA_DE_CONSULTAS_SQL.md)
- **Problemas con Consola:** Ver [GUIA_DE_CONSOLA_CHROME.md](../../GUIA_DE_CONSOLA_CHROME.md)
- **Cualquier duda:** Contacta a David en Slack #testing

---

## Caso CP-F01-04: Inicio de sesión válido + persistencia

### 🎯 Objetivo
Verificar que los usuarios pueden iniciar sesión correctamente y que la sesión se mantiene al cerrar y reabrir el navegador.

### 📋 Preparación (Setup)

#### Paso 1: Asegúrate de tener el usuario de prueba

Para este test usaremos el usuario pre-configurado:

```
Email: qa.registrado@cromos.test
Contraseña: Registrado#123
```

**Este usuario ya existe en la base de datos y está activo.**

#### Paso 2: Limpiar navegador

1. Cierra TODAS las ventanas de Chrome
2. Abre Chrome normalmente (NO en modo incógnito para este test)
3. Presiona `Ctrl + Shift + Delete` para abrir "Borrar datos de navegación"
4. Selecciona:
   - Intervalo de tiempo: "Todo el tiempo"
   - Marca: "Cookies y otros datos de sitios"
   - Marca: "Imágenes y archivos almacenados en caché"
5. Haz clic en "Borrar datos"
6. Espera a que termine (2-3 segundos)

**¿Por qué NO usamos modo incógnito?**
- Necesitamos probar la **persistencia** de la sesión
- El modo incógnito borra todo al cerrar
- Queremos verificar que la sesión se mantiene al reabrir Chrome

### 🧪 Pasos del Test

#### 1. Navegar a la página de login

1. En Chrome, ve a: `https://cambio-cromos.vercel.app`
2. Busca el botón **"Iniciar sesión"** o **"Login"**
3. Haz clic en él

**Deberías ver:**
- Un formulario con campos "Email" y "Contraseña"
- Una casilla "Recordarme" o "Mantener sesión iniciada"
- Un botón "Iniciar sesión"

#### 2. Completar el formulario de login

1. En el campo **"Email"**, escribe: `qa.registrado@cromos.test`
2. En el campo **"Contraseña"**, escribe: `Registrado#123`
3. **IMPORTANTE:** Marca la casilla **"Recordarme"** ✓
   - Esta casilla permite que la sesión persista
   - Si no la marcas, el test fallará
4. Haz clic en el botón **"Iniciar sesión"**

**✅ Debe verse:**
- Un mensaje verde (toast) que dice "Bienvenido" o "Sesión iniciada"
- La página te redirige automáticamente (probablemente a "Mi colección" o dashboard)
- En el header aparece tu avatar o nombre de usuario

**❌ NO debe verse:**
- Mensaje "Correo o contraseña incorrectos"
- La página se queda en el formulario de login
- Errores rojos

**Si algo sale mal:**
- Verifica que escribiste bien el email y contraseña
- Asegúrate de haber marcado "Recordarme"
- Revisa la consola de Chrome para errores (F12 → Console)

#### 3. Verificar que la sesión está activa

Después de iniciar sesión exitosamente:

1. Presiona `F12` para abrir DevTools
2. Ve a la pestaña **"Application"** (arriba en DevTools)
3. En el panel izquierdo, busca **"Storage"**
4. Expande **"Local Storage"**
5. Haz clic en `https://cambio-cromos.vercel.app`

**Deberías ver:**
- Una clave que empieza con `supabase.auth.token`
- Un valor muy largo (esto es tu token de sesión)

**Toma nota de la fecha de expiración si aparece**
- Debería ser más de 50 minutos en el futuro
- Ejemplo: Si son las 14:00, debería expirar después de las 14:50

#### 4. Cerrar y reabrir el navegador (TEST DE PERSISTENCIA)

**Este es el paso más importante del test:**

1. **Cierra COMPLETAMENTE Chrome**
   - No solo la pestaña, sino TODO el navegador
   - Windows: Haz clic en la X roja de la ventana principal
   - Mac: Cmd+Q para cerrar Chrome completamente

2. **Espera 10 segundos** (cuenta hasta 10)

3. **Abre Chrome de nuevo**

4. **Ve directamente a la URL:**
   - Escribe: `https://cambio-cromos.vercel.app`
   - Presiona Enter

**✅ Test EXITOSO si:**
- La página te muestra directamente el dashboard (sigues autenticado)
- Ves tu avatar o nombre en el header
- NO te pide que inicies sesión de nuevo

**❌ Test FALLIDO si:**
- Te redirige a la página de login
- Ves el mensaje "Inicia sesión para continuar"
- No aparece tu avatar en el header

### 🔍 Validaciones Técnicas

#### Verificación en Consola de Chrome

**¿Qué vamos a verificar?** Que el token de sesión sigue existiendo después de reabrir.

**Instrucciones:**

1. Con Chrome reabierto y en la página de la app, presiona `F12`
2. Ve a la pestaña **"Application"**
3. Navega a **Storage → Local Storage → https://cambio-cromos.vercel.app**

**✅ Verificar:**
- La clave `supabase.auth.token` **sigue existiendo**
- El valor es el mismo (o muy similar) al de antes de cerrar
- La fecha de expiración no ha pasado

4. Ahora ve a la pestaña **"Console"**
5. Escribe este comando y presiona Enter:
   ```javascript
   await supabaseClient.auth.getSession()
   ```

**Si funciona, verás:**
```javascript
{
  data: {
    session: {
      access_token: "ey...",  // Token largo
      expires_at: 1234567890,  // Número grande
      user: {
        email: "qa.registrado@cromos.test"
      }
    }
  }
}
```

**✅ Verificar:**
- `expires_at` es un número mayor que la hora actual
- `user.email` es "qa.registrado@cromos.test"

**Si NO funciona:**
- Verás `session: null`
- **Significa:** La sesión NO persistió
- **Causa probable:** No se marcó "Recordarme"

#### Verificación en Base de Datos (SQL)

**¿Qué vamos a verificar?** Que el último inicio de sesión está registrado.

**Instrucciones:**

1. Abre Supabase Dashboard: https://app.supabase.com
2. Ve a SQL Editor
3. Copia esta consulta:

```sql
-- Verificar el último inicio de sesión del usuario
SELECT
    email,
    last_sign_in_at AS ultimo_login,
    -- Esta línea calcula cuántos minutos hace que iniciaste sesión
    EXTRACT(EPOCH FROM (NOW() - last_sign_in_at)) / 60 AS minutos_desde_login
FROM auth.users
WHERE email = 'qa.registrado@cromos.test';
```

4. Haz clic en **"Run"**

**Resultado esperado:**

```
┌───────────────────────────┬─────────────────────┬──────────────────────┐
│ email                     │ ultimo_login        │ minutos_desde_login  │
├───────────────────────────┼─────────────────────┼──────────────────────┤
│ qa.registrado@cromos.test │ 2025-11-09 14:35:22 │ 2.5                  │
└───────────────────────────┴─────────────────────┴──────────────────────┘
```

**✅ Verificar:**
- `ultimo_login` muestra una fecha y hora reciente (últimos 5 minutos)
- `minutos_desde_login` es un número pequeño (menos de 10)

**Si la fecha es muy antigua:**
- Puede ser que el login no se registró correctamente
- Reporta esto como un problema

### 📊 Resultado del Test

**Criterios para considerar el test EXITOSO:**

- ✅ Login exitoso con credenciales correctas
- ✅ Apareció mensaje de bienvenida
- ✅ Redirigió al dashboard
- ✅ Token guardado en Local Storage
- ✅ Al cerrar y reabrir Chrome, la sesión PERSISTIÓ (seguías autenticado)
- ✅ Consulta SQL muestra último login reciente
- ✅ No hay errores en consola

**Actualizar spreadsheet:**

- **Si todo OK:** Estado = `Passed`, Notas = `OK`
- **Si falló persistencia:** Estado = `Failed`, Notas = `Sesión no persistió al reabrir Chrome`
- **Si otro error:** Estado = `Failed`, Notas = [descripción del problema]

### 📞 ¿Necesitas ayuda?

- **No encuentro Local Storage:** Ver [GUIA_DE_CONSOLA_CHROME.md](../../GUIA_DE_CONSOLA_CHROME.md) → Sección "Paso 7: Usar la pestaña Application"
- **El comando JavaScript da error:** Es posible que `supabaseClient` no esté disponible. Omite ese paso y solo verifica Local Storage.
- **Cualquier duda:** Contacta a David en Slack #testing

---

## Caso CP-F01-05: Manejo de credenciales inválidas

### 🎯 Objetivo
Verificar que el sistema maneja correctamente los intentos de login con credenciales incorrectas, mostrando mensajes apropiados y sin bloquear la cuenta.

### 📋 Preparación (Setup)

#### Usuarios para este test

Usaremos dos escenarios:

1. **Usuario real con contraseña incorrecta:**
   - Email: `qa.registrado@cromos.test`
   - Contraseña CORRECTA: `Registrado#123` (no la uses aún)
   - Contraseña INCORRECTA: `PasswordMalo123!` (usaremos esta)

2. **Usuario que no existe:**
   - Email: `fantasma@cromos.test` (este usuario NO está en la BD)
   - Contraseña: `Cualquiera123!`

#### Limpiar navegador

1. Cierra todas las pestañas de la app
2. Abre modo incógnito: `Ctrl + Shift + N`
3. Abre DevTools: `F12`
4. Ve a Console y limpia: clic en 🚫 "Clear console"

### 🧪 Pasos del Test

#### 1. Intento con contraseña incorrecta (3 veces)

**Primer intento:**

1. Ve a: `https://cambio-cromos.vercel.app`
2. Haz clic en **"Iniciar sesión"**
3. Email: `qa.registrado@cromos.test`
4. Contraseña: `PasswordMalo123!` (intencionalmente incorrecta)
5. Haz clic en **"Iniciar sesión"**

**✅ Debe verse:**
- Mensaje de error: **"Correo o contraseña incorrectos"** o similar
- El mensaje NO debe decir cuál campo es el incorrecto (por seguridad)
- El formulario NO se limpia (email sigue visible)
- NO te redirige a ninguna parte

**❌ NO debe verse:**
- "La contraseña es incorrecta" (no debe revelar qué campo falló)
- "Usuario no encontrado"
- Cuenta bloqueada

**Segundo intento:**

1. Sin recargar la página, vuelve a escribir la contraseña incorrecta
2. Haz clic en "Iniciar sesión" de nuevo

**✅ Debe verse:**
- El mismo mensaje de error
- Aún puedes intentar de nuevo

**Tercer intento:**

1. Sin recargar la página, intenta por tercera vez
2. Haz clic en "Iniciar sesión"

**✅ Debe verse:**
- El mismo mensaje de error
- **ADEMÁS:** Aparece una sugerencia: "¿Olvidaste tu contraseña?" o enlace para recuperación
- El formulario sigue permitiendo más intentos (no hay bloqueo)

**¿Por qué 3 intentos?**
- Es buena práctica mostrar la opción de recuperación después de varios fallos
- Pero NO bloqueamos la cuenta automáticamente

#### 2. Intento con email inexistente

1. Recarga la página: `F5`
2. Ve al formulario de login
3. Email: `fantasma@cromos.test` (este usuario NO existe)
4. Contraseña: `Cualquiera123!`
5. Haz clic en "Iniciar sesión"

**✅ Debe verse:**
- El MISMO mensaje: "Correo o contraseña incorrectos"
- NO debe decir "Usuario no encontrado" (por seguridad)
- El mensaje es idéntico al del intento con contraseña incorrecta

**¿Por qué el mismo mensaje?**
- Por seguridad, no revelamos si un email existe o no
- Un atacante no puede averiguar qué emails están registrados

### 🔍 Validaciones Técnicas

#### Verificación en Consola de Chrome

**¿Qué vamos a verificar?** Que no hay errores 500 o stack traces.

**Instrucciones:**

1. Asegúrate de que DevTools → Console esté abierta
2. Después de cada intento fallido, revisa la consola

**✅ Es normal ver:**
```
> POST /api/auth/login 401 Unauthorized
```
- El código `401` significa "no autorizado" (credenciales incorrectas)
- Esto NO es un error del sistema, es esperado

**❌ NO debe verse:**
```
❌ POST /api/auth/login 500 Internal Server Error
❌ TypeError: Cannot read property...
❌ Uncaught ReferenceError...
```

- El código `500` es un error del servidor (problema técnico)
- Stack traces indican errores de programación
- Si ves esto, es un BUG

#### Verificación en Base de Datos (SQL)

**¿Qué vamos a verificar?** Que la cuenta NO fue bloqueada después de los 3 intentos.

**Instrucciones:**

1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Copia esta consulta:

```sql
-- Verificar que la cuenta sigue activa (no bloqueada)
SELECT
    email,
    -- En Supabase, las cuentas bloqueadas tienen banned_until
    banned_until,
    -- También verificamos el estado general
    confirmation_sent_at
FROM auth.users
WHERE email = 'qa.registrado@cromos.test';
```

4. Haz clic en **"Run"**

**Resultado esperado:**

```
┌───────────────────────────┬──────────────┬────────────────────────┐
│ email                     │ banned_until │ confirmation_sent_at   │
├───────────────────────────┼──────────────┼────────────────────────┤
│ qa.registrado@cromos.test │ NULL         │ 2025-01-15 10:30:00    │
└───────────────────────────┴──────────────┴────────────────────────┘
```

**✅ Verificar:**
- `banned_until` debe ser `NULL` (no bloqueado)
- Si tiene una fecha, la cuenta está bloqueada (PROBLEMA)

**También verifica:**

```sql
-- Contar cuántos usuarios con este email existen
SELECT COUNT(*) AS total
FROM auth.users
WHERE email = 'fantasma@cromos.test';
```

**Resultado esperado:**
```
┌───────┐
│ total │
├───────┤
│ 0     │  ← Cero porque el usuario NO existe
└───────┘
```

**✅ Verificar:**
- `total` debe ser `0` (el usuario fantasma NO se creó)
- Si es `1`, significa que se creó por error (PROBLEMA)

### 📊 Resultado del Test

**Criterios para considerar el test EXITOSO:**

- ✅ Mensaje de error aparece con credenciales incorrectas
- ✅ El mensaje NO revela qué campo está incorrecto
- ✅ Después de 3 intentos, aparece sugerencia de recuperación
- ✅ La cuenta NO se bloquea (puedes seguir intentando)
- ✅ Usuario inexistente muestra el mismo mensaje que contraseña incorrecta
- ✅ Consulta SQL muestra `banned_until = NULL` (no bloqueado)
- ✅ Usuario fantasma NO se creó en BD (COUNT = 0)
- ✅ No hay errores 500 en consola

**Actualizar spreadsheet:**

- **Si todo OK:** Estado = `Passed`, Notas = `OK`
- **Si revela info de seguridad:** Estado = `Failed`, Notas = `Mensaje revela qué campo falló`
- **Si bloquea cuenta:** Estado = `Failed`, Notas = `Cuenta bloqueada después de 3 intentos`
- **Otro error:** Estado = `Failed`, Notas = [descripción]

### 📞 ¿Necesitas ayuda?

- **¿Qué es un código 401?** Es normal, significa "no autorizado"
- **¿Qué es banned_until?** Es el campo que indica si una cuenta está bloqueada
- **Dudas:** Contacta a David en Slack #testing

---

## Caso CP-F01-08: Refresco automático de sesión y logout

### 🎯 Objetivo
Verificar que el sistema mantiene la sesión activa automáticamente y que el logout limpia correctamente todos los datos de sesión.

### 📋 Preparación (Setup)

#### Usuario para este test

```
Email: qa.registrado@cromos.test
Contraseña: Registrado#123
```

#### Limpiar y preparar

1. Cierra todas las ventanas de Chrome
2. Abre Chrome normalmente (NO incógnito)
3. Limpia datos: `Ctrl + Shift + Delete` → "Todo el tiempo" → Borrar

### 🧪 Pasos del Test

#### 1. Iniciar sesión

1. Ve a: `https://cambio-cromos.vercel.app`
2. Inicia sesión con:
   - Email: `qa.registrado@cromos.test`
   - Contraseña: `Registrado#123`
   - Marca: "Recordarme" ✓
3. Espera a que te rediriga al dashboard

**✅ Verificar:**
- Sesión iniciada correctamente
- Ves tu avatar/nombre en el header

#### 2. Verificar token inicial

1. Presiona `F12` → Pestaña "Application"
2. Navega a: Storage → Local Storage → https://cambio-cromos.vercel.app
3. Busca la clave `supabase.auth.token`
4. Haz clic en el valor (un texto muy largo)
5. Copia el valor completo: Ctrl+C

**Anota información del token:**
- **Hora actual:** ____________ (ej: 14:30)
- **Expira en:** ____________ minutos (busca "expires_at" en el token)

#### 3. Dejar la sesión abierta 30 minutos

**Opciones:**

**Opción A - Esperar realmente (recomendado):**
1. Deja la pestaña abierta
2. Puedes hacer otras cosas en tu computadora
3. NO cierres Chrome
4. Espera exactamente 30 minutos

**Opción B - Simular tiempo (más rápido):**
1. En Console de DevTools, ejecuta:
   ```javascript
   // Esto avanza el tiempo del token
   // (Solo para testing, no funciona en producción)
   ```
2. **Nota:** Si esta opción no funciona, usa Opción A

#### 4. Verificar refresco automático

Después de 30 minutos:

1. Vuelve a la pestaña de la app
2. Haz alguna acción (ej: navega a otra sección de la app)
3. Presiona `F12` → Application → Local Storage
4. Busca `supabase.auth.token` de nuevo
5. Copia el nuevo valor

**Compara con el token anterior:**
- ¿Son diferentes? ✅ Bien (el token se refrescó)
- ¿Son iguales? ❌ Posible problema

**Verifica el tiempo de expiración:**
- Debe ser ~50 minutos en el futuro (desde ahora)
- Si es menos, puede haber un problema

#### 5. Hacer logout

1. En el header de la app, busca tu avatar o menú de usuario
2. Haz clic para abrir el menú desplegable
3. Busca la opción **"Cerrar sesión"** o **"Logout"**
4. Haz clic

**✅ Debe verse:**
- Te redirige a la página principal o de login
- Ya NO ves tu avatar en el header
- Mensaje opcional: "Sesión cerrada"

#### 6. Verificar limpieza de datos

**Inmediatamente después del logout:**

1. Presiona `F12` → Application → Local Storage
2. Busca `supabase.auth.token`

**✅ Debe verse:**
- La clave NO existe (fue eliminada)
- O el valor está vacío/null

**Si la clave todavía tiene un token largo:**
- ❌ PROBLEMA - El logout NO limpió los datos

3. Ahora intenta navegar a: `https://cambio-cromos.vercel.app/profile`

**✅ Debe verse:**
- Te redirige al login
- Mensaje: "Inicia sesión para continuar" o similar

**❌ NO debe verse:**
- Tu perfil (sigues autenticado)

### 🔍 Validaciones Técnicas

#### Verificación en Consola

**Después del logout, ejecuta en Console:**

```javascript
await supabaseClient.auth.getSession()
```

**Resultado esperado:**
```javascript
{
  data: {
    session: null  // ← Debe ser null
  }
}
```

**Si `session` NO es null:**
- ❌ PROBLEMA - La sesión no se cerró correctamente

#### Verificación Multi-Pestaña (Avanzado)

**Este paso verifica que el logout funciona en todas las pestañas:**

1. **ANTES de hacer logout**, abre una segunda pestaña
2. En la segunda pestaña, ve también a: `https://cambio-cromos.vercel.app`
3. Verifica que estás autenticado en ambas pestañas
4. **En la primera pestaña**, haz logout
5. **En la segunda pestaña**, recarga la página (F5)

**✅ Debe verse:**
- La segunda pestaña TAMBIÉN te desautentica
- Te redirige al login en ambas pestañas

**¿Por qué?**
- El logout debe cerrar sesión en TODAS las pestañas
- Esto es por seguridad

### 📊 Resultado del Test

**Criterios para considerar el test EXITOSO:**

- ✅ Login exitoso inicial
- ✅ Token de sesión existe en Local Storage
- ✅ Después de 30 minutos, el token se refrescó automáticamente
- ✅ Logout cierra sesión correctamente
- ✅ Local Storage queda limpio (token eliminado)
- ✅ Intentar acceder a rutas protegidas redirige al login
- ✅ Logout funciona en todas las pestañas abiertas
- ✅ No hay errores en consola

**Actualizar spreadsheet:**

- **Si todo OK:** Estado = `Passed`, Notas = `Token refrescó a los 30 min, logout limpia datos`
- **Si token no refrescó:** Estado = `Failed`, Notas = `Token no se refrescó después de 30 min`
- **Si logout no limpia:** Estado = `Failed`, Notas = `Logout no elimina token de Local Storage`
- **Otro error:** Estado = `Failed`, Notas = [descripción]

### 📞 ¿Necesitas ayuda?

- **No sé cómo comparar tokens:** Solo verifica que sean textos diferentes
- **El comando JavaScript da error:** Verifica en Local Storage manualmente
- **Dudas:** Contacta a David en Slack #testing

---

## ✅ Checklist Final

Después de completar todos los tests de este archivo:

- [ ] CP-F01-02: Registro móvil - Completado
- [ ] CP-F01-04: Login y persistencia - Completado
- [ ] CP-F01-05: Credenciales inválidas - Completado
- [ ] CP-F01-08: Refresco y logout - Completado

**Tiempo total invertido:** __________ horas

**Tests pasados:** ______ / 4

**Tests fallidos:** ______ / 4

**Próximo archivo:** `02_Perfil_y_Avatar.md`

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Autor:** Equipo CambioCromos
**Contacto:** David (Slack #testing)
