# Plan de Ejecución de Tests Técnicos - Fase 01

Este documento detalla el plan para ejecutar los tests técnicos solicitados utilizando las herramientas disponibles (Supabase MCP, Browser Automation).

## 📋 Resumen de Tests

| ID | Nombre | Método Principal | Estado |
|----|--------|------------------|--------|
| **CP-F01-02E** | Trigger creación perfil | SQL (Supabase) | Pendiente |
| **CP-F01-02I** | Storage policies | SQL + Browser | Pendiente |
| **CP-F01-06** | Password Reset Flow | Browser + SQL | Pendiente |
| **CP-F01-07** | Performance Perfil | Browser + SQL | Pendiente |
| **CP-F01-02J** | Cascada Eliminación | SQL (Supabase) | Pendiente |

## 🛠️ Fase 0: Setup y Preparación

Antes de ejecutar los tests, es necesario preparar el entorno y los datos de prueba.

1.  **Verificación de Acceso:**
    *   Confirmar acceso a proyecto Supabase `cromos-web` (ID: `cuzuzitadwmrlocqhhtu`). ✅ **Listo**
    *   Verificar extensión `pgcrypto` para crear usuarios con password. ✅ **Listo**

2.  **Creación de Usuarios de Prueba (Script SQL):**
    *   Se creará un script SQL para insertar los usuarios necesarios si no existen:
        *   `qa.trigger_test@cromos.test`
        *   `qa.storage_a@cromos.test`
        *   `qa.storage_b@cromos.test`
        *   `qa.reset@cromos.test`
        *   `qa.delete_test@cromos.test`
    *   Contraseña por defecto: `password123`

## 🚀 Fase 1: Ejecución de Tests

### 1. CP-F01-02E: Trigger de creación automática de perfil
**Objetivo:** Verificar que al insertar en `auth.users`, se crea registro en `public.profiles`.
**Pasos:**
1.  Ejecutar `INSERT` en `auth.users` para `qa.trigger_test@cromos.test`.
2.  Ejecutar `SELECT` en `public.profiles` buscando el ID del nuevo usuario.
3.  **Validación:** El perfil debe existir y tener `created_at` reciente.

### 2. CP-F01-02I: Storage Policy - Acceso a avatares
**Objetivo:** Verificar seguridad de buckets.
**Pasos:**
1.  **SQL:** Inspeccionar `storage.buckets` y `storage.policies` para asegurar configuración correcta (Público para lectura, Auth para escritura).
2.  **Browser (Opcional):** Intentar subir avatar con usuario `dsalva@gmail.com` (si login funciona) o `qa.storage_a` (si logramos loguear).
3.  **Validación:** Confirmar existencia de políticas `SELECT` (public) e `INSERT` (owner).

### 3. CP-F01-06: API de Auth - Password Reset Flow
**Objetivo:** Verificar flujo de recuperación.
**Pasos:**
1.  **Browser:** Ir a `/login`, click en "Olvidé mi contraseña".
2.  **Browser:** Ingresar `qa.reset@cromos.test` y enviar.
3.  **SQL:** Consultar `auth.users` para verificar `recovery_token` y `recovery_sent_at`.
4.  **Validación:** El token debe haberse generado recientemente. (No podemos verificar el email enviado externamente, pero sí el estado en BD).

### 4. CP-F01-07: Performance - Carga de página de perfil
**Objetivo:** Medir tiempos y optimización.
**Pasos:**
1.  **Browser:** Navegar a perfil de usuario (ej. `dsalva@gmail.com` o uno creado).
2.  **Browser:** Medir tiempo de carga visual.
3.  **SQL:** Ejecutar `EXPLAIN ANALYZE` de la query principal de perfil.
4.  **Validación:** Query < 200ms, uso de índices confirmado.

### 5. CP-F01-02J: Integridad - Cascada de eliminación
**Objetivo:** Verificar limpieza de datos relacionados.
**Pasos:**
1.  **SQL:** Setup completo para `qa.delete_test@cromos.test` (Perfil, Listados, Colecciones).
2.  **SQL:** Verificar conteos iniciales (>0).
3.  **SQL:** `DELETE FROM auth.users`.
4.  **SQL:** Verificar conteos finales (=0).
5.  **Validación:** Todo debe estar vacío.

## ⚠️ Limitaciones Identificadas
*   **Email:** No hay acceso a la bandeja de entrada real para verificar el contenido del email de reset. Se verificará la generación del token en BD.
*   **Login:** El login inicial falló por un error de automatización (doble input). Se procederá a usar `dsalva@gmail.com` para los tests de UI tras corregir el método de input.

## ✅ Criterios de Aprobación
El plan se considerará exitoso si se ejecutan todos los pasos y se genera un reporte de resultados (Walkthrough) con evidencias (Screenshots, Outputs SQL).
