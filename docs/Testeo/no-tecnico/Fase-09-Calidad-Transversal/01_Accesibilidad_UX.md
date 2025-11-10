# Tests No-Técnicos - Fase 09: Accesibilidad y UX

## 📋 Información General

**Fase:** Fase-09
**Categoría:** Calidad Transversal - Accesibilidad, Responsive, UX
**Archivo:** 01_Accesibilidad_UX.md
**Cantidad de tests:** 6 casos de prueba
**Tiempo estimado total:** ~3 horas

---

## 🎯 Objetivo de Este Archivo

Tests de calidad transversal que verifican la experiencia de usuario:

1. ✅ Accesibilidad con lector de pantalla
2. ✅ Navegación por teclado
3. ✅ Diseño responsive (móvil, tablet, desktop)
4. ✅ Contraste y legibilidad
5. ✅ Tiempos de carga y performance percibida
6. ✅ Manejo de errores y feedback al usuario

---

## Caso CP-F09-Q01: Accesibilidad con lector de pantalla

### 🎯 Objetivo

Verificar que la aplicación es usable con tecnologías de asistencia (lectores de pantalla).

### 📋 Preparación

**Herramientas necesarias:**
- **Windows:** NVDA (gratuito) - https://www.nvaccess.org/download/
- **Mac:** VoiceOver (integrado en macOS)
- **Chrome:** ChromeVox (extensión)

### 🧪 Pasos del Test

**PASO 1: Activar lector de pantalla (5 minutos)**

**Para NVDA (Windows):**
1. Descargar e instalar NVDA
2. Iniciar NVDA
3. Escuchar mensaje de bienvenida
4. Abrir navegador

**Para VoiceOver (Mac):**
1. Presionar `Cmd + F5` para activar VoiceOver
2. Escuchar introducción
3. Abrir Safari o Chrome

**PASO 2: Navegar a la página de login (5 minutos)**

1. Ir a `https://cromos.com/login`
2. Escuchar lo que anuncia el lector:

**Debe anunciar:**
- ✅ "Página de inicio de sesión"
- ✅ "Email, campo de texto"
- ✅ "Contraseña, campo de texto, protegido"
- ✅ "Iniciar sesión, botón"

**NO debe:**
- ❌ Leer solo "input" o "button" sin contexto
- ❌ Silencio total (falta de labels)

**PASO 3: Completar formulario con teclado (10 minutos)**

3. Usar `Tab` para navegar entre campos
4. Escribir email y contraseña
5. Presionar `Enter` o `Tab` hasta botón "Iniciar sesión"
6. Activar botón con `Enter` o `Espacio`

**Verificar:**
- ✅ Todos los campos son anunciados correctamente
- ✅ Mensajes de error se leen en voz alta
- ✅ Focus visible en cada elemento

**PASO 4: Navegar marketplace (10 minutos)**

7. Ir a página de marketplace
8. Usar `Tab` para navegar por listados

**Debe anunciar cada listado:**
- ✅ "Messi 2022, Panini, 50 euros, estado excelente"
- ✅ "Ver detalles, botón"
- ✅ "Contactar vendedor, botón"

**PASO 5: Formulario de crear listado (10 minutos)**

9. Ir a formulario de crear listado
10. Navegar con `Tab` por todos los campos

**Verificar que anuncia:**
- ✅ "Título del listado, campo de texto"
- ✅ "Precio, campo numérico, en euros"
- ✅ "Estado del cromo, lista desplegable"
- ✅ "Subir imágenes, botón"

**PASO 6: Usar landmarks y encabezados (5 minutos)**

11. Usar atajos del lector de pantalla:
    - **NVDA:** `Insert + F7` (lista de landmarks y encabezados)
    - **VoiceOver:** `VO + U` (rotor de navegación)

**Debe mostrar estructura:**
```
Navigation
  - Home
  - Marketplace
  - Mis plantillas
  - Perfil

Main
  Heading 1: Marketplace
  Heading 2: Filtros
  Heading 2: Resultados

Footer
  - Términos de servicio
  - Privacidad
```

**Verificar:**
- ✅ Landmarks semánticos (nav, main, footer)
- ✅ Jerarquía de encabezados correcta (H1 → H2 → H3)

### 🔍 Validaciones Técnicas

#### Verificación en Código HTML

Abrir DevTools (F12) → Elements, verificar:

**Campos de formulario tienen labels:**

```html
<!-- ✅ CORRECTO -->
<label for="email">Email</label>
<input type="email" id="email" name="email" aria-required="true" />

<!-- ❌ INCORRECTO -->
<input type="email" placeholder="Email" />  <!-- Sin label -->
```

**Botones tienen texto descriptivo:**

```html
<!-- ✅ CORRECTO -->
<button aria-label="Cerrar modal">X</button>

<!-- ❌ INCORRECTO -->
<button>X</button>  <!-- No descriptivo -->
```

**Imágenes tienen alt text:**

```html
<!-- ✅ CORRECTO -->
<img src="messi.jpg" alt="Cromo de Lionel Messi, Mundial 2022" />

<!-- ❌ INCORRECTO -->
<img src="messi.jpg" />  <!-- Sin alt -->
```

**Landmarks ARIA:**

```html
<nav aria-label="Navegación principal">...</nav>
<main>...</main>
<footer>...</footer>
```

### 📊 Resultado del Test

✅ **Passed** si:
- Lector de pantalla lee todos los elementos
- Formularios son completables sin ratón
- Estructura semántica es correcta

---

## Caso CP-F09-Q02: Navegación por teclado

### 🎯 Objetivo

Verificar que toda la funcionalidad es accesible usando solo el teclado (sin ratón).

### 🧪 Pasos del Test

**IMPORTANTE:** NO usar el ratón durante todo el test.

**PASO 1: Navegación básica (10 minutos)**

1. Abrir la app
2. Presionar `Tab` repetidamente
3. Verificar que el focus (borde resaltado) es visible en cada elemento

**Atajos comunes:**
- `Tab`: Siguiente elemento
- `Shift + Tab`: Elemento anterior
- `Enter`: Activar enlace o botón
- `Espacio`: Activar botón o checkbox
- `Escape`: Cerrar modal
- `Flechas`: Navegar en select, radio buttons

**Verificar:**
- ✅ Focus visible (borde azul, outline)
- ✅ Orden lógico de navegación (de arriba abajo, izquierda a derecha)
- ✅ No hay "trampas de teclado" (focus atrapado en un elemento)

**PASO 2: Usar menú de navegación (5 minutos)**

3. `Tab` hasta llegar al menú principal
4. Usar flechas para navegar por opciones:
   - Marketplace
   - Mis Plantillas
   - Perfil
5. Presionar `Enter` para seleccionar

**Verificar:**
- ✅ Menú navegable con flechas
- ✅ `Enter` abre la sección

**PASO 3: Completar formulario (10 minutos)**

6. Ir a formulario de crear listado
7. Usar solo teclado:
   - `Tab` entre campos
   - Escribir en campos de texto
   - `Espacio` o `Enter` para checkboxes
   - Flechas en select/dropdown
   - `Enter` para enviar

**Verificar:**
- ✅ Todos los campos accesibles
- ✅ Select/Dropdown navegable con flechas
- ✅ Formulario enviable con `Enter`

**PASO 4: Interactuar con modal (10 minutos)**

8. Abrir modal (ej: "Contactar vendedor")
9. Verificar que focus se mueve DENTRO del modal
10. `Tab` debe ciclar solo entre elementos del modal
11. `Escape` debe cerrar el modal
12. Al cerrar, focus regresa al elemento que abrió el modal

**Verificar:**
- ✅ Focus atrapado en modal (trap focus)
- ✅ `Escape` cierra modal
- ✅ Focus regresa al origen

**PASO 5: Navegación en tabla/grid (5 minutos)**

13. Si hay tabla de datos (ej: "Mis Listados")
14. Usar flechas para navegar por celdas

**Verificar:**
- ✅ Flechas navegan por celdas
- ✅ `Enter` activa acción en celda

### 🔍 Validaciones Técnicas

#### Verificar Focus Visible en CSS

Abrir DevTools → Styles, buscar:

```css
/* ✅ CORRECTO - Focus visible */
button:focus {
    outline: 2px solid #0066cc;
    outline-offset: 2px;
}

/* ❌ INCORRECTO - Focus eliminado */
button:focus {
    outline: none;  /* ¡MAL! */
}
```

#### Verificar Tab Index

En DevTools → Elements:

```html
<!-- ✅ CORRECTO - Orden natural -->
<input type="text" />  <!-- tabindex implícito: 0 -->
<button>Submit</button>

<!-- ❌ INCORRECTO - tabindex > 0 (evitar) -->
<input type="text" tabindex="5" />  <!-- Rompe orden natural -->

<!-- ⚠️ USAR CON CUIDADO - tabindex="-1" -->
<div tabindex="-1">...</div>  <!-- Solo para focus programático -->
```

### 📊 Resultado del Test

✅ **Passed** si:
- Toda la app es navegable sin ratón
- Focus siempre visible
- Modales atrapan focus correctamente

---

## Caso CP-F09-Q03: Diseño responsive (móvil, tablet, desktop)

### 🎯 Objetivo

Verificar que la app se ve y funciona bien en diferentes tamaños de pantalla.

### 🧪 Pasos del Test

**PASO 1: Modo responsive en Chrome DevTools (5 minutos)**

1. Abrir Chrome DevTools (F12)
2. Presionar `Ctrl + Shift + M` (toggle device toolbar)
3. Seleccionar diferentes dispositivos

**PASO 2: Probar en móvil (iPhone SE - 375x667) (15 minutos)**

4. Seleccionar "iPhone SE"
5. Navegar por la app

**Verificar:**
- ✅ Menú de navegación collapsa en "hamburguesa" ☰
- ✅ Texto legible (mínimo 16px)
- ✅ Botones suficientemente grandes (mínimo 44x44px)
- ✅ Imágenes se redimensionan correctamente
- ✅ No hay scroll horizontal
- ✅ Formularios usables con teclado virtual

**Layout esperado en móvil:**

```
┌─────────────────────┐
│ ☰  Logo     🔔 👤  │  <- Header sticky
├─────────────────────┤
│                     │
│  [Buscador]        │
│                     │
│  ┌───────────────┐ │
│  │   Listado 1   │ │  <- Listados en columna única
│  │   Imagen      │ │
│  │   Título      │ │
│  │   50€         │ │
│  └───────────────┘ │
│                     │
│  ┌───────────────┐ │
│  │   Listado 2   │ │
│  └───────────────┘ │
│                     │
└─────────────────────┘
```

**PASO 3: Probar en tablet (iPad - 768x1024) (10 minutos)**

6. Seleccionar "iPad"
7. Verificar layout

**Verificar:**
- ✅ Listados en grid 2 columnas
- ✅ Menú puede ser hamburguesa o visible
- ✅ Modales centrados correctamente

**Layout esperado en tablet:**

```
┌─────────────────────────────────────┐
│  Logo   Marketplace  Perfil  🔔 👤 │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────┐  ┌──────────┐       │  <- 2 columnas
│  │ Listado 1│  │ Listado 2│       │
│  └──────────┘  └──────────┘       │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ Listado 3│  │ Listado 4│       │
│  └──────────┘  └──────────┘       │
│                                     │
└─────────────────────────────────────┘
```

**PASO 4: Probar en desktop (1920x1080) (10 minutos)**

8. Seleccionar "Responsive" y establecer 1920x1080
9. Verificar layout

**Verificar:**
- ✅ Listados en grid 3-4 columnas
- ✅ Menú de navegación siempre visible
- ✅ Sidebar (si existe) visible
- ✅ Contenido no excede 1400px de ancho (max-width para legibilidad)

**Layout esperado en desktop:**

```
┌───────────────────────────────────────────────────────────┐
│  Logo    Marketplace  Plantillas  Perfil    🔔  👤       │
├─────────┬─────────────────────────────────────────────────┤
│         │  ┌────────┐  ┌────────┐  ┌────────┐           │
│ Filtros │  │ List 1 │  │ List 2 │  │ List 3 │   3-4     │
│         │  └────────┘  └────────┘  └────────┘  columnas  │
│ Precio  │                                                 │
│ [____]  │  ┌────────┐  ┌────────┐  ┌────────┐           │
│         │  │ List 4 │  │ List 5 │  │ List 6 │           │
│ Estado  │  └────────┘  └────────┘  └────────┘           │
│ ☐ Nuevo │                                                 │
│ ☐ Usado │                                                 │
│         │                                                 │
└─────────┴─────────────────────────────────────────────────┘
```

**PASO 5: Orientación landscape en móvil (5 minutos)**

10. Rotar dispositivo a horizontal
11. Verificar que layout se adapta

**PASO 6: Zoom (5 minutos)**

12. En desktop, hacer zoom al 200% (`Ctrl + +`)
13. Verificar que contenido aún es usable

**Verificar:**
- ✅ Texto se agranda
- ✅ Layout se adapta (puede cambiar a móvil)
- ✅ No hay elementos cortados

### 🔍 Validaciones Técnicas

#### Verificar Media Queries en DevTools

En DevTools → Sources, buscar en archivos CSS:

```css
/* Mobile first approach */
.grid {
    display: grid;
    grid-template-columns: 1fr; /* 1 columna en móvil */
}

/* Tablet */
@media (min-width: 768px) {
    .grid {
        grid-template-columns: repeat(2, 1fr); /* 2 columnas */
    }
}

/* Desktop */
@media (min-width: 1024px) {
    .grid {
        grid-template-columns: repeat(3, 1fr); /* 3 columnas */
    }
}
```

#### Verificar Viewport Meta Tag

En HTML `<head>`:

```html
<!-- ✅ CORRECTO -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- ❌ INCORRECTO -->
<!-- Sin viewport tag = no responsive -->
```

### 📊 Resultado del Test

✅ **Passed** si:
- Layout se adapta a móvil, tablet y desktop
- No hay scroll horizontal en ningún tamaño
- Elementos táctiles son suficientemente grandes (44x44px)

---

## Caso CP-F09-Q04: Contraste y legibilidad

### 🎯 Objetivo

Verificar que el texto es legible y cumple con estándares de contraste WCAG.

### 📋 Preparación

**Herramienta:** WebAIM Contrast Checker - https://webaim.org/resources/contrastchecker/

### 🧪 Pasos del Test

**PASO 1: Verificar contraste de texto principal (10 minutos)**

1. Identificar color de texto principal y fondo
2. Usar DevTools para obtener valores:
   - Clic derecho en texto → Inspect
   - En Styles, ver `color` y `background-color`

**Ejemplo:**
```
Color de texto: #333333 (gris oscuro)
Color de fondo: #FFFFFF (blanco)
```

3. Ir a https://webaim.org/resources/contrastchecker/
4. Ingresar colores
5. Ver ratio de contraste

**Estándares WCAG:**
- **Texto normal (< 18px):**
  - AA: Ratio mínimo 4.5:1
  - AAA: Ratio mínimo 7:1
- **Texto grande (≥ 18px o 14px bold):**
  - AA: Ratio mínimo 3:1
  - AAA: Ratio mínimo 4.5:1

**Verificar:**
- ✅ Texto principal cumple AA (mínimo 4.5:1)
- ✅ Encabezados grandes cumplen AA (mínimo 3:1)

**PASO 2: Verificar contraste de botones (10 minutos)**

6. Verificar botones primarios:
   - Botón "Crear listado" (azul)
   - Texto en botón (blanco)

**Ejemplo:**
```
Botón primario: #0066CC (azul)
Texto: #FFFFFF (blanco)
Ratio: 8.2:1 ✅ (AA y AAA)
```

**Verificar:**
- ✅ Botones principales cumplen AA
- ✅ Botones secundarios cumplen AA

**PASO 3: Verificar enlaces (5 minutos)**

7. Verificar que enlaces son distinguibles:

**❌ INCORRECTO:**
```
Texto normal: Negro
Enlaces: Negro (solo diferenciado por underline)
```

**✅ CORRECTO:**
```
Texto normal: #333333
Enlaces: #0066CC (azul) + underline
```

**Verificar:**
- ✅ Enlaces tienen color diferente (no solo underline)
- ✅ Contraste de enlaces cumple AA

**PASO 4: Modo de alto contraste (10 minutos)**

8. Activar modo de alto contraste en Windows:
   - `Alt izq + Shift izq + Print Screen`
9. Navegar por la app

**Verificar:**
- ✅ Contenido aún visible
- ✅ Iconos tienen contorno/borde

**PASO 5: Tamaño de fuente (5 minutos)**

10. Verificar tamaños de texto:
    - En DevTools → Computed, ver `font-size`

**Tamaños recomendados:**
- Texto principal: Mínimo 16px
- Texto secundario: Mínimo 14px
- Texto pequeño (legal): Mínimo 12px

**Verificar:**
- ✅ Texto principal ≥ 16px
- ✅ No hay texto < 12px

### 🔍 Validaciones Técnicas

#### Usar Lighthouse para Accesibilidad

1. DevTools → Lighthouse
2. Seleccionar "Accessibility"
3. Generar reporte

**Verificar:**
- ✅ Score de Accesibilidad ≥ 90
- ✅ Sin errores críticos de contraste

#### Extensión de Chrome: "Accessibility Insights"

1. Instalar: https://accessibilityinsights.io/
2. Ejecutar "FastPass"
3. Revisar issues de contraste

### 📊 Resultado del Test

✅ **Passed** si:
- Contraste de texto cumple WCAG AA (4.5:1)
- Enlaces distinguibles por color
- Lighthouse score ≥ 90

---

## Caso CP-F09-Q05: Tiempos de carga y performance percibida

### 🎯 Objetivo

Verificar que la app carga rápidamente y proporciona feedback visual durante la carga.

### 🧪 Pasos del Test

**PASO 1: Medir tiempo de carga inicial (10 minutos)**

1. Abrir DevTools (F12) → Network
2. Marcar "Disable cache"
3. Recargar página (Ctrl + Shift + R)
4. Ver tiempo total de carga

**Métricas en Network tab:**

```
DOMContentLoaded: 1.2s  (azul)
Load: 2.5s              (rojo)
```

**Criterios:**
- ✅ DOMContentLoaded < 2 segundos
- ✅ Load completo < 4 segundos

**PASO 2: Lighthouse Performance Audit (10 minutos)**

5. DevTools → Lighthouse
6. Seleccionar "Performance"
7. Generar reporte

**Métricas Core Web Vitals:**

| Métrica | Bueno | Mejorar | Pobre |
|---------|-------|---------|-------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5-4s | > 4s |
| **FID** (First Input Delay) | < 100ms | 100-300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 |

**Verificar:**
- ✅ LCP < 2.5s (contenido principal carga rápido)
- ✅ FID < 100ms (responde rápido a interacción)
- ✅ CLS < 0.1 (layout no salta)

**PASO 3: Verificar estados de carga (10 minutos)**

8. Ir a página que carga datos (ej: Marketplace)
9. Simular conexión lenta:
   - DevTools → Network → "Slow 3G"
10. Recargar página

**Debe mostrar:**

**Skeleton screens (preferido):**

```
┌─────────────────────┐
│ ████████  ████      │  <- Placeholder animado
│ ████████  ████      │
│ ██████    ████      │
│                     │
│ ████████  ████      │
│ ████████  ████      │
└─────────────────────┘
```

**O spinners:**

```
┌─────────────────────┐
│                     │
│        ⏳           │  <- Spinner
│    Cargando...     │
│                     │
└─────────────────────┘
```

**Verificar:**
- ✅ Feedback visual inmediato (< 200ms)
- ✅ No pantalla en blanco durante carga
- ✅ Skeleton screens o spinners

**PASO 4: Lazy loading de imágenes (10 minutos)**

11. En Network, filtrar por "Img"
12. Scroll down en lista de listados
13. Ver que imágenes se cargan bajo demanda

**Verificar:**
- ✅ Imágenes fuera de viewport no se cargan inicialmente
- ✅ Se cargan al hacer scroll cerca de ellas

**Código esperado:**

```html
<img src="messi.jpg" loading="lazy" alt="Messi" />
```

**PASO 5: Caché y navegación (5 minutos)**

14. Desactivar "Disable cache" en DevTools
15. Navegar: Home → Marketplace → Home
16. Ver que segunda carga es más rápida

**Verificar:**
- ✅ Recursos estáticos en caché (304 Not Modified)
- ✅ Segunda carga < 1 segundo

### 📊 Resultado del Test

✅ **Passed** si:
- LCP < 2.5s
- Feedback visual durante cargas
- Lighthouse Performance score ≥ 80

---

## Caso CP-F09-Q06: Manejo de errores y feedback al usuario

### 🎯 Objetivo

Verificar que errores y acciones proporcionan feedback claro al usuario.

### 🧪 Pasos del Test

**PASO 1: Errores de validación en formularios (10 minutos)**

1. Ir a formulario de crear listado
2. Dejar campos vacíos
3. Hacer clic en "Publicar"

**Debe mostrar:**

```
┌─────────────────────────────────┐
│  Título: [________________]     │
│  ⚠️ El título es obligatorio    │  <- Mensaje de error
│                                 │
│  Precio: [________________]     │
│  ⚠️ El precio debe ser > 0      │
│                                 │
│  [Publicar listado]             │
└─────────────────────────────────┘
```

**Verificar:**
- ✅ Mensajes de error claros y específicos
- ✅ Errores junto al campo problemático
- ✅ Color rojo para indicar error
- ✅ Icono de error (⚠️ o ❌)

**PASO 2: Errores de servidor (10 minutos)**

4. Simular error de servidor (ej: crear listado sin conexión)
5. DevTools → Network → Offline
6. Intentar publicar listado

**Debe mostrar:**

```
┌─────────────────────────────────────┐
│  ❌ Error al publicar listado       │
│                                     │
│  No se pudo conectar al servidor.   │
│  Por favor, verifica tu conexión    │
│  e intenta nuevamente.              │
│                                     │
│  [Reintentar]  [Cancelar]          │
└─────────────────────────────────────┘
```

**Verificar:**
- ✅ Mensaje de error amigable (no técnico)
- ✅ Opción de reintentar
- ✅ Modal o toast visible

**PASO 3: Confirmaciones de acciones (10 minutos)**

7. Ir a "Mis Listados"
8. Hacer clic en "Eliminar" un listado

**Debe pedir confirmación:**

```
┌─────────────────────────────────────┐
│  ⚠️ ¿Eliminar listado?              │
│                                     │
│  Esta acción no se puede deshacer.  │
│                                     │
│  ¿Estás seguro de que quieres       │
│  eliminar "Messi 2022"?             │
│                                     │
│  [Cancelar]  [Sí, eliminar]        │
└─────────────────────────────────────┘
```

**Verificar:**
- ✅ Confirmación antes de acción destructiva
- ✅ Explicación de consecuencias
- ✅ Botón de cancelar visible

**PASO 4: Feedback de éxito (5 minutos)**

9. Completar acción exitosamente (ej: publicar listado)

**Debe mostrar:**

**Toast notification:**

```
┌─────────────────────────────┐
│  ✅ Listado publicado       │  <- Toast en esquina
│     exitosamente            │
└─────────────────────────────┘
```

**Verificar:**
- ✅ Mensaje de éxito visible
- ✅ Desaparece automáticamente (3-5 segundos)
- ✅ Icono de éxito (✅ o ✓)

**PASO 5: Estados de botones (5 minutos)**

10. Hacer clic en "Publicar listado"
11. Durante el proceso, ver estado del botón

**Debe mostrar:**

```
Estado inicial:  [Publicar listado]

Durante acción:  [⏳ Publicando...]  <- Deshabilitado

Después:         [✅ Publicado!]     <- Feedback visual
```

**Verificar:**
- ✅ Botón se deshabilita durante acción
- ✅ Spinner o texto de carga
- ✅ No permite doble clic

**PASO 6: Página 404 (5 minutos)**

12. Ir a URL inexistente: `/listados/99999999`

**Debe mostrar:**

```
┌─────────────────────────────────┐
│         😕                      │
│                                 │
│    Página no encontrada         │
│                                 │
│  Lo sentimos, el listado que    │
│  buscas no existe o fue         │
│  eliminado.                     │
│                                 │
│  [Volver al marketplace]        │
│  [Ir a inicio]                  │
│                                 │
└─────────────────────────────────┘
```

**Verificar:**
- ✅ Mensaje amigable (no solo "404")
- ✅ Opciones de navegación
- ✅ No página en blanco

### 📊 Resultado del Test

✅ **Passed** si:
- Errores de validación son claros
- Acciones destructivas piden confirmación
- Feedback de éxito visible
- Página 404 personalizada

---

## 📊 Resumen - Fase 09: Accesibilidad y UX

| Test ID | Nombre | Tiempo Est. |
|---------|--------|-------------|
| CP-F09-Q01 | Lector de pantalla | 45 min |
| CP-F09-Q02 | Navegación por teclado | 40 min |
| CP-F09-Q03 | Diseño responsive | 50 min |
| CP-F09-Q04 | Contraste y legibilidad | 40 min |
| CP-F09-Q05 | Performance percibida | 45 min |
| CP-F09-Q06 | Manejo de errores | 45 min |

**Total:** ~4 horas 25 minutos

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
