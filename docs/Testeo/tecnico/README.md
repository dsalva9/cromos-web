# Guía para Testers Técnicos

## 🎯 Audiencia

Esta carpeta contiene tests diseñados para **David** y cualquier tester con conocimientos técnicos avanzados en:

- SQL (JOINs, subconsultas, funciones agregadas)
- Row Level Security (RLS) policies
- Database triggers y funciones
- Performance analysis (EXPLAIN ANALYZE)
- Supabase Realtime subscriptions
- API testing con cURL/Postman

## 📋 Tipos de Tests Técnicos

### 1. Verificación de RLS Policies

**Qué verificamos:**
- Políticas de seguridad a nivel de fila funcionan correctamente
- Usuarios no pueden acceder a datos que no les corresponden
- Intentos de bypass son bloqueados

**Ejemplo:**
```sql
-- Verificar que usuario A no puede modificar plantilla de usuario B
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'collection_templates'
  AND policyname = 'author_update_own_templates';
```

### 2. Triggers y Funciones de BD

**Qué verificamos:**
- Triggers se ejecutan en el momento correcto
- Funciones realizan las operaciones esperadas
- Audit logs capturan todas las acciones

**Ejemplo:**
```sql
-- Verificar que trigger de audit log se ejecutó
SELECT action, user_id, metadata
FROM audit_log
WHERE action = 'update'
  AND metadata->>'table' = 'trade_listings'
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Performance y Optimización

**Qué verificamos:**
- Queries completan en tiempo razonable (<500ms típicamente)
- Índices están siendo utilizados
- No hay full table scans innecesarios

**Ejemplo:**
```sql
-- Analizar rendimiento de búsqueda en marketplace
EXPLAIN ANALYZE
SELECT tl.*, p.nickname
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'
  AND tl.title ILIKE '%mundial%'
ORDER BY tl.created_at DESC
LIMIT 20;
```

### 4. Integridad de Datos

**Qué verificamos:**
- No hay registros huérfanos
- Foreign keys mantienen integridad referencial
- Cascadas funcionan correctamente
- No hay datos inconsistentes

**Ejemplo:**
```sql
-- Buscar listados huérfanos (sin usuario dueño)
SELECT tl.id, tl.title
FROM trade_listings tl
LEFT JOIN profiles p ON p.id = tl.user_id
WHERE p.id IS NULL;
```

### 5. Realtime Subscriptions

**Qué verificamos:**
- Cambios en BD se propagan en tiempo real
- Websockets mantienen conexión estable
- Filtros de subscripción funcionan correctamente

**Método:**
- Abrir 2 navegadores en paralelo
- Realizar acción en navegador A
- Verificar que navegador B recibe actualización en <3 segundos

---

## 🗂️ Estructura de Archivos

Cada fase tiene **un solo archivo consolidado** con todos los tests técnicos:

```
tecnico/
├── Fase-01-Autenticacion-Perfil/
│   └── 01_Tests_Tecnicos_Autenticacion.md
├── Fase-02-Plantillas-Colecciones/
│   └── 01_Tests_Tecnicos_Plantillas.md
├── Fase-03-Marketplace/
│   └── 01_Tests_Tecnicos_Marketplace.md
... (continúa para las 10 fases)
```

**Beneficio:** Todos los tests relacionados en un solo lugar, fácil de referenciar.

---

## 📖 Formato de Tests Técnicos

Cada test sigue esta estructura:

```markdown
## CP-FXX-YY: [Nombre del Test]

### Objetivo
[Descripción técnica de qué se verifica]

### Setup
- Usuario: qa.usuario@cromos.test
- Prerrequisitos: [Datos necesarios, estados requeridos]
- Herramientas: [Supabase Dashboard, psql, cURL, etc.]

### Pasos
1. [Acción técnica específica]
2. [Siguiente acción]

### Verificación Principal

**Consulta SQL:**
```sql
[Query compleja con JOINs, subconsultas, etc.]
```

**Resultado esperado:** [Descripción precisa del output]

### Verificaciones Adicionales

**RLS Policy (si aplica):**
```sql
[Verificación de política específica]
```

**Trigger/Function (si aplica):**
```sql
[Verificación de ejecución de trigger]
```

**Performance (si aplica):**
```sql
EXPLAIN ANALYZE [query]
```
Criterio: <500ms con 1000 registros

### Criterios de Éxito
- ✅ [Criterio 1]
- ✅ [Criterio 2]
- ✅ [Criterio 3]

### Notas Técnicas
[Edge cases, limitaciones conocidas, referencias]
```

---

## 🛠️ Herramientas Requeridas

### Obligatorias

1. **Supabase Dashboard** (con permisos admin)
   - URL: https://app.supabase.com
   - Proyecto: cromos-web
   - Acceso a SQL Editor, Database, Auth

2. **Google Chrome** (versión 120+)
   - Con DevTools avanzadas (Network, Application, Performance)

3. **Test_Tracking_Spreadsheet.csv**
   - Filtrar por "Asignado_A: David"
   - Columna "Tipo: Técnico"

### Opcionales (Recomendadas)

4. **psql** (PostgreSQL command line)
   - Para queries complejas con mejor formato
   - Conexión directa a Supabase DB

5. **Postman** o **cURL**
   - Para tests de API
   - Verificación de autenticación

6. **VS Code** con extensión PostgreSQL
   - Mejor experiencia para escribir SQL
   - Syntax highlighting y autocomplete

---

## 🚀 Proceso de Ejecución

### 1. Preparación (antes de iniciar sesión)

1. **Revisar el Test Tracking Spreadsheet**
   - Filtrar tests técnicos pendientes
   - Identificar dependencias (columna "Bloqueador")
   - Priorizar por columna "Prioridad"

2. **Configurar entorno**
   - Abrir Supabase Dashboard
   - Conectar psql si es necesario
   - Preparar Postman para tests de API

3. **Limpiar datos de pruebas anteriores** (si necesario)
   ```sql
   -- Ejemplo: Limpiar usuarios de testing antiguos
   DELETE FROM profiles
   WHERE email LIKE 'qa.test%'
     AND created_at < NOW() - INTERVAL '7 days';
   ```

### 2. Ejecución del Test

1. **Abrir archivo .md de la fase**
2. **Localizar el test por Test_ID** (ej: CP-F02-01G)
3. **Ejecutar Setup** (crear datos, usuarios, etc.)
4. **Ejecutar pasos** secuencialmente
5. **Verificar resultados** con todas las queries provistas
6. **Documentar hallazgos** en spreadsheet

### 3. Validación Exhaustiva

Para cada test, verificar **todos** los criterios:

#### ✅ Query devuelve resultado esperado
```sql
-- Debe coincidir exactamente con "Resultado esperado"
```

#### ✅ RLS funciona correctamente
```sql
-- Intentar acción no autorizada debe fallar con código apropiado
```

#### ✅ Triggers se ejecutaron
```sql
-- Audit log o tabla relevante debe tener registro
```

#### ✅ Performance aceptable
```sql
-- EXPLAIN ANALYZE muestra uso de índices, tiempo <500ms
```

#### ✅ No hay efectos colaterales
```sql
-- Verificar que no se modificaron datos no relacionados
```

### 4. Reporte de Resultados

En `Test_Tracking_Spreadsheet.csv`:

| Test_ID | Estado | Notas |
|---------|--------|-------|
| CP-F02-01G | Passed | RLS policy funciona. Query en 145ms. |
| CP-F03-02H | Failed | Policy permite acceso no autorizado. Ver captura. |
| CP-F06-02F | Passed | Realtime funciona. Latencia ~2s aceptable. |

---

## 📊 Tests por Categoría

### Total de Tests Técnicos: 134

**Distribución por fase:**

| Fase | Cantidad | Complejidad Principal |
|------|----------|----------------------|
| Fase-01 | 7 | RLS, Storage, Auth API |
| Fase-02 | 8 | RLS, Triggers, Cascadas |
| Fase-03 | 5 | RLS, Realtime, Performance |
| Fase-04 | 4 | Integridad, Realtime |
| Fase-05 | 3 | RLS, Notificaciones |
| Fase-06 | 24 | RLS complejas, Full-text search, Triggers |
| Fase-07 | 12 | Admin APIs, Audit logs, Purges |
| Fase-08 | 6 | E2E flows, Data persistence |
| Fase-09 | 3 | Performance, Error simulation |
| Fase-10 | 12 | Badges logic, Realtime, Concurrency |

**Estimación de tiempo:** ~18-28 horas totales

---

## 🧪 Técnicas de Testing Avanzadas

### 1. Test de Penetración RLS

**Objetivo:** Intentar bypass de políticas de seguridad

**Método:**
```sql
-- Como usuario no autorizado, intentar:
UPDATE collection_templates
SET title = 'HACKED'
WHERE id = (SELECT id FROM collection_templates WHERE author_id != auth.uid() LIMIT 1);

-- Resultado esperado: 0 rows affected, o error
```

**Verificar audit log:**
```sql
SELECT action, metadata
FROM audit_log
WHERE metadata->>'attempted_action' = 'unauthorized_update'
ORDER BY created_at DESC
LIMIT 1;
```

### 2. Test de Concurrencia

**Objetivo:** Verificar que múltiples operaciones simultáneas no causan race conditions

**Método:**
1. Abrir 2 sesiones de psql en paralelo
2. Ejecutar misma operación simultáneamente
3. Verificar que resultado es consistente

**Ejemplo - prevención de duplicados en badges:**
```sql
-- Sesión 1 y 2 ejecutan esto al mismo tiempo
INSERT INTO user_badges (user_id, badge_id)
VALUES ('{user_id}', '{badge_id}');

-- Resultado esperado:
-- Una sesión: INSERT exitoso
-- Otra sesión: Error de UNIQUE constraint
```

### 3. Test de Performance con EXPLAIN ANALYZE

**Objetivo:** Verificar que queries están optimizadas

**Método:**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT tl.*, p.nickname
FROM trade_listings tl
JOIN profiles p ON p.id = tl.user_id
WHERE tl.status = 'active'
ORDER BY tl.created_at DESC
LIMIT 20;
```

**Criterios:**
- ✅ Usa índice en `status` (Index Scan, no Seq Scan)
- ✅ JOIN eficiente (Nested Loop o Hash Join según tamaño)
- ✅ Execution time < 500ms con 10,000 registros
- ✅ Planning time < 50ms

### 4. Test de Audit Trail

**Objetivo:** Verificar que todas las acciones críticas quedan registradas

**Método:**
```sql
-- Realizar acción de admin (ej: suspender usuario)
SELECT admin_suspend_user('{user_id}', 'Spam detection');

-- Verificar registro en audit_log
SELECT action, admin_id, metadata
FROM audit_log
WHERE action = 'suspend_user'
  AND metadata->>'target_user_id' = '{user_id}'
ORDER BY created_at DESC
LIMIT 1;
```

**Criterios:**
- ✅ Acción registrada con timestamp correcto
- ✅ admin_id corresponde al usuario autenticado
- ✅ metadata contiene toda la info relevante (reason, target, etc.)

### 5. Test de Realtime con Timing

**Objetivo:** Medir latencia de propagación de cambios

**Método:**
1. Abrir navegador A con DevTools → Console
2. Subscribirse a cambios en tabla:
   ```javascript
   const subscription = supabase
     .from('trade_listings')
     .on('INSERT', payload => {
       console.log('Received:', new Date().toISOString(), payload);
     })
     .subscribe();
   ```
3. En navegador B, insertar registro:
   ```sql
   INSERT INTO trade_listings (...) VALUES (...);
   ```
4. En navegador A, medir tiempo hasta que aparece en consola

**Criterios:**
- ✅ Latencia < 3 segundos (típicamente 1-2s)
- ✅ Payload contiene datos completos
- ✅ No hay mensajes duplicados

---

## 🐛 Debugging Tips

### Cuando un test falla...

#### 1. Verificar el Setup
```sql
-- ¿Existen los datos de prueba?
SELECT * FROM profiles WHERE email = 'qa.test@cromos.test';
```

#### 2. Revisar logs de Supabase
- Dashboard → Logs → PostgreSQL
- Buscar errores en el timeframe del test

#### 3. Ejecutar query manualmente con EXPLAIN
```sql
EXPLAIN (ANALYZE, VERBOSE)
[tu query aquí]
```

#### 4. Verificar políticas RLS activas
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'nombre_tabla';
```

#### 5. Comprobar estado de triggers
```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'nombre_tabla';
```

---

## 📈 Priorización de Tests

### Alta Prioridad (ejecutar primero)

Tests que verifican **seguridad** y **integridad de datos**:
- CP-F01-03: Prevención de duplicados
- CP-F02-01G: Restricciones de autoría (RLS)
- CP-F03-02H: Seguridad de chat
- CP-F06-02D: Sistema de reportes
- CP-F07-02I: Seguridad de admin endpoints

### Media Prioridad

Tests de **funcionalidad avanzada**:
- CP-F04-01H: Integridad de datos en integración
- CP-F05-02F: Notificaciones globales
- CP-F06-03C/D: Filtrado de usuarios ignorados

### Baja Prioridad

Tests de **optimización** y **edge cases**:
- CP-F09-02G: Rendimiento en panel admin
- CP-F10-17: Todas las insignias (edge case)

---

## ✅ Checklist Pre-Test

Antes de empezar una sesión de testing técnico:

- [ ] Tengo acceso admin a Supabase Dashboard
- [ ] Puedo ejecutar queries en SQL Editor
- [ ] Tengo psql configurado (opcional)
- [ ] Entiendo el esquema de BD del área que voy a testear
- [ ] Revisé si hay tests bloqueadores que debo completar primero
- [ ] Tengo tiempo suficiente (tests técnicos toman 20-35 min c/u)
- [ ] Sé cómo revertir cambios si es necesario

---

## 📞 Contacto

**David (tú mismo):**
- Este documento es tu referencia rápida
- Consulta `docs/database-schema.md` para esquema completo
- Consulta `docs/api-endpoints.md` para RPCs disponibles

**Equipo de Testing:**
- Canal Slack `#testing` para coordinar con testers no-técnicos
- Reportar bugs críticos encontrados en canal `#dev`

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Autor:** David
