# Tests No-Técnicos - Fase 06: Ratings y Reportes

## 📋 Información General

**Fase:** Fase-06
**Categoría:** Social - Valoraciones y Reportes
**Archivo:** 02_Ratings_Reportes.md
**Cantidad de tests:** 7 casos de prueba
**Tiempo estimado total:** ~2 horas

---

## 🎯 Objetivo de Este Archivo

Tests para el sistema de reputación y moderación:

1. ✅ Valorar a otro usuario después de transacción
2. ✅ Ver rating promedio de usuario
3. ✅ Ver historial de ratings recibidos
4. ✅ Reportar usuario por conducta inapropiada
5. ✅ Reportar listado (spam, fraude)
6. ✅ Bloquear usuario
7. ✅ Ver usuarios bloqueados

---

## Caso CP-F06-02A: Valorar usuario después de transacción

### 🎯 Objetivo

Después de completar una transacción, verificar que puedes valorar al otro usuario.

### 📋 Preparación

**Prerequisito:** Transacción completada con otro usuario

### 🧪 Pasos del Test

1. Ir a **"Mis Transacciones"** o **"Historial"**
2. Buscar transacción completada
3. Hacer clic en **"Valorar usuario"**
4. Seleccionar estrellas: **5 estrellas** ⭐⭐⭐⭐⭐
5. Comentario opcional: `Excelente vendedor, muy rápido`
6. Enviar

**Resultado esperado:**

- ✅ Mensaje: "Valoración enviada"
- ✅ Ya no se puede valorar nuevamente

### 🔍 Validaciones Técnicas

```sql
SELECT
    r.id,
    r.rater_id,
    r.rated_user_id,
    r.rating,
    r.comment,
    r.created_at
FROM ratings r
WHERE r.rater_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
ORDER BY r.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| rating | comment |
|--------|---------|
| 5 | Excelente vendedor, muy rápido |

### 📊 Resultado

✅ **Passed** si valoración se guarda

---

## Caso CP-F06-02B: Ver rating promedio de usuario

### 🎯 Objetivo

Verificar que el rating promedio se muestra en el perfil del usuario.

### 🧪 Pasos del Test

1. Ir al perfil del usuario valorado
2. Buscar sección de rating

**Debe mostrar:**

- ✅ Estrellas: ⭐⭐⭐⭐⭐ (4.8/5)
- ✅ Número de valoraciones: "(15 valoraciones)"
- ✅ Desglose por estrellas (opcional):
  - 5★: 12
  - 4★: 2
  - 3★: 1

### 🔍 Validaciones

```sql
SELECT
    COUNT(*) AS total_ratings,
    AVG(rating) AS rating_promedio,
    MIN(rating) AS peor,
    MAX(rating) AS mejor
FROM ratings
WHERE rated_user_id = '{user_id}';
```

### 📊 Resultado

✅ **Passed** si rating promedio se calcula y muestra

---

## Caso CP-F06-02C: Ver historial de ratings recibidos

### 🎯 Objetivo

Verificar que un usuario puede ver todos los ratings que ha recibido.

### 🧪 Pasos del Test

1. Ir a **"Mi Perfil"** → **"Valoraciones"**
2. Ver lista de ratings recibidos

**Debe mostrar:**

- ✅ Usuario que valoró
- ✅ Estrellas dadas
- ✅ Comentario
- ✅ Fecha

### 📊 Resultado

✅ **Passed** si historial es visible

---

## Caso CP-F06-02D: Reportar usuario

### 🎯 Objetivo

Verificar que puedes reportar un usuario por comportamiento inapropiado.

### 🧪 Pasos del Test

1. Ir al perfil del usuario problemático
2. Buscar: **"⋮ Más opciones"** → **"Reportar usuario"**
3. Seleccionar motivo:
   - ⚫ Spam
   - ⚪ Lenguaje ofensivo
   - ⚪ Estafa/Fraude
   - ⚪ Otro
4. Descripción: `Usuario envía mensajes spam constantemente`
5. Enviar reporte

**Resultado esperado:**

- ✅ Mensaje: "Reporte enviado. Lo revisaremos pronto"
- ✅ Usuario es notificado que no debe abusar de reportes

### 🔍 Validaciones

```sql
SELECT
    ur.id,
    ur.reporter_id,
    ur.reported_user_id,
    ur.reason,
    ur.description,
    ur.status,
    ur.created_at
FROM user_reports ur
WHERE ur.reporter_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
ORDER BY ur.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| reason | status | description |
|--------|--------|-------------|
| spam | pending | Usuario envía mensajes spam... |

### 📊 Resultado

✅ **Passed** si reporte se guarda con `status = 'pending'`

---

## Caso CP-F06-02E: Reportar listado

### 🎯 Objetivo

Verificar que puedes reportar un listado sospechoso.

### 🧪 Pasos del Test

1. Ir a un listado
2. **"⋮"** → **"Reportar listado"**
3. Motivo:
   - ⚫ Producto falso
   - ⚪ Precio abusivo
   - ⚪ Contenido inapropiado
4. Descripción: `Vende cromos falsificados`
5. Enviar

**Resultado esperado:**

- ✅ Mensaje de confirmación
- ✅ Reporte enviado a moderadores

### 🔍 Validaciones

```sql
SELECT
    lr.id,
    lr.reporter_id,
    lr.listing_id,
    lr.reason,
    lr.description,
    lr.status
FROM listing_reports lr
WHERE lr.reporter_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
ORDER BY lr.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| reason | status |
|--------|--------|
| fake_product | pending |

### 📊 Resultado

✅ **Passed** si reporte se crea

---

## Caso CP-F06-03D: Bloquear usuario

### 🎯 Objetivo

Verificar que puedes bloquear a un usuario para no ver sus listados ni recibir mensajes.

### 🧪 Pasos del Test

1. Perfil del usuario → **"⋮"** → **"Bloquear usuario"**
2. Confirmación: "¿Bloquear a este usuario?"
3. Confirmar

**Resultado esperado:**

- ✅ Mensaje: "Usuario bloqueado"
- ✅ Listados de ese usuario ya NO aparecen en marketplace
- ✅ No puede enviarte mensajes

### 🔍 Validaciones

```sql
SELECT
    ub.id,
    ub.blocker_id,
    ub.blocked_id,
    ub.created_at,
    p.nickname AS usuario_bloqueado
FROM user_blocks ub
JOIN profiles p ON p.id = ub.blocked_id
WHERE ub.blocker_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
ORDER BY ub.created_at DESC;
```

**Resultado esperado:** Al menos 1 fila

### 📊 Resultado

✅ **Passed** si bloqueo se registra

---

## Caso CP-F06-03E: Ver usuarios bloqueados y desbloquear

### 🎯 Objetivo

Verificar que puedes ver lista de usuarios bloqueados y desbloquear.

### 🧪 Pasos del Test

1. Ir a **"Configuración"** → **"Usuarios bloqueados"**
2. Ver lista
3. Hacer clic en **"Desbloquear"** junto a un usuario
4. Confirmar

**Resultado esperado:**

- ✅ Usuario desaparece de lista de bloqueados
- ✅ Sus listados vuelven a aparecer

### 🔍 Validaciones

```sql
-- Después de desbloquear, debe retornar 0 filas
SELECT COUNT(*) FROM user_blocks
WHERE blocker_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
  AND blocked_id = '{unblocked_user_id}';
```

### 📊 Resultado

✅ **Passed** si desbloqueo funciona

---

## 📊 Resumen

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F06-02A | Valorar usuario | 15 min |
| CP-F06-02B | Ver rating promedio | 10 min |
| CP-F06-02C | Historial ratings | 10 min |
| CP-F06-02D | Reportar usuario | 20 min |
| CP-F06-02E | Reportar listado | 15 min |
| CP-F06-03D | Bloquear usuario | 20 min |
| CP-F06-03E | Desbloquear usuario | 15 min |

**Total:** ~1 hora 45 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
