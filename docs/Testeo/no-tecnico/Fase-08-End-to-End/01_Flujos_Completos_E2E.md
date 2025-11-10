# Tests No-Técnicos - Fase 08: Flujos Completos End-to-End

## 📋 Información General

**Fase:** Fase-08
**Categoría:** End-to-End - Flujos Completos de Usuario
**Archivo:** 01_Flujos_Completos_E2E.md
**Cantidad de tests:** 6 casos de prueba
**Tiempo estimado total:** ~4 horas

---

## 🎯 Objetivo de Este Archivo

Tests de flujos completos que simulan el uso real de la aplicación de principio a fin:

1. ✅ Flujo completo: Nuevo usuario completa primera transacción
2. ✅ Flujo completo: Crear plantilla y publicar listado
3. ✅ Flujo completo: Negociación de intercambio exitosa
4. ✅ Flujo completo: Gestionar colección y progreso
5. ✅ Flujo completo: Sistema de reputación (rating y reportes)
6. ✅ Flujo completo: Obtener insignias por actividad

---

## Caso CP-F08-E2E-01: Nuevo usuario completa primera transacción

### 🎯 Objetivo

Simular el viaje completo de un usuario nuevo desde registro hasta completar su primera compra/intercambio.

### 📋 Preparación

**Usuario nuevo:** Crear cuenta desde cero
**Email:** `nuevo.usuario@cromos.test`

### 🧪 Pasos del Test (Flujo Completo)

**PASO 1: Registro y Onboarding (10 minutos)**

1. Ir a `/signup`
2. Registrarse con email: `nuevo.usuario@cromos.test`
3. Confirmar email (verificar inbox o usar Supabase dashboard)
4. Completar onboarding:
   - Subir avatar
   - Elegir nickname: `NuevoColector`
   - Seleccionar país: `España`
   - Confirmar

**Verificar:**
- ✅ Perfil creado correctamente
- ✅ Redirigido a dashboard principal

**PASO 2: Explorar Marketplace (5 minutos)**

5. Ir a **"Marketplace"**
6. Buscar: `Messi`
7. Aplicar filtros:
   - Tipo: Panini
   - Estado: Nuevo
   - Precio máximo: 50€
8. Ver varios listados

**Verificar:**
- ✅ Búsqueda funciona
- ✅ Filtros se aplican correctamente

**PASO 3: Contactar Vendedor (10 minutos)**

9. Seleccionar un listado interesante
10. Hacer clic en **"Contactar vendedor"**
11. Enviar mensaje:
```
Hola, me interesa este cromo. ¿Está disponible?
```
12. Esperar respuesta (o simular con otro usuario)
13. Negociar precio o condiciones

**Verificar:**
- ✅ Chat se crea correctamente
- ✅ Mensajes se envían en tiempo real
- ✅ Notificaciones funcionan

**PASO 4: Acordar Transacción (5 minutos)**

14. Ponerse de acuerdo en:
    - Precio final
    - Método de pago
    - Método de envío
15. Vendedor marca listado como **"Vendido"**

**Verificar:**
- ✅ Listado cambia a estado "Vendido"
- ✅ Ya no aparece en búsquedas

**PASO 5: Completar Pago (simulado) (5 minutos)**

16. Realizar pago (fuera de la app o simulado)
17. Confirmación de transacción

**PASO 6: Valorar Vendedor (5 minutos)**

18. Ir a **"Mis Transacciones"**
19. Buscar transacción completada
20. Hacer clic en **"Valorar vendedor"**
21. Seleccionar: ⭐⭐⭐⭐⭐ (5 estrellas)
22. Comentario: `Excelente vendedor, envío rápido`
23. Enviar valoración

**Verificar:**
- ✅ Valoración guardada
- ✅ Rating del vendedor se actualiza
- ✅ Vendedor recibe notificación

**PASO 7: Obtener Insignia de Primera Compra (2 minutos)**

24. Verificar que se otorgó insignia: **"Primera Compra"** 🛒

**Verificar:**
- ✅ Insignia aparece en perfil
- ✅ Notificación de insignia recibida

### 🔍 Validaciones Técnicas

#### Verificación Completa del Flujo

```sql
-- Verificar usuario creado
SELECT
    u.email,
    u.confirmed_at,
    p.nickname,
    p.avatar_url,
    p.country
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'nuevo.usuario@cromos.test';
```

**Resultado esperado:**

| email | confirmed_at | nickname | country |
|-------|--------------|----------|---------|
| nuevo.usuario@cromos.test | [timestamp] | NuevoColector | España |

```sql
-- Verificar que participó en chat
SELECT
    c.id,
    c.listing_id,
    c.created_at,
    (SELECT COUNT(*) FROM chat_messages WHERE chat_id = c.id) AS num_mensajes
FROM chats c
WHERE c.buyer_id = (SELECT id FROM auth.users WHERE email = 'nuevo.usuario@cromos.test')
   OR c.seller_id = (SELECT id FROM auth.users WHERE email = 'nuevo.usuario@cromos.test')
ORDER BY c.created_at DESC
LIMIT 1;
```

```sql
-- Verificar valoración enviada
SELECT
    r.rating,
    r.comment,
    r.created_at
FROM ratings r
WHERE r.rater_id = (SELECT id FROM auth.users WHERE email = 'nuevo.usuario@cromos.test')
ORDER BY r.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| rating | comment |
|--------|---------|
| 5 | Excelente vendedor, envío rápido |

```sql
-- Verificar insignia obtenida
SELECT
    b.name,
    ub.earned_at
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = (SELECT id FROM auth.users WHERE email = 'nuevo.usuario@cromos.test')
  AND b.slug = 'first_purchase';
```

**Resultado esperado:**

| name | earned_at |
|------|-----------|
| Primera Compra | [timestamp] |

### 📊 Resultado del Test

✅ **Passed** si:
- Usuario completó todo el flujo sin errores
- Todas las funcionalidades funcionaron correctamente
- Datos se guardaron en base de datos
- Insignia se otorgó automáticamente

**Tiempo total del flujo:** ~40 minutos

---

## Caso CP-F08-E2E-02: Crear plantilla y publicar listado

### 🎯 Objetivo

Flujo completo desde crear una nueva plantilla hasta publicar un listado basado en ella.

### 🧪 Pasos del Test

**PASO 1: Crear Plantilla Privada (15 minutos)**

1. Login como usuario existente
2. Ir a **"Mis Plantillas"** → **"Crear nueva"**
3. Tipo de plantilla: **"Personalizada"**
4. Visibilidad: **"Privada"**
5. Información básica:
   - Nombre: `Mi Colección Pokemon Personal`
   - Descripción: `Colección de cartas Pokemon que poseo`
6. **Agregar ítems manualmente:**
   - Ítem #1: `Charizard Base Set`
     - Categoría: `Starter`
     - Rareza: `Rara`
     - Imagen: (subir o URL)
   - Ítem #2: `Pikachu`
     - Categoría: `Common`
     - Rareza: `Común`
   - ... (agregar 10-20 ítems)
7. Guardar plantilla

**Verificar:**
- ✅ Plantilla creada con todos los ítems
- ✅ Aparece en "Mis Plantillas"

**PASO 2: Crear Colección Personal desde Plantilla (10 minutos)**

8. Desde la plantilla, hacer clic en **"Usar plantilla"**
9. Crear colección: `Mi Colección Pokemon`
10. Marcar ítems que poseo:
    - ☑ Charizard (tengo 1)
    - ☑ Pikachu (tengo 3)
    - ☐ Blastoise (no tengo)
11. Guardar progreso

**Verificar:**
- ✅ Colección creada
- ✅ Progreso: `2/20 (10%)`

**PASO 3: Publicar Listado de Duplicado (10 minutos)**

12. Desde mi colección, en ítem `Pikachu` (tengo 3)
13. Hacer clic en **"Vender duplicado"**
14. Crear listado:
    - Título: `Pikachu Common - Excelente estado`
    - Precio: `5€`
    - Condición: `Excelente`
    - Descripción: `Carta en excelente estado, sin uso`
    - Fotos: (subir 2-3 fotos)
    - Método de envío: `Correo ordinario - 2€`
15. Publicar

**Verificar:**
- ✅ Listado publicado en marketplace
- ✅ Aparece en "Mis Listados"
- ✅ Visible en búsquedas públicas

**PASO 4: Editar Listado (5 minutos)**

16. Ir a "Mis Listados"
17. Editar listado recién creado
18. Cambiar precio: `5€` → `4€`
19. Agregar etiqueta: `#oferta`
20. Guardar cambios

**Verificar:**
- ✅ Cambios guardados
- ✅ Precio actualizado en marketplace

**PASO 5: Recibir Consulta (5 minutos)**

21. Otro usuario contacta por el listado
22. Recibir notificación de nuevo mensaje
23. Responder consulta

**Verificar:**
- ✅ Chat funciona correctamente

### 🔍 Validaciones Técnicas

```sql
-- Verificar plantilla creada
SELECT
    tc.id,
    tc.name,
    tc.visibility,
    (SELECT COUNT(*) FROM template_items WHERE collection_id = tc.id) AS num_items
FROM template_collections tc
WHERE tc.name = 'Mi Colección Pokemon Personal';
```

**Resultado esperado:**

| name | visibility | num_items |
|------|------------|-----------|
| Mi Colección Pokemon Personal | private | 20 |

```sql
-- Verificar colección de usuario basada en plantilla
SELECT
    uc.id,
    uc.name,
    uc.progress_percentage,
    (SELECT COUNT(*) FROM user_items WHERE collection_id = uc.id AND owned_quantity > 0) AS items_owned
FROM user_collections uc
WHERE uc.name = 'Mi Colección Pokemon';
```

**Resultado esperado:**

| name | progress_percentage | items_owned |
|------|---------------------|-------------|
| Mi Colección Pokemon | 10 | 2 |

```sql
-- Verificar listado publicado
SELECT
    tl.id,
    tl.title,
    tl.price,
    tl.status,
    tl.condition,
    tl.created_at
FROM trade_listings tl
WHERE tl.title LIKE '%Pikachu Common%'
ORDER BY tl.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| title | price | status | condition |
|-------|-------|--------|-----------|
| Pikachu Common - Excelente estado | 4.00 | active | excellent |

### 📊 Resultado del Test

✅ **Passed** si todo el flujo funciona sin errores

**Tiempo total:** ~45 minutos

---

## Caso CP-F08-E2E-03: Negociación de intercambio exitosa

### 🎯 Objetivo

Flujo completo de propuesta de intercambio entre dos usuarios.

### 📋 Preparación

**Usuario A:** `trader.a@cromos.test` (tiene Messi, quiere Ronaldo)
**Usuario B:** `trader.b@cromos.test` (tiene Ronaldo, quiere Messi)

### 🧪 Pasos del Test

**PASO 1: Usuario A crea propuesta de intercambio (10 minutos)**

1. Login como Usuario A
2. Ir a listado de Ronaldo (publicado por Usuario B)
3. Hacer clic en **"Proponer intercambio"**
4. Modal de intercambio:

```
┌─────────────────────────────────────────┐
│  🔄 PROPONER INTERCAMBIO                │
├─────────────────────────────────────────┤
│                                         │
│  Tú ofreces:                            │
│  [Seleccionar de tus listados]          │
│  ☑ Messi 2022 - Mint condition          │
│                                         │
│  A cambio de:                           │
│  ✓ Ronaldo 2021 - Excellent             │
│                                         │
│  💰 Compensación monetaria (opcional):  │
│  [ ] Yo pago: [___] €                   │
│  [ ] Yo recibo: [___] €                 │
│                                         │
│  📝 Mensaje:                            │
│  ┌─────────────────────────────────┐   │
│  │ Hola, me interesa intercambiar. │   │
│  │ ¿Te parece justo?               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Cancelar]  [Enviar propuesta]        │
└─────────────────────────────────────────┘
```

5. Seleccionar cromo a ofrecer: `Messi 2022`
6. Mensaje: `Hola, intercambio directo sin dinero. ¿Te interesa?`
7. Enviar propuesta

**Verificar:**
- ✅ Propuesta creada
- ✅ Usuario B recibe notificación

**PASO 2: Usuario B revisa propuesta (5 minutos)**

8. Logout de Usuario A
9. Login como Usuario B
10. Ver notificación: **"Nueva propuesta de intercambio"**
11. Ir a **"Propuestas recibidas"**
12. Ver detalles de la propuesta

**Verificar:**
- ✅ Propuesta visible con todos los detalles
- ✅ Opciones: Aceptar / Rechazar / Contraoferta

**PASO 3: Usuario B contraoferta (8 minutos)**

13. Hacer clic en **"Hacer contraoferta"**
14. Modificar:
    - Mantener: Messi 2022 ↔ Ronaldo 2021
    - Agregar: **"Yo recibo: 5€"** (Usuario A paga 5€)
15. Mensaje: `Me interesa pero necesito 5€ de compensación`
16. Enviar contraoferta

**Verificar:**
- ✅ Contraoferta enviada
- ✅ Usuario A recibe notificación

**PASO 4: Usuario A acepta (5 minutos)**

17. Logout de Usuario B
18. Login como Usuario A
19. Ver notificación: **"Contraoferta recibida"**
20. Revisar nueva propuesta (con 5€ de compensación)
21. Hacer clic en **"Aceptar propuesta"**
22. Confirmar

**Verificar:**
- ✅ Propuesta marcada como "Aceptada"
- ✅ Ambos usuarios reciben notificación
- ✅ Chat se habilita para coordinar envío

**PASO 5: Coordinar envío (10 minutos)**

23. En el chat del intercambio:
    - Usuario A: `Perfecto, te envío mañana. ¿Tu dirección?`
    - Usuario B: `[dirección]`
    - Usuario A: `[dirección]`
24. Acordar código de seguimiento

**PASO 6: Marcar como completado (5 minutos)**

25. Usuario A recibe el cromo
26. Marcar intercambio como **"Completado"**
27. Usuario B también marca como completado

**Verificar:**
- ✅ Intercambio marcado como "Completado"
- ✅ Prompt para valorar al otro usuario

**PASO 7: Valoraciones mutuas (10 minutos)**

28. Usuario A valora a Usuario B:
    - ⭐⭐⭐⭐⭐ (5 estrellas)
    - Comentario: `Excelente trader, envío rápido`

29. Usuario B valora a Usuario A:
    - ⭐⭐⭐⭐⭐ (5 estrellas)
    - Comentario: `Muy buen intercambio, recomendado`

**Verificar:**
- ✅ Valoraciones guardadas
- ✅ Rating de ambos usuarios se actualiza
- ✅ Insignias otorgadas (si es primer intercambio)

### 🔍 Validaciones Técnicas

```sql
-- Verificar propuesta creada
SELECT
    tp.id,
    tp.status,
    tp.sender_id,
    tp.receiver_id,
    tp.money_compensation,
    tp.created_at
FROM trade_proposals tp
WHERE tp.sender_id = (SELECT id FROM auth.users WHERE email = 'trader.a@cromos.test')
  AND tp.receiver_id = (SELECT id FROM auth.users WHERE email = 'trader.b@cromos.test')
ORDER BY tp.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| status | money_compensation | created_at |
|--------|-------------------|------------|
| accepted | 5.00 | [timestamp] |

```sql
-- Verificar ítems intercambiados
SELECT
    tpi.listing_id,
    tl.title,
    tpi.direction
FROM trade_proposal_items tpi
JOIN trade_listings tl ON tl.id = tpi.listing_id
WHERE tpi.proposal_id = (
    SELECT tp.id FROM trade_proposals tp
    WHERE tp.sender_id = (SELECT id FROM auth.users WHERE email = 'trader.a@cromos.test')
    ORDER BY tp.created_at DESC
    LIMIT 1
);
```

**Resultado esperado:**

| title | direction |
|-------|-----------|
| Messi 2022 - Mint condition | offered |
| Ronaldo 2021 - Excellent | requested |

```sql
-- Verificar valoraciones cruzadas
SELECT
    r.rater_id,
    r.rated_user_id,
    r.rating,
    r.comment
FROM ratings r
WHERE (
    r.rater_id = (SELECT id FROM auth.users WHERE email = 'trader.a@cromos.test')
    AND r.rated_user_id = (SELECT id FROM auth.users WHERE email = 'trader.b@cromos.test')
)
OR (
    r.rater_id = (SELECT id FROM auth.users WHERE email = 'trader.b@cromos.test')
    AND r.rated_user_id = (SELECT id FROM auth.users WHERE email = 'trader.a@cromos.test')
);
```

**Resultado esperado:** 2 filas (valoraciones cruzadas)

### 📊 Resultado del Test

✅ **Passed** si:
- Propuesta y contraoferta funcionan
- Intercambio se completa exitosamente
- Valoraciones mutuas se registran

**Tiempo total:** ~50 minutos

---

## Caso CP-F08-E2E-04: Gestionar colección y progreso

### 🎯 Objetivo

Flujo completo de gestión de colección personal con seguimiento de progreso.

### 🧪 Pasos del Test

**PASO 1: Copiar plantilla pública (5 minutos)**

1. Ir a **"Plantillas públicas"**
2. Buscar: `Panini Mundial 2022`
3. Ver plantilla (640 ítems)
4. Hacer clic en **"Usar esta plantilla"**
5. Nombre de colección: `Mi Mundial 2022`
6. Crear

**Verificar:**
- ✅ Colección creada con 640 ítems
- ✅ Progreso inicial: 0/640 (0%)

**PASO 2: Marcar ítems que poseo (15 minutos)**

7. Ir a mi colección
8. Categoría: `Argentina`
9. Marcar como poseído:
    - ☑ Escudo Argentina (1)
    - ☑ Lionel Messi (2 copias)
    - ☑ Di María (1)
    - ... (marcar 20 ítems)

**Verificar:**
- ✅ Progreso actualiza: `20/640 (3.1%)`
- ✅ Barra de progreso se muestra

**PASO 3: Marcar ítems faltantes (10 minutos)**

10. Ver sección **"Ítems que me faltan"**
11. Marcar algunos como **"Necesito urgente"** ⭐
12. Filtrar por: `Necesito urgente`

**Verificar:**
- ✅ Filtro funciona
- ✅ Destacados visualmente

**PASO 4: Buscar ítems faltantes en marketplace (10 minutos)**

13. Desde la colección, hacer clic en **"Buscar en marketplace"**
14. Sistema automáticamente busca listados que coincidan con ítems faltantes
15. Ver resultados: Listados de ítems que necesito

**Verificar:**
- ✅ Búsqueda inteligente funciona
- ✅ Solo muestra ítems que NO poseo

**PASO 5: Comprar ítem faltante (15 minutos)**

16. Comprar un ítem de la lista
17. Al confirmar compra, marcar automáticamente como **"Poseído"** en colección

**Verificar:**
- ✅ Progreso se actualiza automáticamente
- ✅ Nuevo progreso: `21/640 (3.3%)`

**PASO 6: Ver estadísticas de colección (5 minutos)**

18. Ir a **"Estadísticas"** de la colección
19. Ver:
    - Progreso total: 3.3%
    - Ítems con duplicados: 1 (Messi x2)
    - Ítems faltantes: 619
    - Categoría más completa: Argentina (15%)
    - Rareza más común: Común (80%)

**Verificar:**
- ✅ Estadísticas se calculan correctamente

### 🔍 Validaciones Técnicas

```sql
-- Verificar colección del usuario
SELECT
    uc.id,
    uc.name,
    uc.progress_percentage,
    uc.template_id,
    tc.name AS plantilla_origen
FROM user_collections uc
JOIN template_collections tc ON tc.id = uc.template_id
WHERE uc.name = 'Mi Mundial 2022';
```

**Resultado esperado:**

| name | progress_percentage | plantilla_origen |
|------|---------------------|------------------|
| Mi Mundial 2022 | 3.3 | Panini Mundial 2022 |

```sql
-- Verificar ítems poseídos
SELECT
    ui.item_id,
    ti.name,
    ui.owned_quantity,
    ui.needed_priority
FROM user_items ui
JOIN template_items ti ON ti.id = ui.item_id
WHERE ui.collection_id = (SELECT id FROM user_collections WHERE name = 'Mi Mundial 2022')
  AND ui.owned_quantity > 0
ORDER BY ui.owned_quantity DESC;
```

**Resultado esperado:**

| name | owned_quantity | needed_priority |
|------|----------------|-----------------|
| Lionel Messi | 2 | NULL |
| Escudo Argentina | 1 | NULL |
| Di María | 1 | NULL |

### 📊 Resultado del Test

✅ **Passed** si gestión de colección funciona completamente

**Tiempo total:** ~60 minutos

---

## Caso CP-F08-E2E-05: Sistema de reputación completo

### 🎯 Objetivo

Flujo que cubre todo el sistema de reputación: ratings, reportes y bloqueos.

### 🧪 Pasos del Test

**PASO 1: Usuario A valora a Usuario B después de transacción (5 min)**

1. Completar transacción entre Usuario A y B
2. Usuario A valora a B: ⭐⭐⭐⭐⭐ (5 estrellas)
3. Comentario: `Excelente vendedor`

**PASO 2: Ver rating en perfil (3 min)**

4. Ir al perfil de Usuario B
5. Ver rating promedio actualizado

**Verificar:**
- ✅ Rating promedio visible
- ✅ Número de valoraciones se incrementó

**PASO 3: Usuario C reporta a Usuario D por spam (10 min)**

6. Login como Usuario C
7. Recibir spam de Usuario D
8. Ir al perfil de Usuario D
9. **"⋮"** → **"Reportar usuario"**
10. Motivo: `Spam`
11. Descripción: `Envía mensajes no solicitados constantemente`
12. Enviar reporte

**Verificar:**
- ✅ Reporte enviado
- ✅ Mensaje de confirmación

**PASO 4: Usuario C bloquea a Usuario D (5 min)**

13. Después de reportar, hacer clic en **"Bloquear usuario"**
14. Confirmar bloqueo

**Verificar:**
- ✅ Usuario D bloqueado
- ✅ Sus listados ya NO aparecen para Usuario C
- ✅ No puede enviar mensajes a Usuario C

**PASO 5: Admin revisa reporte (10 min)**

15. Login como admin
16. Ir a **"Reportes"** → **"Usuarios"**
17. Ver reporte de Usuario C contra Usuario D
18. Revisar historial de Usuario D
19. Resolver: **"Suspender usuario"** por 7 días
20. Notas: `Confirmado spam, múltiples reportes`

**Verificar:**
- ✅ Usuario D suspendido
- ✅ Reporte marcado como "Resuelto"
- ✅ Usuario C recibe notificación de resolución

**PASO 6: Usuario C desbloquea a Usuario D (opcional) (3 min)**

21. Usuario C va a **"Configuración"** → **"Usuarios bloqueados"**
22. Ver lista de bloqueados
23. Desbloquear a Usuario D

**Verificar:**
- ✅ Usuario D desbloqueado
- ✅ Sus listados vuelven a aparecer (cuando suspensión termine)

### 🔍 Validaciones Técnicas

```sql
-- Verificar rating actualizado
SELECT
    p.nickname,
    COUNT(r.id) AS total_ratings,
    AVG(r.rating) AS rating_promedio
FROM profiles p
LEFT JOIN ratings r ON r.rated_user_id = p.id
WHERE p.nickname = 'UserB'
GROUP BY p.id;
```

```sql
-- Verificar reporte y resolución
SELECT
    ur.id,
    ur.reason,
    ur.status,
    ur.resolution,
    ur.resolved_at
FROM user_reports ur
WHERE ur.reported_user_id = (SELECT id FROM profiles WHERE nickname = 'UserD')
  AND ur.reporter_id = (SELECT id FROM profiles WHERE nickname = 'UserC')
ORDER BY ur.created_at DESC
LIMIT 1;
```

**Resultado esperado:**

| reason | status | resolution |
|--------|--------|------------|
| spam | resolved | user_suspended |

```sql
-- Verificar usuario suspendido
SELECT
    p.nickname,
    p.status,
    p.suspension_reason,
    p.suspended_until
FROM profiles p
WHERE p.nickname = 'UserD';
```

**Resultado esperado:**

| status | suspension_reason | suspended_until |
|--------|-------------------|-----------------|
| suspended | spam | [fecha +7 días] |

### 📊 Resultado del Test

✅ **Passed** si sistema de reputación funciona de principio a fin

**Tiempo total:** ~40 minutos

---

## Caso CP-F08-E2E-06: Obtener insignias por actividad

### 🎯 Objetivo

Flujo que cubre el sistema de gamificación y obtención de insignias.

### 🧪 Pasos del Test

**PASO 1: Primera compra → Insignia "Primera Compra" (30 min)**

1. Usuario nuevo completa primera compra
2. Automáticamente recibe insignia: 🛒 **"Primera Compra"**

**Verificar:**
- ✅ Notificación de insignia
- ✅ Insignia visible en perfil

**PASO 2: Crear 5 plantillas → Insignia "Creador" (45 min)**

3. Crear 5 plantillas diferentes
4. Al crear la 5ª, recibir insignia: 📝 **"Creador"**

**Verificar:**
- ✅ Contador de plantillas: 5
- ✅ Insignia otorgada

**PASO 3: Completar 100% de colección → Insignia "Completista" (60 min)**

5. Tener colección pequeña (ej: 20 ítems)
6. Marcar todos como poseídos
7. Progreso: 100%
8. Recibir insignia: 🏆 **"Completista"**

**Verificar:**
- ✅ Progreso 100%
- ✅ Insignia otorgada

**PASO 4: 10 transacciones exitosas → Insignia "Trader Pro" (largo plazo)**

9. Completar 10 transacciones
10. Recibir insignia: 💼 **"Trader Pro"**

**Verificar:**
- ✅ Contador de transacciones: 10
- ✅ Insignia otorgada

**PASO 5: Rating promedio > 4.5 con 10+ valoraciones → Insignia "Confiable" (largo plazo)**

11. Acumular 10+ valoraciones con promedio > 4.5
12. Recibir insignia: ⭐ **"Confiable"**

**Verificar:**
- ✅ Rating promedio visible
- ✅ Insignia otorgada

### 🔍 Validaciones Técnicas

```sql
-- Verificar insignias del usuario
SELECT
    b.name,
    b.description,
    b.icon,
    ub.earned_at,
    ub.progress
FROM user_badges ub
JOIN badges b ON b.id = ub.badge_id
WHERE ub.user_id = '{user_id}'
ORDER BY ub.earned_at DESC;
```

```sql
-- Verificar progreso hacia insignias no obtenidas
SELECT
    b.name,
    b.requirement_count,
    COALESCE(ub.progress, 0) AS progreso_actual
FROM badges b
LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = '{user_id}'
WHERE ub.id IS NULL OR ub.earned_at IS NULL
ORDER BY b.name;
```

**Ejemplo de resultado:**

| name | requirement_count | progreso_actual |
|------|-------------------|-----------------|
| Trader Pro | 10 | 7 |
| Coleccionista | 50 | 23 |

### 📊 Resultado del Test

✅ **Passed** si insignias se otorgan automáticamente según acciones del usuario

**Tiempo total:** Variable (depende de la insignia)

---

## 📊 Resumen - Fase 08: End-to-End

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F08-E2E-01 | Nuevo usuario → Primera transacción | 40 min |
| CP-F08-E2E-02 | Crear plantilla → Publicar listado | 45 min |
| CP-F08-E2E-03 | Negociación intercambio completa | 50 min |
| CP-F08-E2E-04 | Gestionar colección y progreso | 60 min |
| CP-F08-E2E-05 | Sistema reputación completo | 40 min |
| CP-F08-E2E-06 | Obtener insignias | Variable |

**Total:** ~4 horas (sin contar insignias de largo plazo)

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
