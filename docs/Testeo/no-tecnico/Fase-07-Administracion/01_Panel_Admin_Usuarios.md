# Tests No-Técnicos - Fase 07: Panel Admin y Usuarios

## 📋 Información General

**Fase:** Fase-07
**Categoría:** Administración - Panel y Gestión de Usuarios
**Archivo:** 01_Panel_Admin_Usuarios.md
**Cantidad de tests:** 12 casos de prueba
**Tiempo estimado total:** ~4 horas

---

## 🎯 Objetivo de Este Archivo

Tests para el panel de administración y gestión de usuarios:

1. ✅ Acceso al panel de administración
2. ✅ Ver estadísticas globales del sistema
3. ✅ Buscar y filtrar usuarios
4. ✅ Ver detalles completos de un usuario
5. ✅ Suspender cuenta de usuario
6. ✅ Reactivar cuenta suspendida
7. ✅ Eliminar cuenta de usuario
8. ✅ Ver reportes pendientes de usuarios
9. ✅ Revisar y resolver reporte de usuario
10. ✅ Ver reportes pendientes de listados
11. ✅ Revisar y resolver reporte de listado
12. ✅ Ver log de acciones administrativas

---

## Caso CP-F07-01A: Acceso al panel de administración

### 🎯 Objetivo

Verificar que solo usuarios con rol de administrador pueden acceder al panel admin.

### 📋 Preparación

**Usuarios necesarios:**
- Admin: `admin@cromos.test` (con rol `admin`)
- Usuario normal: `qa.user@cromos.test` (sin privilegios admin)

### 🧪 Pasos del Test

**Test 1: Usuario normal intenta acceder**

1. Login como `qa.user@cromos.test`
2. En la URL, intentar ir a: `/admin` o `/dashboard/admin`

**Resultado esperado:**

- ✅ Mensaje: "No tienes permisos para acceder a esta página"
- ✅ Redirigido a página principal o 403 Forbidden

**Test 2: Usuario admin accede**

1. Logout
2. Login como `admin@cromos.test`
3. Hacer clic en menú → **"Panel de Administración"**
4. O ir directamente a `/admin`

**Debe aparecer:**

- ✅ Dashboard con estadísticas
- ✅ Menú lateral con opciones:
  - 📊 Dashboard
  - 👥 Usuarios
  - 📝 Reportes
  - 🏷️ Plantillas
  - 📋 Listados
  - 🎖️ Insignias
  - 📜 Logs

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que el usuario tiene rol de admin
SELECT
    u.id,              -- ID del usuario
    u.email,           -- Su email
    p.role             -- ¿Tiene rol 'admin'?
FROM auth.users u      -- Tabla de autenticación de Supabase
JOIN profiles p ON p.id = u.id
WHERE u.email = 'admin@cromos.test';
```

**Resultado esperado:**

| email | role |
|-------|------|
| admin@cromos.test | admin |

#### Verificación en Consola de Chrome

1. Abrir DevTools (F12) → pestaña **"Console"**
2. Verificar que no hay errores 403 o "Unauthorized"
3. En pestaña **"Network"**, verificar llamadas a `/api/admin/*` retornan 200 OK

### 📊 Resultado del Test

✅ **Passed** si:
- Usuario normal es bloqueado
- Admin puede acceder al panel completo

---

## Caso CP-F07-01B: Ver estadísticas globales del sistema

### 🎯 Objetivo

Verificar que el dashboard muestra métricas clave del sistema.

### 🧪 Pasos del Test

1. Como admin, ir al **Dashboard** del panel admin
2. Verificar que se muestran las siguientes estadísticas:

**Métricas esperadas:**

┌─────────────────────────────────────────┐
│  📊 ESTADÍSTICAS DEL SISTEMA            │
├─────────────────────────────────────────┤
│                                         │
│  👥 Usuarios Totales: 1,234            │
│  ├─ Activos: 1,100                     │
│  ├─ Suspendidos: 34                    │
│  └─ Nuevos (últimos 7 días): 45        │
│                                         │
│  🏷️ Plantillas Totales: 567            │
│  ├─ Públicas: 489                      │
│  ├─ Privadas: 78                       │
│  └─ Pendientes moderación: 12          │
│                                         │
│  📝 Listados Activos: 3,456            │
│  └─ Vendidos (último mes): 234         │
│                                         │
│  ⚠️ Reportes Pendientes: 8             │
│  ├─ Usuarios: 3                        │
│  └─ Listados: 5                        │
│                                         │
│  💬 Mensajes (últimas 24h): 1,234      │
│                                         │
└─────────────────────────────────────────┘

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Obtener estadísticas de usuarios
SELECT
    COUNT(*) AS total_usuarios,
    COUNT(*) FILTER (WHERE status = 'active') AS activos,
    COUNT(*) FILTER (WHERE status = 'suspended') AS suspendidos,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS nuevos_ultimos_7_dias
FROM profiles;
```

```sql
-- Obtener estadísticas de reportes pendientes
SELECT
    (SELECT COUNT(*) FROM user_reports WHERE status = 'pending') AS reportes_usuarios,
    (SELECT COUNT(*) FROM listing_reports WHERE status = 'pending') AS reportes_listados,
    (SELECT COUNT(*) FROM user_reports WHERE status = 'pending') +
    (SELECT COUNT(*) FROM listing_reports WHERE status = 'pending') AS total_reportes_pendientes;
```

### 📊 Resultado del Test

✅ **Passed** si todas las métricas se muestran correctamente

---

## Caso CP-F07-01C: Buscar y filtrar usuarios

### 🎯 Objetivo

Verificar que el admin puede buscar usuarios por diferentes criterios.

### 🧪 Pasos del Test

1. En panel admin, ir a **"Usuarios"**
2. Ver lista de todos los usuarios
3. Probar búsqueda por:

**Búsqueda por email:**

- Campo de búsqueda: `qa.social@cromos.test`
- ✅ Debe aparecer solo ese usuario

**Búsqueda por nickname:**

- Campo de búsqueda: `JuanTrader`
- ✅ Debe aparecer usuario con ese nickname

**Filtros:**

- Filtro: **"Estado: Suspendidos"**
- ✅ Solo aparecen usuarios con `status = 'suspended'`

- Filtro: **"Registrados últimos 7 días"**
- ✅ Solo usuarios nuevos

- Filtro: **"Con reportes"**
- ✅ Solo usuarios que han sido reportados

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Buscar usuario por email o nickname
SELECT
    u.id,
    u.email,
    p.nickname,
    p.status,
    p.created_at,
    (SELECT COUNT(*) FROM user_reports WHERE reported_user_id = u.id) AS num_reportes
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email ILIKE '%qa.social%'
   OR p.nickname ILIKE '%JuanTrader%'
ORDER BY p.created_at DESC;
```

**¿Qué hace esta consulta?**
- `ILIKE`: Búsqueda sin diferenciar mayúsculas/minúsculas
- `%texto%`: Busca el texto en cualquier parte (no solo al inicio)
- Subconsulta cuenta reportes asociados a cada usuario

### 📊 Resultado del Test

✅ **Passed** si búsqueda y filtros funcionan correctamente

---

## Caso CP-F07-01D: Ver detalles completos de un usuario

### 🎯 Objetivo

Verificar que el admin puede ver información detallada de cualquier usuario.

### 🧪 Pasos del Test

1. En lista de usuarios, hacer clic en un usuario
2. Ir a **"Ver detalles"**

**Debe mostrar:**

┌─────────────────────────────────────────┐
│  👤 DETALLES DE USUARIO                 │
├─────────────────────────────────────────┤
│                                         │
│  📧 Email: qa.social@cromos.test       │
│  👤 Nickname: JuanTrader               │
│  📅 Registrado: 2024-05-15             │
│  ✅ Estado: Activo                     │
│                                         │
│  📊 ESTADÍSTICAS                        │
│  ├─ Plantillas creadas: 12             │
│  ├─ Listados publicados: 23            │
│  ├─ Transacciones: 8                   │
│  ├─ Rating promedio: ⭐ 4.7/5          │
│  └─ Insignias: 🏆 5                    │
│                                         │
│  ⚠️ MODERACIÓN                          │
│  ├─ Reportes recibidos: 2              │
│  ├─ Reportes enviados: 0               │
│  └─ Suspensiones anteriores: 0         │
│                                         │
│  💬 ACTIVIDAD RECIENTE                  │
│  ├─ Último login: Hace 2 horas         │
│  ├─ Mensajes enviados (24h): 15        │
│  └─ Listados creados (7 días): 3       │
│                                         │
│  🔧 ACCIONES                            │
│  [Suspender] [Eliminar] [Ver reportes] │
│                                         │
└─────────────────────────────────────────┘

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Obtener detalles completos del usuario
SELECT
    u.email,
    p.nickname,
    p.status,
    p.created_at,
    u.last_sign_in_at AS ultimo_login,
    (SELECT COUNT(*) FROM template_collections WHERE user_id = u.id) AS plantillas_creadas,
    (SELECT COUNT(*) FROM trade_listings WHERE user_id = u.id) AS listados_publicados,
    (SELECT COUNT(*) FROM trade_proposals WHERE sender_id = u.id OR receiver_id = u.id) AS transacciones,
    (SELECT AVG(rating) FROM ratings WHERE rated_user_id = u.id) AS rating_promedio,
    (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) AS num_insignias,
    (SELECT COUNT(*) FROM user_reports WHERE reported_user_id = u.id) AS reportes_recibidos,
    (SELECT COUNT(*) FROM user_reports WHERE reporter_id = u.id) AS reportes_enviados
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'qa.social@cromos.test';
```

**¿Qué hace esta consulta?**
- Combina información de múltiples tablas usando subconsultas
- `COUNT(*)`: Cuenta el número de registros relacionados
- `AVG(rating)`: Calcula el promedio de valoraciones

### 📊 Resultado del Test

✅ **Passed** si todos los detalles se muestran correctamente

---

## Caso CP-F07-02A: Suspender cuenta de usuario

### 🎯 Objetivo

Verificar que un admin puede suspender temporalmente una cuenta.

### 🧪 Pasos del Test

1. En detalles del usuario problemático
2. Hacer clic en **"Suspender cuenta"**
3. Aparece modal:

```
┌───────────────────────────────────────┐
│  ⚠️ SUSPENDER CUENTA                  │
├───────────────────────────────────────┤
│                                       │
│  Usuario: qa.social@cromos.test      │
│                                       │
│  Motivo de suspensión:                │
│  [▼ Seleccionar motivo]               │
│    - Spam                             │
│    - Conducta inapropiada             │
│    - Fraude                           │
│    - Otro                             │
│                                       │
│  Duración:                            │
│  ⚪ 7 días                             │
│  ⚪ 30 días                            │
│  ⚫ Indefinida (requiere reactivación) │
│                                       │
│  Notas internas (opcional):           │
│  ┌─────────────────────────────────┐ │
│  │ Usuario reportado múltiples     │ │
│  │ veces por spam                  │ │
│  └─────────────────────────────────┘ │
│                                       │
│  [Cancelar]  [Confirmar suspensión]  │
└───────────────────────────────────────┘
```

4. Seleccionar motivo: **"Spam"**
5. Duración: **"30 días"**
6. Notas: `Usuario reportado por enviar mensajes spam`
7. Confirmar

**Resultado esperado:**

- ✅ Mensaje: "Usuario suspendido exitosamente"
- ✅ Estado del usuario cambia a "Suspendido"
- ✅ Usuario no puede hacer login

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que el usuario está suspendido
SELECT
    p.status,                    -- Debe ser 'suspended'
    p.suspension_reason,         -- Motivo
    p.suspended_until,           -- Fecha de fin de suspensión
    p.suspension_notes           -- Notas internas
FROM profiles p
WHERE p.id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test');
```

**Resultado esperado:**

| status | suspension_reason | suspended_until | suspension_notes |
|--------|-------------------|-----------------|------------------|
| suspended | spam | 2025-12-09 | Usuario reportado por... |

```sql
-- Verificar que se creó un log de la acción
SELECT
    al.action_type,              -- Tipo de acción
    al.admin_id,                 -- ID del admin que suspendió
    al.target_user_id,           -- Usuario suspendido
    al.details,                  -- Detalles en JSON
    al.created_at
FROM admin_logs al
WHERE al.action_type = 'user_suspended'
  AND al.target_user_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
ORDER BY al.created_at DESC
LIMIT 1;
```

#### Test funcional: Intentar login con cuenta suspendida

1. Logout
2. Intentar login como `qa.social@cromos.test`

**Resultado esperado:**

- ✅ Error: "Tu cuenta ha sido suspendida. Razón: Spam. Contacta a soporte."
- ✅ No permite acceso al sistema

### 📊 Resultado del Test

✅ **Passed** si usuario queda suspendido y no puede acceder

---

## Caso CP-F07-02B: Reactivar cuenta suspendida

### 🎯 Objetivo

Verificar que un admin puede reactivar una cuenta suspendida.

### 🧪 Pasos del Test

1. En lista de usuarios, filtrar: **"Suspendidos"**
2. Seleccionar usuario suspendido
3. Hacer clic en **"Reactivar cuenta"**
4. Modal de confirmación:

```
┌─────────────────────────────────┐
│  ✅ REACTIVAR CUENTA            │
├─────────────────────────────────┤
│                                 │
│  Usuario: qa.social@cromos.test│
│                                 │
│  Notas de reactivación:         │
│  ┌───────────────────────────┐ │
│  │ Usuario apeló la          │ │
│  │ suspensión. Reactivado    │ │
│  └───────────────────────────┘ │
│                                 │
│  [Cancelar]  [Reactivar]       │
└─────────────────────────────────┘
```

5. Agregar notas: `Usuario corrigió comportamiento`
6. Confirmar

**Resultado esperado:**

- ✅ Mensaje: "Cuenta reactivada exitosamente"
- ✅ Estado cambia a "Activo"
- ✅ Usuario puede hacer login nuevamente

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que el usuario está activo nuevamente
SELECT
    p.status,                    -- Debe ser 'active'
    p.suspension_reason,         -- Debe ser NULL
    p.suspended_until,           -- Debe ser NULL
    p.reactivation_notes         -- Notas de reactivación
FROM profiles p
WHERE p.id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test');
```

**Resultado esperado:**

| status | suspension_reason | suspended_until | reactivation_notes |
|--------|-------------------|-----------------|-------------------|
| active | NULL | NULL | Usuario corrigió comportamiento |

```sql
-- Verificar log de reactivación
SELECT
    al.action_type,
    al.admin_id,
    al.target_user_id,
    al.details,
    al.created_at
FROM admin_logs al
WHERE al.action_type = 'user_reactivated'
  AND al.target_user_id = (SELECT id FROM auth.users WHERE email = 'qa.social@cromos.test')
ORDER BY al.created_at DESC
LIMIT 1;
```

### 📊 Resultado del Test

✅ **Passed** si cuenta se reactiva y usuario puede acceder

---

## Caso CP-F07-02C: Eliminar cuenta de usuario

### 🎯 Objetivo

Verificar que un admin puede eliminar permanentemente una cuenta.

### 🧪 Pasos del Test

1. En detalles del usuario
2. Hacer clic en **"Eliminar cuenta"**
3. Modal con advertencia:

```
┌─────────────────────────────────────────┐
│  🚨 ELIMINAR CUENTA - ACCIÓN PERMANENTE │
├─────────────────────────────────────────┤
│                                         │
│  ⚠️ ADVERTENCIA: Esta acción NO se     │
│     puede deshacer.                     │
│                                         │
│  Se eliminarán:                         │
│  ✓ Perfil del usuario                  │
│  ✓ Todas sus plantillas                │
│  ✓ Todos sus listados                  │
│  ✓ Mensajes enviados/recibidos         │
│  ✓ Ratings dados y recibidos           │
│                                         │
│  Motivo de eliminación:                 │
│  [▼ Seleccionar]                        │
│    - Solicitud del usuario              │
│    - Fraude confirmado                  │
│    - Violación grave de términos        │
│                                         │
│  Para confirmar, escribe:               │
│  "ELIMINAR qa.social@cromos.test"      │
│  ┌───────────────────────────────────┐ │
│  │ ELIMINAR qa.social@cromos.test    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Cancelar]  [Eliminar permanentemente]│
└─────────────────────────────────────────┘
```

4. Seleccionar motivo: **"Violación grave de términos"**
5. Escribir texto de confirmación exacto
6. Hacer clic en **"Eliminar permanentemente"**

**Resultado esperado:**

- ✅ Mensaje: "Cuenta eliminada permanentemente"
- ✅ Usuario desaparece de la lista
- ✅ Todos sus datos relacionados son eliminados o anonimizados

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que el usuario fue eliminado
SELECT COUNT(*) AS existe
FROM auth.users
WHERE email = 'qa.social@cromos.test';
```

**Resultado esperado:** `existe = 0`

```sql
-- Verificar que sus plantillas fueron eliminadas (o marcadas como huérfanas)
SELECT COUNT(*) AS plantillas_huerfanas
FROM template_collections
WHERE user_id = '{deleted_user_id}';
```

**Resultado esperado:** `plantillas_huerfanas = 0` (si ON DELETE CASCADE está configurado)

```sql
-- Verificar log de eliminación
SELECT
    al.action_type,
    al.admin_id,
    al.details,
    al.created_at
FROM admin_logs al
WHERE al.action_type = 'user_deleted'
  AND al.details->>'deleted_email' = 'qa.social@cromos.test'
ORDER BY al.created_at DESC
LIMIT 1;
```

**¿Qué hace esta consulta?**
- `->>'deleted_email'`: Extrae el valor de un campo JSON
- Busca en los logs la eliminación de ese usuario específico

### 📊 Resultado del Test

✅ **Passed** si cuenta es eliminada y se registra en logs

---

## Caso CP-F07-03A: Ver reportes pendientes de usuarios

### 🎯 Objetivo

Verificar que el admin puede ver todos los reportes pendientes de usuarios.

### 🧪 Pasos del Test

1. En panel admin, ir a **"Reportes"** → **"Usuarios"**
2. Ver lista de reportes pendientes

**Debe mostrar tabla:**

| ID | Reportado | Reportador | Motivo | Descripción | Fecha | Acciones |
|----|-----------|------------|--------|-------------|-------|----------|
| 45 | @UserBad | @UserA | Spam | Envía mensajes... | Hace 2 días | [Ver] |
| 44 | @Scammer | @UserB | Fraude | Intentó estafarme... | Hace 3 días | [Ver] |
| 43 | @Troll | @UserC | Lenguaje ofensivo | Insultos en chat... | Hace 5 días | [Ver] |

**Filtros disponibles:**

- Por estado: Pendiente / En revisión / Resuelto
- Por motivo: Spam / Fraude / Lenguaje ofensivo / Otro
- Por fecha: Últimos 7 días / Últimos 30 días

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Listar reportes pendientes de usuarios
SELECT
    ur.id,
    ur.reason AS motivo,
    ur.description AS descripcion,
    ur.status,
    ur.created_at,
    p_reported.nickname AS usuario_reportado,
    p_reporter.nickname AS reportador
FROM user_reports ur
JOIN profiles p_reported ON p_reported.id = ur.reported_user_id
JOIN profiles p_reporter ON p_reporter.id = ur.reporter_id
WHERE ur.status = 'pending'
ORDER BY ur.created_at DESC;
```

**¿Qué hace esta consulta?**
- Hace JOIN doble: uno para obtener nickname del reportado, otro para el reportador
- Filtra por `status = 'pending'`
- Ordena por fecha, más recientes primero

### 📊 Resultado del Test

✅ **Passed** si lista de reportes se muestra correctamente

---

## Caso CP-F07-03B: Revisar y resolver reporte de usuario

### 🎯 Objetivo

Verificar que el admin puede revisar un reporte y tomar acción.

### 🧪 Pasos del Test

1. En lista de reportes, hacer clic en **"Ver"** en un reporte
2. Ver detalles completos:

```
┌─────────────────────────────────────────┐
│  📋 REPORTE #45                         │
├─────────────────────────────────────────┤
│                                         │
│  👤 Usuario reportado: @UserBad        │
│     Email: userbad@example.com         │
│     Reportes previos: 3                │
│                                         │
│  👤 Reportador: @UserA                 │
│     Email: usera@example.com           │
│                                         │
│  ⚠️ Motivo: Spam                        │
│                                         │
│  📝 Descripción:                        │
│  "Este usuario me envió 10 mensajes    │
│   en 5 minutos vendiendo el mismo      │
│   listado. Es spam claro."             │
│                                         │
│  📅 Fecha del reporte: 2025-11-07      │
│  ⏱️ Hace: 2 días                        │
│                                         │
│  📊 HISTORIAL DEL REPORTADO             │
│  ├─ Reportes recibidos: 3              │
│  ├─ Suspensiones previas: 1            │
│  └─ Rating promedio: 2.3/5             │
│                                         │
│  🔧 ACCIONES DISPONIBLES                │
│                                         │
│  Resolución:                            │
│  ⚪ Rechazar reporte (no hay infracción)│
│  ⚪ Advertencia al usuario              │
│  ⚫ Suspender usuario                   │
│  ⚪ Eliminar cuenta                     │
│                                         │
│  Notas de moderación:                   │
│  ┌─────────────────────────────────┐   │
│  │ Confirmado spam. 3er reporte.   │   │
│  │ Suspensión de 30 días.          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancelar]  [Resolver reporte]        │
└─────────────────────────────────────────┘
```

3. Seleccionar: **"Suspender usuario"**
4. Agregar notas: `Confirmado spam. 3er reporte. Suspensión de 30 días.`
5. Hacer clic en **"Resolver reporte"**

**Resultado esperado:**

- ✅ Reporte cambia a estado "Resuelto"
- ✅ Usuario es suspendido automáticamente
- ✅ Ambos usuarios (reportador y reportado) reciben notificación

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que el reporte fue resuelto
SELECT
    ur.status,                   -- Debe ser 'resolved'
    ur.resolution,               -- Acción tomada
    ur.resolution_notes,         -- Notas del moderador
    ur.resolved_by,              -- ID del admin
    ur.resolved_at               -- Fecha de resolución
FROM user_reports ur
WHERE ur.id = 45;
```

**Resultado esperado:**

| status | resolution | resolution_notes | resolved_at |
|--------|------------|------------------|-------------|
| resolved | user_suspended | Confirmado spam... | 2025-11-09 |

```sql
-- Verificar que el usuario reportado fue suspendido
SELECT
    p.status,
    p.suspension_reason
FROM profiles p
WHERE p.id = (SELECT reported_user_id FROM user_reports WHERE id = 45);
```

**Resultado esperado:**

| status | suspension_reason |
|--------|-------------------|
| suspended | spam |

### 📊 Resultado del Test

✅ **Passed** si reporte se resuelve y acción se ejecuta

---

## Caso CP-F07-03C: Ver reportes pendientes de listados

### 🎯 Objetivo

Verificar que el admin puede ver reportes de listados sospechosos.

### 🧪 Pasos del Test

1. En panel admin, ir a **"Reportes"** → **"Listados"**
2. Ver lista de reportes pendientes

**Debe mostrar:**

| ID | Listado | Vendedor | Motivo | Descripción | Fecha | Acciones |
|----|---------|----------|--------|-------------|-------|----------|
| 78 | Messi Rookie | @Seller1 | Fake product | Es una falsificación... | Hace 1 día | [Ver] |
| 77 | Jordan 23 | @Seller2 | Precio abusivo | Pide $5000... | Hace 3 días | [Ver] |

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Listar reportes pendientes de listados
SELECT
    lr.id,
    lr.reason AS motivo,
    lr.description AS descripcion,
    lr.status,
    lr.created_at,
    tl.title AS titulo_listado,
    p_seller.nickname AS vendedor,
    p_reporter.nickname AS reportador
FROM listing_reports lr
JOIN trade_listings tl ON tl.id = lr.listing_id
JOIN profiles p_seller ON p_seller.id = tl.user_id
JOIN profiles p_reporter ON p_reporter.id = lr.reporter_id
WHERE lr.status = 'pending'
ORDER BY lr.created_at DESC;
```

### 📊 Resultado del Test

✅ **Passed** si reportes de listados se listan correctamente

---

## Caso CP-F07-03D: Revisar y resolver reporte de listado

### 🎯 Objetivo

Verificar que el admin puede revisar un reporte de listado y tomar acción.

### 🧪 Pasos del Test

1. Hacer clic en **"Ver"** en un reporte de listado
2. Ver detalles:

```
┌─────────────────────────────────────────┐
│  📋 REPORTE DE LISTADO #78              │
├─────────────────────────────────────────┤
│                                         │
│  🏷️ Listado: "Messi Rookie Card 2005"  │
│     Precio: $350                       │
│     Estado: Activo                     │
│     [Ver listado completo]             │
│                                         │
│  👤 Vendedor: @Seller1                 │
│     Rating: 3.2/5                      │
│     Reportes previos: 0                │
│                                         │
│  ⚠️ Motivo: Producto falso              │
│                                         │
│  📝 Descripción del reportador:         │
│  "La foto es de internet. Ese cromo    │
│   no existe en esa edición."           │
│                                         │
│  🔧 ACCIONES                            │
│                                         │
│  ⚪ Rechazar reporte                    │
│  ⚪ Solicitar más información al vendedor│
│  ⚫ Eliminar listado                    │
│  ⚪ Suspender vendedor                  │
│                                         │
│  Notas:                                 │
│  ┌─────────────────────────────────┐   │
│  │ Verificado: producto fake.      │   │
│  │ Listado eliminado.              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancelar]  [Resolver]                │
└─────────────────────────────────────────┘
```

3. Seleccionar: **"Eliminar listado"**
4. Notas: `Verificado: producto fake. Listado eliminado.`
5. Resolver

**Resultado esperado:**

- ✅ Listado es eliminado o marcado como "Removed by admin"
- ✅ Vendedor recibe notificación
- ✅ Reportador recibe confirmación

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que el reporte fue resuelto
SELECT
    lr.status,
    lr.resolution,
    lr.resolution_notes,
    lr.resolved_at
FROM listing_reports lr
WHERE lr.id = 78;
```

```sql
-- Verificar que el listado fue eliminado
SELECT
    tl.status,
    tl.removed_reason
FROM trade_listings tl
WHERE tl.id = (SELECT listing_id FROM listing_reports WHERE id = 78);
```

**Resultado esperado:**

| status | removed_reason |
|--------|----------------|
| removed_by_admin | fake_product |

### 📊 Resultado del Test

✅ **Passed** si listado es eliminado y reporte resuelto

---

## Caso CP-F07-04A: Ver log de acciones administrativas

### 🎯 Objetivo

Verificar que existe un registro de todas las acciones administrativas para auditoría.

### 🧪 Pasos del Test

1. En panel admin, ir a **"Logs"** o **"Auditoría"**
2. Ver tabla de acciones recientes

**Debe mostrar:**

| Fecha | Admin | Acción | Usuario/Recurso | Detalles |
|-------|-------|--------|-----------------|----------|
| 2025-11-09 10:30 | admin@cromos.test | user_suspended | @UserBad | Motivo: Spam, 30 días |
| 2025-11-09 09:15 | admin@cromos.test | listing_removed | Listing #456 | Motivo: Fake product |
| 2025-11-08 16:20 | admin@cromos.test | user_reactivated | @UserC | Apeló suspensión |
| 2025-11-08 14:00 | admin@cromos.test | template_approved | Template #123 | Aprobada moderación |

**Filtros:**

- Por tipo de acción
- Por admin
- Por rango de fechas

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Listar logs de acciones administrativas
SELECT
    al.id,
    al.action_type,              -- Tipo de acción
    al.created_at,               -- Fecha/hora
    p_admin.nickname AS admin,   -- Admin que realizó la acción
    al.target_user_id,           -- Usuario afectado (si aplica)
    al.target_resource_type,     -- Tipo de recurso (listing, template, etc)
    al.target_resource_id,       -- ID del recurso
    al.details                   -- JSON con detalles
FROM admin_logs al
JOIN profiles p_admin ON p_admin.id = al.admin_id
ORDER BY al.created_at DESC
LIMIT 50;
```

**¿Qué hace esta consulta?**
- `admin_logs`: Tabla que registra todas las acciones admin
- `details`: Campo JSON con información adicional específica de cada acción
- Ordenado por fecha descendente (más recientes primero)

**Ejemplo de campo `details` (JSON):**

```json
{
  "suspension_reason": "spam",
  "suspension_duration_days": 30,
  "previous_reports": 3,
  "notes": "Confirmado spam. 3er reporte."
}
```

### 📊 Resultado del Test

✅ **Passed** si todos los logs se registran correctamente

---

## 📊 Resumen - Fase 07: Panel Admin y Usuarios

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F07-01A | Acceso panel admin | 20 min |
| CP-F07-01B | Estadísticas globales | 20 min |
| CP-F07-01C | Buscar/filtrar usuarios | 25 min |
| CP-F07-01D | Detalles de usuario | 20 min |
| CP-F07-02A | Suspender cuenta | 30 min |
| CP-F07-02B | Reactivar cuenta | 20 min |
| CP-F07-02C | Eliminar cuenta | 30 min |
| CP-F07-03A | Ver reportes usuarios | 20 min |
| CP-F07-03B | Resolver reporte usuario | 30 min |
| CP-F07-03C | Ver reportes listados | 15 min |
| CP-F07-03D | Resolver reporte listado | 25 min |
| CP-F07-04A | Ver logs auditoría | 25 min |

**Total:** ~4 horas 20 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
