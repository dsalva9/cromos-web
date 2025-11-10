# Tests No-Técnicos - Fase 06: Favoritos y Seguir Usuarios

## 📋 Información General

**Fase:** Fase-06
**Categoría:** Social - Favoritos y Seguimiento
**Archivo:** 01_Favoritos_Seguir.md
**Cantidad de tests:** 6 casos de prueba
**Tiempo estimado total:** ~1.5 horas

---

## 🎯 Objetivo de Este Archivo

Este archivo contiene tests para verificar las funcionalidades sociales básicas:

1. ✅ Marcar listados como favoritos
2. ✅ Ver mis favoritos
3. ✅ Quitar de favoritos
4. ✅ Seguir a otros usuarios
5. ✅ Ver listados de usuarios seguidos
6. ✅ Dejar de seguir

---

## 📚 Prerequisitos

- ✅ Usuario: `qa.social@cromos.test`
- ✅ Al menos 2 listados públicos de otros usuarios en marketplace

---

## Caso CP-F06-01A: Marcar listado como favorito

### 🎯 Objetivo

Verificar que un usuario puede marcar un listado del marketplace como favorito para verlo después.

### 📋 Preparación (Setup)

**Usuario:** `qa.social@cromos.test`

### 🧪 Pasos del Test

1. Ir a **Marketplace**
2. Buscar un listado de otro usuario
3. Buscar icono: **⭐ Favorito** o **♥**
4. Hacer clic

**Resultado esperado:**

- ✅ Icono cambia: ⭐ → ★ (lleno) o ♥ → ❤️ (rojo)
- ✅ Mensaje breve: "Añadido a favoritos"

### 🔍 Validaciones Técnicas

```sql
SELECT
    f.id,
    f.user_id,
    f.listing_id,
    f.created_at,
    tl.title AS listado_titulo
FROM favorites f
JOIN trade_listings tl ON tl.id = f.listing_id
WHERE f.user_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
ORDER BY f.created_at DESC
LIMIT 5;
```

**Resultado esperado:** Al menos 1 fila

### 📊 Resultado del Test

✅ **Passed** si:
- Icono cambia visualmente
- SQL retorna el favorito

---

## Caso CP-F06-01B: Ver mis favoritos

### 🎯 Objetivo

Verificar que existe una página donde el usuario puede ver todos sus listados favoritos.

### 🧪 Pasos del Test

1. Buscar sección: **"Mis Favoritos"** o **"Guardados"**
2. Hacer clic

**Resultado esperado:**

- ✅ Lista de listados marcados como favoritos
- ✅ Para cada uno:
  - Título
  - Precio
  - Vendedor
  - Botón: "Ver detalle"
  - Icono: ❤️ (para quitar de favoritos)

### 📊 Resultado del Test

✅ **Passed** si lista de favoritos se muestra correctamente

---

## Caso CP-F06-01C: Quitar de favoritos

### 🎯 Objetivo

Verificar que el usuario puede quitar un listado de favoritos.

### 🧪 Pasos del Test

1. Desde "Mis Favoritos" o desde el listado
2. Hacer clic en icono ❤️ nuevamente

**Resultado esperado:**

- ✅ Icono cambia: ❤️ → ♥ (vacío)
- ✅ Desaparece de "Mis Favoritos"

### 🔍 Validaciones Técnicas

```sql
-- Debe retornar 0 filas si se quitó
SELECT COUNT(*) FROM favorites
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
  AND listing_id = '{listing_id}';
```

### 📊 Resultado del Test

✅ **Passed** si favorito se elimina

---

## Caso CP-F06-03A: Seguir a otro usuario

### 🎯 Objetivo

Verificar que un usuario puede seguir a otro usuario para ver sus listados.

### 🧪 Pasos del Test

1. Ir al perfil de otro usuario
2. Buscar botón: **"Seguir"** o **"Follow"**
3. Hacer clic

**Resultado esperado:**

- ✅ Botón cambia a: **"Siguiendo"** ✓
- ✅ Contador de seguidores del otro usuario aumenta

### 🔍 Validaciones Técnicas

```sql
SELECT
    uf.id,
    uf.follower_id,
    uf.following_id,
    uf.created_at,
    p.nickname AS siguiendo_a
FROM user_follows uf
JOIN profiles p ON p.id = uf.following_id
WHERE uf.follower_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
ORDER BY uf.created_at DESC;
```

**Resultado esperado:** Al menos 1 fila

### 📊 Resultado del Test

✅ **Passed** si registro de seguimiento se crea

---

## Caso CP-F06-03B: Ver listados de usuarios seguidos

### 🎯 Objetivo

Verificar que existe un feed de listados de usuarios que sigues.

### 🧪 Pasos del Test

1. Ir a: **"Siguiendo"** o **"Feed"**
2. Verificar que aparecen listados de usuarios seguidos

**Resultado esperado:**

- ✅ Solo listados de usuarios que sigues
- ✅ Ordenados por fecha (más recientes primero)

### 📊 Resultado del Test

✅ **Passed** si feed funciona

---

## Caso CP-F06-03C: Dejar de seguir

### 🎯 Objetivo

Verificar que el usuario puede dejar de seguir a otro usuario.

### 🧪 Pasos del Test

1. Ir al perfil del usuario seguido
2. Hacer clic en **"Siguiendo"** → Cambia a **"Seguir"**

**Resultado esperado:**

- ✅ Botón vuelve a "Seguir"
- ✅ Usuario desaparece de tu lista de seguidos

### 🔍 Validaciones Técnicas

```sql
-- Debe retornar 0 filas
SELECT COUNT(*) FROM user_follows
WHERE follower_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
  AND following_id = '{other_user_id}';
```

### 📊 Resultado del Test

✅ **Passed** si relación de seguimiento se elimina

---

## 📊 Resumen

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F06-01A | Marcar favorito | 10 min |
| CP-F06-01B | Ver favoritos | 10 min |
| CP-F06-01C | Quitar favorito | 10 min |
| CP-F06-03A | Seguir usuario | 15 min |
| CP-F06-03B | Feed de seguidos | 15 min |
| CP-F06-03C | Dejar de seguir | 10 min |

**Total:** ~1 hora 10 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
