import { SlotProgress } from '@/types/v1.6.0';

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
  limit?: number;
}

function formatSlotList(
  slots: SlotProgress[],
  isDupes: boolean,
  limit?: number,
): { pageLines: string[]; isTruncated: boolean; remainingCount: number } {
  const actualLimit = limit !== undefined ? limit : Infinity;
  const slicedSlots = slots.slice(0, actualLimit);
  const isTruncated = slots.length > actualLimit;
  const remainingCount = slots.length - actualLimit;

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
        return spareCount > 1 ? `${base} (x${spareCount})` : base;
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
  limit,
}: GenerateShareTextOptions): string {
  const dupes = progress.filter((s) => s.status === 'duplicate' && s.count > 1);
  const missing = progress.filter((s) => s.status === 'missing');

  const dupesCount = dupes.reduce((sum, s) => sum + (s.count - 1), 0);
  const missingCount = missing.length;

  if (type === 'dupes') {
    if (dupesCount === 0) return translations.emptyList;

    const header = translations.shareDupesHeader
      .replace('{title}', copyTitle)
      .replace('{count}', dupesCount.toString());

    const { pageLines, isTruncated, remainingCount } = formatSlotList(dupes, true, limit);

    let result = header + '\n\n' + pageLines.join('\n');
    if (isTruncated) {
      result += `\n... ${translations.shareTruncated.replace('{count}', remainingCount.toString())}`;
    }
    result += `\n\n${translations.shareDupesCTA}`;
    return result;
  }

  if (type === 'missing') {
    if (missingCount === 0) return translations.emptyList;

    const header = translations.shareMissingHeader
      .replace('{title}', copyTitle)
      .replace('{count}', missingCount.toString());

    const { pageLines, isTruncated, remainingCount } = formatSlotList(missing, false, limit);

    let result = header + '\n\n' + pageLines.join('\n');
    if (isTruncated) {
      result += `\n... ${translations.shareTruncated.replace('{count}', remainingCount.toString())}`;
    }
    result += `\n\n${translations.shareMissingCTA}`;
    return result;
  }

  // type === 'all'
  if (dupesCount === 0 && missingCount === 0) return translations.emptyList;

  const header = translations.shareAllHeader
    .replace('{title}', copyTitle);

  let result = header + '\n';

  const sectionLimit = limit !== undefined ? Math.max(10, Math.floor(limit / 2)) : undefined;

  // Dupes section
  if (dupesCount > 0) {
    const dupesHeader = translations.shareDupesHeader
      .replace('{title}', '')
      .replace('{count}', dupesCount.toString())
      .replace(/^\s*/, '');
    result += `\n${dupesHeader}\n`;
    const { pageLines, isTruncated, remainingCount } = formatSlotList(dupes, true, sectionLimit);
    result += pageLines.join('\n');
    if (isTruncated) {
      result += `\n... ${translations.shareTruncated.replace('{count}', remainingCount.toString())}`;
    }
  }

  // Missing section
  if (missingCount > 0) {
    const missingHeader = translations.shareMissingHeader
      .replace('{title}', '')
      .replace('{count}', missingCount.toString())
      .replace(/^\s*/, '');
    result += `\n\n${missingHeader}\n`;
    const { pageLines, isTruncated, remainingCount } = formatSlotList(missing, false, sectionLimit);
    result += pageLines.join('\n');
    if (isTruncated) {
      result += `\n... ${translations.shareTruncated.replace('{count}', remainingCount.toString())}`;
    }
  }

  result += `\n\n${translations.shareAllCTA}`;
  return result;
}
