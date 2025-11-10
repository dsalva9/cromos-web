# Guía para Testers No Técnicos

## 👋 Bienvenido

Esta carpeta contiene todos los tests diseñados para ser ejecutados por miembros del equipo **sin conocimientos técnicos avanzados**. Si puedes usar una computadora, navegar por sitios web y seguir instrucciones paso a paso, ¡puedes ejecutar estos tests!

## 🎯 ¿Qué tipo de tests encontrarás aquí?

Los tests en esta categoría incluyen:

- ✅ **Validaciones de UI** (interfaz de usuario)
- ✅ **Consultas SQL simples** (búsquedas en una sola tabla)
- ✅ **Verificación en Chrome DevTools** (revisar errores en consola)
- ✅ **Tests de funcionalidad básica** (crear usuarios, publicar listados, etc.)

## 📚 Antes de Empezar

### 1. Lee las guías fundamentales

**OBLIGATORIO** - Debes leer estas guías antes de ejecutar tu primer test:

- [`GUIA_DE_CONSULTAS_SQL.md`](../GUIA_DE_CONSULTAS_SQL.md) - Cómo ejecutar consultas SQL
- [`GUIA_DE_CONSOLA_CHROME.md`](../GUIA_DE_CONSOLA_CHROME.md) - Cómo usar Chrome DevTools

**Tiempo estimado:** 1-2 horas para leer y practicar con los ejercicios.

### 2. Obtén acceso a las herramientas

Necesitarás:

- ✅ **Google Chrome** (versión 120 o superior)
- ✅ **Acceso a Supabase Dashboard** (contactar a David para credenciales)
- ✅ **Test_Tracking_Spreadsheet.csv** (abrir con Excel o LibreOffice)

### 3. Configura tu entorno

1. **Instala Chrome** si no lo tienes: https://www.google.com/chrome/
2. **Solicita credenciales** de Supabase a David en Slack (#testing)
3. **Abre el spreadsheet** y filtra por tu nombre en la columna "Asignado_A"

## 📖 Cómo Usar Esta Carpeta

### Estructura de Fases

La carpeta está organizada en **10 fases** que corresponden a diferentes áreas de la aplicación:

```
no-tecnico/
├── Fase-01-Autenticacion-Perfil/      ← Registro, login, perfil
├── Fase-02-Plantillas-Colecciones/    ← Crear y gestionar plantillas
├── Fase-03-Marketplace/               ← Publicar y vender cromos
├── Fase-04-Integracion/               ← Conexión plantillas-marketplace
├── Fase-05-Intercambios/              ← Propuestas de intercambio
├── Fase-06-Social-Notificaciones/     ← Favoritos, ratings, reportes
├── Fase-07-Administracion/            ← Panel de administración
├── Fase-08-End-to-End/                ← Flujos completos de usuario
├── Fase-09-Calidad-Transversal/       ← Accesibilidad, rendimiento
└── Fase-10-Badges/                    ← Sistema de logros e insignias
```

### Formato de los Archivos de Test

Cada archivo `.md` contiene **múltiples casos de prueba** relacionados. Por ejemplo:

- `01_Autenticacion_Onboarding.md` contiene ~8 tests de registro y login
- `02_Perfil_y_Avatar.md` contiene ~6 tests de edición de perfil

## 🚀 Proceso Paso a Paso

### Para cada test que ejecutes:

#### 1. Preparación (10 min)

1. Abre el archivo .md del test en un editor de texto o navegador
2. Lee la sección completa **"Preparación (Setup)"**
3. Ejecuta todos los pasos de preparación (crear cuentas, limpiar datos, etc.)

#### 2. Ejecución (15-20 min)

1. Sigue los **"Pasos del Test"** exactamente como están escritos
2. Verifica cada **"Validación UI"** mientras avanzas
3. Toma notas de cualquier comportamiento inesperado

#### 3. Validaciones Técnicas (10-15 min)

**Validación SQL:**
1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Copia la consulta del test
4. Reemplaza las variables `{...}` con tus valores
5. Ejecuta y verifica el resultado

**Verificación Chrome DevTools:**
1. Abre DevTools con `F12`
2. Ve a pestaña Console
3. Verifica que no haya errores rojos
4. Si hay errores, cópialos

#### 4. Reportar Resultado (5 min)

1. Abre `Test_Tracking_Spreadsheet.csv`
2. Busca el Test_ID (ej: CP-F01-02)
3. Actualiza la columna "Estado":
   - `Passed` ✅ si todo salió bien
   - `Failed` ❌ si algo falló
4. En "Notas" escribe:
   - Si pasó: "OK" o dejar vacío
   - Si falló: descripción del problema + captura de pantalla

## 📋 Ejemplo Completo de Ejecución

Veamos un ejemplo real del test **CP-F01-02: Registro móvil**

### 1. Abrir el archivo

```
no-tecnico/Fase-01-Autenticacion-Perfil/01_Autenticacion_Onboarding.md
```

### 2. Leer el caso CP-F01-02

Encontrarás una sección que dice:

```markdown
# Caso CP-F01-02: Registro móvil (vista 375px)
```

### 3. Seguir Setup

```
- Cerrar todas las ventanas de Chrome
- Abrir modo incógnito: Ctrl + Shift + N
- Activar vista móvil en DevTools
- Generar email de prueba: tester+maria_09nov@cromos.test
```

### 4. Ejecutar pasos

```
1. Ir a cambio-cromos.vercel.app
2. Clic en "Crear cuenta"
3. Rellenar formulario...
```

### 5. Verificar en SQL

```sql
SELECT email, confirmed_at, nickname
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE email = 'tester+maria_09nov@cromos.test';
```

### 6. Resultado esperado

✅ **Test EXITOSO si:**
- Ves 1 fila con tu email
- `confirmed_at` no está vacío
- No hay errores rojos en consola

### 7. Actualizar spreadsheet

```
Test_ID: CP-F01-02
Estado: Passed
Notas: OK
```

## ⚠️ Consejos y Mejores Prácticas

### ✅ Hazlo

- ✅ Lee las guías completas antes de empezar
- ✅ Ejecuta los tests en orden (no saltes fases)
- ✅ Toma capturas de pantalla de los errores
- ✅ Copia los mensajes de error completos
- ✅ Pregunta en Slack #testing si tienes dudas
- ✅ Anota el tiempo que te toma cada test (para mejorar estimaciones)

### ❌ Evita

- ❌ Saltar la sección "Preparación (Setup)"
- ❌ Ejecutar tests sin haber leído las guías
- ❌ Modificar las consultas SQL (úsalas exactamente como están)
- ❌ Continuar si tienes un bloqueador (ver columna "Bloqueador" en CSV)
- ❌ Asumir que algo está bien sin verificarlo
- ❌ Trabajar con datos antiguos (limpia entre tests si es necesario)

## 🆘 ¿Qué hago si...?

### ...no entiendo una consulta SQL?

1. Vuelve a leer `GUIA_DE_CONSULTAS_SQL.md`
2. Busca la sección relevante (ej: "Reemplazar variables")
3. Si sigue sin estar claro, contacta a David en Slack
4. **NUNCA adivines** - mejor preguntar

### ...un test falla pero no sé por qué?

1. **Verifica** que seguiste todos los pasos exactamente
2. **Reintenta** desde el inicio (a veces hay problemas temporales)
3. **Captura** pantalla del error y mensaje de consola
4. **Anota** en spreadsheet: Estado=Failed, Notas="[descripción del problema]"
5. **Reporta** a David con toda la evidencia

### ...hay un error en las instrucciones del test?

1. **No modifiques** el archivo de test
2. **Reporta** a David en Slack: "Test CP-FXX-YY tiene error en paso 3"
3. **Continúa** con el siguiente test mientras David lo revisa

### ...no tengo acceso a Supabase?

1. **STOP** - no puedes ejecutar tests sin acceso
2. **Contacta** a David inmediatamente en Slack
3. Mientras tanto, puedes leer las guías y familiarizarte con Chrome DevTools

## 📊 Seguimiento de Progreso

### Cómo saber cuántos tests te faltan

1. Abre `Test_Tracking_Spreadsheet.csv`
2. Aplica filtro:
   - Columna "Tipo" = "No-Técnico"
   - Columna "Asignado_A" = [Tu nombre]
3. Cuenta las filas con "Estado" = "Not Started"

### Meta sugerida

**Objetivo semanal:** 10-15 tests completados

**Tiempo estimado:** 2-3 horas de trabajo por sesión

**Distribución:**
- Lunes-Miércoles: Fase-01, Fase-02 (fundacionales)
- Jueves-Viernes: Fase-03, Fase-04 (features principales)
- Siguiente semana: Fase-05 en adelante

## 🎓 Preguntas Frecuentes

### ¿Puedo ejecutar tests en cualquier orden?

**NO siempre.** Algunos tests tienen **dependencias** (columna "Bloqueador").

**Ejemplo:**
- CP-F03-02B (ver detalle de listado) **requiere** CP-F03-01 (crear listado)

**Regla:** Ejecuta en orden de fases (01 → 10) para evitar problemas.

### ¿Qué navegador debo usar?

**Google Chrome** (versión 120+) es **obligatorio**.

Los tests están diseñados específicamente para Chrome DevTools.

### ¿Cuánto tiempo toma completar todos los tests no-técnicos?

**Aproximadamente 18-23 horas** distribuidas en 2-3 semanas.

**Desglose:**
- Fase-01: ~3 horas
- Fase-02: ~3.5 horas
- Fase-03: ~4 horas
- Fases 04-10: ~10 horas

### ¿Qué hago con los tests que fallan?

1. **NO los marques como Passed** si no funcionan
2. **Anota el error** en columna "Notas"
3. **Adjunta evidencia** (capturas, mensajes de error)
4. **Reporta a David** para que lo priorice
5. **Continúa con el siguiente** test (no te bloquees)

## 📞 Contacto y Soporte

### David (Lead Técnico)
- **Slack:** @david en canal `#testing`
- **Cuándo contactar:**
  - No tienes acceso a Supabase
  - Encontraste un bug crítico
  - Las instrucciones no están claras
  - Un test falla consistentemente

### Canal #testing (Slack)
- **Para qué:**
  - Preguntas generales
  - Compartir hallazgos
  - Coordinar con otros testers
  - Reportar progreso

## ✅ Checklist: Antes de tu Primera Sesión de Testing

Antes de ejecutar cualquier test, asegúrate de:

- [ ] Leí `GUIA_DE_CONSULTAS_SQL.md` completa
- [ ] Leí `GUIA_DE_CONSOLA_CHROME.md` completa
- [ ] Practiqué con los ejercicios de ambas guías
- [ ] Tengo Google Chrome instalado (versión 120+)
- [ ] Tengo acceso a Supabase Dashboard
- [ ] Probé hacer login en Supabase
- [ ] Puedo abrir SQL Editor sin problemas
- [ ] Abrí `Test_Tracking_Spreadsheet.csv`
- [ ] Filtré el spreadsheet para ver mis tests asignados
- [ ] Sé cómo contactar a David si tengo dudas
- [ ] Entiendo la diferencia entre tests "Passed" y "Failed"
- [ ] Sé cómo tomar capturas de pantalla en mi sistema

**Si marcaste todas las casillas:** ¡Estás listo para empezar! 🎉

**Si falta alguna:** Completa esos pasos antes de continuar.

---

## 🚀 ¡Comencemos!

**Siguiente paso:** Abre `Fase-01-Autenticacion-Perfil/01_Autenticacion_Onboarding.md` y empieza con tu primer test.

**Recuerda:** Todos empezamos sin saber SQL o DevTools. Con las guías y la práctica, te volverás un experto en testing. ¡Tú puedes!

---

**Versión:** 1.0
**Última actualización:** 2025-11-09
**Contacto:** David (Slack #testing)
