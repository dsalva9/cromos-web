/**
 * Badge Configuration
 * Maps badge IDs to their icons and provides metadata
 */

import type { BadgeCategory, BadgeTier } from '@/types/badges';
import {
  BookCopy,
  BookMarked,
  Library,
  Pencil,
  PenTool,
  Sparkles,
  MessageSquare,
  MessageCircle,
  MessagesSquare,
  CheckCircle,
  CheckCircle2,
  Award,
  Repeat,
  RefreshCw,
  TrendingUp,
  Crown,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon mapping for badge definitions
 */
export const BADGE_ICONS: Record<string, LucideIcon> = {
  // Collector badges
  BookCopy,
  BookMarked,
  Library,

  // Creator badges
  Pencil,
  PenTool,
  Sparkles,

  // Reviewer badges
  MessageSquare,
  MessageCircle,
  MessagesSquare,

  // Completionist badges
  CheckCircle,
  CheckCircle2,
  Award,

  // Trader badges
  Repeat,
  RefreshCw,
  TrendingUp,

  // Special badges
  Crown,
};

/**
 * Color schemes for badge tiers
 */
export const BADGE_TIER_COLORS: Record<
  BadgeTier,
  {
    bg: string;
    border: string;
    text: string;
    icon: string;
    glow?: string;
  }
> = {
  bronze: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-900 dark:text-amber-100',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  silver: {
    bg: 'bg-slate-50 dark:bg-slate-800/30',
    border: 'border-slate-300 dark:border-slate-600',
    text: 'text-slate-900 dark:text-slate-100',
    icon: 'text-slate-600 dark:text-slate-400',
  },
  gold: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-400 dark:border-yellow-600',
    text: 'text-yellow-900 dark:text-yellow-100',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  special: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-900 dark:text-purple-100',
    icon: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-500/50',
  },
};

/**
 * Category display information
 */
export const BADGE_CATEGORIES: Record<
  BadgeCategory,
  {
    name_es: string;
    description_es: string;
    color: string;
  }
> = {
  collector: {
    name_es: 'Coleccionista',
    description_es: 'Copia colecciones para tu biblioteca',
    color: 'text-blue-600 dark:text-blue-400',
  },
  creator: {
    name_es: 'Creador',
    description_es: 'Crea colecciones para la comunidad',
    color: 'text-green-600 dark:text-green-400',
  },
  reviewer: {
    name_es: 'Opinador',
    description_es: 'Califica y comenta colecciones',
    color: 'text-indigo-600 dark:text-indigo-400',
  },
  completionist: {
    name_es: 'Completista',
    description_es: 'Completa colecciones al 100%',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  trader: {
    name_es: 'Trader',
    description_es: 'Intercambia cromos exitosamente',
    color: 'text-orange-600 dark:text-orange-400',
  },
  top_rated: {
    name_es: 'Top Valorado',
    description_es: 'Mantén una excelente reputación',
    color: 'text-purple-600 dark:text-purple-400',
  },
};

/**
 * Get icon component for a badge
 */
export function getBadgeIcon(iconName: string): LucideIcon | null {
  return BADGE_ICONS[iconName] || null;
}

/**
 * Get tier colors for a badge
 */
export function getBadgeTierColors(tier: BadgeTier) {
  return BADGE_TIER_COLORS[tier];
}

/**
 * Get category info
 */
export function getCategoryInfo(category: BadgeCategory) {
  return BADGE_CATEGORIES[category];
}

/**
 * Tier display labels (football-themed)
 */
export const BADGE_TIER_LABELS: Record<BadgeTier, string> = {
  bronze: 'CANTERA',
  silver: 'TITULAR',
  gold: 'ESTRELLA',
  special: 'LEYENDA',
};

/**
 * Get tier display label
 */
export function getTierLabel(tier: BadgeTier): string {
  return BADGE_TIER_LABELS[tier];
}
