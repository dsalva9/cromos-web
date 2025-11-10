# Tests No-Técnicos - Fase 05: Propuestas de Intercambio

## 📋 Información General

**Fase:** Fase-05
**Categoría:** Sistema de Intercambios (Propuestas y Negociación)
**Archivo:** 01_Propuestas_Intercambio.md
**Cantidad de tests:** 5 casos de prueba
**Tiempo estimado total:** ~1.5 horas

---

## 🎯 Objetivo de Este Archivo

Este archivo contiene tests para verificar el sistema de propuestas de intercambio de cromos entre usuarios. Verificamos que:

1. ✅ Usuario puede enviar propuesta de intercambio formal
2. ✅ Receptor recibe notificación de propuesta
3. ✅ Receptor puede aceptar o rechazar propuesta
4. ✅ Al aceptar, ambos cromos se marcan como intercambiados
5. ✅ Historial de propuestas es visible

**📝 Nota:** Esta funcionalidad es diferente a simplemente chatear. Aquí hay una **propuesta formal** con cromos específicos en ambos lados.

---

## 📚 Prerequisitos

Antes de ejecutar estos tests:

- ✅ Tener 2 usuarios:
  - **Usuario A:** `qa.trader_a@cromos.test` (tiene Messi #10)
  - **Usuario B:** `qa.trader_b@cromos.test` (tiene Neymar #11)
- ✅ Ambos usuarios tienen colecciones con cromos marcados
- ✅ Idealmente, listados de intercambio publicados

---

## Caso CP-F05-01A: Enviar propuesta de intercambio

### 🎯 Objetivo

Verificar que un usuario puede enviar una propuesta formal de intercambio especificando qué cromo ofrece y qué cromo quiere recibir.

### 📋 Preparación (Setup)

**Usuarios necesarios:**

1. **Usuario A (Ofertante):** `qa.trader_a@cromos.test`
   - Tiene: Cromo Messi #10 (marcado como "tengo")
   - Quiere: Cromo Neymar #11

2. **Usuario B (Receptor):** `qa.trader_b@cromos.test`
   - Tiene: Cromo Neymar #11 (marcado como "tengo")
   - Listado publicado: "Intercambio Neymar #11"

**Pasos de preparación:**

1. **Login como Usuario A:** `qa.trader_a@cromos.test`
2. Verificar que tienes Messi #10 en tu colección

### 🧪 Pasos del Test

#### 1. Encontrar listado de intercambio

1. Ir a **"Marketplace"**
2. Filtrar por **"Tipo: Intercambio"**
3. Buscar listado: **"Intercambio Neymar #11"** (publicado por Usuario B)
4. Abrir detalle del listado

**Verificar que ves:**

- ✅ Título: "Intercambio Neymar #11" o similar
- ✅ Badge: "Intercambio" o "Trade"
- ✅ Vendedor: Usuario B
- ✅ Descripción: Puede indicar qué cromo busca a cambio

#### 2. Iniciar propuesta de intercambio

Buscar botón o acción:
- **"Proponer intercambio"**
- **"Hacer oferta"**
- **"Intercambiar"**

Hacer clic

**Debe abrir formulario de propuesta:**

- ✅ Sección: **"Ofrezco"** (qué das tú)
- ✅ Sección: **"A cambio de"** (qué recibes)
- ✅ Campo de mensaje/nota opcional

#### 3. Seleccionar cromo a ofrecer

1. En sección **"Ofrezco"**, buscar selector:
   - Dropdown: "Selecciona cromo de tu colección"
   - Buscador: Escribe "Messi"
   - Grid: Muestra tus cromos disponibles

2. Seleccionar **"Messi #10"** de tu colección "Mundial Qatar 2022"

**Verificar que aparece:**

- ✅ Vista previa del cromo seleccionado
- ✅ Info: "Messi #10 - Mundial Qatar 2022"
- ✅ Botón para cambiar selección

#### 4. Confirmar cromo a recibir

En sección **"A cambio de"**:

- ✅ Debería estar pre-seleccionado: **"Neymar #11"** (del listado)
- ✅ Si no está pre-seleccionado, seleccionarlo manualmente

#### 5. Añadir mensaje (opcional)

En campo de nota/mensaje:

**Escribir:** `Hola, me interesa mucho este intercambio. Mi cromo está en perfecto estado.`

#### 6. Enviar propuesta

1. Hacer clic en **"Enviar propuesta"** o **"Proponer intercambio"**
2. Puede haber confirmación: "¿Enviar propuesta de intercambio?"
3. Confirmar

**Lo que DEBE pasar:**

- ✅ Mensaje de éxito: "Propuesta de intercambio enviada"
- ✅ Redirigido a "Mis propuestas" o detalle de la propuesta
- ✅ Estado de propuesta: **"Pendiente"** o **"Waiting"**

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar la propuesta recién creada
SELECT
    tp.id AS propuesta_id,
    tp.status,
    tp.created_at,
    -- Usuario ofertante (A)
    p1.nickname AS ofertante,
    tp.offered_item_number,
    -- Usuario receptor (B)
    p2.nickname AS receptor,
    tp.requested_item_number,
    -- Mensaje
    tp.message,
    -- IDs de usuarios
    tp.sender_id,
    tp.receiver_id
FROM trade_proposals tp
JOIN profiles p1 ON p1.id = tp.sender_id
JOIN profiles p2 ON p2.id = tp.receiver_id
WHERE tp.sender_id = (
    SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test'
)
  AND tp.receiver_id = (
      SELECT id FROM auth.users WHERE email = 'qa.trader_b@cromos.test'
  )
ORDER BY tp.created_at DESC
LIMIT 1;
```

**¿Qué hace esta consulta?**

- **Línea 2-13:** Seleccionamos datos de la propuesta y usuarios involucrados
- **Línea 14:** Buscamos en tabla `trade_proposals` (o nombre similar)
- **Línea 18-24:** Filtramos por ofertante = Usuario A y receptor = Usuario B

**Resultado esperado:**

| Campo | Valor Esperado |
|-------|----------------|
| `status` | `pending` o `waiting` |
| `ofertante` | (nickname de Usuario A) |
| `offered_item_number` | 10 (Messi) |
| `receptor` | (nickname de Usuario B) |
| `requested_item_number` | 11 (Neymar) |
| `message` | Hola, me interesa mucho... |
| `created_at` | Hace pocos minutos |

**Si ves 0 filas:** ❌ La propuesta NO se guardó

**⚠️ Nota:** Nombre de tabla puede variar: `trade_proposals`, `swap_offers`, `exchange_requests`, etc.

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Formulario de propuesta funciona
2. ✅ Puedes seleccionar cromo a ofrecer de tu colección
3. ✅ Propuesta se envía exitosamente
4. ✅ SQL retorna 1 fila con datos correctos
5. ✅ `status = 'pending'`

Marca el test como **Failed** ❌ si:

- ❌ No hay forma de enviar propuesta formal
- ❌ SQL retorna 0 filas
- ❌ Propuesta no aparece en "Mis propuestas"

**Actualizar en:** `Test_Tracking_Spreadsheet.csv` → Test_ID: `CP-F05-01A`

---

## Caso CP-F05-02F: Recibir notificación de propuesta

### 🎯 Objetivo

Verificar que el receptor (Usuario B) recibe notificación de la propuesta de intercambio.

### 📋 Preparación (Setup)

**Usuario:** `qa.trader_b@cromos.test` (receptor)

**Prerequisito:** Propuesta enviada por Usuario A (test anterior CP-F05-01A)

### 🧪 Pasos del Test

#### 1. Login como receptor

1. **Cerrar sesión** de Usuario A
2. **Login como Usuario B:** `qa.trader_b@cromos.test`

#### 2. Buscar notificación

Buscar indicadores de notificación:

- ✅ Badge numérico en icono de campana 🔔 (ej: "1")
- ✅ Badge en menú "Intercambios" o "Propuestas"
- ✅ Notificación en página principal: "Tienes 1 propuesta pendiente"

**Hacer clic en notificaciones o ir a:**

- **"Mis Propuestas"**
- **"Intercambios"**
- **"Ofertas recibidas"**

#### 3. Verificar propuesta recibida

**Debe aparecer:**

- ✅ Lista de propuestas recibidas
- ✅ Propuesta de Usuario A visible:
  - **De:** Usuario A (nickname)
  - **Ofrece:** Messi #10
  - **A cambio de:** Neymar #11 (tu cromo)
  - **Estado:** Pendiente
  - **Fecha:** Hace X minutos
  - **Mensaje:** "Hola, me interesa mucho..."

**Acciones disponibles:**

- ✅ Botón: **"Ver detalles"**
- ✅ Botón: **"Aceptar"** ✅
- ✅ Botón: **"Rechazar"** ❌

---

### 🔍 Validaciones Técnicas

```sql
-- Como Usuario B, ver propuestas recibidas
SELECT
    tp.id,
    tp.status,
    p_sender.nickname AS de_usuario,
    tp.offered_item_number AS ofrece_cromo,
    tp.requested_item_number AS quiere_cromo,
    tp.message,
    tp.created_at
FROM trade_proposals tp
JOIN profiles p_sender ON p_sender.id = tp.sender_id
WHERE tp.receiver_id = (
    SELECT id FROM auth.users WHERE email = 'qa.trader_b@cromos.test'
)
  AND tp.status = 'pending'
ORDER BY tp.created_at DESC;
```

**Resultado esperado:**

| de_usuario | ofrece_cromo | quiere_cromo | status |
|------------|--------------|--------------|--------|
| (Usuario A) | 10 | 11 | pending |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Notificación aparece para Usuario B
2. ✅ Propuesta es visible en "Propuestas recibidas"
3. ✅ Información completa se muestra (quién, qué ofrece, qué pide)
4. ✅ SQL muestra propuesta con `status = 'pending'`

---

## Caso CP-F05-02G: Aceptar propuesta de intercambio

### 🎯 Objetivo

Verificar que el receptor puede aceptar la propuesta, y que ambos cromos se actualizan correctamente.

### 📋 Preparación (Setup)

**Usuario:** `qa.trader_b@cromos.test` (receptor, logueado desde test anterior)

**Prerequisito:** Propuesta pendiente de Usuario A visible

### 🧪 Pasos del Test

#### 1. Abrir detalle de propuesta

1. Desde "Propuestas recibidas", hacer clic en la propuesta de Usuario A
2. Revisar detalles completos:
   - ✅ Usuario A ofrece: Messi #10
   - ✅ Tú entregas: Neymar #11
   - ✅ Mensaje de Usuario A

#### 2. Aceptar propuesta

1. Hacer clic en botón **"Aceptar propuesta"** o **"Aceptar intercambio"**
2. Puede aparecer confirmación:
   - "¿Confirmas el intercambio?"
   - "Al aceptar, tu cromo Neymar #11 se marcará como intercambiado"
3. Confirmar

**Lo que DEBE pasar:**

- ✅ Mensaje de éxito: "Propuesta aceptada. Intercambio completado"
- ✅ Estado cambia a: **"Aceptada"** o **"Completed"**
- ✅ Puede aparecer info de contacto para coordinar entrega física
- ✅ Badge de notificación para Usuario A (le avisan que aceptaron)

#### 3. Verificar en colección de Usuario B

1. Ir a **"Mis Colecciones"** → **"Mundial Qatar 2022"**
2. Buscar **Cromo Neymar #11**

**Estado esperado (opción A):**

- ✅ Cromo ya **NO está marcado** como "tengo" (checkbox vacío)
- ✅ Badge: "Intercambiado" con fecha
- ✅ Histórico: "Intercambiado con Usuario A el [fecha]"

**Estado esperado (opción B):**

- ✅ Cromo sigue marcado pero con estado especial
- ✅ Badge: "En proceso de intercambio"

---

### 🔍 Validaciones Técnicas

#### Verificar estado de propuesta

```sql
-- Ver propuesta aceptada
SELECT
    tp.id,
    tp.status,                   -- Debe ser 'accepted' o 'completed'
    tp.accepted_at,              -- Timestamp de aceptación
    tp.created_at,
    EXTRACT(EPOCH FROM (tp.accepted_at - tp.created_at)) AS segundos_hasta_aceptar
FROM trade_proposals tp
WHERE tp.sender_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test')
  AND tp.receiver_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_b@cromos.test')
ORDER BY tp.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| status | accepted_at |
|--------|-------------|
| accepted o completed | (timestamp reciente) |

#### Verificar actualización en colecciones

**Colección de Usuario B (receptor - entregó Neymar #11):**

```sql
-- Ver si Neymar #11 se desmarcó
SELECT
    ci.item_number,
    ci.owned,                    -- Debería ser FALSE (ya no lo tiene)
    ci.updated_at
FROM collection_items ci
WHERE ci.copy_id = (
    SELECT cc.id
    FROM collection_copies cc
    JOIN collection_templates ct ON ct.id = cc.template_id
    WHERE cc.user_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_b@cromos.test')
      AND ct.title = 'Mundial Qatar 2022 - Oficial'
)
  AND ci.item_number = 11;  -- Neymar
```

**Resultado esperado:**

| owned |
|-------|
| false | ← Ya no lo tiene

**Colección de Usuario A (ofertante - entregó Messi #10, recibe Neymar #11):**

```sql
-- Ver Messi #10 (entregado)
SELECT item_number, owned FROM collection_items ci
WHERE ci.copy_id = (
    SELECT cc.id FROM collection_copies cc
    JOIN collection_templates ct ON ct.id = cc.template_id
    WHERE cc.user_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test')
      AND ct.title = 'Mundial Qatar 2022 - Oficial'
)
  AND ci.item_number = 10;  -- Messi

-- Ver Neymar #11 (recibido)
SELECT item_number, owned FROM collection_items ci
WHERE ci.copy_id = (
    SELECT cc.id FROM collection_copies cc
    JOIN collection_templates ct ON ct.id = cc.template_id
    WHERE cc.user_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test')
      AND ct.title = 'Mundial Qatar 2022 - Oficial'
)
  AND ci.item_number = 11;  -- Neymar
```

**Resultado esperado:**

| item_number | owned |
|-------------|-------|
| 10 (Messi) | false | ← Entregado
| 11 (Neymar) | true | ← Recibido ✅

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Propuesta se acepta exitosamente
2. ✅ Estado cambia a `accepted` o `completed`
3. ✅ Cromo de Usuario B (Neymar) se desmarca (`owned = false`)
4. ✅ Cromo de Usuario A (Messi) se desmarca (`owned = false`)
5. ✅ Usuario A recibe Neymar (se marca como `owned = true`)

Marca el test como **Failed** ❌ si:

- ❌ Propuesta se acepta pero colecciones no se actualizan
- ❌ Solo un usuario se actualiza (inconsistencia)

---

## Caso CP-F05-02H: Rechazar propuesta de intercambio

### 🎯 Objetivo

Verificar que el receptor puede rechazar una propuesta y que el estado se actualiza correctamente.

### 📋 Preparación (Setup)

**Usuarios:**
- **Usuario A:** `qa.trader_a@cromos.test` (enviará nueva propuesta)
- **Usuario B:** `qa.trader_b@cromos.test` (rechazará)

**Pasos de preparación:**

1. Como Usuario A, enviar nueva propuesta:
   - Ofrece: Cromo #15
   - Quiere: Cromo #20 (de Usuario B)

### 🧪 Pasos del Test

#### 1. Como Usuario B, ver nueva propuesta

1. Login como `qa.trader_b@cromos.test`
2. Ir a **"Propuestas recibidas"**
3. Ver nueva propuesta de Usuario A

#### 2. Rechazar propuesta

1. Abrir detalle de la propuesta
2. Hacer clic en **"Rechazar"** o **"Declinar"**
3. Puede haber campo opcional: **"Razón de rechazo"**
   - Escribir: `Ya tengo ese cromo, gracias`
4. Confirmar rechazo

**Resultado esperado:**

- ✅ Mensaje: "Propuesta rechazada"
- ✅ Propuesta desaparece de "Pendientes"
- ✅ Puede aparecer en sección "Rechazadas" (histórico)

#### 3. Verificar que cromos NO se actualizaron

1. Ir a colección de Usuario B
2. Verificar que **Cromo #20** sigue marcado como "tengo"

---

### 🔍 Validaciones Técnicas

```sql
-- Ver propuesta rechazada
SELECT
    tp.id,
    tp.status,                   -- Debe ser 'rejected' o 'declined'
    tp.rejected_at,
    tp.rejection_reason
FROM trade_proposals tp
WHERE tp.sender_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test')
  AND tp.receiver_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_b@cromos.test')
  AND tp.status = 'rejected'
ORDER BY tp.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| status | rejection_reason |
|--------|------------------|
| rejected | Ya tengo ese cromo, gracias |

**Verificar que cromos siguen igual:**

```sql
-- Cromo #20 de Usuario B debe seguir owned=true
SELECT item_number, owned
FROM collection_items ci
WHERE ci.copy_id IN (
    SELECT cc.id FROM collection_copies cc
    WHERE cc.user_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_b@cromos.test')
)
  AND ci.item_number = 20;
```

**Resultado esperado:**

| owned |
|-------|
| true | ← Sin cambios

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Propuesta se rechaza correctamente
2. ✅ Estado cambia a `rejected`
3. ✅ Cromos de ambos usuarios permanecen sin cambios
4. ✅ Razón de rechazo se guarda (si se proporcionó)

---

## Caso CP-F05-02I: Ver historial de propuestas

### 🎯 Objetivo

Verificar que los usuarios pueden ver historial completo de propuestas (enviadas, recibidas, aceptadas, rechazadas).

### 📋 Preparación (Setup)

**Usuario:** `qa.trader_a@cromos.test`

**Prerequisito:** Tener al menos:
- 1 propuesta aceptada
- 1 propuesta rechazada

### 🧪 Pasos del Test

#### 1. Ver propuestas enviadas

1. Login como Usuario A
2. Ir a **"Mis Propuestas"** o **"Intercambios"**
3. Buscar tab o filtro: **"Enviadas"**

**Debe mostrar:**

- ✅ Lista de propuestas enviadas por ti
- ✅ Para cada propuesta:
  - A quién (receptor)
  - Qué ofreciste
  - Qué pediste
  - Estado (pendiente/aceptada/rechazada)
  - Fecha

#### 2. Filtrar por estado

Buscar filtros:
- `□ Pendientes`
- `□ Aceptadas`
- `□ Rechazadas`

Seleccionar **"Aceptadas"**

**Resultado esperado:**

- ✅ Solo aparecen propuestas con estado "Aceptada"
- ✅ Incluye la del test CP-F05-02G (Messi por Neymar)

Cambiar a **"Rechazadas"**

**Resultado esperado:**

- ✅ Solo aparecen propuestas rechazadas
- ✅ Puede mostrar razón de rechazo si la hay

---

### 🔍 Validaciones Técnicas

```sql
-- Historial completo de propuestas de Usuario A
SELECT
    tp.id,
    CASE
        WHEN tp.sender_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test')
        THEN 'Enviada'
        ELSE 'Recibida'
    END AS tipo,
    tp.status,
    tp.offered_item_number,
    tp.requested_item_number,
    tp.created_at,
    tp.accepted_at,
    tp.rejected_at
FROM trade_proposals tp
WHERE tp.sender_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test')
   OR tp.receiver_id = (SELECT id FROM auth.users WHERE email = 'qa.trader_a@cromos.test')
ORDER BY tp.created_at DESC;
```

**Resultado esperado:**

Al menos 2 filas (1 aceptada, 1 rechazada)

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Historial de propuestas es visible
2. ✅ Filtros por estado funcionan
3. ✅ Aparecen tanto enviadas como recibidas
4. ✅ Información completa se muestra

---

## 📊 Resumen de Tests - Archivo 01

| Test ID | Nombre | Complejidad | Tiempo Est. | Estado |
|---------|--------|-------------|-------------|--------|
| CP-F05-01A | Enviar propuesta | Media | 20 min | - |
| CP-F05-02F | Recibir notificación | Baja | 15 min | - |
| CP-F05-02G | Aceptar propuesta | Alta | 25 min | - |
| CP-F05-02H | Rechazar propuesta | Media | 15 min | - |
| CP-F05-02I | Ver historial | Baja | 15 min | - |

**Total:** ~1 hora 30 minutos

---

## ✅ Checklist Post-Tests

- [ ] Verifiqué que tabla `trade_proposals` existe
- [ ] Confirmé que al aceptar, ambos cromos se actualizan
- [ ] Probé que rechazar NO modifica cromos
- [ ] Historial muestra todas las propuestas correctamente

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
