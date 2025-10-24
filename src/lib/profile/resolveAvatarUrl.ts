import { SupabaseClient } from '@supabase/supabase-js';
import { isPresetAvatar } from '@/constants/avatars';

/**
 * Resolves avatar URL from various formats:
 * - Full HTTP/HTTPS URLs (returned as-is)
 * - Preset avatar paths (public Next.js paths starting with /)
 * - Supabase storage paths (converted to public URL)
 * - null/undefined (returns null)
 */
export function resolveAvatarUrl(
  value: string | null | undefined,
  supabase: SupabaseClient
): string | null {
  if (!value) return null;

  // Already a full URL
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // Preset avatar (Next.js public path)
  if (value.startsWith('/avatars/') || isPresetAvatar(value)) {
    return value;
  }

  // Supabase storage path - convert to public URL
  const { data } = supabase.storage.from('avatars').getPublicUrl(value);
  return data.publicUrl;
}

/**
 * Get fallback avatar (gradient with initial)
 */
export function getAvatarFallback(nickname: string | null | undefined): {
  initial: string;
  gradientClass: string;
} {
  const initial = (nickname?.[0] ?? '?').toUpperCase();

  // Generate consistent gradient based on first character
  const charCode = initial.charCodeAt(0);
  const gradients = [
    'bg-gradient-to-br from-[#FFC000] to-[#FF8C00]',
    'bg-gradient-to-br from-[#FF6B6B] to-[#C92A2A]',
    'bg-gradient-to-br from-[#4ECDC4] to-[#1A535C]',
    'bg-gradient-to-br from-[#95E1D3] to-[#38A3A5]',
    'bg-gradient-to-br from-[#A8E6CF] to-[#56AB91]',
    'bg-gradient-to-br from-[#FFB6B9] to-[#FFC6C7]',
  ];

  const gradientClass = gradients[charCode % gradients.length];

  return { initial, gradientClass };
}
