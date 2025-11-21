# Guía de Despliegue - CambioCromos

Esta guía cubre el proceso completo de despliegue de CambioCromos a producción.

## Pre-requisitos

- ✅ Cuenta de [Vercel](https://vercel.com)
- ✅ Proyecto de [Supabase](https://supabase.com) configurado
- ✅ Cuenta de [Sentry](https://sentry.io) (opcional, para error tracking)
- ✅ Acceso al repositorio de GitHub

## Variables de Entorno

### Variables Requeridas

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Dónde encontrar las credenciales de Supabase:**
1. Ve a tu [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Settings > API
4. Copia Project URL y anon/public key

### Variables Opcionales

```bash
# Error Tracking (Recomendado para producción)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Environment
NODE_ENV=production
```

## Configuración de Vercel

### 1. Importar Proyecto

```bash
# Desde el dashboard de Vercel
1. Click "Add New Project"
2. Importa tu repositorio de GitHub
3. Framework Preset: Next.js
4. Root Directory: ./
```

### 2. Configurar Variables de Entorno

```bash
# En el dashboard de Vercel
Settings > Environment Variables

Añade todas las variables requeridas y opcionales
```

### 3. Configuración de Build

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

## Configuración de Supabase

### 1. Base de Datos

```bash
# Ejecutar migraciones en orden
1. Phase 0: Cleanup
2. Sprint 1: Marketplace
3. Sprint 2: Templates
4. Sprint 3: Integration
5. Sprint 4: Social
6. Sprint 5: Admin
```

**Vía Supabase Dashboard:**
1. SQL Editor
2. Pega el contenido de cada archivo de migración
3. Ejecuta en orden

### 2. Storage Buckets

```sql
-- Crear bucket para imágenes de cromos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sticker-images',
  'sticker-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Crear bucket para avatares
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

### 3. Authentication

```bash
# En Supabase Dashboard
Authentication > Providers

# Configurar:
- Email/Password ✅ Habilitado
- Email confirmations ✅ Habilitado
- Rate limiting ✅ Habilitado
```

### 4. Row Level Security (RLS)

```bash
# Verificar que RLS está habilitado en todas las tablas
# Esto ya viene configurado en las migraciones
```

## Configuración de Sentry (Opcional)

### 1. Crear Proyecto en Sentry

```bash
1. Ve a sentry.io
2. Create Project
3. Platform: Next.js
4. Copia el DSN
```

### 2. Configurar en Vercel

```bash
# Añadir variable de entorno
NEXT_PUBLIC_SENTRY_DSN=tu-dsn-de-sentry
```

## Proceso de Despliegue

### Despliegue Inicial

```bash
# 1. Commit final
git add .
git commit -m "chore: prepare for production deployment"
git push origin main

# 2. Vercel detectará automáticamente el push
# 3. Build se ejecutará automáticamente
# 4. Si tiene éxito, se desplegará a producción
```

### Despliegues Subsecuentes

```bash
# Cada push a main despliega automáticamente
git push origin main

# Preview deployments para PRs
git checkout -b feature/nueva-feature
git push origin feature/nueva-feature
# Abre un PR → Vercel crea preview deployment
```

## Post-Despliegue

### Verificaciones Necesarias

#### 1. Health Check

```bash
# Verificar que la app carga
https://tu-dominio.vercel.app

# Verificar páginas críticas
https://tu-dominio.vercel.app/marketplace
https://tu-dominio.vercel.app/templates
https://tu-dominio.vercel.app/login
```

#### 2. Funcionalidad

- [ ] Login funciona
- [ ] Crear listing funciona
- [ ] Ver plantillas funciona
- [ ] Copiar plantilla funciona
- [ ] Chat funciona (si aplicable)
- [ ] Imagenes cargan correctamente

#### 3. Performance

```bash
# Ejecutar Lighthouse en modo incógnito
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: >95
```

#### 4. Error Tracking

```bash
# Verificar en Sentry Dashboard
- Errores se están capturando
- Releases están tagueados
- Source maps se cargaron
```

### Monitoreo

#### Vercel Analytics

```bash
# Habilitar en Vercel Dashboard
Project Settings > Analytics > Enable
```

**Métricas a monitorear:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)

#### Supabase

```bash
# En Supabase Dashboard
Reports > Database

Monitorear:
- Query performance
- Connection count
- Database size
- Slow queries
```

#### Sentry

```bash
# En Sentry Dashboard
Issues

Monitorear:
- Error rate
- Performance degradation
- User impact
```

## Rollback

### Rollback en Vercel

```bash
# Vía Dashboard
1. Deployments
2. Selecciona deployment anterior
3. Click "Promote to Production"

# Vía CLI
vercel rollback
```

### Rollback de Base de Datos

```bash
# Manual: Ejecutar migration inversa
# Siempre hacer backup antes de migration
```

## Dominios Personalizados

### Añadir Dominio

```bash
# En Vercel Dashboard
1. Settings > Domains
2. Add Domain
3. Ingresa tu dominio
4. Sigue instrucciones de DNS
```

### Configuración DNS

```bash
# Añade estos registros en tu proveedor de DNS:

Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## CI/CD Pipeline

### GitHub Actions (Opcional)

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Troubleshooting

### Build Fails

```bash
# Error común: Out of memory
Solution: Increase Node memory
NEXT_PUBLIC_NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Supabase Connection Issues

```bash
# Verificar:
1. Variables de entorno correctas
2. Supabase project no está pausado
3. RLS policies permiten acceso
```

### Images Not Loading

```bash
# Verificar:
1. Storage buckets están públicos
2. CORS está configurado
3. Images existen en el bucket
```

## Mantenimiento

### Backups

```bash
# Supabase hace backups automáticos
# Para backup manual:
Supabase Dashboard > Database > Backups
```

### Updates

```bash
# Actualizar dependencias mensualmente
npm update
npm audit fix

# Verificar breaking changes
npm outdated
```

## Checklist de Despliegue

### Pre-Despliegue

- [ ] Tests pasan localmente
- [ ] Build exitoso localmente
- [ ] Variables de entorno configuradas
- [ ] Migraciones de DB aplicadas
- [ ] Storage buckets creados
- [ ] RLS policies verificadas

### Despliegue

- [ ] Code pushed a main
- [ ] Vercel build exitoso
- [ ] Deployment completado

### Post-Despliegue

- [ ] Health check pasó
- [ ] Funcionalidad crítica verificada
- [ ] Performance aceptable
- [ ] Error tracking funcionando
- [ ] Monitoreo configurado

---

**Última actualización**: 2025-01-22
