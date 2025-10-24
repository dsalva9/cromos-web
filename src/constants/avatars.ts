/**
 * Avatar preset system
 *
 * Naming pattern: default-{theme}-{number}.png
 * Storage: public/avatars/default-*.png
 * Each avatar is 256x256px, <80KB, optimized for web
 *
 * Themes:
 * - comic: Retro comic-style characters
 * - geometric: Simple geometric shapes with personality
 * - cromo: Card/sticker themed avatars
 */

export interface AvatarPreset {
  id: string;
  label: string;
  /** Path within public folder (will be served via Next.js static assets) */
  publicPath: string;
  /** Storage path when copying to Supabase (for consistency) */
  storagePath?: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'comic-hero',
    label: 'Héroe Cómic',
    publicPath: '/avatars/default-comic-1.svg',
  },
  {
    id: 'comic-villain',
    label: 'Villano Retro',
    publicPath: '/avatars/default-comic-2.svg',
  },
  {
    id: 'geometric-circle',
    label: 'Círculo Cool',
    publicPath: '/avatars/default-geometric-1.svg',
  },
  {
    id: 'geometric-triangle',
    label: 'Triángulo Épico',
    publicPath: '/avatars/default-geometric-2.svg',
  },
  {
    id: 'cromo-gold',
    label: 'Cromo Dorado',
    publicPath: '/avatars/default-cromo-1.svg',
  },
  {
    id: 'cromo-silver',
    label: 'Cromo Plateado',
    publicPath: '/avatars/default-cromo-2.svg',
  },
  {
    id: 'retro-star',
    label: 'Estrella Retro',
    publicPath: '/avatars/default-retro-1.svg',
  },
  {
    id: 'retro-lightning',
    label: 'Rayo Vintage',
    publicPath: '/avatars/default-retro-2.svg',
  },
];

/**
 * Get avatar preset by ID
 */
export function getAvatarPreset(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find(preset => preset.id === id);
}

/**
 * Check if a path is a preset avatar
 */
export function isPresetAvatar(path: string | null | undefined): boolean {
  if (!path) return false;
  return AVATAR_PRESETS.some(preset =>
    path.includes(preset.publicPath) || path.includes(preset.id)
  );
}
