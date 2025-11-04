# TEST: Sistema de Insignias (Badges System)

**Fase:** 10 - Gamificación con Insignias
**Fecha:** 2025-01-04
**Versión:** 1.7.0

## Descripción General

Sistema de gamificación que premia a los usuarios por completar diversas acciones en la plataforma. Incluye 19 insignias en 6 categorías diferentes con visualización en perfiles, marketplace y notificaciones.

---

## Pre-requisitos

1. Aplicar las migraciones de base de datos:
   - `supabase/migrations/20251104121546_create_badges_system.sql`
   - `supabase/migrations/20251104121547_seed_badge_definitions.sql`

2. Tener dos usuarios de prueba (Usuario A y Usuario B)
3. Tener al menos una colección disponible en el sistema
4. Navegador web moderno (Chrome, Firefox, Safari)

---

## Test 1: Visualización de Insignias en el Perfil

### Objetivo
Verificar que las insignias se muestran correctamente en la página de perfil del usuario.

### Pasos
1. Iniciar sesión como Usuario A
2. Navegar a `/profile`
3. Desplazarse hasta la sección "Insignias"
4. Verificar que aparece la sección con el título "Insignias"
5. Verificar que aparecen dos pestañas: "Todas las insignias" y "Ganadas"
6. Verificar que se muestran contadores de insignias ganadas y por ganar

### Resultado Esperado
- ✅ La sección "Insignias" es visible en el perfil
- ✅ Las pestañas funcionan correctamente
- ✅ El contador muestra "0 ganadas" y "19 por ganar" (para usuario nuevo)
- ✅ Las insignias se muestran agrupadas por categoría:
  - Coleccionista (3 insignias)
  - Creador (3 insignias)
  - Opinador (3 insignias)
  - Completista (3 insignias)
  - Trader (3 insignias)
  - Top Valorado (1 insignia especial)

---

## Test 2: Ganar Insignia "Coleccionista Novato"

### Objetivo
Verificar que se gana la primera insignia de coleccionista al copiar una colección.

### Pasos
1. Como Usuario A (sin colecciones copiadas)
2. Navegar a `/templates`
3. Buscar una plantilla de colección pública
4. Hacer clic en "Copiar Plantilla" o similar
5. Confirmar la copia de la colección
6. Verificar que aparece una notificación de nueva insignia
7. Navegar a `/profile#badges`
8. Verificar que la insignia "Coleccionista Novato" aparece como ganada

### Resultado Esperado
- ✅ Notificación aparece: "¡Nueva insignia ganada! Has ganado la insignia 'Coleccionista Novato'"
- ✅ La notificación tiene un icono de premio (Award)
- ✅ Al hacer clic en la notificación, navega a `/profile#badges`
- ✅ La insignia "Coleccionista Novato" aparece en la pestaña "Ganadas"
- ✅ La barra de progreso muestra "1 / 1" y 100%
- ✅ El contador de insignias muestra "1 ganada"

---

## Test 3: Progreso hacia Insignia "Coleccionista Dedicado"

### Objetivo
Verificar que el progreso se actualiza correctamente al acercarse a una nueva insignia.

### Pasos
1. Como Usuario A (con 1 colección copiada del Test 2)
2. Copiar una segunda colección diferente
3. Navegar a `/profile#badges`
4. Buscar las insignias de "Coleccionista"
5. Verificar el progreso de "Coleccionista Dedicado"

### Resultado Esperado
- ✅ "Coleccionista Novato" sigue marcada como ganada
- ✅ "Coleccionista Dedicado" muestra progreso: "2 / 3" y 67%
- ✅ La barra de progreso está al 67%
- ✅ "Coleccionista Experto" muestra "2 / 10" y 20%

---

## Test 4: Ganar Insignia "Creador Principiante"

### Objetivo
Verificar que se gana la primera insignia de creador al crear una plantilla.

### Pasos
1. Como Usuario A
2. Navegar a `/templates/create`
3. Crear una nueva plantilla de colección:
   - Nombre: "Mi Primera Plantilla Test"
   - Competición: "Test League"
   - Año: 2025
   - Añadir al menos 1 slot
4. Guardar la plantilla
5. Verificar notificación de insignia
6. Navegar a `/profile#badges`

### Resultado Esperado
- ✅ Notificación: "Has ganado la insignia 'Creador Principiante'"
- ✅ La insignia aparece en la pestaña "Ganadas"
- ✅ El contador ahora muestra "2 ganadas"

---

## Test 5: Ganar Insignia "Opinador Novato"

### Objetivo
Verificar que se gana la primera insignia de opinador al calificar una plantilla.

### Pasos
1. Como Usuario A
2. Navegar a `/templates`
3. Abrir una plantilla pública (no creada por ti)
4. Hacer clic en "Calificar" o ver la sección de calificaciones
5. Dar una calificación de 4-5 estrellas y comentario opcional
6. Guardar la calificación
7. Verificar notificación
8. Navegar a `/profile#badges`

### Resultado Esperado
- ✅ Notificación: "Has ganado la insignia 'Opinador Novato'"
- ✅ La insignia aparece en "Ganadas"
- ✅ El contador muestra "3 ganadas"

---

## Test 6: Ganar Insignia "Completista Inicial"

### Objetivo
Verificar que se gana la insignia al completar una colección al 100%.

### Pasos
1. Como Usuario A
2. Tener una colección pequeña (idealmente de prueba con pocos cromos)
3. Marcar todos los cromos de la colección como "TENGO" o "REPE"
4. Verificar que la colección muestra 100% de completado
5. Verificar notificación de insignia
6. Navegar a `/profile#badges`

### Resultado Esperado
- ✅ Notificación: "Has ganado la insignia 'Completista Inicial'"
- ✅ La insignia aparece en "Ganadas"
- ✅ El contador aumenta

---

## Test 7: Ganar Insignia "Trader Novato"

### Objetivo
Verificar que se gana la insignia al completar el primer intercambio.

### Pasos
1. Como Usuario A, publicar un anuncio en el marketplace
2. Como Usuario B, chatear con Usuario A sobre el anuncio
3. Como Usuario A, reservar el anuncio para Usuario B
4. Como Usuario A, marcar el anuncio como completado
5. Como Usuario B, confirmar la finalización
6. Verificar que Usuario A recibe notificación de insignia "Trader Novato"
7. Verificar perfil de Usuario A

### Resultado Esperado
- ✅ Usuario A recibe notificación: "Has ganado la insignia 'Trader Novato'"
- ✅ La insignia aparece en el perfil de Usuario A
- ✅ El progreso hacia "Trader Activo" muestra "1 / 5"

---

## Test 8: Insignia Especial "Top Valorado"

### Objetivo
Verificar los requisitos especiales para ganar la insignia Top Valorado.

### Pre-requisitos
- El usuario debe tener 5+ intercambios completados
- El usuario debe tener una valoración promedio de 4.5+ estrellas
- El usuario debe tener al menos 5 valoraciones

### Pasos
1. Completar los pre-requisitos para Usuario A:
   - Completar 5 intercambios exitosos
   - Recibir calificaciones de 4-5 estrellas en cada intercambio
2. Después de la 5ta valoración positiva, verificar notificación
3. Navegar a `/profile#badges`

### Resultado Esperado
- ✅ Notificación: "Has ganado la insignia 'Top Valorado'"
- ✅ La insignia tiene efecto especial (glow púrpura)
- ✅ Aparece en la pestaña "Ganadas"
- ✅ Se muestra con estilo especial (tier: special)

---

## Test 9: Visualización de Insignias en el Marketplace

### Objetivo
Verificar que las insignias de los vendedores se muestran en las tarjetas de anuncios.

### Pasos
1. Como Usuario A (con varias insignias ganadas)
2. Publicar un nuevo anuncio en el marketplace
3. Cerrar sesión
4. Como Usuario B (o sin sesión), navegar a `/marketplace`
5. Buscar el anuncio de Usuario A
6. Verificar las insignias junto al nombre del usuario

### Resultado Esperado
- ✅ Se muestran máximo 2 insignias del vendedor
- ✅ Se priorizan insignias de mayor tier (special > gold > silver > bronze)
- ✅ Las insignias tienen tooltip con nombre y descripción
- ✅ Los iconos son pequeños pero visibles

---

## Test 10: Navegación desde Notificación

### Objetivo
Verificar que las notificaciones de insignias llevan correctamente al perfil.

### Pasos
1. Como Usuario A, realizar una acción que otorgue una insignia
2. Abrir el menú de notificaciones (campana)
3. Hacer clic en la notificación de insignia ganada
4. Verificar que navega a `/profile#badges`
5. Verificar que la sección de insignias está visible

### Resultado Esperado
- ✅ El enlace de la notificación funciona
- ✅ Navega a la URL correcta con hash `#badges`
- ✅ La página hace scroll automático a la sección de insignias
- ✅ La nueva insignia es visible de inmediato

---

## Test 11: Persistencia de Datos

### Objetivo
Verificar que las insignias y progreso se mantienen tras reiniciar sesión.

### Pasos
1. Como Usuario A (con varias insignias ganadas)
2. Tomar nota de las insignias ganadas y progreso
3. Cerrar sesión
4. Cerrar navegador completamente
5. Abrir navegador e iniciar sesión nuevamente
6. Navegar a `/profile#badges`
7. Verificar que las insignias se mantienen

### Resultado Esperado
- ✅ Todas las insignias ganadas siguen presentes
- ✅ El progreso hacia insignias no ganadas se mantiene
- ✅ Las fechas de obtención son correctas

---

## Test 12: Prevención de Duplicados

### Objetivo
Verificar que no se pueden ganar insignias duplicadas.

### Pasos
1. Como Usuario A (con "Coleccionista Novato" ya ganada)
2. Copiar más colecciones
3. Verificar que NO se recibe notificación de "Coleccionista Novato" nuevamente
4. Verificar que se actualiza el progreso hacia siguientes tiers

### Resultado Esperado
- ✅ No aparecen notificaciones duplicadas
- ✅ El progreso se actualiza correctamente
- ✅ Al ganar 3 colecciones, se otorga "Coleccionista Dedicado"
- ✅ No se vuelve a otorgar "Coleccionista Novato"

---

## Test 13: Responsividad Móvil

### Objetivo
Verificar que las insignias se ven correctamente en dispositivos móviles.

### Pasos
1. Activar modo responsive en DevTools (375px de ancho)
2. Navegar a `/profile` como Usuario A
3. Ver la sección de insignias
4. Verificar la grilla y diseño

### Resultado Esperado
- ✅ Las insignias se muestran en 1 columna en móvil
- ✅ Los iconos son legibles
- ✅ Los tooltips funcionan en touch
- ✅ El diseño no se rompe
- ✅ Las barras de progreso son visibles

---

## Test 14: Actualización en Tiempo Real

### Objetivo
Verificar las suscripciones en tiempo real para insignias.

### Pasos
1. Abrir dos pestañas del navegador
2. Iniciar sesión como Usuario A en ambas
3. En Pestaña 1: Navegar a `/profile#badges`
4. En Pestaña 2: Realizar una acción que otorgue insignia
5. Verificar que Pestaña 1 se actualiza automáticamente

### Resultado Esperado
- ✅ La nueva insignia aparece automáticamente en Pestaña 1
- ✅ No requiere recargar la página
- ✅ El contador de insignias se actualiza
- ✅ La suscripción WebSocket funciona correctamente

---

## Test 15: Accesibilidad

### Objetivo
Verificar que el sistema de insignias es accesible.

### Pasos
1. Navegar a `/profile#badges`
2. Usar navegación por teclado (Tab)
3. Verificar textos alternativos
4. Usar lector de pantalla (opcional)

### Resultado Esperado
- ✅ Todos los elementos son navegables con teclado
- ✅ Los iconos tienen descripciones accesibles
- ✅ Los tooltips son accesibles
- ✅ Los contrastes de color cumplen WCAG

---

## Casos Extremos y Edge Cases

### Test 16: Sin Insignias
**Pasos:** Usuario nuevo sin ninguna insignia
**Esperado:** Mensaje amigable "Aún no has ganado ninguna insignia"

### Test 17: Todas las Insignias
**Pasos:** Usuario con las 19 insignias completas
**Esperado:** Pestaña "Ganadas" muestra todas, pestaña "Todas" muestra 100% en todo

### Test 18: Concurrencia
**Pasos:** Realizar múltiples acciones que otorguen insignias simultáneamente
**Esperado:** Todas las insignias se otorgan correctamente sin conflictos

---

## Resumen de Verificación

### Insignias por Categoría

**Coleccionista** (copiar colecciones):
- [ ] Novato: 1 colección copiada
- [ ] Dedicado: 3 colecciones copiadas
- [ ] Experto: 10 colecciones copiadas

**Creador** (crear plantillas):
- [ ] Principiante: 1 plantilla creada
- [ ] Activo: 3 plantillas creadas
- [ ] Legendario: 10 plantillas creadas

**Opinador** (calificar plantillas):
- [ ] Novato: 1 calificación dada
- [ ] Activo: 3 calificaciones dadas
- [ ] Experto: 10 calificaciones dadas

**Completista** (completar colecciones):
- [ ] Inicial: 1 colección 100%
- [ ] Dedicado: 3 colecciones 100%
- [ ] Maestro: 10 colecciones 100%

**Trader** (intercambios exitosos):
- [ ] Novato: 1 intercambio
- [ ] Activo: 5 intercambios
- [ ] Profesional: 10 intercambios

**Top Valorado** (especial):
- [ ] Requisitos: 5+ intercambios + 4.5+ estrellas + 5+ valoraciones

### Funcionalidades Generales
- [ ] Visualización en perfil
- [ ] Notificaciones funcionando
- [ ] Progreso en tiempo real
- [ ] Visualización en marketplace
- [ ] Persistencia de datos
- [ ] Prevención de duplicados
- [ ] Responsividad móvil
- [ ] Actualización en tiempo real
- [ ] Accesibilidad

---

## Notas de Prueba

### Bugs Encontrados
_(Registrar aquí cualquier bug encontrado durante las pruebas)_

### Mejoras Sugeridas
_(Registrar sugerencias de mejora)_

### Tiempo Estimado de Prueba
- Tests 1-5: 30 minutos
- Tests 6-10: 30 minutos
- Tests 11-15: 20 minutos
- Tests 16-18: 15 minutos
- **Total:** ~1.5 horas

---

## Criterios de Aceptación

El sistema de insignias se considera funcional si:

1. ✅ Todas las 19 insignias se pueden ganar
2. ✅ Las notificaciones aparecen correctamente
3. ✅ El progreso se rastrea con precisión
4. ✅ Las insignias se muestran en perfil y marketplace
5. ✅ No hay duplicados ni conflictos
6. ✅ La experiencia móvil es satisfactoria
7. ✅ El sistema es accesible
8. ✅ La actualización en tiempo real funciona
9. ✅ No hay errores en consola
10. ✅ El build de producción es exitoso

---

**Fecha de última actualización:** 2025-01-04
**Tester:** _________________
**Resultado:** [ ] APROBADO [ ] FALLADO
**Comentarios adicionales:**
