import { SlotProgress } from '@/types/v1.6.0';

// Emoji constants — kept in JS source (not JSON translations) to avoid UTF-8 encoding issues
const EMOJI = {
  dupes: '\u{1F504}',    // 🔄
  missing: '\u{274C}',   // ❌
  cta: '\u{1F4F2}',      // 📲
  all: '\u{1F4CB}',      // 📋
} as const;

export interface GenerateShareTextOptions {
  type: 'dupes' | 'missing' | 'all';
  progress: SlotProgress[];
  copyTitle: string;
  translations: {
    shareDupesHeader: string;
    shareMissingHeader: string;
    shareAllHeader: string;
    shareDupesCTA: string;
    shareMissingCTA: string;
    shareAllCTA: string;
    shareTruncated: string;
    emptyList: string;
  };
}

function formatSlotList(
  slots: SlotProgress[],
  isDupes: boolean,
  limit: number,
): { pageLines: string[]; isTruncated: boolean; remainingCount: number } {
  const slicedSlots = slots.slice(0, limit);
  const isTruncated = slots.length > limit;
  const remainingCount = slots.length - limit;

  // Group by page_id
  const pageMap = new Map<number, { page_title: string; page_number: number; items: SlotProgress[] }>();
  for (const slot of slicedSlots) {
    const pageId = slot.page_id;
    if (!pageMap.has(pageId)) {
      pageMap.set(pageId, {
        page_title: slot.page_title,
        page_number: slot.page_number,
        items: [],
      });
    }
    pageMap.get(pageId)!.items.push(slot);
  }

  // Sort pages by page_number
  const sortedPages = Array.from(pageMap.values()).sort((a, b) => a.page_number - b.page_number);

  // Format each page
  const pageLines: string[] = [];
  for (const page of sortedPages) {
    page.items.sort((a, b) => {
      if (a.slot_number !== b.slot_number) return a.slot_number - b.slot_number;
      return (a.slot_variant || '').localeCompare(b.slot_variant || '');
    });

    const itemStrings = page.items.map((s) => {
      const variant = s.slot_variant || '';
      const base = `${s.slot_number}${variant}`;
      if (isDupes) {
        const spareCount = s.count - 1;
        return spareCount > 1 ? `${base} (\u{00D7}${spareCount})` : base;
      }
      return base;
    });

    pageLines.push(`${page.page_title}: ${itemStrings.join(', ')}`);
  }

  return { pageLines, isTruncated, remainingCount };
}

export function generateShareText({
  type,
  progress,
  copyTitle,
  translations,
}: GenerateShareTextOptions): string {
  const dupes = progress.filter((s) => s.status === 'duplicate' && s.count > 1);
  const missing = progress.filter((s) => s.status === 'missing');

  const dupesCount = dupes.reduce((sum, s) => sum + (s.count - 1), 0);
  const missingCount = missing.length;

  if (type === 'dupes') {
    if (dupesCount === 0) return translations.emptyList;

    const header = `${EMOJI.dupes} ${translations.shareDupesHeader}`
      .replace('{title}', copyTitle)
      .replace('{count}', dupesCount.toString());

    const { pageLines, isTruncated, remainingCount } = formatSlotList(dupes, true, 200);

    let result = header + '\n\n' + pageLines.join('\n');
    if (isTruncated) {
      result += `\n... ${translations.shareTruncated.replace('{count}', remainingCount.toString())}`;
    }
    result += `\n\n${EMOJI.cta} ${translations.shareDupesCTA}`;
    return result;
  }

  if (type === 'missing') {
    if (missingCount === 0) return translations.emptyList;

    const header = `${EMOJI.missing} ${translations.shareMissingHeader}`
      .replace('{title}', copyTitle)
      .replace('{count}', missingCount.toString());

    const { pageLines, isTruncated, remainingCount } = formatSlotList(missing, false, 200);

    let result = header + '\n\n' + pageLines.join('\n');
    if (isTruncated) {
      result += `\n... ${translations.shareTruncated.replace('{count}', remainingCount.toString())}`;
    }
    result += `\n\n${EMOJI.cta} ${translations.shareMissingCTA}`;
    return result;
  }

  // type === 'all'
  if (dupesCount === 0 && missingCount === 0) return translations.emptyList;

  const header = `${EMOJI.all} ${translations.shareAllHeader}`
    .replace('{title}', copyTitle);

  let result = header + '\n';

  // Dupes section
  if (dupesCount > 0) {
    result += `\n${EMOJI.dupes} ${translations.shareDupesHeader
      .replace('{title}', '')
      .replace('{count}', dupesCount.toString())
      .replace(/^\s*/, '')}\n`;
    const { pageLines, isTruncated, remainingCount } = formatSlotList(dupes, true, 100);
    result += pageLines.join('\n');
    if (isTruncated) {
      result += `\n... ${translations.shareTruncated.replace('{count}', remainingCount.toString())}`;
    }
  }

  // Missing section
  if (missingCount > 0) {
    result += `\n\n${EMOJI.missing} ${translations.shareMissingHeader
      .replace('{title}', '')
      .replace('{count}', missingCount.toString())
      .replace(/^\s*/, '')}\n`;
    const { pageLines, isTruncated, remainingCount } = formatSlotList(missing, false, 100);
    result += pageLines.join('\n');
    if (isTruncated) {
      result += `\n... ${translations.shareTruncated.replace('{count}', remainingCount.toString())}`;
    }
  }

  result += `\n\n${EMOJI.cta} ${translations.shareAllCTA}`;
  return result;
}
