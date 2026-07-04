# CambioCromos: Resumen Funcional Detallado

CambioCromos ha pivotado de ser una aplicación tradicional de álbumes de cromos a convertirse en una plataforma comunitaria y mercado (marketplace) neutral de intercambio y venta de cartas y cromos deportivos (conforme a la normativa española LSSI/DSA). Este documento detalla los módulos funcionales actuales, la arquitectura técnica, las métricas reales de uso extraídas directamente de la base de datos de producción y los sistemas heredados identificados a través del historial de Git.

---

## 🏗️ 1. Stack Tecnológico y Arquitectura

La aplicación utiliza una arquitectura moderna, serverless y optimizada para dispositivos móviles con un diseño visual de estilo **Retro-Comic**:

*   **Frontend**: Next.js 15.5 (App Router) con soporte de internacionalización (i18n para español, inglés y portugués).
*   **Estilo y UI**: Tailwind CSS 4.0, componentes de `shadcn/ui`, iconos de Lucide, navegación inferior optimizada para móviles, esqueletos de carga personalizados y estilos de foco de accesibilidad (cumplimiento WCAG AA).
*   **Base de datos y API**: Supabase (PostgreSQL 17) con una arquitectura orientada a RPC (funciones en base de datos de PostgreSQL declaradas como `SECURITY DEFINER` y protegidas por políticas de seguridad de nivel de fila - RLS). Los tipos de TypeScript se generan automáticamente desde el esquema de base de datos.
*   **Tiempo real**: Supabase Realtime para la mensajería instantánea y notificaciones.
*   **App nativa**: Integración con Capacitor para Android, que incluye soporte para feedback háptico, pantalla de inicio (splash screen), enlaces profundos (deep linking), tematización dinámica de barras de navegación y notificaciones push mediante OneSignal.

---

## 📦 2. Módulos Funcionales Principales

### 🛒 A. Sistema de Mercado (Marketplace) y Anuncios
Permite a los usuarios listar, comprar o intercambiar cartas físicas y cromos.
*   **Anuncios libres**: Publicación con título, descripción, precio personalizado, nombre de la colección y subida obligatoria de fotos (capturables directamente con la cámara del dispositivo).
*   **Metadatos de Panini**: Integración de campos detallados específicos de álbumes como `page_number` (número de página), `page_title` (título de sección), `slot_variant` (variante de casilla, ej. 5A/5B) y `global_number` (números de checklist globales del 1 al 773+).
*   **Packs o Lotes de cromos**: Permite agrupar múltiples cromos en un solo anuncio ("Pack de cromos"), almacenando cada elemento en la tabla `listing_pack_items`.
*   **Flujo transaccional**: Los anuncios transicionan a través de los estados:
    $$\text{Activo} \rightarrow \text{Reservado} \rightarrow \text{Completado} \text{ (o cancelado/eliminado)}$$
    Los vendedores pueden reservar el anuncio para un comprador concreto desde el chat. El comprador debe hacer clic en **Confirmar Recepción** para completar la transacción.
*   **Chat de anuncios**: Cada anuncio genera una conversación fluida en la tabla `trade_chats`. Se dispone de moderación automática contra URLs externas y mensajes de sistema personalizados (cuya visibilidad depende de si eres comprador o vendedor).
*   **Sistema de Mecenas (Patron)**: Estado premium ("Patron") que otorga una estrella dorada en el perfil y anuncios, y oculta los recordatorios de donación (ej. Buy Me A Coffee) en los chats.

### 📋 B. Sistema de Plantillas de Colecciones (Templates)
En lugar de tener un catálogo rígido, los usuarios pueden diseñar y estructurar plantillas de álbumes.
*   **Creador de plantillas**: Asistente visual para definir secciones, páginas y slots personalizados de un álbum.
*   **Seguimiento del progreso**: Los usuarios copian plantillas públicas a su perfil (`user_template_copies`) y gestionan su progreso en tres estados básicos:
    *   **Tengo**: Progreso $= 1$.
    *   **Falta**: Progreso $= 0$.
    *   **Repe (Repetido)**: Progreso $\ge 2$.
*   **Funcionalidades de álbum**: Soporte de variantes, checklists, completado rápido de página (marca todos los cromos faltantes de una página como "Tengo" sin alterar los repetidos) y modal de Entrada Rápida orientada a teclado para ingresar listas de números secuenciales.

### 📥 C. Exportación de Listados desde Álbumes
Los coleccionistas pueden compartir o descargar listados de su inventario mediante un modal integrado (`ListingsModal`) en sus álbumes activos:
*   **Tipos de listado**:
    *   **Repetidos (Dupes)**: Casillas con un contador superior a 1, calculando los cromos sobrantes netos.
    *   **Faltantes (Missing)**: Casillas con estado "Falta".
    *   **Resumen general (Summary)**: Desglose completo de progreso por equipos o páginas de álbumes.
*   **Formatos admitidos**: Descarga local en **PDF** (formateado visualmente) o **CSV** (para importaciones en hojas de cálculo).
*   **Compartición social**: Generación de textos optimizados (`generateShareText`) y accesos directos para enviar por **WhatsApp, Telegram, Facebook y Twitter/X**, además del copiado directo al portapapeles.

### 🔗 D. Integración Mercado-Plantillas
*   **Publicación rápida**: Publicación en 1 clic de cromos repetidos desde la vista del álbum. Autocompleta el formulario del anuncio con los metadatos de la casilla (imágenes, nombre, número).
*   **Sincronización de inventario**: Cuando un anuncio enlazado a un álbum se marca como completado (vendido), un trigger en la base de datos decrementa automáticamente la cantidad de repetidos en `user_template_progress`.

### 🔀 E. Sistema de Emparejamiento (Matches) entre Coleccionistas
Para facilitar los intercambios directos, el sistema compara el progreso de los usuarios para encontrar solapamientos mutuos:
*   **Algoritmo de cruce**: Ejecutado en base de datos mediante la función `find_mutual_traders`. Compara el progreso del usuario $A$ con el de un usuario $B$:
    *   *Ofrecido de B a A*: Cromos que le faltan a $A$ y que $B$ tiene repetidos.
    *   *Ofrecido de A a B*: Cromos que le faltan a $B$ y que $A$ tiene repetidos.
*   **Puntuación por Distancia (Geo-Matching)**: Calcula la distancia física mediante la fórmula del semiverseno (Haversine) basándose en los códigos postales de los perfiles. La coincidencia genera un **Match Score** combinado:
    $$\text{Score} = 0,6 \times \text{Overlap Normalizado} + 0,4 \times \text{Decaimiento por Distancia}$$
*   **Filtros avanzados**: Umbral de coincidencia mínima (ej. mínimo 3, 5, 10 o 20 cromos), ordenación (por distancia, por solapamiento o mixto), y filtros específicos por equipos o rareza del cromo.
*   **Interfaces de usuario**:
    *   **Modo Swipe / Spotlight**: Presentación tipo tarjeta deslizante con acciones de pasar o proponer.
    *   **Modo Grid**: Vista de lista con desglose numérico de coincidencias.
*   **Inicio de negociación**: Al pulsar en "Propone intercambio", el frontend llama a `get_mutual_trade_detail` para obtener el inventario cruzado de cromos que cada uno puede ofrecer y crea la conversación de chat directamente (`get_or_create_match_conversation`).

### 🤝 F. Confirmación de Transacciones y Reputación
Para certificar que los intercambios ocurren de forma real y segura, se implementa un flujo formal de confirmación y puntuación:
*   **Prevención de spam transaccional**: Para solicitar la confirmación de una transacción (`request_trade_confirmation`), el sistema de base de datos **exige obligatoriamente que ambos usuarios hayan intercambiado al menos un mensaje de chat** sobre el anuncio seleccionado.
*   **Flujo de confirmación**:
    1.  El usuario inicia la solicitud indicando la cantidad de cromos intercambiados.
    2.  La contraparte recibe la alerta y puede confirmar (`confirm_trade`) o descartar (`dismiss_trade_confirmation`).
    3.  Al confirmarse, el contador `completed_trades` se incrementa para **ambos** usuarios en sus perfiles públicos.
    4.  El sistema recalcula automáticamente el rango del usuario en su `trade_reputation_tier`:
        *   **Novato**: 0 a 2 intercambios.
        *   **Coleccionista**: 3 a 9 intercambios.
        *   **Experto**: 10 a 24 intercambios.
        *   **Veterano**: 25 a 49 intercambios.
        *   **Leyenda**: 50+ intercambios.
    5.  Se activan los incrementos en la categoría de insignia "Trader".
*   **Visibilidad de confianza**: Las transacciones completadas se muestran en las tarjetas de anuncios (`author_completed_trades`) y en las cabeceras de perfiles públicos para dotar de fiabilidad a los usuarios activos del mercado.

### 💬 G. Compartición de Imágenes y Documentos en el Chat
La interfaz de chat permite compartir evidencias físicas de los cromos y documentación:
*   **Subida a Supabase Storage**: Almacenamiento directo en el bucket `sticker-images` en la ruta estructurada `chat-images/[listingId]/[userId]/[timestamp]`.
*   **Formatos soportados**:
    *   **Documentos PDF**: Subidas directas de hasta 2MB, ideales para compartir listas en PDF de colecciones. Se renderiza un icono de archivo (`FileText`) interactivo y permite su descarga local.
    *   **Imágenes (PNG/JPEG/WEBP)**: Procesado automático en el cliente (`processImageBeforeUpload` a un límite de 0.5MB, redimensionado a 1200px de ancho/alto máximo y calidad al 82% en formato WebP). Generación automática de miniaturas a 300px (`generateThumbnail`) para una carga móvil fluida.
*   **Visualización**: Las imágenes del chat se pueden expandir a pantalla completa en una interfaz interactiva de **Lightbox** táctil.

### 📝 H. Sistema de Blog Multilingüe
CambioCromos cuenta con un módulo de blog para la atracción orgánica de tráfico (SEO) y educación del usuario:
*   **Catálogo de artículos**: 16 artículos específicos que tratan sobre guías locales (ej. intercambio de cromos de Panini en Portugal o Ecuador), seguridad de transacciones, conservación de cartas o guías de iniciación (Pokémon, colecciones de fútbol 2026).
*   **Estructura y Localización**: Los artículos se cargan desde módulos estáticos con traducciones independientes (ES, EN, PT).
*   **Optimización SEO Avanzada**:
    *   Generación dinámica de metadatos canonicals e hreflangs dinámicos en `generateMetadata`.
    *   Inyección automática de datos estructurados **JSON-LD** para esquemas `Blog` y `BlogPosting`.
    *   Estructura semántica HTML5 y optimización de rendimiento móvil en la lectura de artículos.

### 🔔 I. Alertas del Mercado (Marketplace Alerts)
Para evitar que los usuarios tengan que buscar activamente, se implementa un motor de alertas automáticas:
*   **Creación de Alertas**: Desde anuncios del mercado o vistas de álbum, los usuarios pueden configurar alertas basadas en:
    *   `search_query`: Búsqueda textual.
    *   `collection_id`: Filtrado por plantilla específica.
    *   `template_id` / `slot_number` / `slot_variant`: Alerta de un cromo exacto (ej. "Álbum Liga 25-26, Cromo #14B").
*   **Frecuencia**:
    *   `instant`: Envía alertas al instante en cuanto se crea un anuncio que coincide.
    *   `daily`: Agrupa las coincidencias en un resumen diario (digest) enviado a las 9:00 AM.
    *   `weekly`: Agrupa las coincidencias en un resumen semanal enviado los lunes.
*   **Canales**: Notificaciones Push (OneSignal), correo electrónico (Email) o alertas en la interfaz (In-App).
*   **Lógica en base de datos**: Procesado mediante triggers en la inserción/edición de `trade_listings` (`match_listing_against_instant_alerts`). Para evitar saturación, las alertas de tipo *instant* aplican un **cooldown de 1 hora** por usuario.

### 📍 J. Consistencia Geográfica y Validación de Códigos Postales
*   **Validación Multi-país**: Soporte de reglas dinámicas y expresiones regulares (`COUNTRY_POSTCODE_RULES`) en frontend y backend para:
    *   **España (ES)**: 5 dígitos.
    *   **Estados Unidos (US)**: 5 dígitos.
    *   **Brasil (BR)**: Formato CEP (01310-100).
    *   **Argentina (AR)**: Código postal de 4 u 8 caracteres.
    *   **Colombia (CO)**: 6 dígitos.
    *   **México (MX)**: 5 dígitos.
*   **Trigger de Consistencia Geográfica**: El trigger `profiles_validate_postcode` en la base de datos intercepta cualquier guardado de perfil y **valida que el código postal exista dentro de la tabla de referencia `postal_codes`** (que contiene 96,262 registros de coordenadas de todo el mundo). Si no existe, bloquea el guardado. Esto garantiza que todos los cálculos de distancias Haversine para los *Matches* no contengan fallos.

### 🎖️ K. Sistema de Puntos de Experiencia (XP) y Niveles
Sistema de retención y gamificación basado en niveles de usuario:
*   **Premio de XP**: Las acciones en la plataforma otorgan XP a través del procedimiento `award_xp`, registrando la actividad en `xp_history` y sumándola al `xp_total` del perfil.
*   **Trigger de Nivel**: El trigger `auto_update_level` se ejecuta automáticamente ante cualquier modificación en `xp_total` en `profiles`:
    *   Calcula el nivel actual usando la fórmula:
        $$\text{Level} = \text{Greatest}\left(1, \text{Floor}\left(\frac{\text{xp\_total}}{100}\right) + 1\right)$$
    *   Actualiza el nivel del usuario y calcula el XP sobrante para el nivel actual (`xp_current`).
    *   Si el nivel calculado es superior al anterior, genera automáticamente una notificación de tipo `level_up` para celebrar la subida de rango del usuario.

### 🚫 L. Privacidad: Bloqueo de Usuarios e Ignorar Contenido
*   **Bloqueo de Usuarios**: A través del sistema `ignored_users`, los usuarios pueden bloquear a otros. Esto oculta instantáneamente todos los anuncios del usuario bloqueado.
*   **Protección en Chat**: El trigger inmutable `trigger_prevent_messaging_ignored_users` en la tabla `trade_chats` intercepta cualquier intento de inserción de mensajes. Si existe un bloqueo entre el emisor y el receptor (en cualquier dirección), la base de datos cancela la inserción del mensaje y lanza una excepción.
*   **Ignorar anuncios específicos**: Los usuarios pueden silenciar anuncios puntuales (`ignored_listings`) para ocultarlos del buscador general y de la vista de chats.

### ⏳ M. GDPR: Planificador de Retención y Borrado Diferido de Datos
Cumplimiento estricto de privacidad y retención de datos en la tabla `retention_schedule`:
*   **Borrado en Diferido**: Cuando un usuario borra su cuenta o elimina un anuncio, el sistema realiza un borrado lógico y lo planifica en `retention_schedule` con una retención estándar de 90 días (permitiendo recuperación en caso de disputa o error).
*   **Soporte de Legal Hold**: El planificador comprueba la fecha `legal_hold_until`. Si existe una retención legal/hold activa, el registro no se elimina.
*   **Procesamiento automatizado**: Un proceso diario gestionado mediante tareas de base de datos (`process_retention_schedule`) procesa y purga de forma inmutable todas las entidades elegibles que hayan completado su tiempo de retención.

### 🔌 N. Banners Publicitarios y Detección de Adblockers
*   **AdBanner responsivo**: Un banner integrado (`AdBanner.tsx`) que adapta dinámicamente sus tamaños y exclusiones por rutas (oculto en `/login`, `/admin`, etc.).
*   **Bait-Element de detección**: Al cargar, el componente inyecta un elemento invisible en el DOM con firmas y clases típicamente bloqueadas por extensiones de publicidad (ej. `adsbox`, `doubleclick-ad`). Si las extensiones ocultan el elemento, la app lo detecta y muestra un modal solicitando desactivar el bloqueador.

### 🛡️ O. Backoffice de Administración y Moderación
Panel accesible en `/admin` únicamente para usuarios administradores:
*   **Métricas del panel**: 8 tarjetas de estadísticas en tiempo real y banners de usuarios suspendidos.
*   **Gestión de reportes**: Cola de revisión para descartar reportes, eliminar contenido infractor o suspender usuarios.
*   **Registro de auditoría**: Tabla histórica (`audit_log`) inmutable que registra cada acción de los administradores.

---

## 📊 3. Métricas de Base de Datos y Análisis de Uso

Las consultas ejecutadas en la base de datos de producción (`cuzuzitadwmrlocqhhtu`) revelan las siguientes cifras reales de adopción:

### A. Escala General de Usuarios
*   **Usuarios Registrados**: **3.051**
*   **Administradores**: **5**
*   **Usuarios Suspendidos**: **17**
*   **Mensajes de Chat Enviados**: **19.996** (lo que denota alta interacción social)

### B. Penetración de Funcionalidades (Usuarios Únicos)
Esta tabla representa cuántos usuarios distintos han interactuado con cada módulo del sistema:

| Módulo Funcional | Tabla de Destino | Usuarios Únicos | % sobre el total |
| :--- | :--- | :--- | :--- |
| **Seguimiento de Álbumes (Copias)** | `user_template_copies` | **819** | **26.8%** |
| **Mensajería en Chat** | `trade_chats` | **620** | **20.3%** |
| **Vendedores (Creadores de Anuncio)** | `trade_listings` | **352** | **11.5%** |
| **Usuarios que Guardan Favoritos** | `favourites` | **161** | **5.3%** |
| **Compradores en Transacciones** | `listing_transactions` | **35** | **1.1%** |
| **Creadores de Alertas de Mercado** | `marketplace_alerts` | **11** | **0.36%** |
| **Evaluadores (Dejaron valoración)** | `user_ratings` | **8** | **0.26%** |
| **Valoradores de Plantillas** | `template_ratings` | **5** | **0.16%** |

*   *Dato de gamificación*: **913 usuarios únicos (29.9%)** han obtenido al menos una insignia de progreso.

### C. Desglose de Anuncios en el Mercado
*   **Total de Anuncios Creados**: **2.877**
*   **Anuncios Activos**: **1.965**
*   **Anuncios Reservados**: **23**
*   **Transacciones Completadas**: **6**
*   **Eliminados por el vendedor**: **733**
*   **ELIMINADOS por moderación**: **150**
*   **Lotes o Packs**: **402 anuncios** (14% del total) creados por **209 vendedores**, conteniendo un total de **13,019 cromos individuales** (un promedio de ~32 cromos por pack).

### D. Álbumes más Populares
De las **24 plantillas** de colecciones creadas, las más copiadas por los usuarios son:
1.  **Panini Copa Mundial de la FIFA 2026**: **542 copias**
2.  **ADRENALYN XL 25-26**: **170 copias**
3.  **LALIGA 2025-26**: **61 copias**
4.  **MEGACRACKS 2025-26**: **53 copias**
5.  **Adrenalyn XL FIFA World Cup 2026**: **26 copias**

---

## 🗑️ 4. Sistemas Deprecados, Heredados y No Utilizados

La auditoría de Git y el análisis de código identifican dos grandes sistemas anteriores que han quedado fuera de uso:

### A. El "Sistema de Colecciones Oficiales" (Eliminado)
*   **Cuándo**: Eliminado en octubre de 2025 (`fe01c28` - fase de limpieza 0).
*   **Detalles**: La aplicación inicialmente gestionaba catálogos cargados de manera centralizada. Este catálogo estático fue completamente reemplazado por el sistema de plantillas comunitarias.
*   **Tablas eliminadas**: `collections`, `stickers`, `collection_teams`, `collection_pages`, `page_slots`, `user_collections`, `user_stickers`.
*   **RPCs eliminados**: `find_mutual_traders` (firma antigua), `get_user_collection_stats`, `get_completion_report`, `bulk_add_stickers_by_numbers`, `search_stickers`, `mark_team_page_complete`.

### B. El "Sistema de Propuestas de Intercambio" (Heredado / Deprecado)
*   **Cuándo**: Deprecado en diciembre de 2025 (`7873396`).
*   **Detalles**: El intercambio original de cromos funcionaba mediante propuestas formales en las que se detallaban qué cromos ofrecía un usuario y cuáles solicitaba a cambio. Este sistema rígido ha sido totalmente reemplazado por la flexibilidad de los **Anuncios de Mercado** con comunicación directa por chat y reservas inmediatas.
*   **Estado actual del código**:
    *   La página principal de `/intercambios` fue reemplazada por un componente de **"Próximamente" (Coming Soon)** en mayo de 2026 (`4b36b6f`), invitando al usuario a utilizar la sección de mercado.
    *   Las tablas de base de datos (`trade_proposals`, `trade_proposal_items`, `trade_finalizations`, `trades_history`) se conservan exclusivamente para compatibilidad con intercambios antiguos en curso. Actualmente solo quedan datos residuales en base de datos: 4 propuestas, 17 ítems y 1 finalización. El código correspondiente está marcado con comentarios `// LEGACY:`.
    *   Las notificaciones del sistema de propuestas (`proposal_accepted`, `proposal_rejected`, etc.) vienen desactivadas por defecto y se ocultan en la interfaz de preferencias de notificaciones.

### C. Banners de Auto-promoción y Ajustes de Anuncios
*   **Cuándo**: Primer trimestre de 2026 (`1028eb6` y `fb29e6d`).
*   **Detalles**: Se eliminaron los banners de auto-promoción internos y se redujo a la mitad la altura de los banners publicitarios de terceros para maximizar la superficie visual útil en dispositivos móviles. Asimismo, se revirtieron integraciones de scripts publicitarios pesados en cabecera (como Ezoic).
