/**
 * Utilities for formatting dates and times in chat components.
 */

const RELATIVE_LABELS: Record<string, { today: string; yesterday: string }> = {
  es: { today: 'Hoy', yesterday: 'Ayer' },
  en: { today: 'Today', yesterday: 'Yesterday' },
  pt: { today: 'Hoje', yesterday: 'Ontem' },
};

function getLabels(locale: string) {
  const lang = locale.split('-')[0].toLowerCase();
  return RELATIVE_LABELS[lang] || RELATIVE_LABELS.es;
}

/**
 * Checks if two dates fall on the same calendar day.
 */
export function isSameDay(d1: Date | string, d2: Date | string): boolean {
  const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
  const date2 = typeof d2 === 'string' ? new Date(d2) : d2;
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return false;

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Formats a date for the day separator pill between chat messages.
 * e.g., "Hoy", "Ayer", "15 de marzo", or "15 de marzo de 2025".
 */
export function formatChatDateSeparator(
  date: Date | string,
  locale: string = 'es'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  if (isSameDay(d, now)) {
    return getLabels(locale).today;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) {
    return getLabels(locale).yesterday;
  }

  const isCurrentYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Formats timestamp for a message bubble.
 * - Today: "14:32"
 * - Yesterday: "Ayer, 14:32"
 * - Past day this year: "15 mar, 14:32"
 * - Past day another year: "15 mar 2025, 14:32"
 */
export function formatMessageTime(
  date: Date | string,
  locale: string = 'es'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const timeStr = d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const now = new Date();
  if (isSameDay(d, now)) {
    return timeStr;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(d, yesterday)) {
    return `${getLabels(locale).yesterday}, ${timeStr}`;
  }

  const isCurrentYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Returns full date and time for tooltip/accessibility (`title` attribute).
 * e.g., "lunes, 15 de marzo de 2026, 14:32"
 */
export function formatFullDateTime(
  date: Date | string,
  locale: string = 'es'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  try {
    return d.toLocaleString(locale, {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  } catch {
    return d.toLocaleString(locale);
  }
}
