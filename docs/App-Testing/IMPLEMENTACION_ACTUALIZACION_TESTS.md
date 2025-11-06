# Implementación de Actualización de Tests - Guía Completa

## Resumen de Cambios Requeridos

Esta guía contiene todo lo necesario para actualizar la suite de pruebas según los requisitos solicitados, haciendo que los tests sean accesibles para usuarios no técnicos.

## 1. Hoja de Seguimiento de Tests Actualizada

### Tests que deben permanecer asignados a David (complejos)

| Fase    | Test                                           | Motivo                                                            |
| ------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Fase 02 | CP-F02-01E: Edición completa con nuevos campos | Requiere verificación de delete+insert en BD                      |
| Fase 02 | CP-F02-01F: Eliminación total de plantilla     | Requiere verificar is_deleted y template_deleted                  |
| Fase 02 | CP-F02-01G: Restricciones de autoría           | Requiere verificar políticas RLS complejas                        |
| Fase 03 | CP-F03-02A: Búsqueda y filtros avanzados       | Requiere verificar list_trade_listings_with_collection_filter RPC |
| Fase 03 | CP-F03-02F: Completar transacción              | Requiere verificar listing_transactions completed_at              |
| Fase 04 | CP-F04-01H: Integridad de datos en BD          | Requiere verificar registros huérfanos y sync_status              |
| Fase 05 | CP-F05-01A: Creación de propuesta              | Requiere verificar trade_proposals y trade_proposal_items         |
| Fase 06 | CP-F06-03A: Ignorar usuario                    | Requiere verificar ignored_users y RPC                            |
| Fase 06 | CP-F06-03D: Filtrado automático                | Requiere verificar list_trade_listings_filtered RPC               |
| Fase 07 | CP-F07-01B: Estadísticas principales           | Requiere verificar agregaciones complejas de BD                   |
| Fase 07 | CP-F07-01G: Reapertura o revisión posterior    | Requiere verificar reopen_report audit log                        |
| Fase 08 | CP-F08-01A: Registro y verificación            | Requiere verificar auth.users y profiles                          |
| Fase 09 | CP-F09-02C: Manejo de errores backend          | Requiere simular errores 500/timeout                              |
| Fase 10 | Todos los tests de badges                      | Requiere verificar user_badges y badge_definitions                |

### Tests que pueden reasignarse a testers regulares (simples)

| Fase    | Test                                        | Motivo                                      |
| ------- | ------------------------------------------- | ------------------------------------------- |
| Fase 01 | CP-F01-02A: Visualización de perfil propio  | Solo requiere SELECT simple                 |
| Fase 01 | CP-F01-02B: Edición de nickname y bio       | Solo requiere verificar updated_at          |
| Fase 01 | CP-F01-02C: Selección de avatar predefinido | Solo requiere verificar avatar_url          |
| Fase 02 | CP-F02-01A: Crear plantilla privada         | Solo requiere verificar is_public = false   |
| Fase 02 | CP-F02-01B: Validaciones de formulario      | Solo requiere verificar COUNT de duplicados |
| Fase 02 | CP-F02-01C: Publicar plantilla              | Solo requiere verificar is_public = true    |
| Fase 03 | CP-F03-02B: Vista de detalle                | Solo requiere verificar views_count         |
| Fase 03 | CP-F03-02I: Favoritos y seguimiento         | Solo requiere verificar favourites          |
| Fase 04 | CP-F04-01A: Publicar duplicado              | Solo requiere verificar copy_id y slot_id   |
| Fase 04 | CP-F04-01B: Sincronización en panel         | Solo requiere verificar sync_status         |
| Fase 05 | CP-F05-01B: Revisión de propuesta           | Verificación UI, sin consulta compleja      |
| Fase 06 | CP-F06-01A: Favoritos de listados           | Solo requiere verificar favourites          |
| Fase 06 | CP-F06-01B: Favorito desde detalle          | Solo requiere verificar favourites          |
| Fase 06 | CP-F06-01C: Favoritos de plantillas         | Solo requiere verificar favourites          |
| Fase 06 | CP-F06-01D: Seguir a un usuario             | Solo requiere verificar favourites          |
| Fase 08 | CP-F08-01B: Exploración de plantillas       | Verificación UI, sin consulta compleja      |
| Fase 09 | CP-F09-01A: Navegación por teclado          | Verificación UI, sin consulta compleja      |
| Fase 09 | CP-F09-03A: Smoke en navegadores            | Verificación UI, sin consulta compleja      |

## 2. Formato Estandarizado para Consultas SQL

### Plantilla a usar en todos los tests:

```sql
-- Consulta para verificar [descripción]
SELECT campo1, campo2, campo3
FROM nombre_tabla
WHERE condicion = 'valor_esperado';
```

**Instrucciones para ejecutar la consulta:**

1. Iniciar sesión en Supabase Dashboard: https://app.supabase.com
2. En el menú izquierdo, hacer clic en **"SQL Editor"**
3. Copiar la consulta anterior y pegarla en el editor
4. Reemplazar `{variable}` con el valor real de la prueba
5. Hacer clic en el botón **"Run"**
6. Verificar que el resultado coincida con lo esperado

**Resultado esperado:** El campo `campo1` debe mostrar `[valor esperado]`

## 3. Formato Estandarizado para Consola Chrome

### Plantilla a usar en todos los tests:

**Verificación en Chrome (consola):**

1. En la página donde realizaste la acción, hacer clic derecho y seleccionar **Inspeccionar**
2. En la ventana que se abre, hacer clic en la pestaña **Console**
3. [Instrucción específica según la prueba]
4. Verificar que [resultado esperado]

**Si hay errores:**

1. Tomar captura de pantalla del error
2. Copiar el mensaje de error (clic derecho → Copy message)
3. Reportar en el seguimiento de prueba

Para más ayuda sobre cómo ejecutar consultas SQL, ver: GUIA_DE_CONSULTAS_SQL.md
Para más ayuda sobre cómo usar la consola de Chrome, ver: GUIA_DE_CONSOLA_CHROME.md

## 4. Ejemplo Completo de Test Actualizado

### Ejemplo: CP-F02-01A: Crear plantilla privada con páginas y slots

**Caso CP-F02-01A: Crear plantilla privada con páginas y slots**
Cobertura: Flujo feliz; guardado incremental; estructura básica.
Pasos: 1. Iniciar sesión con `qa.creador@cromos.test`. 2. Navegar a `/templates/new` y completar título "Colección QA Liga 2025", descripción >120 caracteres y portada opcional. 3. Agregar dos páginas: - Página 1 "Equipo A" con 9 slots numerados 1-9. - Página 2 "Equipo B" con 6 slots; marcar slot 6 como especial. 4. Guardar como borrador (sin publicar).
Validaciones UI: - Botón "Guardar borrador" solo se habilita con campos obligatorios completos. - Toast "Plantilla guardada como borrador". - Resumen lateral muestra conteo correcto de páginas y slots.
Validación en Supabase (SQL):
`sql
    -- Consulta para verificar que la plantilla se creó como borrador
    SELECT title,
           is_public,
           is_deleted,
           pages_count,
           slots_count
    FROM collection_templates
    WHERE title = 'Colección QA Liga 2025';
    `
**Instrucciones para ejecutar la consulta:** 1. Iniciar sesión en Supabase Dashboard: https://app.supabase.com 2. En el menú izquierdo, hacer clic en **"SQL Editor"** 3. Copiar la consulta anterior y pegarla en el editor 4. Hacer clic en el botón **"Run"** 5. Verificar que el resultado muestra `is_public = false`, `pages_count = 2`, `slots_count = 15`

    ```sql
    -- Consulta para verificar las páginas y slots creados
    SELECT tp.page_name,
           ts.slot_number,
           ts.is_special
    FROM template_pages tp
    JOIN template_slots ts ON ts.page_id = tp.id
    WHERE tp.template_id = (
      SELECT id FROM collection_templates
      WHERE title = 'Colección QA Liga 2025'
      ORDER BY created_at DESC
      LIMIT 1
    )
    ORDER BY tp.page_order, ts.slot_number;
    ```
    **Instrucciones para ejecutar la consulta:**
    1. En el mismo SQL Editor, pegar esta segunda consulta
    2. Hacer clic en **"Run"**
    3. Verificar que aparecen las dos páginas y que el slot 6 marca `is_special = true`

**Resultado esperado:** La primera consulta debe mostrar `is_public = false`, `pages_count = 2`, `slots_count = 15`. La segunda debe mostrar las páginas creadas con sus slots.

Verificación en Chrome (consola):
**Verificación en Chrome (consola):** 1. En la vista de edición, hacer clic derecho y seleccionar **Inspeccionar** 2. En la ventana que se abre, hacer clic en la pestaña **Console** 3. Guardar el borrador y comprobar que no se registran errores en rojo 4. Verificar que aparecen mensajes de éxito como "Plantilla guardada como borrador"

    **Si hay errores:**
    1. Tomar captura de pantalla del error
    2. Copiar el mensaje de error (clic derecho → Copy message)
    3. Reportar en el seguimiento de prueba

    Para más ayuda sobre cómo ejecutar consultas SQL, ver: GUIA_DE_CONSULTAS_SQL.md
    Para más ayuda sobre cómo usar la consola de Chrome, ver: GUIA_DE_CONSOLA_CHROME.md

## 5. Proceso de Implementación

### Para el implementador:

1. **Actualizar Test_Tracking_Spreadsheet.csv**
   - Usar la lista de la sección 1 para mantener asignados a David los tests complejos
   - Reasignar a testers regulares los tests simples
   - Mantener el formato CSV existente

2. **Actualizar archivos de prueba fase por fase**
   - Seguir el formato del ejemplo completo de la sección 4
   - Asegurar que cada prueba que requiera consulta SQL incluya:
     - Bloque de código SQL con comentarios explicativos
     - Instrucciones paso a paso para Supabase Dashboard
     - Resultado esperado claramente definido
   - Asegurar que cada prueba que requiera verificación técnica incluya:
     - Instrucciones detalladas para Consola de Chrome
     - Pasos específicos según lo que se debe verificar
     - Qué hacer si hay errores
   - Agregar referencias a las guías de ayuda al final

3. **Verificar consistencia**
   - Revisar que todos los archivos mantengan el estilo y lenguaje español
   - Confirmar que las instrucciones sean claras y sin ambigüedad
   - Probar una muestra actualizada para validar el nuevo formato

## 6. Checklist de Verificación Final

- [ ] Test tracking spreadsheet actualizado con asignaciones correctas
- [ ] Todos los archivos de Fases 2-9 tienen consultas SQL detalladas
- [ ] Todos los archivos de Fases 2-9 tienen instrucciones de Consola Chrome
- [ ] Cada prueba incluye referencias a las guías de ayuda
- [ ] El lenguaje es consistente y en español
- [ ] Las instrucciones son lo suficientemente detalladas para usuarios no técnicos
- [ ] Se ha probado al menos un archivo actualizado como ejemplo

---

**Nota importante:** Esta guía debe seguirse exactamente para asegurar que los tests sean accesibles para usuarios no técnicos mientras se mantiene la validez técnica de las verificaciones.
