import { SlotProgress } from '@/types/v1.6.0';

export interface GenerateShareTextOptions {
  type: 'dupes' | 'missing';
  progress: SlotProgress[];
  copyTitle: string;
  translations: {
    shareDupesHeader: string;
    shareMissingHeader: string;
    shareDupesCTA: string;
    shareMissingCTA: string;
    shareTruncated: string;
    emptyList: string;
  };
}

export function generateShareText({
  type,
  progress,
  copyTitle,
  translations,
}: GenerateShareTextOptions): string {
  // Filter slots based on type
  const targetSlots = progress.filter((s) => {
    if (type === 'dupes') {
      return s.status === 'duplicate' && s.count > 1;
    } else {
      return s.status === 'missing';
    }
  });

  // Calculate total count (sum of spares for dupes, length for missing)
  const totalCount = type === 'dupes'
    ? targetSlots.reduce((sum, s) => sum + (s.count - 1), 0)
    : targetSlots.length;

  if (totalCount === 0) {
    return translations.emptyList;
  }

  // Header
  const headerTemplate = type === 'dupes'
    ? translations.shareDupesHeader
    : translations.shareMissingHeader;
  
  let result = headerTemplate
    .replace('{title}', copyTitle)
    .replace('{count}', totalCount.toString()) + '\n\n';

  // Sort and group targetSlots
  const limit = 200;
  const slicedSlots = targetSlots.slice(0, limit);
  const isTruncated = targetSlots.length > limit;
  const remainingSlotsCount = targetSlots.length - limit;

  // Group by page_id to keep page grouping
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
    // Sort items inside page by slot_number, then variant
    page.items.sort((a, b) => {
      if (a.slot_number !== b.slot_number) {
        return a.slot_number - b.slot_number;
      }
      return (a.slot_variant || '').localeCompare(b.slot_variant || '');
    });

    const itemStrings = page.items.map((s) => {
      const variant = s.slot_variant || '';
      const base = `${s.slot_number}${variant}`;
      if (type === 'dupes') {
        const spareCount = s.count - 1;
        return spareCount > 1 ? `${base} (×${spareCount})` : base;
      }
      return base;
    });

    pageLines.push(`${page.page_title}: ${itemStrings.join(', ')}`);
  }

  result += pageLines.join('\n');

  // If truncated, add ellipsis and count of remaining items
  if (isTruncated) {
    result += `\n... ${translations.shareTruncated.replace('{count}', remainingSlotsCount.toString())}`;
  }

  // Add CTA and URL
  result += '\n\n';
  result += type === 'dupes' ? translations.shareDupesCTA : translations.shareMissingCTA;

  return result;
}
