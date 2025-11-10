# Guía Completa de Consultas SQL para Testers No Técnicos

## 📖 ¿Qué es esta guía?

Esta guía te enseñará paso a paso cómo ejecutar consultas SQL en Supabase Dashboard para verificar que los tests funcionan correctamente. **No necesitas experiencia previa en programación o bases de datos.**

## 🎯 ¿Qué es SQL?

**SQL** (Se pronuncia "ese-cu-el") es un lenguaje para **buscar** y **leer** información guardada en bases de datos.

**Analogía:** Imagina una biblioteca gigante:
- Los **libros** son tus datos (usuarios, cromos, colecciones)
- Los **estantes** son las tablas (profiles, trade_listings, collection_templates)
- **SQL** es como pedirle al bibliotecario: *"Tráeme todos los libros de terror escritos en 2023"*

## 🗄️ ¿Qué es una Base de Datos?

Una base de datos es como una **hoja de cálculo gigante de Excel**, pero mucho más poderosa.

**Ejemplo visual:**

Imagina una tabla llamada `profiles` (perfiles de usuarios):

| id | nickname | email | created_at |
|----|----------|-------|------------|
| 1 | Mario82 | mario@test.com | 2025-01-15 |
| 2 | LuisC | luis@test.com | 2025-01-16 |
| 3 | Ana_M | ana@test.com | 2025-01-17 |

Cada **fila** es un usuario diferente.
Cada **columna** es un dato sobre ese usuario (nombre, email, etc.).

## ☁️ ¿Qué es Supabase Dashboard?

**Supabase** es la plataforma donde está guardada toda la información de CambioCromos.
El **Dashboard** (tablero) es el sitio web donde podemos ver y consultar esa información.

**Es como:** El panel de control de un administrador, pero solo vamos a **leer** datos, nunca los vamos a modificar o borrar.

---

## 🚀 Paso 1: Acceder a Supabase Dashboard

### 1.1. Abrir el navegador

1. Abre **Google Chrome** (recomendado)
2. Ve a: **https://app.supabase.com**

### 1.2. Iniciar sesión

**Si es tu primera vez:**
- Contacta a David para obtener las credenciales del equipo de testing
- Guárdalas en un lugar seguro (gestor de contraseñas)

**Credenciales típicas:**
- Email: `[David te proporcionará]`
- Contraseña: `[David te proporcionará]`

### 1.3. Seleccionar el proyecto

1. Después de iniciar sesión, verás una lista de proyectos
2. Buscar el proyecto que se llama: **cromos-web** o **cambio-cromos**
3. Hacer clic sobre él

**¿No ves el proyecto?**
- Asegúrate de que David te haya dado acceso
- Verifica que iniciaste sesión con el email correcto

---

## 📝 Paso 2: Ir al SQL Editor (Editor SQL)

### 2.1. Navegación en el menú

En el lado izquierdo de la pantalla, verás un menú vertical con varios íconos.

**Busca el ícono que parece:** `</>`  (dos símbolos de mayor/menor que)

**Nombre del botón:** "SQL Editor" o "Editor SQL"

### 2.2. Hacer clic en SQL Editor

1. Clic en el ícono `</>`
2. Se abre una pantalla nueva con:
   - Un cuadro blanco grande arriba (aquí escribes las consultas)
   - Un área de resultados abajo (aquí aparecen las respuestas)

**Así se ve:**
```
┌─────────────────────────────────────┐
│  [Cuadro blanco para escribir SQL]  │  ← Aquí pegas las consultas
│                                     │
└─────────────────────────────────────┘
         [Botón "Run" verde]            ← Aquí ejecutas
┌─────────────────────────────────────┐
│  [Área de resultados - tabla]       │  ← Aquí ves los resultados
└─────────────────────────────────────┘
```

---

## 🔍 Paso 3: Anatomía de una Consulta SQL

Vamos a aprender qué significa cada parte de una consulta SQL.

### 3.1. La consulta más simple

```sql
SELECT email
FROM profiles
WHERE id = 1;
```

**Traducción al español:**
> "Dame el email de la tabla profiles donde el id sea igual a 1"

### 3.2. Desglose línea por línea

```sql
SELECT email           -- 📌 ¿QUÉ quiero ver? → El email
FROM profiles          -- 📌 ¿DE DÓNDE lo saco? → De la tabla profiles
WHERE id = 1;          -- 📌 ¿CON QUÉ FILTRO? → Solo donde el id sea 1
```

**Importante:** Los textos que empiezan con `--` son **comentarios** (notas explicativas). La computadora los ignora.

### 3.3. Consulta con múltiples campos

```sql
SELECT
    nickname,           -- Quiero ver el nickname
    email,              -- Y también el email
    created_at          -- Y la fecha de creación
FROM profiles
WHERE email = 'test@example.com';
```

**Traducción:**
> "Dame el nickname, email y fecha de creación de la tabla profiles donde el email sea test@example.com"

### 3.4. Partes importantes de una consulta

| Palabra clave | ¿Qué hace? | Ejemplo |
|---------------|------------|---------|
| `SELECT` | Define QUÉ campos quieres ver | `SELECT email, nickname` |
| `FROM` | Define DE QUÉ TABLA sacas los datos | `FROM profiles` |
| `WHERE` | Define el FILTRO para buscar | `WHERE id = 5` |
| `;` | Marca el FIN de la consulta | Siempre al final |

---

## ✏️ Paso 4: Copiar y Pegar una Consulta

### 4.1. Desde el documento de test

Cuando estés ejecutando un test, verás algo como esto en el documento:

````markdown
**Validación en Supabase (SQL):**

```sql
-- Consulta para verificar que el usuario se creó
SELECT
    email,
    confirmed_at,
    nickname
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE email = '{TU_EMAIL_AQUI}';
```
````

### 4.2. Seleccionar y copiar

1. **Seleccionar todo el código SQL:**
   - Haz clic al inicio de `SELECT`
   - Mantén presionado y arrastra hasta el `;` final
   - O usa: `Ctrl + A` para seleccionar todo dentro del bloque

2. **Copiar:**
   - `Ctrl + C` (Windows)
   - `Cmd + C` (Mac)

### 4.3. Pegar en Supabase

1. Haz clic en el cuadro blanco del SQL Editor
2. Pega con:
   - `Ctrl + V` (Windows)
   - `Cmd + V` (Mac)

**Verás:** El código SQL aparece en el editor

---

## 🔄 Paso 5: Reemplazar Variables

Muchas consultas tienen **variables** que debes reemplazar con valores reales.

### 5.1. Identificar las variables

Las variables suelen verse así:
- `{TU_EMAIL_AQUI}`
- `{ID_DEL_LISTADO}`
- `{TIMESTAMP}`
- `'REEMPLAZAR_CON_TU_VALOR'`

**Ejemplo de consulta con variable:**
```sql
SELECT title, is_public
FROM collection_templates
WHERE title = '{NOMBRE_DE_TU_PLANTILLA}';
```

### 5.2. Cómo reemplazar paso a paso

**Antes:**
```sql
WHERE title = '{NOMBRE_DE_TU_PLANTILLA}';
```

**Pasos:**
1. Busca el texto `{NOMBRE_DE_TU_PLANTILLA}`
2. Selecciónalo (solo esa parte, **manteniendo las comillas `'`**)
3. Bórralo
4. Escribe el valor real que usaste en tu test

**Ejemplo:** Si creaste una plantilla llamada "Álbum Mundial 2026"

**Después:**
```sql
WHERE title = 'Álbum Mundial 2026';
```

### 5.3. Reglas importantes

✅ **SI el valor es texto (palabras):** Usar comillas simples `'así'`
```sql
WHERE email = 'test@example.com'   ✅ Correcto
WHERE email = test@example.com     ❌ Incorrecto
```

✅ **SI el valor es un número:** NO usar comillas
```sql
WHERE id = 5          ✅ Correcto
WHERE id = '5'        ⚠️ Funciona, pero no es lo ideal
```

✅ **SI el valor es una fecha:** Usar comillas simples
```sql
WHERE created_at > '2025-01-01'    ✅ Correcto
```

### 5.4. Ejemplo completo

**Original (con variable):**
```sql
SELECT COUNT(*) AS total
FROM trade_listings
WHERE user_id = (
    SELECT id FROM auth.users
    WHERE email = '{TU_EMAIL}'
);
```

**Reemplazado (valor real):**
```sql
SELECT COUNT(*) AS total
FROM trade_listings
WHERE user_id = (
    SELECT id FROM auth.users
    WHERE email = 'tester@cromos.test'
);
```

---

## ▶️ Paso 6: Ejecutar la Consulta

### 6.1. Revisar antes de ejecutar

**Checklist:**
- ✅ ¿Copié toda la consulta completa?
- ✅ ¿Reemplacé todas las variables `{...}`?
- ✅ ¿Las comillas simples están bien puestas?
- ✅ ¿Hay un punto y coma `;` al final?

### 6.2. Hacer clic en "Run"

1. Busca el botón verde que dice **"Run"** o **"Ejecutar"**
2. Haz clic
3. Espera 1-3 segundos

**¿Qué pasa ahora?**
- Supabase busca los datos en la base de datos
- Los resultados aparecen abajo en forma de tabla

### 6.3. Si hay error

**Si ves un mensaje rojo:**
```
ERROR: syntax error at or near "..."
```

**Causas comunes:**
1. Falta el `;` al final
2. Olvidaste reemplazar una variable `{...}`
3. Comillas mal puestas (`"` en lugar de `'`)
4. Copiaste mal (falta alguna palabra)

**Solución:**
1. Lee el mensaje de error (a veces dice dónde está el problema)
2. Revisa el checklist anterior
3. Copia de nuevo desde el documento original
4. Si sigue sin funcionar, contacta a David

---

## 📊 Paso 7: Leer los Resultados

### 7.1. Tabla de resultados

Cuando la consulta funciona, verás una tabla como esta:

```
┌─────┬────────────┬─────────────────────┬────────────┐
│ id  │ nickname   │ email               │ created_at │
├─────┼────────────┼─────────────────────┼────────────┤
│ 15  │ MarioTest  │ mario@test.com      │ 2025-01-15 │
└─────┴────────────┴─────────────────────┴────────────┘

1 row returned
```

**Elementos clave:**
- **Encabezados (fila superior):** Nombres de los campos (`id`, `nickname`, etc.)
- **Datos (filas debajo):** Los valores encontrados
- **Pie de página:** Cuántas filas se encontraron (`1 row returned`)

### 7.2. Interpretando los resultados

**Ejemplo 1: Se encontró 1 fila**
```
1 row returned
```
✅ Significa: Se encontró exactamente 1 resultado (generalmente es lo que esperamos)

**Ejemplo 2: Se encontraron 0 filas**
```
0 rows returned
```
⚠️ Significa: No se encontró nada con ese filtro
- Puede ser normal (si estamos verificando que algo NO existe)
- O puede ser un error (si esperábamos encontrar algo)

**Ejemplo 3: Se encontraron muchas filas**
```
45 rows returned
```
✅ o ❌ Depende de qué estés buscando
- Si buscabas "todos los usuarios" → Normal
- Si buscabas "un usuario específico" → Problema (debería ser 1)

### 7.3. Verificar valores específicos

**El documento del test dirá qué esperar:**

```markdown
**Resultado esperado:**
- La consulta debe devolver exactamente 1 fila
- El campo `is_public` debe ser `false`
- El campo `pages_count` debe ser `2`
```

**Cómo verificar:**
1. Cuenta las filas en la tabla (debe ser 1)
2. Busca la columna `is_public` → Debe decir `false` (o `f`)
3. Busca la columna `pages_count` → Debe decir `2`

### 7.4. Valores especiales

| Valor | ¿Qué significa? |
|-------|-----------------|
| `null` | Vacío / sin valor |
| `true` o `t` | Verdadero (sí) |
| `false` o `f` | Falso (no) |
| `2025-01-15 10:30:00` | Fecha y hora |
| `0` | Número cero |

---

## 📋 Paso 8: Anotar el Resultado

### 8.1. Abrir el Test Tracking Spreadsheet

1. Abre el archivo `Test_Tracking_Spreadsheet.csv`
2. Busca la fila del test que estás ejecutando (por ejemplo: `CP-F01-02`)

### 8.2. Actualizar el estado

**Si todo salió bien:**
- Columna `Estado`: Cambiar de `Not Started` a `Passed`
- Columna `Notas`: Dejar vacío o escribir "OK"

**Si hubo problemas:**
- Columna `Estado`: Cambiar a `Failed`
- Columna `Notas`: Describir qué pasó
  - Ejemplo: "Esperaba 1 fila, encontré 0"
  - Ejemplo: "Campo is_public debía ser false, pero es true"

### 8.3. Guardar capturas (opcional)

Si encuentras un error:
1. Presiona `Win + Shift + S` (Windows) o `Cmd + Shift + 4` (Mac)
2. Selecciona el área de la tabla de resultados
3. Guarda como: `CP-FXX-YY_resultado.png`

---

## 🆘 Paso 9: Errores Comunes y Soluciones

### Error 1: "relation does not exist"

```
ERROR: relation "profiles" does not exist
```

**Significa:** La tabla no existe (mal escrita)

**Solución:**
- Revisa que el nombre de la tabla esté bien escrito
- Algunas tablas tienen prefijo: `auth.users` (no solo `users`)

### Error 2: "column does not exist"

```
ERROR: column "nikname" does not exist
```

**Significa:** El campo no existe (mal escrito)

**Solución:**
- Revisa la ortografía: `nikname` → `nickname`

### Error 3: "syntax error"

```
ERROR: syntax error at or near "WHERE"
```

**Significa:** Falta algo en la consulta

**Solución:**
- Revisa que no falte un `;`
- Revisa que las comillas estén bien: `'` no `"`
- Copia de nuevo desde el documento original

### Error 4: "unterminated quoted string"

```
ERROR: unterminated quoted string at or near "'test@example.com"
```

**Significa:** Falta una comilla de cierre `'`

**Solución:**
- Busca comillas que no estén cerradas
- Ejemplo mal: `'test@example.com`
- Ejemplo bien: `'test@example.com'`

### Error 5: No aparece el botón "Run"

**Solución:**
- Refresca la página (F5)
- Cierra sesión y vuelve a entrar
- Prueba en modo incógnito
- Contacta a David si persiste

---

## 📚 Glosario de Términos SQL

| Término | Significado Simple | Ejemplo |
|---------|-------------------|---------|
| **SELECT** | "Dame estos campos" | `SELECT email` |
| **FROM** | "De esta tabla" | `FROM profiles` |
| **WHERE** | "Que cumplan esta condición" | `WHERE id = 5` |
| **JOIN** | "Combina dos tablas" | Avanzado - consultar guía técnica |
| **COUNT(*)** | "Cuenta cuántas filas" | `SELECT COUNT(*)` |
| **AS** | "Dale un nombre diferente" | `COUNT(*) AS total` |
| **ORDER BY** | "Ordena por este campo" | `ORDER BY created_at` |
| **LIMIT** | "Muestra solo las primeras X" | `LIMIT 10` |
| **IS NULL** | "Que esté vacío" | `WHERE email IS NULL` |
| **IS NOT NULL** | "Que NO esté vacío" | `WHERE email IS NOT NULL` |
| **AND** | "Y también" | `WHERE id = 5 AND is_public = true` |
| **OR** | "O también" | `WHERE email = 'a@test.com' OR email = 'b@test.com'` |

---

## 🎓 Ejercicios Prácticos

### Ejercicio 1: Consulta Simple

**Objetivo:** Buscar tu propio usuario en la base de datos

```sql
SELECT email, nickname, created_at
FROM profiles
WHERE email = 'TU_EMAIL_AQUI';
```

**Instrucciones:**
1. Copia esta consulta en el SQL Editor
2. Reemplaza `'TU_EMAIL_AQUI'` con tu email real (entre comillas)
3. Ejecuta con "Run"
4. Deberías ver 1 fila con tus datos

**Resultado esperado:** 1 fila con tu email, nickname y fecha de creación

---

### Ejercicio 2: Contar Registros

**Objetivo:** Contar cuántos usuarios hay en total

```sql
SELECT COUNT(*) AS total_usuarios
FROM profiles;
```

**Instrucciones:**
1. Copia y ejecuta
2. Verás una tabla con 1 fila y 1 columna llamada `total_usuarios`
3. El número que aparece es el total de usuarios en la app

**Resultado esperado:** Un número mayor a 0 (por ejemplo, 147)

---

### Ejercicio 3: Filtrar por Fecha

**Objetivo:** Buscar usuarios creados hoy

```sql
SELECT email, nickname, created_at
FROM profiles
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

**Instrucciones:**
1. Copia y ejecuta
2. Verás todos los usuarios creados hoy
3. Están ordenados del más reciente al más antiguo (`DESC` = descendente)

**Resultado esperado:** 0 o más filas, dependiendo de cuántos usuarios se registraron hoy

---

## 🔗 Recursos Adicionales

### ¿Dónde obtener ayuda?

1. **Esta guía:** Vuelve a leer las secciones relevantes
2. **Guía de Consola Chrome:** `GUIA_DE_CONSOLA_CHROME.md`
3. **David (Slack):** Canal `#testing` para preguntas técnicas
4. **Documentación Supabase:** https://supabase.com/docs (nivel avanzado)

### Próximos pasos

Una vez que domines esta guía:
- Podrás ejecutar todos los tests no técnicos de forma independiente
- Entenderás qué significan los resultados de las consultas
- Sabrás reportar errores de forma precisa

---

## ✅ Checklist: ¿Listo para empezar?

Antes de ejecutar tu primer test, asegúrate de poder hacer esto:

- [ ] Puedo acceder a https://app.supabase.com
- [ ] Puedo iniciar sesión con las credenciales del equipo
- [ ] Puedo abrir el SQL Editor (ícono `</>`)
- [ ] Entiendo qué significa `SELECT`, `FROM`, `WHERE`
- [ ] Puedo copiar y pegar una consulta
- [ ] Sé cómo reemplazar variables `{...}` con valores reales
- [ ] Sé cómo hacer clic en "Run" y leer los resultados
- [ ] Sé dónde anotar si el test pasó o falló

**Si marcaste todas las casillas:** ¡Estás listo para empezar a testear! 🎉

**Si te falta alguna:** Vuelve a leer esa sección o contacta a David.

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Autor:** Equipo CambioCromos
**Contacto:** David (Slack #testing)
