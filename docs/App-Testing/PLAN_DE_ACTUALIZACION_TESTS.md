# Plan de Actualización de Tests para Usuarios No Técnicos

## Objetivo

Actualizar todos los casos de prueba en las Fases 2-9 para que puedan ser ejecutados por usuarios no técnicos, proporcionando instrucciones detalladas para:

1. Consultas SQL en Supabase Dashboard
2. Uso de la Consola de Chrome
3. Reasignar pruebas apropiadas del test tracking spreadsheet de David a testers regulares

## Cambios Requeridos

### 1. Formato de Consultas SQL

Cada prueba que requiera verificación en base de datos debe incluir:

#### Bloque de Consulta SQL

```sql
-- Consulta para verificar [qué se está verificando]
SELECT campo1, campo2
FROM tabla
WHERE condicion = 'valor';
```

#### Instrucciones Detalladas

**Instrucciones para ejecutar la consulta:**

1. Abrir Supabase Dashboard: https://app.supabase.com
2. Ir a SQL Editor (menú izquierdo)
3. Copiar y pegar la consulta anterior
4. Reemplazar `{variable}` con el valor real de la prueba
5. Hacer clic en "Run"
6. Verificar que el resultado coincida con lo esperado

**Resultado esperado:** El campo `campo1` debe mostrar `[valor esperado]`

### 2. Instrucciones de Consola Chrome

Cada prueba que requiera verificación técnica debe incluir:

#### Pasos Detallados

**Verificación en Chrome (consola):**

1. En la página a probar, hacer clic derecho y seleccionar **Inspeccionar**
2. En la ventana que se abre, hacer clic en la pestaña **Console**
3. [Instrucción específica según la prueba]
4. Verificar que [resultado esperado]

**Si hay errores:**

1. Tomar captura de pantalla del error
2. Copiar el mensaje de error (clic derecho → Copy message)
3. Reportar en el seguimiento de prueba

### 3. Referencias a Guías

Al final de cada archivo de prueba, agregar:

```
Para más ayuda sobre cómo ejecutar consultas SQL, ver: GUIA_DE_CONSULTAS_SQL.md
Para más ayuda sobre cómo usar la consola de Chrome, ver: GUIA_DE_CONSOLA_CHROME.md
```

## Tests que Deben Asignarse a David (Complejos)

Solo mantener asignados a David los tests que requieran:

1. Múltiples consultas complejas con JOINs
2. Verificación de triggers o funciones complejas de base de datos
3. Análisis de rendimiento con EXPLAIN ANALYZE
4. Verificación de políticas RLS complejas
5. Tests que requieran acceso administrativo avanzado

## Tests que Pueden Asignarse a Testers Regulares

Reasignar a testers regulares los tests que involucren:

1. Consultas SELECT simples en una sola tabla
2. Verificación de conteos (COUNT(\*))
3. Verificación de estados (status = 'active')
4. Verificación de fechas (created_at, updated_at)
5. Verificación de existencia de registros

## Ejemplo de Actualización de Test

### ANTES (Formato actual):

```
Validación en Supabase (SQL):
SELECT COUNT(*) FROM tabla WHERE condicion;
```

### DESPUÉS (Formato actualizado):

````
Validación en Supabase (SQL):
```sql
SELECT COUNT(*) AS total_registros
FROM tabla
WHERE condicion = 'valor_esperado';
````

**Instrucciones para ejecutar la consulta:**

1. Iniciar sesión en Supabase Dashboard: https://app.supabase.com
2. En el menú izquierdo, hacer clic en **"SQL Editor"**
3. Copiar la consulta anterior y pegarla en el editor
4. Reemplazar `'valor_esperado'` con el valor real usado en la prueba
5. Hacer clic en el botón **"Run"**
6. Verificar que el resultado muestre el número esperado de registros

**Resultado esperado:** La consulta debe devolver un número mayor a 0 si el registro existe

Verificación en Chrome (consola):

1. En la página donde realizaste la acción, hacer clic derecho y seleccionar **Inspeccionar**
2. En la ventana de herramientas, hacer clic en la pestaña **Console**
3. Buscar cualquier mensaje de error en rojo
4. Si no hay errores, la prueba se considera exitosa desde el lado técnico

Para más ayuda sobre cómo ejecutar consultas SQL, ver: GUIA_DE_CONSULTAS_SQL.md
Para más ayuda sobre cómo usar la consola de Chrome, ver: GUIA_DE_CONSOLA_CHROME.md

```

## Archivos a Actualizar

### Fase 2 - Plantillas y Colecciones
- 01_Plantillas_Creacion_Edicion.txt
- 02_Copias_Progreso_Ratings.txt

### Fase 3 - Marketplace
- 01_Listados_Publicacion_Gestion.txt
- 02_Exploracion_Chat_Transacciones.txt
- 03_Metadata_Panini.txt

### Fase 4 - Integración
- 01_Puente_Plantillas_Marketplace.txt

### Fase 5 - Intercambios
- 01_Propuestas_Intercambio.txt
- 02_Chat_Finalizacion_Notificaciones.txt

### Fase 6 - Social y Notificaciones
- 01_Favoritos_Perfiles_Publicos.txt
- 02_Ratings_Usuarios_Reportes_Notificaciones.txt
- 03_Sistema_Ignorar_Usuarios.txt

### Fase 7 - Administración
- 01_Moderacion_Dashboard_Reportes.txt
- 02_Admin_Listados_Plantillas.txt
- 03_Usuarios_Auditoria_Purgas.txt

### Fase 8 - End-to-End
- 01_Flujo_Onboarding_a_Coleccion.txt
- 02_Flujo_Duplicados_a_Venta.txt
- 03_Flujo_Trade_a_Reputacion.txt

### Fase 9 - Calidad Transversal
- 01_Accesibilidad_UI.txt
- 02_Rendimiento_Resiliencia.txt
- 03_Compatibilidad_Dispositivos.txt

### Fase 10 - Badges
- TEST-badges-system.md

## Hoja de Ruta para Actualización

1. Actualizar Test_Tracking_Spreadsheet.csv primero (reasignar tests)
2. Actualizar los archivos de prueba fase por fase
3. Verificar consistencia en formato y lenguaje
4. Probar una muestra de los casos actualizados para validar el nuevo formato

## Criterios de Calidad

- Todas las consultas SQL tienen instrucciones paso a paso
- Todas las verificaciones de consola tienen instrucciones detalladas
- El lenguaje es consistente y en español
- Se incluyen referencias a las guías de ayuda
- Las asignaciones en el spreadsheet son correctas según complejidad

---
**Nota:** Este plan debe ejecutarse completamente antes de considerar la tarea finalizada.
```
