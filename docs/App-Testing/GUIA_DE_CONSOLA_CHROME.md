# Guía para Usar la Consola de Chrome

Esta guía explica paso a paso cómo acceder y usar la Consola de Chrome para las verificaciones técnicas que aparecen en los casos de prueba.

## Pasos para Abrir la Consola de Chrome

### Método 1: Atajos de Teclado (Recomendado)

1. En la página web que quieres verificar, presionar **F12** en Windows/Linux
2. En Mac, presionar **Cmd + Opt + J**
3. La Consola se abrirá automáticamente

### Método 2: Menú del Navegador

1. Hacer clic derecho en cualquier parte de la página
2. Seleccionar **"Inspeccionar"** o **"Inspeccionar elemento"**
3. En la ventana que se abre, hacer clic en la pestaña **"Console"**

### Método 3: Menú de Chrome

1. Hacer clic en los tres puntos (⋮) en la esquina superior derecha
2. Seleccionar **"Más herramientas"** → **"Herramientas para desarrolladores"**
3. Hacer clic en la pestaña **"Console"**

## Navegación Básica en la Consola

### Cambiar entre Pestañas

- **Elements**: Para ver y editar HTML/CSS
- **Console**: Para ver errores y ejecutar comandos (la que usaremos más)
- **Network**: Para ver peticiones de red
- **Application**: Para ver almacenamiento local y cookies

### Limpiar la Consola

- Hacer clic en el ícono de **🚫** (borrar consola)
- Presionar **Ctrl + L** (Windows/Linux) o **Cmd + L** (Mac)

## Verificaciones Comunes en Pruebas

### 1. Verificar Errores

```javascript
// Los errores aparecen en rojo con un ícono ⚠️ o ❌
// Buscar textos como:
// - "Failed to load resource"
// - "TypeError: ..."
// - "NetworkError: ..."
```

### 2. Verificar Peticiones de Red

1. Cambiar a la pestaña **"Network"**
2. Realizar la acción en la web (ej. hacer clic en un botón)
3. Buscar la petición en la lista
4. Hacer clic en ella para ver detalles:
   - **Status**: Debe ser 200 (éxito) o 201 (creado)
   - **Response**: Debe contener los datos esperados

### 3. Verificar Tokens de Autenticación

```javascript
// En la pestaña Application → Local Storage
// Buscar clave: supabase.auth.token
// Verificar que exista y no esté expirado
```

### 4. Verificar Estado de la Aplicación

```javascript
// Ejecutar en la consola para verificar estado:
console.log('Usuario actual:', await supabaseClient.auth.getUser());
console.log('Sesión activa:', await supabaseClient.auth.getSession());
```

## Capturar Errores para Reporte

### Método 1: Captura de Pantalla

1. Presionar **PrtScn** (Windows) o **Cmd + Shift + 4** (Mac)
2. La consola debe ser visible en la captura

### Método 2: Copiar Mensaje de Error

1. Hacer clic derecho sobre el error en la consola
2. Seleccionar **"Copy message"** o **"Copiar mensaje"**
3. Pegar en el informe de prueba

### Método 3: Exportar Log Completo

1. Hacer clic derecho en cualquier parte de la consola
2. Seleccionar **"Save as..."** o **"Guardar como..."**
3. Guardar como archivo .log para adjuntar al informe

## Problemas Comunes y Soluciones

### "La consola no abre"

- Asegurarse de no estar en modo incógnito si el sitio lo bloquea
- Verificar que Chrome esté actualizado

### "No veo los errores"

- Hacer clic en el filtro **"Default levels"** y seleccionar **"Verbose"**
- Verificar que no haya filtros activos

### "Los comandos no funcionan"

- Asegurarse de estar en la pestaña correcta (**Console**)
- Verificar que no haya errores de sintaxis en el comando

## Atajos Útiles

| Acción                              | Windows/Linux | Mac           |
| ----------------------------------- | ------------- | ------------- |
| Abrir herramientas de desarrollador | F12           | Cmd + Opt + J |
| Limpiar consola                     | Ctrl + L      | Cmd + L       |
| Búsqueda en consola                 | Ctrl + F      | Cmd + F       |
| Maximizar/minimizar consola         | Ctrl + `      | Cmd + `       |

## Glosario de Términos

- **Consola**: Herramienta para ver errores y ejecutar código JavaScript
- **Red**: Peticiones entre el navegador y el servidor
- **Token**: Clave de autenticación que mantiene la sesión activa
- **LocalStorage**: Almacenamiento en el navegador que persiste entre sesiones
- **Error 404**: Recurso no encontrado
- **Error 500**: Error interno del servidor

---

**Nota**: Esta guía está diseñada para usuarios sin experiencia técnica. Sigue los pasos exactamente como se indican.
