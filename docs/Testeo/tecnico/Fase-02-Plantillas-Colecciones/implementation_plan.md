# Plan de Ejecución de Tests Técnicos - Fase 02

## Objetivo
Ejecutar los 8 tests técnicos definidos en `docs/Testeo/tecnico/Fase-02-Plantillas-Colecciones/01_Tests_Tecnicos_Plantillas.md`, verificando la seguridad, integridad y funcionalidad de las plantillas y colecciones.

## Estado Actual y Bloqueos
1. **Usuarios de Test**: No existen en la base de datos.
   - `qa.plantillas@cromos.test`
   - `qa.coleccionista@cromos.test`
   - `qa.otro_usuario@cromos.test`
2. **Diferencias en Schema**: Los nombres de tablas en el documento de test difieren de la base de datos real.
   - `collection_copies` -> `user_template_copies`
   - `collection_items` -> `user_template_progress` (y `template_slots`)

## Plan de Trabajo

### 1. Preparación (Setup)
- **Asignación de Usuarios**:
  - **Usuario A (Autor/Coleccionista)**: `dsalva@gmail.com` (`a0e5335c-5fa9-48f9-a563-2923fdba8a3b`)
  - **Usuario B (Intruso/Otro)**: `qa.storage_a@cromos.test` (`6d2506aa-e625-4a57-9b8f-27340bf47d84`)
- **Adaptar Queries**: Ajustar las consultas SQL para usar los nombres de tabla reales:
  - `collection_templates` (Correcto)
  - `collection_copies` -> `user_template_copies`
  - `collection_items` -> `user_template_progress`
  - `template_ratings` (Correcto)

### 2. Ejecución de Tests (Uno a uno)
Se ejecutarán los siguientes tests en orden, documentando el resultado de cada uno.

#### [ ] CP-F02-01G: RLS - Solo autor puede modificar plantilla
- **Objetivo**: Verificar seguridad de edición.
- **Cambios**: Usar `collection_templates`. Usuario A crea, Usuario B intenta editar.

#### [ ] CP-F02-02F: Trigger de actualización de progreso
- **Objetivo**: Verificar cálculo automático de progreso.
- **Cambios**: Usar `user_template_progress` y `user_template_copies`.

#### [ ] CP-F02-02G: Cascada - Eliminar plantilla elimina copias
- **Objetivo**: Verificar integridad referencial.
- **Cambios**: Verificar borrado en `user_template_copies`.

#### [ ] CP-F02-02H: Constraint - Rating entre 1 y 5
- **Objetivo**: Validar rango de datos.
- **Cambios**: Usar `template_ratings`.

#### [ ] CP-F02-02I: Prevención de rating duplicado
- **Objetivo**: Validar unicidad.
- **Cambios**: Usar `template_ratings`.

#### [ ] CP-F02-03A: Performance - Listado de plantillas públicas
- **Objetivo**: Analizar rendimiento de query crítica.
- **Cambios**: Adaptar query de listado a schema actual.

#### [ ] CP-F02-03B: Constraint - total_items mayor a 0
- **Objetivo**: Validar datos de entrada.
- **Cambios**: Sin cambios mayores esperados.

#### [ ] CP-F02-03C: RLS - Plantillas privadas no visibles
- **Objetivo**: Verificar privacidad.
- **Cambios**: Usuario A crea privada, Usuario B intenta ver.

## Verificación
- Cada test tiene sus propios criterios de éxito definidos en el documento original.
- Se generará un reporte final con el estado de cada test (PASSED/FAILED) y observaciones.
