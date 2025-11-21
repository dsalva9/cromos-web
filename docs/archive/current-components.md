# Current Components – Sprint 16 Update (2025-10-28)

## Profile Completion Experience

- **ProfileCompletionProvider**: Context provider that exposes profile completion status, refresh helpers, and optimistic updates for nickname/código postal.
- **ProfileCompletionGuard**: Client guard used by marketplace/plantillas layouts to redirect usuarios sin perfil completo a `/profile/completar`.
- **`/profile/completar` page**: Full-screen form con `AvatarPicker`, validación de usuario único y código postal obligatorio antes de habilitar la app.
- **SiteHeader & UserAvatarDropdown**: Interceptan navegación hacia Marketplace, Mis Colecciones, Plantillas y Mis Anuncios cuando falta completar el perfil, mostrando el toast requerido.

## Authentication Flow

- **Login & Auth Callback**: Tras iniciar sesión, consultan `profiles` para decidir si redirigir a `/profile/completar` o al home.
- **Supabase Profile Migration**: La migración `20251028093000_enforce_profile_completion.sql` añade checks NOT VALID y un índice único case-insensitive para garantizar datos obligatorios.

