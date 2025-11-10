# Suite de Testing Manual - CambioCromos

## 📋 Índice General

Bienvenido a la suite de testing manual completa de CambioCromos. Esta documentación está diseñada para dos tipos de testers:

- **Testers No Técnicos:** Equipo general que ejecutará tests de UI y consultas SQL básicas
- **Testers Técnicos:** Tests complejos que requieren conocimientos avanzados de BD y sistemas

---

## 🗂️ Estructura de Carpetas

```
docs/Testeo/
├── README.md (este archivo)
├── Test_Tracking_Spreadsheet.csv
├── GUIA_DE_CONSULTAS_SQL.md
├── GUIA_DE_CONSOLA_CHROME.md
│
├── no-tecnico/ (Tests para equipo general)
│   ├── Fase-01-Autenticacion-Perfil/
│   ├── Fase-02-Plantillas-Colecciones/
│   ├── Fase-03-Marketplace/
│   ├── Fase-04-Integracion/
│   ├── Fase-05-Intercambios/
│   ├── Fase-06-Social-Notificaciones/
│   ├── Fase-07-Administracion/
│   ├── Fase-08-End-to-End/
│   ├── Fase-09-Calidad-Transversal/
│   └── Fase-10-Badges/
│
└── tecnico/ (Tests para David)
    ├── Fase-01-Autenticacion-Perfil/
    ├── Fase-02-Plantillas-Colecciones/
    ├── Fase-03-Marketplace/
    ├── Fase-04-Integracion/
    ├── Fase-05-Intercambios/
    ├── Fase-06-Social-Notificaciones/
    ├── Fase-07-Administracion/
    ├── Fase-08-End-to-End/
    ├── Fase-09-Calidad-Transversal/
    └── Fase-10-Badges/
```

---

## 🎯 ¿Qué tipo de tester eres?

### 👥 Tester No Técnico

**Perfil:** Miembro del equipo sin experiencia en programación o bases de datos.

**Tests asignados:**
- Validaciones de UI (interfaz de usuario)
- Consultas SQL simples (SELECT de 1 tabla)
- Verificación de estados y fechas
- Funcionalidad básica de la aplicación

**Empezar aquí:**
1. Lee `GUIA_DE_CONSULTAS_SQL.md` (obligatorio)
2. Lee `GUIA_DE_CONSOLA_CHROME.md` (obligatorio)
3. Ve a `no-tecnico/README.md` para comenzar
4. Revisa `Test_Tracking_Spreadsheet.csv` para ver tus tests asignados

**Herramientas que usarás:**
- Navegador Chrome
- Supabase Dashboard (para consultas SQL)
- Excel/LibreOffice (para el spreadsheet de seguimiento)

---

### 🔧 Tester Técnico (David)

**Perfil:** Desarrollador o tester con conocimientos de SQL, RLS policies, y sistemas backend.

**Tests asignados:**
- Verificación de políticas RLS (Row Level Security)
- Consultas SQL complejas con JOINs
- Verificación de triggers y funciones de BD
- Tests de performance (EXPLAIN ANALYZE)
- Verificación de audit logs
- Análisis de errores backend

**Empezar aquí:**
1. Ve a `tecnico/README.md`
2. Revisa `Test_Tracking_Spreadsheet.csv` (filtrar por "Asignado_A: David")
3. Cada fase tiene un archivo consolidado de tests técnicos

**Herramientas que usarás:**
- Supabase Dashboard + SQL Editor
- Chrome DevTools (Network, Console, Application)
- psql (opcional, para queries avanzadas)
- Postman/cURL (para tests de API)

---

## 📊 Test Tracking Spreadsheet

El archivo `Test_Tracking_Spreadsheet.csv` es el **control central** de todos los tests.

### Cómo usarlo

1. **Abrir:** Doble clic en `Test_Tracking_Spreadsheet.csv` (se abre en Excel)
2. **Filtrar:** Usa los filtros de columna para ver solo tus tests
   - Filtrar por `Asignado_A` para ver tus tests
   - Filtrar por `Estado` para ver qué falta completar
   - Filtrar por `Fase` para enfocarte en una funcionalidad
3. **Actualizar:** Marca el estado después de cada test
   - `Not Started` → `Passed` o `Failed`
   - Añade notas en la columna `Notas` si hay problemas

### Columnas del Spreadsheet

| Columna | Descripción |
|---------|-------------|
| **Fase** | Agrupación funcional (Fase-01, Fase-02, etc.) |
| **Test_ID** | Identificador único (CP-F01-02, CP-F03-01A, etc.) |
| **Nombre_Test** | Descripción breve del test |
| **Tipo** | No-Técnico o Técnico |
| **Asignado_A** | Tester, David, Marcos, Alberto, etc. |
| **Estado** | Not Started, Passed, Failed |
| **Prioridad** | Alta, Media, Baja |
| **Complejidad** | Baja, Media, Alta |
| **Bloqueador** | ID de otro test que debe completarse primero |
| **Tiempo_Estimado_Min** | Minutos estimados para ejecutar |
| **Archivo_Referencia** | Ruta al archivo .md con instrucciones |
| **Notas** | Observaciones, errores encontrados, etc. |

---

## 📖 Guías de Referencia

### GUIA_DE_CONSULTAS_SQL.md

**¿Qué contiene?**
- Introducción a SQL para principiantes
- Cómo acceder a Supabase Dashboard
- Cómo ejecutar consultas paso a paso
- Cómo reemplazar variables en consultas
- Cómo leer resultados
- Glosario de términos SQL
- Ejercicios prácticos

**¿Quién debe leerla?**
- **Obligatorio** para testers no técnicos
- Útil para cualquiera que no haya usado SQL antes

---

### GUIA_DE_CONSOLA_CHROME.md

**¿Qué contiene?**
- Qué son las Chrome DevTools
- Cómo abrir la consola (3 métodos)
- Cómo identificar errores rojos vs warnings
- Cómo usar la pestaña Network
- Cómo ver tokens de sesión en Application
- Cómo copiar y reportar errores
- Ejercicios prácticos

**¿Quién debe leerla?**
- **Obligatorio** para testers no técnicos
- Útil para entender cómo verificar errores frontend

---

## 🎯 Fases de Testing

La suite está organizada en **10 fases** que cubren todas las funcionalidades de CambioCromos:

### Fase 01: Autenticación y Perfil
- Registro, login, recuperación de contraseña
- Edición de perfil, avatares, datos personales
- **Tests:** ~18 (11 no-técnicos, 7 técnicos)

### Fase 02: Plantillas y Colecciones
- Creación y edición de plantillas
- Sistema de copias y progreso (HAVE/NEED/DUPES)
- Variantes estilo Panini, ratings de plantillas
- **Tests:** ~18 (10 no-técnicos, 8 técnicos)

### Fase 03: Marketplace
- Publicación y gestión de listados
- Chat, reservas, transacciones
- Metadata Panini, búsquedas y filtros
- **Tests:** ~13 (8 no-técnicos, 5 técnicos)

### Fase 04: Integración Plantillas-Marketplace
- Publicar duplicados desde colecciones
- Sincronización bidireccional
- Decrementos automáticos
- **Tests:** ~8 (4 no-técnicos, 4 técnicos)

### Fase 05: Intercambios (Trade Proposals)
- Creación y gestión de propuestas
- Chat de intercambios
- Finalización bidireccional
- **Tests:** ~8 (5 no-técnicos, 3 técnicos)

### Fase 06: Social y Notificaciones
- Sistema de favoritos (listados, plantillas, usuarios)
- Ratings de usuarios y plantillas
- Sistema de reportes
- Notificaciones en tiempo real
- Sistema de ignorar usuarios
- **Tests:** ~12 (8 no-técnicos, 4 técnicos)

### Fase 07: Administración
- Panel de moderación (reportes, suspensiones)
- Gestión de listados y plantillas
- Audit log, purgas de usuarios
- **Tests:** ~12 (6 no-técnicos, 6 técnicos)

### Fase 08: End-to-End (Flujos completos)
- Onboarding → Colección completa
- Duplicados → Venta en marketplace
- Trade → Reputación (ratings)
- **Tests:** ~9 (6 no-técnicos, 3 técnicos)

### Fase 09: Calidad Transversal
- Accesibilidad (navegación por teclado, lectores de pantalla)
- Rendimiento y resiliencia (errores, timeouts)
- Compatibilidad (navegadores, dispositivos)
- **Tests:** ~9 (6 no-técnicos, 3 técnicos)

### Fase 10: Badges (Sistema de Logros)
- Definición y asignación de badges
- Progreso y notificaciones
- Visualización en perfiles
- **Tests:** ~18 (6 no-técnicos, 12 técnicos)

---

## 📈 Proceso de Testing Recomendado

### Para Testers No Técnicos

1. **Preparación (una vez):**
   - Leer `GUIA_DE_CONSULTAS_SQL.md` completa
   - Leer `GUIA_DE_CONSOLA_CHROME.md` completa
   - Obtener credenciales de Supabase (contactar a David)
   - Abrir `Test_Tracking_Spreadsheet.csv` y filtrar por tu nombre

2. **Por cada test:**
   - Abrir el archivo .md de referencia
   - Seguir los pasos de "Preparación (Setup)"
   - Ejecutar los "Pasos del Test"
   - Verificar las "Validaciones UI"
   - Ejecutar las "Validaciones Técnicas" (SQL y Consola)
   - Anotar resultado en spreadsheet (Passed/Failed)
   - Si hay errores, guardar capturas y copiar mensajes

3. **Al finalizar:**
   - Revisar que todos tus tests tengan estado `Passed` o `Failed`
   - Reportar tests fallidos a David con:
     - ID del test (ej: CP-F03-02B)
     - Capturas de pantalla
     - Mensajes de error copiados
     - Qué esperabas vs qué pasó

### Para Testers Técnicos (David)

1. **Preparación:**
   - Revisar `tecnico/README.md`
   - Acceso a Supabase Dashboard con permisos admin
   - Configurar psql (opcional)

2. **Por cada test:**
   - Tests técnicos están consolidados por fase
   - Ejecutar verificaciones de RLS, triggers, audit logs
   - Analizar rendimiento con EXPLAIN ANALYZE
   - Documentar hallazgos en spreadsheet

3. **Al finalizar:**
   - Validar resultados de tests no-técnicos si hay discrepancias
   - Priorizar fixes de tests fallidos críticos

---

## 🐞 Cómo Reportar un Bug

Si encuentras un error durante el testing:

### 1. Información Básica

- **Test ID:** (ej: CP-F03-02B)
- **Fase:** (ej: Fase-03 Marketplace)
- **Estado:** Failed
- **Prioridad:** Alta/Media/Baja (tu evaluación)

### 2. Evidencia

- **Captura de pantalla:** Del error en UI o consola
- **Mensaje de error:** Copiado de consola o SQL
- **Pasos para reproducir:** Qué hiciste exactamente

### 3. Resultado Esperado vs Real

- **Esperaba:** (según el test)
- **Obtuve:** (qué pasó realmente)

### 4. Dónde Reportar

- **Excel:** Anotar en columna "Notas" del spreadsheet
- **Slack:** Canal `#testing` con toda la info
- **Sistema de bugs:** (si existe, usar template de bug)

---

## ❓ FAQ - Preguntas Frecuentes

### ¿Cuánto tiempo toma completar todos los tests?

**Tests No-Técnicos:** ~70 tests × 15-20 min = **18-23 horas totales**

**Tests Técnicos:** ~55 tests × 20-30 min = **18-28 horas totales**

**Recomendación:** Distribuir en varias sesiones de 2-3 horas.

### ¿Puedo ejecutar tests en cualquier orden?

**No siempre.** Algunos tests tienen **bloqueadores** (columna `Bloqueador` en CSV).

**Ejemplo:** CP-F03-02B (ver detalle de listado) requiere que CP-F03-01 (crear listado) se haya completado antes.

**Regla general:** Ejecuta en orden de Fase-01 → Fase-10 para evitar problemas.

### ¿Qué hago si un test falla?

1. **Verifica que seguiste todos los pasos** correctamente
2. **Reintenta el test** desde cero (a veces hay problemas temporales)
3. **Anota el error** en spreadsheet con toda la evidencia
4. **Reporta a David** en Slack #testing
5. **Continúa con el siguiente test** (no te bloquees en uno)

### ¿Puedo modificar los tests?

**No.** Los tests están diseñados para verificar funcionalidad específica.

Si crees que hay un error en las instrucciones del test:
- Reporta a David
- Él actualizará el documento si es necesario

### ¿Qué navegador debo usar?

**Obligatorio:** Google Chrome (versión 120+)

**Opcional (para tests de compatibilidad):** Firefox, Safari, Edge

### ¿Necesito limpiar la BD entre tests?

**Para tests no-técnicos:** Generalmente no. Cada test usa datos únicos (emails con timestamp, etc.)

**Para tests técnicos:** David manejará limpieza de datos si es necesario.

### ¿Qué hago si no tengo acceso a Supabase?

**Contacta a David inmediatamente.** No puedes ejecutar los tests sin acceso.

Necesitarás:
- Email de acceso
- Contraseña
- Permisos de lectura en SQL Editor

---

## 📞 Contacto y Soporte

### David (Lead Técnico)
- **Slack:** @david en canal `#testing`
- **Email:** [completar]
- **Responsabilidades:**
  - Tests técnicos complejos
  - Soporte para tests no-técnicos
  - Gestión de accesos a Supabase
  - Priorización de bugs

### Equipo de Testing
- **Slack:** Canal `#testing` (toda comunicación ahí)
- **Reuniones:** (definir horario si aplica)

---

## 🔄 Actualizaciones de la Suite

Esta suite de tests se actualizará cuando:
- Se agreguen nuevas funcionalidades a la app
- Se encuentren gaps en la cobertura
- Se mejoren las instrucciones basado en feedback

**Versión actual:** 1.0
**Última actualización:** 2025-11-09

---

## ✅ Checklist: Antes de Empezar

Antes de ejecutar tu primer test, asegúrate de:

### Para Testers No-Técnicos:
- [ ] Leí `GUIA_DE_CONSULTAS_SQL.md` completa
- [ ] Leí `GUIA_DE_CONSOLA_CHROME.md` completa
- [ ] Tengo acceso a Supabase Dashboard
- [ ] Puedo abrir `Test_Tracking_Spreadsheet.csv` en Excel
- [ ] Tengo Google Chrome instalado (versión 120+)
- [ ] Sé cómo contactar a David si tengo dudas

### Para Testers Técnicos:
- [ ] Tengo permisos admin en Supabase
- [ ] Revisé `tecnico/README.md`
- [ ] Tengo herramientas adicionales (psql, Postman si aplica)
- [ ] Entiendo el esquema de BD completo

---

**¡Bienvenido al equipo de testing de CambioCromos! 🎉**

Si tienes alguna duda, no dudes en contactar a David o preguntar en `#testing`.
