# Tests No-Técnicos - Fase 06: Notificaciones

## 📋 Información General

**Fase:** Fase-06
**Categoría:** Sistema de Notificaciones
**Archivo:** 03_Notificaciones.md
**Cantidad de tests:** 5 casos de prueba
**Tiempo estimado total:** ~1.5 horas

---

## 🎯 Objetivo

Tests del sistema de notificaciones en tiempo real y gestión de alertas.

---

## Caso CP-F06-04A: Recibir notificación de nuevo mensaje

### 🎯 Objetivo

Verificar que recibes notificación cuando alguien te envía un mensaje.

### 📋 Preparación

**Usuarios:**
- Usuario A: `qa.social@cromos.test` (receptor)
- Usuario B: otro usuario (enviará mensaje)

### 🧪 Pasos del Test

1. Login como Usuario A
2. Estar en cualquier página (NO en chat)
3. Usuario B envía mensaje
4. **En 5 segundos:**

**Debe aparecer:**

- ✅ Badge numérico en icono de mensajes 💬 (ej: "1")
- ✅ Notificación toast/banner: "Nuevo mensaje de [Usuario B]"
- ✅ Sonido de notificación (opcional)

### 🔍 Validaciones

```sql
SELECT
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.read,
    n.created_at
FROM notifications n
WHERE n.user_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
  AND n.type = 'new_message'
ORDER BY n.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| type | read | title |
|------|------|-------|
| new_message | false | Nuevo mensaje de... |

### 📊 Resultado

✅ **Passed** si notificación aparece en < 5 seg

---

## Caso CP-F06-04B: Ver centro de notificaciones

### 🎯 Objetivo

Verificar que existe un centro donde ver todas las notificaciones.

### 🧪 Pasos del Test

1. Hacer clic en icono 🔔
2. Ver panel de notificaciones

**Debe mostrar:**

- ✅ Lista de notificaciones recientes
- ✅ Para cada una:
  - Tipo (mensaje, propuesta, rating)
  - Título
  - Tiempo ("Hace 5 min")
  - Estado: leída/no leída
- ✅ Botón: "Marcar todas como leídas"

### 📊 Resultado

✅ **Passed** si centro de notificaciones funciona

---

## Caso CP-F06-04C: Marcar notificación como leída

### 🎯 Objetivo

Verificar que al hacer clic en una notificación, se marca como leída.

### 🧪 Pasos del Test

1. Abrir centro de notificaciones
2. Hacer clic en notificación no leída
3. Ir a destino (ej: chat)

**Resultado esperado:**

- ✅ Notificación cambia de **negrita** a texto normal
- ✅ Badge numérico disminuye

### 🔍 Validaciones

```sql
SELECT read FROM notifications
WHERE id = '{notification_id}';
```

**Resultado esperado:** `read = true`

### 📊 Resultado

✅ **Passed** si notificación se marca como leída

---

## Caso CP-F06-04D: Tipos de notificaciones

### 🎯 Objetivo

Verificar que se reciben notificaciones para diferentes eventos.

### 🧪 Pasos del Test

Generar eventos y verificar notificaciones:

1. **Propuesta de intercambio recibida**
   - ✅ Notificación: "Nueva propuesta de intercambio"

2. **Propuesta aceptada**
   - ✅ Notificación: "Tu propuesta fue aceptada"

3. **Nuevo rating recibido**
   - ✅ Notificación: "[Usuario] te ha valorado"

4. **Nuevo seguidor**
   - ✅ Notificación: "[Usuario] te ha seguido"

5. **Listado vendido**
   - ✅ Notificación: "Tu listado [X] fue marcado como vendido"

### 📊 Resultado

✅ **Passed** si todos los tipos generan notificación

---

## Caso CP-F06-04E: Configurar preferencias de notificaciones

### 🎯 Objetivo

Verificar que el usuario puede elegir qué notificaciones recibir.

### 🧪 Pasos del Test

1. Ir a **"Configuración"** → **"Notificaciones"**
2. Ver opciones:
   - ☑ Nuevos mensajes
   - ☑ Propuestas de intercambio
   - ☑ Ratings recibidos
   - ☑ Nuevos seguidores
   - ☑ Listados vendidos

3. **Desactivar** "Nuevos seguidores"
4. Guardar

**Resultado esperado:**

- ✅ Preferencias guardadas
- ✅ Si alguien te sigue, NO recibes notificación

### 🔍 Validaciones

```sql
SELECT
    notification_preferences
FROM profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test');
```

**Resultado esperado (JSON):**

```json
{
  "new_messages": true,
  "trade_proposals": true,
  "ratings": true,
  "new_followers": false,
  "listings_sold": true
}
```

### 📊 Resultado

✅ **Passed** si preferencias se guardan

---

## 📊 Resumen

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F06-04A | Notificación mensaje | 20 min |
| CP-F06-04B | Centro notificaciones | 15 min |
| CP-F06-04C | Marcar como leída | 10 min |
| CP-F06-04D | Tipos notificaciones | 30 min |
| CP-F06-04E | Preferencias | 15 min |

**Total:** ~1 hora 30 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
