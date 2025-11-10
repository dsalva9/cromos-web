# Guía Completa de Consola de Chrome para Testers No Técnicos

## 📖 ¿Qué es esta guía?

Esta guía te enseñará paso a paso cómo usar las **Chrome DevTools** (herramientas de desarrollador) para verificar que no haya errores técnicos durante los tests. **No necesitas experiencia previa en programación.**

## 🎯 ¿Qué son las Chrome DevTools?

**Chrome DevTools** (también llamadas "Herramientas de Desarrollador") son un conjunto de herramientas integradas en Google Chrome que permiten **ver qué pasa "detrás de escena"** en una página web.

**Analogía:** Es como el panel de control de un coche:
- El **volante y pedales** son lo que el usuario normal ve (la página web)
- El **panel de control** muestra velocidad, temperatura del motor, errores (las DevTools)

**¿Para qué las usamos?**
- Ver si hay **errores** en la página
- Verificar que las **peticiones al servidor** funcionan bien
- Revisar información de **sesión** (tokens, cookies)

---

## 🚀 Paso 1: Abrir las Chrome DevTools

Hay **3 formas** de abrir las DevTools. Usa la que te resulte más cómoda.

### Método 1: Clic Derecho (Más común)

1. En cualquier parte de la página web, haz **clic derecho** con el ratón
2. En el menú que aparece, busca la opción **"Inspeccionar"** o **"Inspect"**
3. Se abre un panel nuevo (abajo o al lado de la página)

**Ventaja:** Funciona siempre, muy visual

### Método 2: Atajo de Teclado (Más rápido)

**En Windows:**
- Presiona `F12` en tu teclado

**En Mac:**
- Presiona `Cmd + Option + I`

**Ventaja:** Más rápido una vez que lo memorizas

### Método 3: Menú de Chrome

1. Haz clic en los **tres puntos verticales** (⋮) en la esquina superior derecha de Chrome
2. Ve a **"Más herramientas"** → **"Herramientas para desarrolladores"**

**Ventaja:** No requiere recordar atajos

---

## 📐 Paso 2: Ubicación de las DevTools

Cuando abres las DevTools, pueden aparecer en diferentes posiciones:

### Posición 1: Abajo (Dock to bottom)
```
┌──────────────────────────────┐
│   PÁGINA WEB                 │
│                              │
├──────────────────────────────┤ ← Separador
│   DEVTOOLS (Consola, etc.)   │
└──────────────────────────────┘
```

### Posición 2: Al lado (Dock to right)
```
┌─────────────────┬────────────┐
│   PÁGINA WEB    │  DEVTOOLS  │
│                 │            │
│                 │  (Consola) │
└─────────────────┴────────────┘
```

### Posición 3: Ventana separada (Undock)
```
┌──────────────┐    ┌───────────┐
│  PÁGINA WEB  │    │ DEVTOOLS  │
│              │    │ (Consola) │
└──────────────┘    └───────────┘
```

### Cambiar la posición

1. En la esquina superior derecha de DevTools, busca los **tres puntos verticales** (⋮)
2. Haz clic
3. Verás iconos para cambiar la posición:
   - ⬜ = Dock to left
   - ▭ = Dock to bottom
   - ▢ = Dock to right
   - ⧉ = Undock (ventana separada)

**Recomendación:** Usa "Dock to bottom" (abajo) porque es más fácil de leer

---

## 🗂️ Paso 3: Pestañas Principales de DevTools

Cuando abres las DevTools, verás varias **pestañas** en la parte superior:

### Vista general de las pestañas

```
┌──────────────────────────────────────────────────────┐
│ Elements | Console | Sources | Network | Application │ ← Pestañas
├──────────────────────────────────────────────────────┤
│                                                      │
│         (Contenido de la pestaña activa)             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Pestañas que usaremos

| Pestaña | ¿Para qué sirve? | ¿Cuándo la usamos? |
|---------|------------------|-------------------|
| **Console** | Ver mensajes y errores | En casi todos los tests |
| **Network** | Ver peticiones al servidor | Para verificar que se envían datos correctamente |
| **Application** | Ver cookies, tokens de sesión | Para verificar que el usuario está autenticado |

**Para los tests no técnicos, usaremos principalmente Console y ocasionalmente Network.**

---

## 💬 Paso 4: Usar la Pestaña "Console" (Consola)

La **Console** (Consola) es donde aparecen los mensajes y errores.

### 4.1. Ir a la pestaña Console

1. Asegúrate de que las DevTools estén abiertas
2. Haz clic en la pestaña **"Console"** (arriba)
3. Verás un área donde aparecen mensajes

### 4.2. Tipos de mensajes

La consola muestra diferentes tipos de mensajes con colores:

#### 🔴 Mensajes ROJOS (Errores)

```
❌ Error: Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Significado:** Algo salió mal. Esto ES un problema.

**Qué hacer:**
- Copiar el mensaje completo
- Reportarlo en el test como "Failed"
- Adjuntar captura de pantalla

#### 🟡 Mensajes AMARILLOS (Advertencias/Warnings)

```
⚠️ Warning: React does not recognize the `customProp` prop on a DOM element
```

**Significado:** Hay algo que podría mejorar, pero no impide que funcione.

**Qué hacer:**
- Generalmente se ignoran (a menos que el test lo mencione explícitamente)
- Puedes anotarlo en "Notas" como referencia

#### 🔵 Mensajes AZULES (Informativos)

```
ℹ️ User logged in successfully
```

**Significado:** Información normal. Todo va bien.

**Qué hacer:**
- Ignorar (son normales)

#### ⚪ Mensajes BLANCOS/GRISES (Logs)

```
> Fetching user data...
```

**Significado:** Mensajes de seguimiento del código. Normales.

**Qué hacer:**
- Ignorar (son normales)

### 4.3. Limpiar la consola

Antes de realizar un test, es buena idea limpiar mensajes anteriores:

**Método 1:** Clic en el ícono 🚫 (prohibido) que dice **"Clear console"**

**Método 2:** Clic derecho en cualquier parte de la consola → **"Clear console"**

**Método 3:** Atajo de teclado `Ctrl + L` (Windows) o `Cmd + K` (Mac)

**¿Por qué limpiar?**
- Para ver solo los mensajes del test actual
- Para no confundir errores viejos con nuevos

---

## 🔍 Paso 5: Detectar Errores en la Consola

### 5.1. Escenario típico de test

**Ejemplo:** Test CP-F01-02 - Registro de usuario móvil

**Pasos:**
1. Abrir DevTools (`F12`)
2. Ir a pestaña **Console**
3. Limpiar consola (ícono 🚫)
4. **Realizar la acción del test** (rellenar formulario, enviar)
5. **Observar la consola mientras actúas**

### 5.2. ¿Qué buscar?

#### ✅ Test EXITOSO - Sin errores rojos

```
> POST /api/auth/register 200 OK
> User created successfully
```

**Señales de éxito:**
- Solo mensajes azules/blancos
- Números como `200`, `201` (códigos de éxito)
- Textos como "success", "OK", "created"

#### ❌ Test FALLIDO - Hay errores rojos

```
❌ POST /api/auth/register 500 Internal Server Error
❌ TypeError: Cannot read property 'email' of undefined
```

**Señales de problema:**
- Mensajes rojos
- Códigos como `400`, `404`, `500` (códigos de error)
- Palabras como "Error", "Failed", "undefined", "null"

### 5.3. Interpretar códigos de estado HTTP

Cuando veas números en la consola, significan lo siguiente:

| Código | Color | Significado |
|--------|-------|-------------|
| **200** | Verde | ✅ OK - Todo bien |
| **201** | Verde | ✅ Creado - Registro exitoso |
| **204** | Verde | ✅ Sin contenido - Acción exitosa sin respuesta |
| **400** | Rojo | ❌ Petición incorrecta - Datos mal enviados |
| **401** | Rojo | ❌ No autorizado - Falta login |
| **403** | Rojo | ❌ Prohibido - Sin permisos |
| **404** | Rojo | ❌ No encontrado - Recurso no existe |
| **500** | Rojo | ❌ Error del servidor - Problema técnico grave |

---

## 📡 Paso 6: Usar la Pestaña "Network" (Red)

La pestaña **Network** muestra todas las **peticiones** (requests) que la página hace al servidor.

### 6.1. ¿Cuándo usar Network?

Úsala cuando el test diga algo como:
- "Verificar que se envía la petición correctamente"
- "Confirmar que el servidor responde con 200"
- "Revisar que los datos se suben al backend"

### 6.2. Abrir la pestaña Network

1. En DevTools, haz clic en la pestaña **"Network"**
2. **IMPORTANTE:** La pestaña debe estar abierta **ANTES** de realizar la acción del test
3. Si está vacía, refresca la página (`F5`) con la pestaña Network abierta

### 6.3. Leer la lista de peticiones

Verás una tabla con muchas filas:

```
┌──────────┬────────────────┬────────┬─────────┬──────┐
│ Name     │ Status         │ Type   │ Size    │ Time │
├──────────┼────────────────┼────────┼─────────┼──────┤
│ register │ 200            │ fetch  │ 1.2 KB  │ 450ms│
│ logo.png │ 200            │ png    │ 15 KB   │ 120ms│
│ style.css│ 200            │ css    │ 8 KB    │ 80ms │
└──────────┴────────────────┴────────┴─────────┴──────┘
```

**Columnas importantes:**
- **Name:** Nombre del recurso o endpoint
- **Status:** Código de estado (200 = bien, 500 = error)
- **Type:** Tipo de petición (fetch = API, png = imagen, etc.)
- **Time:** Cuánto tardó en responder

### 6.4. Filtrar peticiones

Arriba de la lista, hay botones para filtrar:

- **All:** Muestra todo
- **Fetch/XHR:** Solo peticiones al servidor (API) ← **Usa este**
- **JS:** Solo archivos JavaScript
- **CSS:** Solo hojas de estilo
- **Img:** Solo imágenes

**Recomendación:** Haz clic en **"Fetch/XHR"** para ver solo las peticiones importantes.

### 6.5. Ver detalles de una petición

1. Haz clic en cualquier fila de la lista
2. Se abre un panel lateral con pestañas:
   - **Headers:** Información de la petición
   - **Preview:** Vista previa de la respuesta
   - **Response:** Respuesta completa del servidor

**Ejemplo de uso:**

**Test dice:** "Verificar que se envía el email al servidor"

**Pasos:**
1. Abrir pestaña Network
2. Rellenar formulario de registro
3. Enviar formulario
4. En Network, buscar la petición `register` o `signup`
5. Hacer clic en ella
6. Ir a pestaña **"Payload"** (a veces llamada "Request")
7. Verificar que aparece tu email

---

## 🔐 Paso 7: Usar la Pestaña "Application" (Almacenamiento)

La pestaña **Application** muestra información almacenada en el navegador, como tokens de sesión.

### 7.1. ¿Cuándo usar Application?

Úsala cuando el test diga:
- "Verificar que el token de sesión se guardó"
- "Confirmar que el usuario está autenticado"
- "Revisar las cookies de la sesión"

### 7.2. Abrir Application y navegar a Local Storage

1. En DevTools, haz clic en la pestaña **"Application"**
2. En el panel izquierdo, busca **"Storage"** (Almacenamiento)
3. Despliega **"Local Storage"**
4. Haz clic en `https://cambio-cromos.vercel.app` (o tu dominio)

### 7.3. Ver el token de sesión

Busca una clave que se llame:
- `supabase.auth.token`
- `sb-[algo]-auth-token`

**Si la ves:** ✅ El usuario está autenticado
**Si no está:** ❌ Hay un problema con el login

---

## 📋 Paso 8: Copiar Mensajes de Error

Cuando encuentres un error, debes **copiarlo** para reportarlo.

### 8.1. Copiar un mensaje individual

**Método 1: Clic derecho**
1. Haz **clic derecho** sobre la línea del error rojo
2. Selecciona **"Copy message"** o **"Copiar mensaje"**
3. Pégalo en tu editor de texto (Notepad, Word, etc.)

**Método 2: Selección manual**
1. Haz clic al inicio del mensaje de error
2. Arrastra hasta el final para seleccionar todo
3. `Ctrl + C` para copiar

### 8.2. Copiar todo el stack trace (Rastro completo)

Algunos errores muestran información adicional expandible:

```
❌ Error: Cannot read property 'email' of undefined
    ▼ at Object.createUser (auth.js:45)
      at handleSubmit (RegisterForm.jsx:123)
      ...
```

1. Haz clic en el **triángulo ▼** para expandir
2. Clic derecho en el error
3. Selecciona **"Copy stack trace"** o **"Copiar rastro"**

**Esto da más información técnica a David para depurar.**

---

## 📸 Paso 9: Tomar Capturas de Pantalla

### 9.1. Captura rápida de la pantalla

**En Windows:**
1. Presiona `Win + Shift + S`
2. El cursor se convierte en una cruz
3. Arrastra para seleccionar el área de DevTools con el error
4. Se copia al portapapeles
5. Pega en Paint o Word: `Ctrl + V`
6. Guarda como: `CP-FXX-YY_error_consola.png`

**En Mac:**
1. Presiona `Cmd + Shift + 4`
2. Arrastra para seleccionar el área
3. Se guarda automáticamente en Escritorio

### 9.2. Captura de la DevTools completa

Si quieres capturar todas las DevTools:

1. Haz clic dentro de las DevTools (para activarlas)
2. Presiona `Ctrl + Shift + P` (Windows) o `Cmd + Shift + P` (Mac)
3. Escribe "screenshot"
4. Selecciona **"Capture screenshot"**
5. Se descarga automáticamente

---

## 🆘 Paso 10: Problemas Comunes y Soluciones

### Problema 1: No puedo abrir las DevTools

**Síntomas:** Presiono `F12` y no pasa nada

**Soluciones:**
1. Intenta con clic derecho → Inspeccionar
2. Reinicia Chrome
3. Verifica que no esté en modo kiosco o pantalla completa
4. Prueba en modo incógnito: `Ctrl + Shift + N`

### Problema 2: Las DevTools están en inglés

**Solución:**
- Chrome DevTools siempre están en inglés (es normal)
- Los términos principales son:
  - Console = Consola
  - Network = Red
  - Application = Aplicación
  - Clear = Limpiar
  - Error = Error

### Problema 3: Hay demasiados mensajes en la consola

**Solución:**
1. Limpia la consola antes de empezar el test (ícono 🚫)
2. Filtra por tipo usando los botones:
   - **Errors** (solo errores)
   - **Warnings** (solo advertencias)
   - **Info** (solo informativos)

### Problema 4: No veo la pestaña que necesito

**Solución:**
- Algunas pestañas están ocultas
- Haz clic en `»` (dos flechas) al final de las pestañas
- Aparece un menú con más opciones
- Selecciona la que necesitas (Network, Application, etc.)

### Problema 5: La consola se limpia sola al cambiar de página

**Solución:**
1. En la pestaña Console, busca el ícono de **engranaje** (⚙️) o **Settings**
2. Marca la opción **"Preserve log"** (Preservar registro)
3. Ahora los mensajes no se borran al navegar

---

## 📚 Glosario de Términos

| Término | Significado |
|---------|-------------|
| **DevTools** | Herramientas de desarrollador de Chrome |
| **Console** | Pestaña donde aparecen mensajes y errores |
| **Network** | Pestaña que muestra peticiones al servidor |
| **Application** | Pestaña que muestra almacenamiento local (cookies, tokens) |
| **Error** | Mensaje rojo que indica un problema |
| **Warning** | Mensaje amarillo de advertencia (no crítico) |
| **Stack trace** | Rastro técnico de dónde ocurrió el error |
| **Request** | Petición enviada al servidor |
| **Response** | Respuesta recibida del servidor |
| **Status code** | Código numérico que indica resultado (200, 404, 500...) |
| **Local Storage** | Almacenamiento local del navegador |
| **Token** | Credencial de sesión del usuario autenticado |

---

## 🎓 Ejercicios Prácticos

### Ejercicio 1: Abrir y explorar

1. Ve a https://cambio-cromos.vercel.app
2. Abre DevTools con `F12`
3. Navega por las pestañas: Console, Network, Application
4. Cierra y vuelve a abrir con clic derecho → Inspeccionar

**Objetivo:** Familiarizarte con abrir y cerrar las herramientas

---

### Ejercicio 2: Ver mensajes en Console

1. Abre DevTools → Console
2. Limpia la consola (🚫)
3. Refresca la página (`F5`)
4. Observa los mensajes que aparecen
5. Identifica: ¿Hay algún error rojo?

**Objetivo:** Aprender a identificar mensajes

---

### Ejercicio 3: Filtrar peticiones en Network

1. Abre DevTools → Network
2. Refresca la página (`F5`)
3. Haz clic en el filtro **"Fetch/XHR"**
4. Observa solo las peticiones al servidor
5. Haz clic en una para ver sus detalles

**Objetivo:** Entender cómo se comunica la página con el servidor

---

### Ejercicio 4: Ver tu token de sesión

1. Inicia sesión en la app (si no lo has hecho)
2. Abre DevTools → Application
3. Local Storage → `https://cambio-cromos.vercel.app`
4. Busca una clave con "auth" o "token"
5. Verifica que tenga un valor largo (el token)

**Objetivo:** Confirmar que entiendes dónde se guarda la sesión

---

## ✅ Checklist: ¿Listo para usar DevTools?

Antes de empezar tus tests, asegúrate de poder hacer esto:

- [ ] Puedo abrir las DevTools con `F12` o clic derecho
- [ ] Puedo cambiar entre pestañas (Console, Network, Application)
- [ ] Puedo limpiar la consola antes de un test
- [ ] Sé identificar mensajes rojos (errores) de otros colores
- [ ] Puedo copiar un mensaje de error
- [ ] Sé tomar una captura de pantalla con `Win + Shift + S`
- [ ] Entiendo qué significan códigos 200 (OK) y 500 (Error)
- [ ] Sé abrir la pestaña Network y filtrar por "Fetch/XHR"

**Si marcaste todas:** ¡Estás listo para usar DevTools en tus tests! 🎉

**Si te falta alguna:** Repasa esa sección o haz los ejercicios prácticos.

---

## 🔗 Recursos Adicionales

### ¿Dónde obtener más ayuda?

1. **Guía de Consultas SQL:** `GUIA_DE_CONSULTAS_SQL.md`
2. **David (Slack):** Canal `#testing`
3. **Documentación oficial de Chrome DevTools:** https://developer.chrome.com/docs/devtools/ (avanzado)

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Autor:** Equipo CambioCromos
**Contacto:** David (Slack #testing)
