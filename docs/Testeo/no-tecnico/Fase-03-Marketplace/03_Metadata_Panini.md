# Tests No-Técnicos - Fase 03: Metadata de Panini

## 📋 Información General

**Fase:** Fase-03
**Categoría:** Marketplace - Metadata Enriquecida Panini
**Archivo:** 03_Metadata_Panini.md
**Cantidad de tests:** 4 casos de prueba
**Tiempo estimado total:** ~1 hora

---

## 🎯 Objetivo de Este Archivo

Este archivo contiene tests para verificar que el sistema puede:

1. ✅ Mostrar metadata enriquecida de colecciones Panini
2. ✅ Buscar cromos por jugador específico
3. ✅ Filtrar por sección de álbum (ej: "Grupo A", "Estrellas")
4. ✅ Mostrar información adicional (equipo, posición, rareza)

**⚠️ Nota importante:** Esta funcionalidad depende de tener metadata de Panini integrada en la base de datos. Si tu sistema aún no tiene esta metadata, estos tests pueden ser marcados como "Bloqueados" hasta implementación.

---

## 📚 Prerequisitos

Antes de ejecutar estos tests:

- ✅ Base de datos debe tener tabla `panini_metadata` o similar
- ✅ Al menos 1 plantilla debe tener metadata de Panini asociada (ej: "Mundial Qatar 2022 - Oficial")
- ✅ Usuario con listados publicados que referencien cromos con metadata

---

## Caso CP-F03-03A: Ver metadata de cromo Panini en detalle de listado

### 🎯 Objetivo

Verificar que cuando un listado está asociado a un cromo de colección Panini oficial, se muestra información enriquecida del cromo.

### 📋 Preparación (Setup)

**Usuario:** Cualquier usuario (puede estar logueado o no)

**Prerequisito:**
- Listado existente: "Cromo Messi #10 - Qatar 2022"
- Este listado debe estar vinculado a metadata de Panini (jugador: Lionel Messi, equipo: Argentina)

### 🧪 Pasos del Test

#### 1. Ir a detalle del listado

1. Navegar al marketplace
2. Buscar y abrir listado: **"Cromo Messi #10 - Qatar 2022"**
3. Ver página de detalle completa

#### 2. Verificar metadata enriquecida

**Información adicional que DEBERÍA aparecer (si metadata está disponible):**

**Información del Jugador:**
- ✅ **Nombre completo:** "Lionel Andrés Messi"
- ✅ **Equipo/Selección:** "Argentina" con bandera 🇦🇷
- ✅ **Posición:** "Delantero" o "Forward" o icono de posición
- ✅ **Número de camiseta:** "10"
- ✅ **Sección del álbum:** "Grupo C - Argentina" o "Estrellas"

**Información del Cromo:**
- ✅ **Número en colección:** "#10" o "ARG-10"
- ✅ **Rareza:** Badge "Común", "Especial", "Legendario" (si aplica)
- ✅ **Edición:** "Copa del Mundo Qatar 2022 - Edición Oficial Panini"

**Elementos visuales:**
- ✅ Imagen oficial del cromo (si está disponible)
- ✅ Logo de Panini
- ✅ Badge "Metadata verificada" o similar

**Si NO hay metadata disponible:**

- ⚠️ Debe mostrar solo información básica del listado
- ⚠️ Puede mostrar mensaje: "Metadata en proceso de integración"

---

### 🔍 Validaciones Técnicas

#### Verificación en Base de Datos (SQL)

```sql
-- Verificar que listado tiene metadata de Panini asociada
SELECT
    tl.id AS listado_id,
    tl.title,
    tl.item_number,
    -- Metadata de Panini (si existe)
    pm.id AS metadata_id,
    pm.player_name,
    pm.team,
    pm.position,
    pm.card_number,
    pm.section,
    pm.rarity,
    pm.collection_year
FROM trade_listings tl
LEFT JOIN panini_metadata pm ON pm.item_number = tl.item_number
    AND pm.collection_id = (
        SELECT id FROM collection_templates WHERE title = 'Mundial Qatar 2022 - Oficial'
    )
WHERE tl.title LIKE '%Messi%'
  AND tl.status = 'active'
LIMIT 1;
```

**¿Qué hace esta consulta?**

- **Línea 2-12:** Seleccionamos datos del listado y de la metadata de Panini
- **Línea 13:** Buscamos en `trade_listings`
- **Línea 14-17:** Hacemos LEFT JOIN con `panini_metadata` si existe
- **Línea 18-20:** Filtramos por listado de Messi

**Resultado esperado (si metadata existe):**

| Campo | Valor Esperado |
|-------|----------------|
| `title` | Cromo Messi #10 - Qatar 2022 |
| `metadata_id` | (UUID o ID, NO NULL) |
| `player_name` | Lionel Messi |
| `team` | Argentina |
| `position` | Forward / Delantero |
| `card_number` | 10 o ARG-10 |
| `section` | Grupo C / Estrellas |
| `rarity` | common / legendary (depende) |
| `collection_year` | 2022 |

**Si `metadata_id` es NULL:**

⚠️ No hay metadata de Panini para este cromo. Test puede marcarse como **"Bloqueado"** hasta integración.

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Metadata de Panini aparece en detalle del listado
2. ✅ Muestra nombre del jugador, equipo, posición
3. ✅ SQL retorna metadata (`metadata_id` NOT NULL)
4. ✅ Información es correcta (Messi = Argentina, Forward, #10)

Marca el test como **Blocked** 🚧 si:

- 🚧 SQL muestra `metadata_id = NULL` (metadata no disponible aún)
- 🚧 Tabla `panini_metadata` no existe

Marca el test como **Failed** ❌ si:

- ❌ Metadata existe en BD pero NO se muestra en UI
- ❌ Información mostrada es incorrecta (ej: Messi = Brasil)

**Actualizar en:** `Test_Tracking_Spreadsheet.csv` → Test_ID: `CP-F03-03A`

---

## Caso CP-F03-03B: Buscar por nombre de jugador

### 🎯 Objetivo

Verificar que los usuarios pueden buscar cromos por nombre del jugador usando la metadata de Panini.

### 📋 Preparación (Setup)

**Usuario:** Cualquier usuario

**Prerequisito:** Metadata de Panini debe estar disponible

### 🧪 Pasos del Test

#### 1. Buscar por nombre de jugador

1. Ir a **"Marketplace"**
2. En el buscador, introducir: **`Messi`**
3. Presionar Enter o hacer clic en buscar 🔍

**Resultado esperado:**

- ✅ Aparecen listados de cromos de Lionel Messi
- ✅ Incluso si el título del listado no contiene "Messi" exactamente, si la metadata lo tiene, debe aparecer
- ✅ Ejemplo: Listado titulado "Cromo #10 Argentina" debería aparecer si metadata indica `player_name = 'Lionel Messi'`

#### 2. Buscar por nombre completo

Buscar: **`Cristiano Ronaldo`**

**Resultado esperado:**

- ✅ Aparecen solo cromos de Cristiano Ronaldo
- ✅ NO aparecen cromos de otros jugadores

#### 3. Buscar por apodo

Buscar: **`CR7`** (si metadata incluye apodos)

**Resultado esperado:**

- ✅ Si metadata tiene campo `nickname = 'CR7'`, debería aparecer Cristiano Ronaldo
- ⚠️ Si metadata no incluye apodos, puede retornar 0 resultados (esto es aceptable)

---

### 🔍 Validaciones Técnicas

```sql
-- Simular búsqueda por jugador "Messi"
SELECT
    tl.id,
    tl.title,
    pm.player_name,
    pm.team,
    pm.position
FROM trade_listings tl
JOIN panini_metadata pm ON pm.item_number = tl.item_number
WHERE tl.status = 'active'
  AND (
      tl.title ILIKE '%Messi%'           -- Búsqueda en título
      OR pm.player_name ILIKE '%Messi%'  -- Búsqueda en metadata
  )
ORDER BY tl.created_at DESC;
```

**¿Qué hace esta consulta?**

- **Línea 10-12:** Busca "Messi" tanto en el título del listado como en el nombre del jugador de la metadata
- Esto permite encontrar cromos incluso si el vendedor no puso el nombre del jugador en el título

**Resultado esperado:**

- Al menos 1 fila con `player_name` conteniendo "Messi"

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Búsqueda por "Messi" retorna cromos de Messi
2. ✅ Búsqueda funciona incluso si título no contiene el nombre
3. ✅ SQL con `pm.player_name ILIKE '%Messi%'` retorna resultados
4. ✅ Búsquedas por diferentes jugadores son precisas

Marca el test como **Blocked** 🚧 si:

- 🚧 Metadata no está disponible

---

## Caso CP-F03-03C: Filtrar por equipo/selección

### 🎯 Objetivo

Verificar que los usuarios pueden filtrar cromos por equipo o selección nacional usando metadata de Panini.

### 📋 Preparación (Setup)

**Usuario:** Cualquier usuario

**Prerequisito:**
- Metadata de Panini disponible
- Listados de cromos de diferentes selecciones (Argentina, Brasil, España, etc.)

### 🧪 Pasos del Test

#### 1. Buscar filtro por equipo

En la página de marketplace, buscar:
- Dropdown: **"Equipo: Todos"**
- Checkboxes: `□ Argentina  □ Brasil  □ España  □ Francia`
- Búsqueda por tags: **"#Argentina"**

#### 2. Filtrar por Argentina

Seleccionar **"Argentina"** en el filtro de equipos

**Resultado esperado:**

- ✅ Solo aparecen cromos de jugadores de Argentina
- ✅ Listado de Messi (Argentina) aparece
- ✅ Cromos de Brasil, España, etc. NO aparecen

#### 3. Filtrar por múltiples equipos (si es posible)

Si el filtro permite selección múltiple:

Seleccionar: **Argentina + Brasil**

**Resultado esperado:**

- ✅ Aparecen cromos de Argentina O Brasil
- ✅ Otros equipos NO aparecen

---

### 🔍 Validaciones Técnicas

```sql
-- Filtrar por equipo "Argentina"
SELECT
    tl.id,
    tl.title,
    pm.player_name,
    pm.team
FROM trade_listings tl
JOIN panini_metadata pm ON pm.item_number = tl.item_number
WHERE tl.status = 'active'
  AND pm.team = 'Argentina'  -- Filtro por equipo
ORDER BY pm.player_name;
```

**Resultado esperado:**

- Todas las filas tienen `team = 'Argentina'`

**Contar cromos por equipo:**

```sql
-- Ver distribución de cromos por equipo
SELECT
    pm.team,
    COUNT(tl.id) AS cantidad_listados
FROM trade_listings tl
JOIN panini_metadata pm ON pm.item_number = tl.item_number
WHERE tl.status = 'active'
GROUP BY pm.team
ORDER BY cantidad_listados DESC;
```

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Filtro por equipo existe y funciona
2. ✅ Filtrar por "Argentina" muestra solo cromos de Argentina
3. ✅ SQL con `team = 'Argentina'` retorna solo argentinos
4. ✅ Resultados son precisos

---

## Caso CP-F03-03D: Mostrar sección de álbum en resultados

### 🎯 Objetivo

Verificar que los cromos muestran su sección del álbum Panini (ej: "Grupo A", "Fase Final", "Estrellas del Torneo").

### 📋 Preparación (Setup)

**Usuario:** Cualquier usuario

**Prerequisito:** Metadata debe incluir campo `section` o `album_section`

### 🧪 Pasos del Test

#### 1. Ver resultados del marketplace

1. Ir a **"Marketplace"**
2. Ver listados de cromos de Mundial Qatar 2022

#### 2. Verificar que aparece sección

Para cada cromo, buscar información de sección:

**Ejemplos de secciones esperadas:**

- ✅ "Grupo A - Qatar"
- ✅ "Grupo B - Inglaterra"
- ✅ "Grupo C - Argentina"
- ✅ "Estrellas del Torneo"
- ✅ "Fase Final - Semifinales"
- ✅ "Estadios"

**Dónde puede aparecer:**

- Badge pequeño: `[Grupo C]`
- Texto debajo del título: "Sección: Grupo C - Argentina"
- Icono con tooltip al pasar mouse

#### 3. Filtrar por sección (si existe filtro)

Si hay filtro de sección:

Seleccionar **"Estrellas del Torneo"**

**Resultado esperado:**

- ✅ Solo aparecen cromos de la sección "Estrellas"
- ✅ Cromos de grupos NO aparecen

---

### 🔍 Validaciones Técnicas

```sql
-- Ver secciones disponibles
SELECT DISTINCT
    pm.section,
    COUNT(tl.id) AS cantidad_listados
FROM trade_listings tl
JOIN panini_metadata pm ON pm.item_number = tl.item_number
WHERE tl.status = 'active'
GROUP BY pm.section
ORDER BY pm.section;
```

**Resultado esperado (ejemplo):**

| section | cantidad_listados |
|---------|-------------------|
| Grupo A | 5 |
| Grupo C - Argentina | 3 |
| Estrellas del Torneo | 2 |
| Estadios | 1 |

**Buscar cromo específico con sección:**

```sql
-- Ver sección del cromo de Messi
SELECT
    tl.title,
    pm.player_name,
    pm.team,
    pm.section
FROM trade_listings tl
JOIN panini_metadata pm ON pm.item_number = tl.item_number
WHERE pm.player_name LIKE '%Messi%'
  AND tl.status = 'active';
```

**Resultado esperado:**

| section |
|---------|
| Grupo C - Argentina (o similar) |

---

### 📊 Resultado del Test

Marca el test como **Passed** ✅ si:

1. ✅ Sección del álbum aparece en listados
2. ✅ Información de sección es correcta (Messi = Grupo C)
3. ✅ SQL muestra `section` NOT NULL para cromos Panini
4. ✅ Filtro por sección funciona (si existe)

Marca el test como **Blocked** 🚧 si:

- 🚧 Campo `section` no existe en metadata

---

## 📊 Resumen de Tests - Archivo 03

| Test ID | Nombre | Complejidad | Tiempo Est. | Estado |
|---------|--------|-------------|-------------|--------|
| CP-F03-03A | Ver metadata Panini | Media | 20 min | - |
| CP-F03-03B | Buscar por jugador | Media | 15 min | - |
| CP-F03-03C | Filtrar por equipo | Baja | 15 min | - |
| CP-F03-03D | Mostrar sección álbum | Baja | 15 min | - |

**Total:** ~1 hora 5 minutos

---

## ⚠️ Notas Importantes sobre Metadata

### Si metadata NO está disponible:

1. **NO marcar estos tests como Failed**
2. Marcar como **"Blocked"** en el spreadsheet
3. Añadir nota: "Bloqueado hasta integración de metadata Panini"
4. Reportar a David para priorización

### Estructura esperada de metadata Panini:

La tabla `panini_metadata` debería tener (aproximadamente):

```sql
-- Ejemplo de estructura esperada
CREATE TABLE panini_metadata (
    id UUID PRIMARY KEY,
    collection_id UUID REFERENCES collection_templates(id),
    item_number INTEGER,              -- Número del cromo
    player_name VARCHAR(255),          -- Nombre del jugador
    team VARCHAR(100),                 -- Equipo/Selección
    position VARCHAR(50),              -- Posición (Forward, Midfielder, etc.)
    card_number VARCHAR(20),           -- Número de camiseta
    section VARCHAR(100),              -- Sección del álbum
    rarity VARCHAR(50),                -- Rareza (common, rare, legendary)
    collection_year INTEGER,           -- Año de la colección
    image_url TEXT,                    -- URL de imagen oficial
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Fuentes de datos de Panini:

Si necesitas integrar metadata, posibles fuentes:

1. **API oficial de Panini** (si existe acceso)
2. **Web scraping** de sitios oficiales (verificar términos de uso)
3. **Datasets comunitarios** (Kaggle, GitHub)
4. **Entrada manual** para colecciones específicas

---

## ✅ Checklist Post-Tests

- [ ] Verifiqué si metadata de Panini está disponible
- [ ] Si está bloqueado, marqué como "Blocked" en CSV
- [ ] Si funciona, verifiqué precisión de datos (jugador = equipo correcto)
- [ ] Reporté a David estado de metadata para roadmap

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
