# Resumen de Funcionalidad de CambioCromos para Testers

## 🎯 Visión General
**CambioCromos** es una plataforma de mercado y comunidad para el intercambio de cromos deportivos (fútbol, etc.). El objetivo principal es permitir a los usuarios gestionar sus colecciones, publicar cromos repetidos y completar sus álbumes mediante compra/venta e intercambio con otros usuarios.

El sistema ha pivotado de un modelo de intercambio automático a un **marketplace abierto** donde los usuarios interactúan directamente.

---

## 👥 Roles de Usuario

1.  **Coleccionista (Usuario Estándar)**: Gestiona sus colecciones, marca faltantes/repetidos, compra y vende.
2.  **Creador de Plantillas**: Usuario que crea estructuras de álbumes (plantillas) públicas para que otros las usen.
3.  **Administrador**: Modera contenido, gestiona reportes y usuarios suspendidos.

---

## 🚀 Flujos Principales a Probar

### 1. Autenticación y Perfil
*   **Registro e Inicio de Sesión**: Email/password, recuperación de contraseña.
*   **Gestión de Perfil**:
    *   Cambiar avatar y datos personales.
    *   Configurar código postal (importante para el cálculo de distancia en el marketplace).
    *   Ver estadísticas propias (valoraciones, insignias).
    *   **Notificaciones**: Centro de notificaciones unificado (compras, ventas, chats, valoraciones).

### 2. Gestión de Colecciones (Plantillas)
*   **Explorador de Plantillas**: Buscar y copiar plantillas públicas creadas por la comunidad.
*   **Mis Plantillas**:
    *   Ver progreso visual (% completado, faltantes, repetidos).
    *   **Interfaz de Álbum**: Marcar cromos como "Lo Tengo", "Me Falta", "Repe" (con contador).
    *   **Entrada Rápida**: Modal para meter números rápidamente.
*   **Creación de Plantillas (Para Creadores)**:
    *   Crear estructura de álbum (páginas, huecos).
    *   Definir visibilidad (Pública/Privada).
    *   Soporte para variantes (5A, 5B) y numeración global.

### 3. Marketplace (Compra y Venta)
*   **Publicar Anuncio**:
    *   **Desde Plantilla**: "Publicar Repes" (publicación masiva o individual desde el álbum). Autocompleta datos.
    *   **Manual**: Crear anuncio con foto (obligatoria), título, precio, descripción.
*   **Buscar y Filtrar**:
    *   Búsqueda por texto (jugador, equipo).
    *   **Filtro por Distancia**: Ver vendedores cercanos (requiere CP).
    *   Filtro por Colección.
*   **Interacción en Anuncio**:
    *   **Chat**: Iniciar conversación desde un anuncio.
    *   **Estados del Anuncio**:
        *   `Activo`: Visible para todos.
        *   `Reservado`: El vendedor lo reserva para un comprador específico (el chat cambia de estado).
        *   `Completado`: Ambas partes confirman. Permite valoración.
        *   `Vendido/Eliminado`: Ya no disponible.

### 4. Sistema Social y Reputación
*   **Valoraciones**:
    *   Al completar un trato, valorar al otro usuario (1-5 estrellas + comentario).
    *   Las valoraciones son visibles en el perfil público.
*   **Favoritos**:
    *   Guardar anuncios, plantillas o usuarios favoritos.
*   **Reportes**:
    *   Reportar contenido inapropiado (anuncios, usuarios, plantillas).

### 5. Experiencia Móvil (PWA/Capacitor)
*   **Navegación**: Menú inferior (Bottom Bar) con accesos rápidos.
*   **FAB (Botón Flotante)**: Acceso rápido para "Publicar Anuncio" o "Crear Plantilla".
*   **Cámara**: Uso de cámara nativa para fotos de cromos.
*   **Gestos**: Haptic feedback (vibración) en interacciones.

---

## ℹ️ Notas para Testers

*   **Enfoque Visual**: La app tiene un diseño "Retro-Comic" con alto contraste. Verificar que se vea bien en modo oscuro (por defecto).
*   **Sincronización**: Al vender un cromo vinculado a una plantilla, el contador de "Repes" en la plantilla debería bajar automáticamente.
*   **Chat**: Probar el flujo completo de: Pregunta -> Reserva -> Confirmación -> Valoración -> Cierre de chat.
*   **Móvil**: La prioridad es la experiencia en móvil. Pruebe en dimensiones de pantalla pequeña.
