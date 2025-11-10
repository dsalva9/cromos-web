# Tests No-Técnicos - Fase 03: Marketplace (Exploración, Chat y Transacciones)

## 📋 Información General

**Fase:** Fase-03
**Categoría:** Marketplace - Exploración y Comunicación
**Archivo:** 02_Exploracion_Chat_Transacciones.md
**Cantidad de tests:** 7 casos de prueba
**Tiempo estimado total:** ~2 horas

---

## 🎯 Objetivo de Este Archivo

Este archivo contiene tests para verificar que los usuarios pueden:

1. ✅ Explorar y buscar cromos en el marketplace
2. ✅ Filtrar listados por tipo (venta/intercambio), precio, etc.
3. ✅ Ver detalles de listados de otros usuarios
4. ✅ Iniciar chat con vendedor
5. ✅ Enviar y recibir mensajes en tiempo real
6. ✅ Marcar transacción como completada

---

## 📚 Prerequisitos

Antes de ejecutar estos tests:

- ✅ Completar tests de `01_Listados_Publicacion_Gestion.md`
- ✅ Tener 2 usuarios:
  - **Vendedor:** `qa.vendedor@cromos.test` (con listados publicados)
  - **Comprador:** `qa.comprador@cromos.test` (sin listados)

---

## Caso CP-F03-02A: Explorar marketplace y buscar cromos

### 🎯 Objetivo

Verificar que los usuarios pueden explorar el marketplace y buscar listados publicados por otros usuarios.

### 📋 Preparación (Setup)

**Usuarios necesarios:**

1. **Vendedor:** `qa.vendedor@cromos.test`
   - Debe tener al menos 1 listado activo: "Cromo Messi #10 - REBAJADO" (precio: 12.00)

2. **Comprador:** `qa.comprador@cromos.test`
   - Contraseña: `Test1234!`
   - Estado: Registrado

**Pasos de preparación:**

1. **Cerrar sesión** si estás logueado como vendedor
2. **Hacer login** como `qa.comprador@cromos.test`
3. Verificar que estás logueado como comprador

### 🧪 Pasos del Test

#### 1. Navegar al marketplace

Desde la página principal, buscar y hacer clic en:
- **"Marketplace"**
- **"Explorar cromos"**
- **"Buscar cromos"**
- **"Comprar/Intercambiar"**

Deberías ver una página con listados de cromos publicados.

#### 2. Verificar listados visibles

**Lo que DEBES ver:**

- ✅ Listado(s) de otros usuarios (incluyendo "Cromo Messi #10 - REBAJADO")
- ✅ Para cada listado:
  - Título del cromo
  - Precio (si es venta) o badge "Intercambio"
  - Foto del cromo (si tiene)
  - Nombre del vendedor
  - Badge de estado: "Activo" o "Disponible"

**Lo que NO debes ver:**

- ❌ Listados con estado "Vendido" o "Completado"
- ❌ Listados eliminados

#### 3. Usar buscador

Buscar un campo de búsqueda o barra de texto.

**Introducir:** `Messi`

Presionar Enter o hacer clic en botón de búsqueda (🔍)

**Resultado esperado:**

- ✅ Aparece el listado "Cromo Messi #10 - REBAJADO"
- ✅ Otros listados que no contengan "Messi" desaparecen (si los había)
- ✅ Contador de resultados: "1 resultado" o similar

#### 4. Buscar algo que no existe

**Introducir:** `Pelé Autografiado Oro`

**Resultado esperado:**

- ✅ Mensaje: "No se encontraron resultados" o "0 resultados"
- ✅ No aparece ningún listado
- ✅ Puede sugerir: "Intenta con otros términos de búsqueda"

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Ver todos los listados activos en el marketplace
SELECT
    tl.id,
    tl.title,
    tl.listing_type,
    tl.price,
    tl.status,
    tl.created_at,
    p.nickname AS vendedor
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'  -- Solo activos
ORDER BY tl.created_at DESC
LIMIT 20;
```

**Resultado esperado:**

- Al menos 1 fila con título "Cromo Messi #10 - REBAJADO"
- `status = 'active'`
- `vendedor` = nickname de `qa.vendedor@cromos.test`

**Buscar con filtro de texto:**

```sql
-- Simular búsqueda por "Messi"
SELECT
    tl.id,
    tl.title,
    tl.price,
    p.nickname AS vendedor
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'
  AND (
      tl.title ILIKE '%Messi%'  -- Búsqueda case-insensitive
      OR tl.description ILIKE '%Messi%'
  )
ORDER BY tl.created_at DESC;
```

**Resultado esperado:**

- 1 fila (el listado de Messi)

#### Verificación en Consola de Chrome

1. Abrir DevTools (F12) → **"Network"**
2. Hacer búsqueda de "Messi"
3. Buscar request GET a algo como `/trade_listings?...` o `/marketplace/search?q=Messi`

**Verificar en Response:**

- ✅ JSON con array de listados
- ✅ Contiene el listado de Messi
- ✅ Status 200 (éxito)

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Página de marketplace carga correctamente
2. ✅ Listados activos son visibles
3. ✅ Búsqueda por "Messi" retorna resultado correcto
4. ✅ Búsqueda sin resultados muestra mensaje adecuado
5. ✅ SQL confirma que hay listados activos
6. ✅ Solo aparecen listados con `status = 'active'`

Marca el test como **Failed** ❌ si:

- ❌ No aparecen listados en marketplace
- ❌ Búsqueda no funciona
- ❌ Aparecen listados vendidos/eliminados

**Actualizar en:** `Test_Tracking_Spreadsheet.csv` → Test_ID: `CP-F03-02A`

---

## Caso CP-F03-02B: Ver detalle de listado de otro usuario

### 🎯 Objetivo

Verificar que un usuario puede ver los detalles completos de un listado publicado por otro usuario.

### 📋 Preparación (Setup)

**Usuario:** `qa.comprador@cromos.test` (logueado desde test anterior)

**Prerequisito:** Listado "Cromo Messi #10 - REBAJADO" visible en marketplace

### 🧪 Pasos del Test

#### 1. Abrir detalle del listado

Desde el marketplace, buscar el listado de Messi y hacer clic en:
- El título del listado
- Botón **"Ver detalles"**
- La imagen del cromo (si tiene)

Deberías ser redirigido a una página de detalle.

#### 2. Verificar información mostrada

**Información que DEBE aparecer:**

- ✅ **Título completo:** "Cromo Messi #10 - REBAJADO"
- ✅ **Descripción completa:** La descripción que el vendedor puso
- ✅ **Precio:** 12.00 € (o moneda configurada)
- ✅ **Tipo:** Badge "Venta" o "Sale"
- ✅ **Vendedor:**
  - Nombre/nickname del vendedor
  - Avatar (si tiene)
  - Puede haber link a perfil del vendedor
- ✅ **Fecha de publicación:** "Hace X horas" o fecha específica
- ✅ **Número de cromo:** #10 (si aplica)
- ✅ **Estado del cromo:** "Nuevo" o estado que indicó el vendedor
- ✅ **Cantidad disponible:** 1

**Botones/acciones disponibles:**

- ✅ **"Contactar vendedor"** o **"Iniciar chat"**
- ✅ **"Hacer oferta"** (si aplica)
- ✅ Icono de favorito ⭐ o ♥ (para guardar)

**Lo que NO debe haber:**

- ❌ Botón "Editar" (no es tu listado)
- ❌ Botón "Eliminar"

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Obtener detalles completos del listado
SELECT
    tl.id,
    tl.title,
    tl.description,
    tl.listing_type,
    tl.price,
    tl.quantity,
    tl.status,
    tl.created_at,
    -- Datos del vendedor
    p.id AS vendedor_id,
    p.nickname AS vendedor_nombre,
    p.avatar_url AS vendedor_avatar,
    -- Verificar que NO es del comprador
    CASE
        WHEN tl.user_id = (SELECT id FROM auth.users WHERE email = 'qa.comprador@cromos.test')
        THEN '❌ ERROR: Es del comprador'
        ELSE '✅ OK: Es de otro usuario'
    END AS verificacion_autor
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.title LIKE '%Messi%REBAJADO%'
  AND tl.status = 'active'
LIMIT 1;
```

**Resultado esperado:**

| Campo | Valor |
|-------|-------|
| `title` | Cromo Messi #10 - REBAJADO |
| `price` | 12.00 |
| `vendedor_nombre` | (nickname del vendedor) |
| `verificacion_autor` | ✅ OK: Es de otro usuario |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Página de detalle carga correctamente
2. ✅ Toda la información del listado es visible
3. ✅ Datos del vendedor aparecen
4. ✅ Botón "Contactar vendedor" existe
5. ✅ NO hay botones de editar/eliminar (no es tu listado)
6. ✅ SQL confirma que es listado de otro usuario

---

## Caso CP-F03-02C: Filtrar por tipo de listado (venta/intercambio)

### 🎯 Objetivo

Verificar que los usuarios pueden filtrar listados por tipo: solo ventas, solo intercambios, o ambos.

### 📋 Preparación (Setup)

**Usuario:** `qa.comprador@cromos.test`

**Prerequisito:** En el marketplace debe haber:
- Al menos 1 listado de tipo "venta" (Messi - 12.00€)
- Al menos 1 listado de tipo "intercambio" (Cristiano Ronaldo por Neymar)

### 🧪 Pasos del Test

#### 1. Ver todos los listados

1. Ir a **"Marketplace"**
2. Sin aplicar filtros, observar cuántos listados hay
3. Verificar que hay mezcla de ventas e intercambios

#### 2. Filtrar por "Solo Ventas"

Buscar filtro/dropdown:
- **"Tipo: Todos → Venta"**
- Checkbox: ☑ **"Solo ventas"**
- Radio button: ⚫ **"Venta"**

Seleccionar opción "Venta"

**Resultado esperado:**

- ✅ Solo aparecen listados con precio (ventas)
- ✅ Listado de Messi visible (tipo venta)
- ✅ Listados de intercambio NO visibles
- ✅ Todos los listados mostrados tienen badge "Venta" o muestran precio

#### 3. Filtrar por "Solo Intercambios"

Cambiar filtro a **"Intercambio"** o **"Trade"**

**Resultado esperado:**

- ✅ Solo aparecen listados de intercambio
- ✅ Listado de Cristiano Ronaldo visible (si existe)
- ✅ Listados con precio NO visibles
- ✅ Todos muestran badge "Intercambio"

#### 4. Ver todos nuevamente

Seleccionar **"Todos"** o quitar filtro

**Resultado esperado:**

- ✅ Aparecen tanto ventas como intercambios

---

### 🔍 Validaciones Técnicas

```sql
-- Contar listados por tipo
SELECT
    listing_type,
    COUNT(*) AS cantidad
FROM trade_listings
WHERE status = 'active'
GROUP BY listing_type;
```

**Resultado esperado (ejemplo):**

| listing_type | cantidad |
|--------------|----------|
| sale | 1 |
| trade | 1 |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Filtro por tipo existe y funciona
2. ✅ "Solo Ventas" muestra solo listados con `listing_type = 'sale'`
3. ✅ "Solo Intercambios" muestra solo `listing_type = 'trade'`
4. ✅ "Todos" muestra ambos tipos

---

## Caso CP-F03-02D: Filtrar por rango de precio

### 🎯 Objetivo

Verificar que los usuarios pueden filtrar listados de venta por rango de precio.

### 📋 Preparación (Setup)

**Usuario:** `qa.comprador@cromos.test`

**Prerequisito:** Tener listados con diferentes precios en marketplace

### 🧪 Pasos del Test

#### 1. Buscar filtro de precio

En la página de marketplace, buscar:
- Slider de rango de precio: `[0] ━━━━━━━ [100]`
- Inputs: **"Precio mín:"** y **"Precio máx:"**
- Checkboxes por rangos: `□ 0-10€  □ 10-20€  □ 20-50€`

#### 2. Filtrar por rango 0-15€

Si hay slider:
1. Mover slider máximo a 15€
2. Dejar mínimo en 0€

Si hay inputs:
1. **Precio mín:** `0`
2. **Precio máx:** `15`
3. Aplicar filtro

**Resultado esperado:**

- ✅ Aparece listado de Messi (12.00€, dentro del rango)
- ✅ NO aparecen listados con precio > 15€
- ✅ Listados de intercambio pueden aparecer o no (depende de implementación)

#### 3. Filtrar por rango 20-50€

Cambiar rango a:
- **Mín:** 20
- **Máx:** 50

**Resultado esperado:**

- ✅ Listado de Messi NO aparece (está fuera del rango)
- ✅ Solo aparecen listados con precio entre 20 y 50€
- ✅ Si no hay listados en ese rango: "No hay resultados"

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Filtro de precio existe
2. ✅ Filtrar por 0-15€ muestra listado de 12€
3. ✅ Filtrar por 20-50€ NO muestra listado de 12€
4. ✅ Resultados corresponden con el rango seleccionado

---

## Caso CP-F03-02E: Iniciar chat con vendedor

### 🎯 Objetivo

Verificar que un comprador interesado puede iniciar una conversación de chat con el vendedor de un listado.

### 📋 Preparación (Setup)

**Usuarios:**

1. **Comprador:** `qa.comprador@cromos.test` (logueado)
2. **Vendedor:** `qa.vendedor@cromos.test` (tiene listado publicado)

### 🧪 Pasos del Test

#### 1. Desde detalle del listado

1. Como **comprador**, ir a detalle de "Cromo Messi #10 - REBAJADO"
2. Buscar botón **"Contactar vendedor"** o **"Iniciar chat"**
3. Hacer clic

**Lo que DEBE pasar:**

- ✅ Abre ventana de chat o modal de mensajería
- ✅ O redirige a página de chat: `/chats/{chat_id}` o `/messages`
- ✅ Aparece el nombre del vendedor en el header del chat
- ✅ Puede haber mensaje pre-cargado: "Hola, estoy interesado en [Cromo Messi #10]"

#### 2. Enviar primer mensaje

En el chat, escribir:

**Mensaje:** `Hola, ¿el cromo sigue disponible?`

Presionar Enter o hacer clic en botón de enviar ➤

**Lo que DEBE pasar:**

- ✅ Mensaje aparece en el chat inmediatamente
- ✅ Mensaje tiene timestamp (ej: "Ahora", "12:34")
- ✅ Mensaje está alineado a la derecha (tus mensajes) o marcado como "Tú:"
- ✅ Campo de texto se limpia después de enviar

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar el chat creado entre comprador y vendedor
SELECT
    c.id AS chat_id,
    c.listing_id,
    c.created_at,
    tl.title AS listado_titulo,
    -- Participantes
    CASE
        WHEN c.participant_a_id = (SELECT id FROM auth.users WHERE email = 'qa.comprador@cromos.test')
             OR c.participant_b_id = (SELECT id FROM auth.users WHERE email = 'qa.comprador@cromos.test')
        THEN '✅ Comprador participa'
        ELSE '❌ Comprador NO participa'
    END AS comprador_participa,
    CASE
        WHEN c.participant_a_id = (SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test')
             OR c.participant_b_id = (SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test')
        THEN '✅ Vendedor participa'
        ELSE '❌ Vendedor NO participa'
    END AS vendedor_participa
FROM chats c
JOIN trade_listings tl ON tl.id = c.listing_id
WHERE (
    c.participant_a_id = (SELECT id FROM auth.users WHERE email = 'qa.comprador@cromos.test')
    OR c.participant_b_id = (SELECT id FROM auth.users WHERE email = 'qa.comprador@cromos.test')
)
  AND tl.title LIKE '%Messi%REBAJADO%'
ORDER BY c.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| Campo | Valor |
|-------|-------|
| `listado_titulo` | Cromo Messi #10 - REBAJADO |
| `comprador_participa` | ✅ Comprador participa |
| `vendedor_participa` | ✅ Vendedor participa |
| `created_at` | Hace pocos minutos |

**Verificar mensaje enviado:**

```sql
-- Buscar el mensaje en la base de datos
-- Primero obtener chat_id del query anterior, ej: {chat_id}

SELECT
    cm.id,
    cm.message,
    cm.sender_id,
    cm.created_at,
    p.nickname AS enviado_por
FROM chat_messages cm
JOIN profiles p ON p.id = cm.sender_id
WHERE cm.chat_id = '{chat_id}'  -- Reemplazar con ID del chat
ORDER BY cm.created_at DESC
LIMIT 5;
```

**Resultado esperado:**

| message | enviado_por |
|---------|-------------|
| Hola, ¿el cromo sigue disponible? | (nickname del comprador) |

**Si ves 0 filas:** ❌ El mensaje NO se guardó

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Contactar vendedor" funciona
2. ✅ Chat se abre o redirige correctamente
3. ✅ Mensaje se envía y aparece en el chat
4. ✅ SQL muestra que chat fue creado con ambos participantes
5. ✅ SQL muestra el mensaje guardado con `sender_id` del comprador

Marca el test como **Failed** ❌ si:

- ❌ No se abre el chat
- ❌ Mensaje no se envía
- ❌ SQL no muestra el chat o mensaje

**Actualizar en:** `Test_Tracking_Spreadsheet.csv` → Test_ID: `CP-F03-02E`

---

## Caso CP-F03-02F: Recibir mensaje en tiempo real (Realtime)

### 🎯 Objetivo

Verificar que cuando el vendedor responde, el comprador recibe el mensaje en tiempo real (sin recargar página).

### 📋 Preparación (Setup)

**Usuarios:**
- **Comprador:** `qa.comprador@cromos.test` (logueado en navegador A)
- **Vendedor:** `qa.vendedor@cromos.test` (va a loguear en navegador B)

**Prerequisito:** Chat activo del test anterior (CP-F03-02E)

### 🧪 Pasos del Test

#### 1. Preparar 2 navegadores

**Navegador A (Comprador):**
1. Mantener sesión de `qa.comprador@cromos.test`
2. Tener el chat abierto en la página de mensajes
3. **NO recargar la página durante el test**

**Navegador B (Vendedor):**
1. Abrir nueva ventana de incógnito o navegador diferente
2. Ir a `https://cambio-cromos.vercel.app`
3. Hacer login como `qa.vendedor@cromos.test`
4. Ir a **"Mensajes"** o **"Chats"**
5. Abrir el chat con el comprador

#### 2. Vendedor envía respuesta

**En Navegador B (Vendedor):**

1. Escribir mensaje: `Sí, está disponible. ¿Te interesa comprarlo?`
2. Presionar Enter o enviar ➤
3. Verificar que mensaje aparece en su pantalla

#### 3. Verificar recepción en tiempo real

**En Navegador A (Comprador):**

**⏱️ Esperar 1-5 segundos (sin recargar página)**

**Lo que DEBE pasar:**

- ✅ El mensaje del vendedor **aparece automáticamente** en el chat del comprador
- ✅ Sin necesidad de recargar (F5)
- ✅ Mensaje aparece alineado a la izquierda (mensaje de otro usuario)
- ✅ Muestra nombre del vendedor: "Vendedor:" o nickname
- ✅ Timestamp actualizado

**Lo que NO debe pasar:**

- ❌ Tener que recargar página para ver el mensaje
- ❌ Mensaje no aparece después de 10 segundos

---

### 🔍 Validaciones Técnicas

#### Verificación en Consola de Chrome (Navegador A - Comprador)

1. **Antes de que vendedor envíe mensaje:**
   - Abrir DevTools (F12)
   - Ir a pestaña **"Network"**
   - Filtrar por **"WS"** (WebSocket) o **"EventSource"**

2. **Verificar conexión Realtime:**
   - Debe haber conexión WebSocket activa a Supabase:
   - `wss://[project].supabase.co/realtime/v1/websocket`
   - Estado: **"101 Switching Protocols"** (conexión establecida)

3. **Cuando vendedor envía mensaje:**
   - En pestaña "Network" → Click en la conexión WebSocket
   - Ir a sub-pestaña **"Messages"**
   - Deberías ver mensaje entrante en tiempo real

**Estructura del mensaje (aproximada):**

```json
{
  "event": "INSERT",
  "payload": {
    "data": {
      "message": "Sí, está disponible. ¿Te interesa comprarlo?",
      "sender_id": "...",
      "chat_id": "..."
    }
  }
}
```

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Vendedor envía mensaje exitosamente
2. ✅ Comprador recibe mensaje en **< 5 segundos** sin recargar
3. ✅ Mensaje aparece correctamente formateado
4. ✅ WebSocket está activo en DevTools
5. ✅ Se ve evento de mensaje en pestaña "Messages" de WS

Marca el test como **Failed** ❌ si:

- ❌ Mensaje no aparece sin recargar
- ❌ Toma > 10 segundos en aparecer
- ❌ No hay conexión WebSocket activa

**⚠️ Nota:** Si Realtime no funciona, reportar como **bug crítico** a David.

---

## Caso CP-F03-02G: Marcar transacción como completada

### 🎯 Objetivo

Verificar que después de acordar una venta/intercambio por chat, el comprador o vendedor puede marcar la transacción como completada.

### 📋 Preparación (Setup)

**Usuarios:**
- **Comprador:** `qa.comprador@cromos.test`
- **Vendedor:** `qa.vendedor@cromos.test`

**Prerequisito:** Chat activo con al menos 2 mensajes intercambiados

### 🧪 Pasos del Test

#### 1. Acordar transacción por chat

**Continuar conversación (ambos usuarios):**

**Comprador:** `Perfecto, ¿dónde nos encontramos para el intercambio?`

**Vendedor:** `Podemos vernos mañana en Plaza Mayor a las 18:00`

**Comprador:** `De acuerdo, hasta mañana`

#### 2. Después de completar transacción en persona

**Como vendedor (navegador B):**

1. En el chat o en el listado, buscar opción:
   - Botón **"Marcar transacción como completada"**
   - **"Cerrar trato"**
   - Checkbox: ☑ **"Venta completada"**

2. Hacer clic y confirmar (si hay diálogo)

**Lo que DEBE pasar:**

- ✅ Mensaje de confirmación: "Transacción marcada como completada"
- ✅ El listado cambia a estado "Vendido" o "Completado"
- ✅ El chat puede marcarse como "Cerrado" o "Completado"
- ✅ Badge visual en el chat: "✓ Completado"

#### 3. Verificar en perfil del vendedor

**Como comprador, ir a:**

1. Perfil del vendedor (click en su nombre)
2. Buscar sección de **"Transacciones completadas"** o **"Historial"**

**Resultado esperado:**

- ✅ Aparece la transacción de "Cromo Messi #10 - REBAJADO"
- ✅ Estado: Completada
- ✅ Puede mostrar contador de transacciones exitosas del vendedor

---

### 🔍 Validaciones Técnicas

```sql
-- Verificar que listado cambió a 'sold' o 'completed'
SELECT
    tl.id,
    tl.title,
    tl.status,               -- Debe ser 'sold' o 'completed'
    tl.updated_at
FROM trade_listings tl
WHERE tl.title LIKE '%Messi%REBAJADO%';
```

**Resultado esperado:**

| status |
|--------|
| `sold` o `completed` |

**Verificar transacción (si hay tabla de transacciones):**

```sql
-- Buscar registro de transacción completada
SELECT
    t.id,
    t.listing_id,
    t.buyer_id,
    t.seller_id,
    t.status,
    t.completed_at,
    tl.title AS listado
FROM transactions t
JOIN trade_listings tl ON tl.id = t.listing_id
WHERE t.buyer_id = (SELECT id FROM auth.users WHERE email = 'qa.comprador@cromos.test')
   OR t.seller_id = (SELECT id FROM auth.users WHERE email = 'qa.vendedor@cromos.test')
ORDER BY t.created_at DESC
LIMIT 1;
```

**Resultado esperado (si tabla existe):**

| status | completed_at |
|--------|--------------|
| `completed` | Timestamp reciente |

**Nota:** Dependiendo de implementación, puede no haber tabla `transactions` separada. Validar que listado cambió a `sold` es suficiente.

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Botón "Completar transacción" existe y funciona
2. ✅ Mensaje de confirmación aparece
3. ✅ SQL muestra listado con `status = 'sold'` o `'completed'`
4. ✅ Chat muestra badge "Completado" (si aplica)
5. ✅ Transacción aparece en historial (si aplica)

Marca el test como **Failed** ❌ si:

- ❌ No hay forma de marcar como completada
- ❌ Listado sigue en `status = 'active'`

---

## 📊 Resumen de Tests - Archivo 02

| Test ID | Nombre | Complejidad | Tiempo Est. | Estado |
|---------|--------|-------------|-------------|--------|
| CP-F03-02A | Explorar marketplace | Baja | 20 min | - |
| CP-F03-02B | Ver detalle de listado | Baja | 15 min | - |
| CP-F03-02C | Filtrar por tipo | Baja | 15 min | - |
| CP-F03-02D | Filtrar por precio | Baja | 15 min | - |
| CP-F03-02E | Iniciar chat | Media | 20 min | - |
| CP-F03-02F | Recibir mensaje Realtime | Alta | 25 min | - |
| CP-F03-02G | Completar transacción | Media | 20 min | - |

**Total:** ~2 horas 10 minutos

---

## ✅ Checklist Post-Tests

- [ ] Actualicé `Test_Tracking_Spreadsheet.csv`
- [ ] Verifiqué que solo listados activos aparecen en marketplace
- [ ] Confirmé que chat en tiempo real funciona (< 5 seg)
- [ ] Comprobé que transacciones completadas cambian estado del listado

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
