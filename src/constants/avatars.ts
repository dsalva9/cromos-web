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
  // Generated avatars
  { id: 'avatar-01', label: 'Avatar 01', publicPath: '/avatars/avatar01-full.webp' },
  { id: 'avatar-02', label: 'Avatar 02', publicPath: '/avatars/avatar02-full.webp' },
  { id: 'avatar-03', label: 'Avatar 03', publicPath: '/avatars/avatar03-full.webp' },
  { id: 'avatar-04', label: 'Avatar 04', publicPath: '/avatars/avatar04-full.webp' },
  { id: 'avatar-05', label: 'Avatar 05', publicPath: '/avatars/avatar05-full.webp' },
  { id: 'avatar-06', label: 'Avatar 06', publicPath: '/avatars/avatar06-full.webp' },
  { id: 'avatar-07', label: 'Avatar 07', publicPath: '/avatars/avatar07-full.webp' },
  { id: 'avatar-08', label: 'Avatar 08', publicPath: '/avatars/avatar08-full.webp' },
  { id: 'avatar-09', label: 'Avatar 09', publicPath: '/avatars/avatar09-full.webp' },
  { id: 'avatar-10', label: 'Avatar 10', publicPath: '/avatars/avatar10-full.webp' },
  { id: 'avatar-21', label: 'Avatar 21', publicPath: '/avatars/avatar21-full.webp' },
  { id: 'avatar-22', label: 'Avatar 22', publicPath: '/avatars/avatar22-full.webp' },
  { id: 'avatar-23', label: 'Avatar 23', publicPath: '/avatars/avatar23-full.webp' },
  { id: 'avatar-24', label: 'Avatar 24', publicPath: '/avatars/avatar24-full.webp' },
  { id: 'avatar-25', label: 'Avatar 25', publicPath: '/avatars/avatar25-full.webp' },
  { id: 'avatar-26', label: 'Avatar 26', publicPath: '/avatars/avatar26-full.webp' },
  { id: 'avatar-27', label: 'Avatar 27', publicPath: '/avatars/avatar27-full.webp' },
  { id: 'avatar-28', label: 'Avatar 28', publicPath: '/avatars/avatar28-full.webp' },
  { id: 'avatar-29', label: 'Avatar 29', publicPath: '/avatars/avatar29-full.webp' },
  { id: 'avatar-30', label: 'Avatar 30', publicPath: '/avatars/avatar30-full.webp' },
  { id: 'avatar-31', label: 'Avatar 31', publicPath: '/avatars/avatar31-full.webp' },
  { id: 'avatar-32', label: 'Avatar 32', publicPath: '/avatars/avatar32-full.webp' },
  { id: 'avatar-33', label: 'Avatar 33', publicPath: '/avatars/avatar33-full.webp' },
  { id: 'avatar-34', label: 'Avatar 34', publicPath: '/avatars/avatar34-full.webp' },
  { id: 'avatar-35', label: 'Avatar 35', publicPath: '/avatars/avatar35-full.webp' },
  { id: 'avatar-36', label: 'Avatar 36', publicPath: '/avatars/avatar36-full.webp' },
  { id: 'avatar-37', label: 'Avatar 37', publicPath: '/avatars/avatar37-full.webp' },
  { id: 'avatar-38', label: 'Avatar 38', publicPath: '/avatars/avatar38-full.webp' },
  { id: 'avatar-39', label: 'Avatar 39', publicPath: '/avatars/avatar39-full.webp' },
  { id: 'avatar-40', label: 'Avatar 40', publicPath: '/avatars/avatar40-full.webp' },
  { id: 'avatar-41', label: 'Avatar 41', publicPath: '/avatars/avatar41-full.webp' },
  { id: 'avatar-42', label: 'Avatar 42', publicPath: '/avatars/avatar42-full.webp' },
  { id: 'avatar-43', label: 'Avatar 43', publicPath: '/avatars/avatar43-full.webp' },
  { id: 'avatar-44', label: 'Avatar 44', publicPath: '/avatars/avatar44-full.webp' },
  { id: 'avatar-45', label: 'Avatar 45', publicPath: '/avatars/avatar45-full.webp' },
  { id: 'avatar-46', label: 'Avatar 46', publicPath: '/avatars/avatar46-full.webp' },
  { id: 'avatar-47', label: 'Avatar 47', publicPath: '/avatars/avatar47-full.webp' },
  { id: 'avatar-48', label: 'Avatar 48', publicPath: '/avatars/avatar48-full.webp' },
  { id: 'avatar-49', label: 'Avatar 49', publicPath: '/avatars/avatar49-full.webp' },
  { id: 'avatar-50', label: 'Avatar 50', publicPath: '/avatars/avatar50-full.webp' },
  { id: 'cambiocromos-001', label: 'CambioCromos 01', publicPath: '/avatars/cambiocromos-avatar-001-full.webp' },
  { id: 'cambiocromos-002', label: 'CambioCromos 02', publicPath: '/avatars/cambiocromos-avatar-002-full.webp' },
  { id: 'cambiocromos-003', label: 'CambioCromos 03', publicPath: '/avatars/cambiocromos-avatar-003-full.webp' },
  { id: 'cambiocromos-004', label: 'CambioCromos 04', publicPath: '/avatars/cambiocromos-avatar-004-full.webp' },
  { id: 'cambiocromos-005', label: 'CambioCromos 05', publicPath: '/avatars/cambiocromos-avatar-005-full.webp' },
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
