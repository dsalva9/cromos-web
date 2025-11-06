# Guía para Ejecutar Consultas SQL en Supabase Dashboard

Esta guía explica paso a paso cómo ejecutar las consultas de verificación que aparecen en los casos de prueba.

## Pasos para Ejecutar una Consulta SQL

1. **Iniciar sesión en Supabase**
   - Abrir el navegador e ir a: https://app.supabase.com
   - Iniciar sesión con las credenciales proporcionadas

2. **Navegar al Editor SQL**
   - En el menú lateral izquierdo, hacer clic en **"SQL Editor"**
   - Esperar a que cargue la interfaz del editor

3. **Pegar la Consulta**
   - Copiar la consulta SQL del caso de prueba (generalmente está en un bloque de código)
   - Pegar la consulta en el área de texto grande del editor

4. **Reemplazar Variables**
   - Buscar texto entre llaves como `{timestamp}` o `{user_id}`
   - Reemplazar con los valores específicos de tu prueba
   - Ejemplo: Si la consulta dice `'nuevo+{timestamp}@cromos.test'`, reemplazar con `'nuevo+1731234567@cromos.test'`

5. **Ejecutar la Consulta**
   - Hacer clic en el botón **"Run"** (generalmente verde o azul)
   - Esperar a que aparezcan los resultados en la parte inferior

6. **Verificar los Resultados**
   - Los resultados aparecen en formato de tabla
   - Comparar con lo que indica el caso de prueba
   - Buscar valores específicos como `confirmed_at no nulo` o `status = 'active'`

## Consejos Útiles

### Si la consulta falla:

- Verificar que no hay comillas o paréntesis faltantes
- Asegurarse de haber reemplazado todos los valores entre llaves {}
- Revisar que el nombre de las tablas esté escrito correctamente

### Para consultas con múltiples resultados:

- Los resultados aparecen en páginas si hay muchos registros
- Usar los controles de paginación en la parte inferior si es necesario

### Para consultas que devuelven un solo valor:

- El resultado aparece en una sola celda
- Generalmente es un número o un texto corto

## Consultas Comunes y Qué Significan

### Verificar si un usuario existe:

```sql
SELECT COUNT(*) AS total
FROM auth.users
WHERE email = 'usuario@ejemplo.com';
```

- **Resultado esperado**: `1` si existe, `0` si no existe

### Verificar estado de un registro:

```sql
SELECT status, created_at
FROM tabla
WHERE id = 123;
```

- **Resultado esperado**: El estado actual y fecha de creación

### Verificar si un campo se actualizó:

```sql
SELECT updated_at
FROM perfiles
WHERE id = 'uuid-usuario';
```

- **Resultado esperado**: Fecha reciente (últimos minutos)

## Glosario de Términos Técnicos

- **SQL**: Lenguaje de consulta para bases de datos
- **NULL**: Valor vacío o sin dato
- **UUID**: Identificador único de usuario (largo texto alfanumérico)
- **TIMESTAMP**: Fecha y hora exactas
- **COUNT(\*)**: Conteo total de registros

## Contacto de Soporte

Si tienes problemas ejecutando una consulta:

1. Tomar captura de pantalla del error
2. Anotar qué consulta estabas ejecutando
3. Contactar al responsable de QA con esta información

---

**Nota**: Esta guía está diseñada para usuarios sin experiencia técnica. Sigue los pasos exactamente como se indican.
