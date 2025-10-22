# Guía de Contribución

¡Gracias por tu interés en contribuir a CambioCromos! Esta guía te ayudará a entender cómo puedes aportar al proyecto.

## Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Proceso de Pull Requests](#proceso-de-pull-requests)
- [Estándares de Código](#estándares-de-código)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Nuevas Funcionalidades](#sugerir-nuevas-funcionalidades)
- [Primeras Contribuciones](#primeras-contribuciones)

## Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas un ambiente respetuoso y constructivo.

### Nuestros Estándares

- **Sé respetuoso**: Trata a todos con respeto y consideración
- **Sé constructivo**: Proporciona feedback constructivo y útil
- **Sé colaborativo**: Trabaja en equipo para mejorar el proyecto
- **Sé paciente**: Entiende que todos estamos aprendiendo

## Cómo Contribuir

### 1. Fork del Repositorio

```bash
# Haz fork del repositorio en GitHub
# Luego clona tu fork localmente
git clone https://github.com/TU-USUARIO/cromos-web.git
cd cromos-web
```

### 2. Crear una Rama

```bash
# Crea una rama para tu feature o fix
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/descripcion-del-bug
```

### 3. Hacer Cambios

- Escribe código limpio y mantenible
- Sigue las convenciones del proyecto
- Añade tests si es aplicable
- Actualiza la documentación si es necesario

### 4. Commit de Cambios

```bash
# Añade los archivos modificados
git add .

# Haz commit con un mensaje descriptivo
git commit -m "feat: añadir validación de formularios con Zod"
```

#### Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `style:` - Cambios de formato (no afectan código)
- `refactor:` - Refactorización de código
- `perf:` - Mejoras de rendimiento
- `test:` - Añadir o modificar tests
- `chore:` - Tareas de mantenimiento

### 5. Push y Pull Request

```bash
# Push a tu fork
git push origin feature/nombre-descriptivo
```

Luego abre un Pull Request en GitHub.

## Proceso de Pull Requests

### Antes de Enviar

- ✅ El código compila sin errores: `npm run build`
- ✅ No hay warnings de ESLint: `npm run lint`
- ✅ Los tests pasan (si aplicable): `npm run test:e2e`
- ✅ Has actualizado la documentación relevante
- ✅ Has añadido tests para nuevas funcionalidades

### Descripción del PR

Tu Pull Request debe incluir:

1. **Título claro y descriptivo**
   - Ejemplo: "feat: añadir validación de formularios con Zod"

2. **Descripción detallada**
   ```markdown
   ## Cambios

   - Añadido validación con Zod para formularios de marketplace
   - Creados schemas de validación en src/lib/validations/
   - Actualizada documentación en README.md

   ## Tipo de Cambio

   - [ ] Bug fix (cambio que corrige un issue)
   - [x] Nueva funcionalidad (cambio que añade funcionalidad)
   - [ ] Breaking change (cambio que rompe compatibilidad)

   ## Testing

   - [x] He probado localmente estos cambios
   - [x] He añadido tests para cubrir estos cambios
   - [x] Todos los tests existentes pasan

   ## Capturas (si aplica)

   [Añadir capturas de pantalla si hay cambios visuales]
   ```

### Proceso de Revisión

1. Un maintainer revisará tu PR
2. Pueden solicitar cambios o aclaraciones
3. Una vez aprobado, se hará merge a `main`

## Estándares de Código

### TypeScript

- **Tipado estricto**: Usa tipos explícitos, evita `any`
- **Interfaces vs Types**: Usa `interface` para objetos, `type` para uniones
- **Nombres descriptivos**: Variables y funciones con nombres claros

```typescript
// ✅ Bueno
interface UserProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

function getUserProfile(userId: string): Promise<UserProfile> {
  // ...
}

// ❌ Malo
const data: any = {};
function get(id: string) {
  // ...
}
```

### React

- **Componentes funcionales**: Usa hooks, no class components
- **Nombres de componentes**: PascalCase para componentes
- **Props destructuring**: Destructura props en la firma de la función

```typescript
// ✅ Bueno
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// ❌ Malo
export function button(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Estilos

- **Tailwind CSS**: Usa clases de Tailwind para estilos
- **Componentes UI**: Usa shadcn/ui cuando sea posible
- **Tema consistente**: Sigue el sistema de diseño retro-comic

```typescript
// ✅ Bueno
<div className="bg-[#1F2937] rounded-lg border-2 border-black shadow-xl p-4">
  <h2 className="text-2xl font-black uppercase text-white mb-4">
    Título
  </h2>
</div>

// ❌ Malo
<div style={{ backgroundColor: '#1F2937', padding: '16px' }}>
  <h2 style={{ fontSize: '24px' }}>Título</h2>
</div>
```

### Logging y Errores

- **Usa el logger utility**: No uses `console.log` directamente
- **Mensajes en español**: Todos los mensajes de usuario en español
- **Error handling**: Siempre maneja errores apropiadamente

```typescript
// ✅ Bueno
import { logger } from '@/lib/logger';
import { ERROR_MESSAGES } from '@/lib/constants/errors';

try {
  await createListing(data);
  toast.success('¡Anuncio creado con éxito!');
} catch (error) {
  logger.error('Failed to create listing:', error);
  toast.error(ERROR_MESSAGES.LISTING_CREATE_FAILED);
}

// ❌ Malo
try {
  await createListing(data);
  console.log('Listing created');
} catch (error) {
  console.error(error);
  alert('Error');
}
```

## Estructura del Proyecto

```
cromos-web/
├── src/
│   ├── app/              # Next.js app directory (pages)
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── marketplace/ # Marketplace components
│   │   └── templates/   # Template components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions
│   │   ├── constants/   # Constants (errors, etc.)
│   │   └── validations/ # Zod schemas
│   └── types/           # TypeScript types
├── docs/                # Documentation
├── scripts/             # Utility scripts
└── tests/               # Test files
```

### Convenciones de Nombres

- **Archivos de componentes**: PascalCase (`ListingCard.tsx`)
- **Archivos de hooks**: camelCase con prefijo use (`useListings.ts`)
- **Archivos de utilidades**: camelCase (`formatDate.ts`)
- **Archivos de tipos**: camelCase (`v1.6.0.ts`)

## Reportar Bugs

### Antes de Reportar

1. **Busca en Issues existentes**: Puede que ya esté reportado
2. **Reproduce el bug**: Asegúrate de que es reproducible
3. **Verifica la versión**: Usa la última versión del código

### Plantilla de Bug Report

```markdown
## Descripción del Bug

Descripción clara y concisa del bug.

## Pasos para Reproducir

1. Ve a '...'
2. Haz clic en '...'
3. Scroll hasta '...'
4. Ver error

## Comportamiento Esperado

Lo que debería pasar.

## Comportamiento Actual

Lo que realmente pasa.

## Capturas de Pantalla

Si aplica, añade capturas.

## Entorno

- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Versión: [e.g. v1.6.3]

## Información Adicional

Cualquier contexto adicional.
```

## Sugerir Nuevas Funcionalidades

### Plantilla de Feature Request

```markdown
## Descripción de la Funcionalidad

Descripción clara de lo que quieres que se añada.

## Problema que Resuelve

¿Qué problema resuelve esta funcionalidad?

## Solución Propuesta

Describe cómo debería funcionar.

## Alternativas Consideradas

¿Qué otras soluciones has considerado?

## Contexto Adicional

Capturas, mockups, ejemplos, etc.
```

## Primeras Contribuciones

¿Primera vez contribuyendo a open source? ¡Bienvenido! Aquí hay algunas issues etiquetadas como "good first issue":

1. Busca issues con la etiqueta `good-first-issue`
2. Comenta en el issue que quieres trabajar en él
3. Un maintainer te asignará el issue
4. ¡Empieza a programar!

### Issues Sugeridas para Empezar

- Añadir tests unitarios
- Mejorar documentación
- Corregir typos
- Añadir traducciones
- Mejorar estilos CSS

## Recursos Útiles

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de React](https://react.dev/)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [Guía de TypeScript](https://www.typescriptlang.org/docs/)

## Preguntas

¿Tienes preguntas? Puedes:

- Abrir un issue con la etiqueta `question`
- Unirte a nuestro Discord (si existe)
- Contactar a los maintainers

## Licencia

Al contribuir a este proyecto, aceptas que tus contribuciones se licenciarán bajo la [MIT License](../LICENSE).

---

¡Gracias por contribuir a CambioCromos! 🎉
