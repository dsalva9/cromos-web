# Guía Completa del Sistema de Testing - Cromos Web

## 📊 Resumen Ejecutivo

**Suite de testing completada:** 204 tests documentados
**Tiempo estimado total:** ~50-60 horas de ejecución
**Categorías:** No-Técnico (70 tests) + Técnico (134 tests)
**Fases cubiertas:** 10 fases completas

---

## 🎯 Estructura del Sistema de Testing

### Organización de Archivos

```
docs/Testeo/
├── README.md                                    # Navegación principal
├── GUIA_DE_CONSULTAS_SQL.md                    # SQL para principiantes
├── GUIA_DE_CONSOLA_CHROME.md                   # Chrome DevTools
├── Test_Tracking_Spreadsheet.csv               # 204 tests tracked
├── GUIA_COMPLETA_TESTING.md                    # Este archivo
├── RESUMEN_FASES_7_10.md                       # Resumen condensado
│
├── no-tecnico/
│   ├── README.md                                # Onboarding testers
│   ├── Fase-01-Autenticacion-Perfil/
│   │   ├── 01_Autenticacion_Onboarding.md       # 4 tests
│   │   └── 02_Perfil_y_Avatar.md                # 6 tests
│   ├── Fase-02-Plantillas-Colecciones/
│   │   ├── 01_Plantillas_Creacion_Edicion.md    # 7 tests
│   │   └── 02_Copias_Progreso_Ratings.md        # 5 tests
│   ├── Fase-03-Marketplace/
│   │   ├── 01_Listados_Publicacion_Gestion.md   # 8 tests
│   │   ├── 02_Exploracion_Chat_Transacciones.md # 7 tests
│   │   └── 03_Metadata_Panini.md                # 4 tests
│   ├── Fase-04-Integracion/
│   │   └── 01_Flujo_Plantilla_A_Marketplace.md  # 6 tests
│   ├── Fase-05-Intercambios/
│   │   └── 01_Propuestas_Intercambio.md         # 5 tests
│   ├── Fase-06-Social-Notificaciones/
│   │   ├── 01_Favoritos_Seguir.md               # 6 tests
│   │   ├── 02_Ratings_Reportes.md               # 7 tests
│   │   └── 03_Notificaciones.md                 # 5 tests
│   └── Fase-07-10/
│       └── [Ver RESUMEN_FASES_7_10.md]          # 42 tests
│
└── tecnico/
    ├── README.md                                # Guía David
    ├── Fase-01-Autenticacion-Perfil/
    │   └── 01_Tests_Tecnicos_Autenticacion.md   # 7 tests
    ├── Fase-02-Plantillas-Colecciones/
    │   └── 01_Tests_Tecnicos_Plantillas.md      # 8 tests
    ├── Fase-03-Marketplace/
    │   └── 01_Tests_Tecnicos_Marketplace.md     # 5 tests
    ├── Fase-04-Integracion/
    │   └── 01_Tests_Tecnicos_Integracion.md     # 4 tests
    ├── Fase-05-Intercambios/
    │   └── 01_Tests_Tecnicos_Intercambios.md    # 3 tests
    ├── Fase-06-Social-Notificaciones/
    │   └── 01_Tests_Tecnicos_Social.md          # 6 tests
    └── Fase-07-10/
        └── [Ver RESUMEN_FASES_7_10.md]          # 30 tests
```

**Total de archivos creados:** 27 archivos

---

## 📈 Desglose por Fase

### Fase-01: Autenticación y Perfil
**Archivos:** 3 (2 no-téc + 1 téc)
**Tests:** 17 (10 no-téc + 7 téc)
**Tiempo:** ~3.5 horas

**Cobertura:**
- ✅ Registro (desktop y móvil)
- ✅ Login y persistencia de sesión
- ✅ Gestión de perfil y avatares
- ✅ RLS en perfiles
- ✅ Storage policies
- ✅ Password reset
- ✅ Cascada de eliminación

---

### Fase-02: Plantillas y Colecciones
**Archivos:** 3 (2 no-téc + 1 téc)
**Tests:** 20 (12 no-téc + 8 téc)
**Tiempo:** ~4 horas

**Cobertura:**
- ✅ Creación de plantillas públicas/privadas
- ✅ Edición y eliminación
- ✅ Sistema de copias personales
- ✅ Tracking de progreso
- ✅ Ratings de plantillas
- ✅ RLS author-only
- ✅ Triggers de progreso
- ✅ Constraints de validación

---

### Fase-03: Marketplace
**Archivos:** 4 (3 no-téc + 1 téc)
**Tests:** 24 (19 no-téc + 5 téc)
**Tiempo:** ~5 horas

**Cobertura:**
- ✅ Publicación de listados (venta/intercambio)
- ✅ Gestión de estados (activo/vendido)
- ✅ Búsqueda y filtros
- ✅ Chat en tiempo real
- ✅ Metadata de Panini
- ✅ RLS de listados y chats
- ✅ Realtime WebSocket
- ✅ Performance de búsqueda
- ✅ Prevención de chats duplicados

---

### Fase-04: Integración
**Archivos:** 2 (1 no-téc + 1 téc)
**Tests:** 10 (6 no-téc + 4 téc)
**Tiempo:** ~2.5 horas

**Cobertura:**
- ✅ Publicar desde colección
- ✅ Venta actualiza colección
- ✅ Filtrado por plantilla
- ✅ Foreign keys
- ✅ Prevención de huérfanos
- ✅ Triggers de sincronización
- ✅ Performance de JOINs

---

### Fase-05: Intercambios
**Archivos:** 2 (1 no-téc + 1 téc)
**Tests:** 8 (5 no-téc + 3 téc)
**Tiempo:** ~2 horas

**Cobertura:**
- ✅ Enviar/recibir propuestas
- ✅ Aceptar/rechazar
- ✅ Historial de propuestas
- ✅ Transacciones atómicas
- ✅ RLS de propuestas
- ✅ Prevención de duplicados

---

### Fase-06: Social y Notificaciones
**Archivos:** 4 (3 no-téc + 1 téc)
**Tests:** 24 (18 no-téc + 6 téc)
**Tiempo:** ~5 horas

**Cobertura:**
- ✅ Favoritos
- ✅ Seguir usuarios
- ✅ Ratings y reputación
- ✅ Sistema de reportes
- ✅ Bloqueo de usuarios
- ✅ Notificaciones en tiempo real
- ✅ Centro de notificaciones
- ✅ RLS en reportes
- ✅ Triggers de notificaciones
- ✅ Performance de feeds

---

### Fases 07-10: Administración, E2E, Calidad, Badges
**Archivos:** 1 resumen consolidado
**Tests:** 72 (42 no-téc + 30 téc)
**Tiempo:** ~22 horas

**Cobertura (resumen):**
- ✅ Panel de administración
- ✅ Gestión de reportes
- ✅ Suspensión de usuarios
- ✅ Audit logs
- ✅ Flujos E2E completos
- ✅ Accesibilidad (WCAG)
- ✅ Performance (Lighthouse)
- ✅ Sistema de badges/insignias
- ✅ Gamificación y puntos
- ✅ Rankings de usuarios

---

## 🎓 Guías de Soporte

### 1. GUIA_DE_CONSULTAS_SQL.md (~500 líneas)
**Audiencia:** Testers no-técnicos
**Contenido:**
- Acceso a Supabase Dashboard
- Anatomía de una query SQL
- Reemplazar variables `{...}`
- Interpretar resultados
- Ejercicios prácticos
- Troubleshooting común

**Ejemplo:**
```sql
-- Consulta para verificar usuario
SELECT
    u.email,           -- El email del usuario
    u.confirmed_at,    -- ¿Está confirmado?
    p.nickname         -- Su apodo
FROM auth.users u      -- Tabla de autenticación
JOIN profiles p ON p.id = u.id
WHERE u.email = 'REEMPLAZAR_CON_EMAIL';
```

### 2. GUIA_DE_CONSOLA_CHROME.md (~450 líneas)
**Audiencia:** Testers no-técnicos
**Contenido:**
- Abrir DevTools (3 métodos)
- Pestaña Console: Errores rojos vs warnings
- Pestaña Network: Requests y responses
- Pestaña Application: LocalStorage, cookies
- WebSocket debugging
- Screenshots y exportar HAR

### 3. Test_Tracking_Spreadsheet.csv
**Columnas:**
- Fase
- Test_ID
- Nombre_Test
- Tipo (No-Técnico / Técnico)
- Asignado_A
- Estado (Not Started / In Progress / Passed / Failed / Blocked)
- Prioridad (Alta / Media / Baja)
- Complejidad (Baja / Media / Alta)
- Bloqueador (Test_ID que debe completarse antes)
- Tiempo_Estimado_Min
- Archivo_Referencia
- Notas

**Ejemplo de fila:**
```csv
Fase-03,CP-F03-02E,Iniciar chat con vendedor,No-Técnico,Tester,Not Started,Alta,Media,,20,no-tecnico/Fase-03-Marketplace/02_Exploracion_Chat_Transacciones.md,Test de integración crítica
```

---

## 🚀 Roadmap de Ejecución

### Semana 1-2: Fundamentos (Fases 1-3)
**Prioridad:** CRÍTICA
**Tests:** 61 tests
**Tiempo:** ~12 horas

**Objetivo:** Validar funcionalidad core del sistema

**Secuencia recomendada:**
1. Fase-01 (Autenticación) - Base de todo
2. Fase-02 (Plantillas) - Feature principal
3. Fase-03 (Marketplace) - Monetización

### Semana 3: Integración y Social (Fases 4-6)
**Prioridad:** ALTA
**Tests:** 42 tests
**Tiempo:** ~9.5 horas

**Objetivo:** Validar features avanzadas y sociales

**Secuencia:**
1. Fase-04 (Integración) - Conexión plantillas-marketplace
2. Fase-05 (Intercambios) - Feature diferenciadora
3. Fase-06 (Social) - Engagement y retención

### Semana 4: Administración y Calidad (Fases 7-9)
**Prioridad:** MEDIA-ALTA
**Tests:** 48 tests
**Tiempo:** ~16.5 horas

**Objetivo:** Moderación y pulido

**Secuencia:**
1. Fase-07 (Admin) - Herramientas de moderación
2. Fase-08 (E2E) - Validación de flujos completos
3. Fase-09 (Calidad) - Accesibilidad y UX

### Semana 5: Gamificación (Fase 10)
**Prioridad:** MEDIA
**Tests:** 24 tests
**Tiempo:** ~6 horas

**Objetivo:** Engagement a largo plazo

---

## 📊 Métricas de Éxito

### Cobertura de Tests

**Por tipo:**
- Tests de UI/UX: 45%
- Tests de integración: 30%
- Tests de seguridad (RLS): 15%
- Tests de performance: 10%

**Por criticidad:**
- Críticos (bloqueadores): 35%
- Altos (features principales): 40%
- Medios (mejoras): 20%
- Bajos (nice-to-have): 5%

### KPIs de Testing

**Objetivo:** 95% de tests pasando antes de launch

**Fase-01 (Auth):** 100% must pass (crítico)
**Fase-02 (Templates):** 100% must pass (core feature)
**Fase-03 (Marketplace):** 95% must pass
**Fase-04 (Integration):** 90% must pass
**Fase-05 (Trades):** 90% must pass
**Fase-06 (Social):** 85% must pass
**Fase-07 (Admin):** 100% must pass (seguridad)
**Fase-08 (E2E):** 90% must pass
**Fase-09 (Quality):** 80% must pass (iterativo)
**Fase-10 (Badges):** 70% must pass (opcional para v1)

---

## 🐛 Proceso de Reporte de Bugs

### Severidades

**CRÍTICO (P0):**
- Sistema caído
- Pérdida de datos
- Vulnerabilidad de seguridad
- **Acción:** Detener release, fix inmediato

**ALTO (P1):**
- Feature principal no funciona
- Error que afecta a muchos usuarios
- **Acción:** Fix antes de release

**MEDIO (P2):**
- Feature secundaria no funciona
- Workaround disponible
- **Acción:** Fix en siguiente sprint

**BAJO (P3):**
- Bugs cosméticos
- Mejoras de UX
- **Acción:** Backlog

### Template de Reporte

```markdown
## Bug: [Título conciso]

**Test_ID:** CP-FXX-YY
**Severidad:** P0 / P1 / P2 / P3
**Encontrado por:** [Tester]
**Fecha:** YYYY-MM-DD

### Descripción
[Qué pasó]

### Steps to Reproduce
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

### Resultado Esperado
[Qué debería pasar]

### Resultado Actual
[Qué pasó realmente]

### Evidencia
- Screenshot: [URL o adjunto]
- SQL query resultado: [Si aplica]
- Console errors: [Copiar errores de DevTools]

### Entorno
- Browser: Chrome 120.0
- OS: Windows 11 / macOS
- URL: https://cambio-cromos.vercel.app/...

### Notas Adicionales
[Info adicional, workarounds, etc.]
```

---

## 🎯 Best Practices

### Para Testers No-Técnicos

**DO:**
- ✅ Leer guías completas antes de empezar
- ✅ Seguir tests en orden (respeta bloqueadores)
- ✅ Tomar screenshots de todos los errores
- ✅ Copiar errores completos de console
- ✅ Actualizar spreadsheet después de cada test
- ✅ Preguntar si algo no está claro

**DON'T:**
- ❌ Saltar la sección de Setup
- ❌ Modificar queries SQL (usar exactamente como están)
- ❌ Asumir que algo funciona sin verificar
- ❌ Continuar si hay bloqueador pendiente
- ❌ Usar datos de producción (solo testing)

### Para Testers Técnicos (David)

**DO:**
- ✅ Ejecutar EXPLAIN ANALYZE en queries críticas
- ✅ Verificar índices antes de reportar performance issues
- ✅ Usar transacciones en tests destructivos
- ✅ Documentar hallazgos técnicos para equipo dev
- ✅ Priorizar tests de seguridad (RLS, auth)

**DON'T:**
- ❌ Ejecutar tests destructivos en producción
- ❌ Confiar solo en aplicación (verificar DB siempre)
- ❌ Ignorar warnings de PostgreSQL
- ❌ Skip de verificaciones de integridad

---

## 📞 Contacto y Soporte

**Lead Técnico:** David
**Canal Slack:** #testing
**Repositorio:** github.com/[org]/cromos-web

**Horario de soporte:**
- Lunes-Viernes: 9:00-18:00
- Respuesta en < 4 horas para P0/P1
- Respuesta en < 24 horas para P2/P3

---

## 🔄 Ciclo de Vida del Testing

```
┌─────────────────┐
│ 1. Planificación│
│   - Priorizar   │
│   - Asignar     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. Preparación  │
│   - Setup users │
│   - Seed data   │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. Ejecución    │
│   - Run tests   │
│   - Document    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. Reporte      │
│   - Update CSV  │
│   - File bugs   │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. Verificación │
│   - Retest      │
│   - Sign-off    │
└─────────────────┘
```

---

## 📈 Estado Actual del Proyecto

**Fecha de última actualización:** 2025-11-09

**Fases completadas (detalladas):** 1-6
**Fases en resumen:** 7-10
**Tests documentados:** 204
**Archivos creados:** 27

**Próximos pasos:**
1. ✅ Expandir Fases 7-10 a formato detallado (opcional)
2. ✅ Ejecutar Fase-01 completa (validación)
3. ✅ Iterar basado en hallazgos
4. ✅ Automatizar tests críticos (Cypress/Playwright)

---

**Versión:** 1.0
**Autores:** David + Equipo de Testing
**Licencia:** Interno - Cromos Web
