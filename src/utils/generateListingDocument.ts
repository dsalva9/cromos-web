import { SlotProgress } from '@/types/v1.6.0';

export interface GenerateListingDocumentOptions {
  type: 'dupes' | 'missing' | 'summary';
  format: 'pdf' | 'jpeg';
  progress: SlotProgress[];
  copyTitle: string;
  translations: Record<string, string>;
  locale: string;
  siteUrl: string;
}

export async function generateListingDocument({
  type,
  format,
  progress,
  copyTitle,
  translations,
  locale,
  siteUrl,
}: GenerateListingDocumentOptions): Promise<void> {
  const dateStr = new Date().toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const sanitizedTitle = copyTitle
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .slice(0, 30);
  const filename = `${sanitizedTitle}_${type}_${new Date().toISOString().split('T')[0]}.${format}`;

  // Filter lists
  const dupes = progress.filter((s) => s.status === 'duplicate' && s.count > 1);
  const missing = progress.filter((s) => s.status === 'missing');

  const repesCount = dupes.reduce((sum, s) => sum + (s.count - 1), 0);
  const missingCount = missing.length;
  const totalSlots = progress.length;
  const ownedCount = progress.filter((s) => s.status === 'owned' || s.status === 'duplicate').length;
  const completionPercentage = totalSlots > 0 ? Math.round((ownedCount / totalSlots) * 100) : 0;

  if (format === 'pdf') {
    // Dynamic import of jsPDF
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const addFooter = (currentPage: number, totalPagesPlaceholder: string | number) => {
      const footerY = 282;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);

      const siteDomain = siteUrl.replace(/^https?:\/\//, '');

      const footerText = `${translations.pdfFooterBranding} ${siteDomain}`;
      const textWidth = doc.getTextWidth(footerText);
      const footerX = (210 - textWidth) / 2;

      doc.text(translations.pdfFooterBranding + ' ', footerX, footerY);

      const prefixWidth = doc.getTextWidth(translations.pdfFooterBranding + ' ');
      doc.setTextColor(197, 160, 89); // Gold color (#c5a059)
      doc.setFont('helvetica', 'bold');
      doc.text(siteDomain, footerX + prefixWidth, footerY);

      const linkWidth = doc.getTextWidth(siteDomain);
      doc.link(footerX + prefixWidth, footerY - 3, linkWidth, 4, { url: siteUrl });

      // Page numbers on the right
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      const pageStr = `${currentPage} / ${totalPagesPlaceholder}`;
      doc.text(pageStr, 190 - doc.getTextWidth(pageStr), footerY);
    };

    if (type === 'dupes' || type === 'missing') {
      const items = type === 'dupes' ? dupes : missing;
      const docTitle = type === 'dupes' ? translations.duplicateStickers : translations.missingStickers;
      const countLabel = type === 'dupes' ? repesCount : missingCount;

      let currentY = 25;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text(copyTitle, 20, currentY);
      currentY += 8;

      // Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`${docTitle} (${countLabel})`, 20, currentY);
      
      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // Slate 400
      const dateText = translations.pdfGeneratedOn.replace('{date}', dateStr);
      doc.text(dateText, 190 - doc.getTextWidth(dateText), currentY);
      currentY += 5;

      // Decorative line
      doc.setDrawColor(197, 160, 89); // Gold
      doc.setLineWidth(0.5);
      doc.line(20, currentY, 190, currentY);
      currentY += 12;

      if (items.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text(type === 'dupes' ? translations.noDupes : translations.noMissing, 20, currentY);
      } else {
        // Group by page
        const pageMap = new Map<number, { page_title: string; page_number: number; items: SlotProgress[] }>();
        for (const slot of items) {
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

        const sortedPages = Array.from(pageMap.values()).sort((a, b) => a.page_number - b.page_number);

        for (const page of sortedPages) {
          page.items.sort((a, b) => {
            if (a.slot_number !== b.slot_number) {
              return a.slot_number - b.slot_number;
            }
            return (a.slot_variant || '').localeCompare(b.slot_variant || '');
          });

          // Check Y room before drawing page header
          if (currentY > 255) {
            doc.addPage();
            currentY = 25;
          }

          // Page header
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59);
          doc.text(`-- ${page.page_title} --`, 20, currentY);
          currentY += 6;

          // Format items list
          const itemStrings = page.items.map((s) => {
            const variant = s.slot_variant || '';
            const base = `#${s.slot_number}${variant}`;
            const labelStr = s.label ? ` ${s.label}` : '';
            if (type === 'dupes') {
              const spareCount = s.count - 1;
              return `${base}${labelStr}${spareCount > 1 ? ` (x${spareCount})` : ''}`;
            }
            return `${base}${labelStr}`;
          });

          const stickerText = itemStrings.join('   ·   ');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105); // Slate 600
          
          const lines = doc.splitTextToSize(stickerText, 170);
          for (const line of lines) {
            if (currentY > 265) {
              doc.addPage();
              currentY = 25;
              // Re-draw page header context
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(11);
              doc.setTextColor(30, 41, 59);
              doc.text(`-- ${page.page_title} (${translations.summaryProgress.toLowerCase()}) --`, 20, currentY);
              currentY += 6;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(10);
              doc.setTextColor(71, 85, 105);
            }
            doc.text(line, 20, currentY);
            currentY += 5;
          }
          currentY += 5; // Spacing between pages
        }
      }

      // Add page footers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }
    } else if (type === 'summary') {
      let currentY = 25;

      // Page 1: Overview
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text(copyTitle, 20, currentY);
      currentY += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(100, 116, 139);
      doc.text(translations.fullSummaryTitle, 20, currentY);

      // Date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      const dateText = translations.pdfGeneratedOn.replace('{date}', dateStr);
      doc.text(dateText, 190 - doc.getTextWidth(dateText), currentY);
      currentY += 5;

      // Decorative line
      doc.setDrawColor(197, 160, 89);
      doc.setLineWidth(0.5);
      doc.line(20, currentY, 190, currentY);
      currentY += 12;

      // Stats Section Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(translations.summaryStats, 20, currentY);
      currentY += 8;

      // Draw beautiful stats grid box
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.setLineWidth(0.2);
      doc.rect(20, currentY, 170, 45, 'FD');

      // Fill in stats details
      const colWidth = 170 / 4;
      const statsY = currentY + 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(translations.summaryCompletedSlots, 20 + 8, statsY);
      doc.text(translations.summaryDuplicateLabel, 20 + colWidth + 8, statsY);
      doc.text(translations.summaryMissingSlots, 20 + (colWidth * 2) + 8, statsY);
      doc.text(translations.summaryTotalSlots, 20 + (colWidth * 3) + 8, statsY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text(`${ownedCount}`, 20 + 8, statsY + 8);
      doc.text(`${repesCount}`, 20 + colWidth + 8, statsY + 8);
      doc.text(`${missingCount}`, 20 + (colWidth * 2) + 8, statsY + 8);
      doc.text(`${totalSlots}`, 20 + (colWidth * 3) + 8, statsY + 8);

      // Progress bar inside stats box
      const barY = currentY + 28;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${translations.summaryProgress}: ${completionPercentage}%`, 28, barY);

      doc.setFillColor(226, 232, 240);
      doc.rect(28, barY + 3, 154, 4, 'F');
      doc.setFillColor(197, 160, 89);
      doc.rect(28, barY + 3, 154 * (completionPercentage / 100), 4, 'F');

      currentY += 57;

      // Page breakdown title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(translations.summaryPageBreakdown, 20, currentY);
      currentY += 8;

      // Process Page breakdown
      const pageMapSummary = new Map<number, { page_title: string; page_number: number; items: SlotProgress[] }>();
      for (const slot of progress) {
        const pageId = slot.page_id;
        if (!pageMapSummary.has(pageId)) {
          pageMapSummary.set(pageId, {
            page_title: slot.page_title,
            page_number: slot.page_number,
            items: [],
          });
        }
        pageMapSummary.get(pageId)!.items.push(slot);
      }

      const summaryPages = Array.from(pageMapSummary.values()).sort((a, b) => a.page_number - b.page_number);

      // Draw table header
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.rect(20, currentY, 170, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);

      doc.text(translations.summaryPageColumn, 24, currentY + 5.5);
      doc.text(translations.summaryTotalColumn, 110, currentY + 5.5);
      doc.text(translations.summaryHaveColumn, 130, currentY + 5.5);
      doc.text(translations.summaryMissingColumn, 150, currentY + 5.5);
      doc.text(translations.summaryProgressColumn, 170, currentY + 5.5);

      currentY += 8;

      // Draw rows
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      let isAlt = false;

      for (const page of summaryPages) {
        if (currentY > 265) {
          doc.addPage();
          currentY = 25;

          // Re-draw table header on new page
          doc.setFillColor(241, 245, 249);
          doc.rect(20, currentY, 170, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.text(translations.summaryPageColumn, 24, currentY + 5.5);
          doc.text(translations.summaryTotalColumn, 110, currentY + 5.5);
          doc.text(translations.summaryHaveColumn, 130, currentY + 5.5);
          doc.text(translations.summaryMissingColumn, 150, currentY + 5.5);
          doc.text(translations.summaryProgressColumn, 170, currentY + 5.5);
          currentY += 8;
          doc.setFont('helvetica', 'normal');
        }

        const pageTotal = page.items.length;
        const pageHave = page.items.filter((s) => s.status === 'owned' || s.status === 'duplicate').length;
        const pageMissing = page.items.filter((s) => s.status === 'missing').length;
        const pagePercentage = pageTotal > 0 ? Math.round((pageHave / pageTotal) * 100) : 0;

        if (isAlt) {
          doc.setFillColor(248, 250, 252);
          doc.rect(20, currentY, 170, 7, 'F');
        }

        // Draw text
        doc.text(page.page_title, 24, currentY + 5);
        doc.text(`${pageTotal}`, 110, currentY + 5);
        doc.text(`${pageHave}`, 130, currentY + 5);
        doc.text(`${pageMissing}`, 150, currentY + 5);
        doc.text(`${pagePercentage}%`, 170, currentY + 5);

        // Thin bottom border line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.1);
        doc.line(20, currentY + 7, 190, currentY + 7);

        currentY += 7;
        isAlt = !isAlt;
      }

      // Add page for Missing list if not empty
      if (missing.length > 0) {
        doc.addPage();
        currentY = 25;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(translations.missingStickers, 20, currentY);
        currentY += 4;

        doc.setDrawColor(197, 160, 89);
        doc.setLineWidth(0.3);
        doc.line(20, currentY, 190, currentY);
        currentY += 8;

        const missingPageMap = new Map<number, { page_title: string; page_number: number; items: SlotProgress[] }>();
        for (const slot of missing) {
          const pageId = slot.page_id;
          if (!missingPageMap.has(pageId)) {
            missingPageMap.set(pageId, {
              page_title: slot.page_title,
              page_number: slot.page_number,
              items: [],
            });
          }
          missingPageMap.get(pageId)!.items.push(slot);
        }

        const sortedMissingPages = Array.from(missingPageMap.values()).sort((a, b) => a.page_number - b.page_number);

        for (const page of sortedMissingPages) {
          page.items.sort((a, b) => {
            if (a.slot_number !== b.slot_number) {
              return a.slot_number - b.slot_number;
            }
            return (a.slot_variant || '').localeCompare(b.slot_variant || '');
          });

          if (currentY > 260) {
            doc.addPage();
            currentY = 25;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.text(`-- ${page.page_title} --`, 20, currentY);
          currentY += 5;

          const itemStrings = page.items.map((s) => `#${s.slot_number}${s.slot_variant || ''}${s.label ? ` ${s.label}` : ''}`);
          const stickerText = itemStrings.join('   ·   ');
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);

          const lines = doc.splitTextToSize(stickerText, 170);
          for (const line of lines) {
            if (currentY > 265) {
              doc.addPage();
              currentY = 25;
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(10);
              doc.setTextColor(30, 41, 59);
              doc.text(`-- ${page.page_title} (${translations.summaryProgress.toLowerCase()}) --`, 20, currentY);
              currentY += 5;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(71, 85, 105);
            }
            doc.text(line, 20, currentY);
            currentY += 4.5;
          }
          currentY += 4;
        }
      }

      // Add page for Duplicate list if not empty
      if (dupes.length > 0) {
        doc.addPage();
        currentY = 25;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(translations.duplicateStickers, 20, currentY);
        currentY += 4;

        doc.setDrawColor(197, 160, 89);
        doc.setLineWidth(0.3);
        doc.line(20, currentY, 190, currentY);
        currentY += 8;

        const dupesPageMap = new Map<number, { page_title: string; page_number: number; items: SlotProgress[] }>();
        for (const slot of dupes) {
          const pageId = slot.page_id;
          if (!dupesPageMap.has(pageId)) {
            dupesPageMap.set(pageId, {
              page_title: slot.page_title,
              page_number: slot.page_number,
              items: [],
            });
          }
          dupesPageMap.get(pageId)!.items.push(slot);
        }

        const sortedDupesPages = Array.from(dupesPageMap.values()).sort((a, b) => a.page_number - b.page_number);

        for (const page of sortedDupesPages) {
          page.items.sort((a, b) => {
            if (a.slot_number !== b.slot_number) {
              return a.slot_number - b.slot_number;
            }
            return (a.slot_variant || '').localeCompare(b.slot_variant || '');
          });

          if (currentY > 260) {
            doc.addPage();
            currentY = 25;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          doc.text(`-- ${page.page_title} --`, 20, currentY);
          currentY += 5;

          const itemStrings = page.items.map((s) => {
            const spareCount = s.count - 1;
            return `#${s.slot_number}${s.slot_variant || ''}${s.label ? ` ${s.label}` : ''}${spareCount > 1 ? ` (x${spareCount})` : ''}`;
          });
          const stickerText = itemStrings.join('   ·   ');
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);

          const lines = doc.splitTextToSize(stickerText, 170);
          for (const line of lines) {
            if (currentY > 265) {
              doc.addPage();
              currentY = 25;
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(10);
              doc.setTextColor(30, 41, 59);
              doc.text(`-- ${page.page_title} (${translations.summaryProgress.toLowerCase()}) --`, 20, currentY);
              currentY += 5;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(71, 85, 105);
            }
            doc.text(line, 20, currentY);
            currentY += 4.5;
          }
          currentY += 4;
        }
      }

      // Add page footers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }
    }

    const pdfData = doc.output('blob');
    const url = URL.createObjectURL(pdfData);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } else if (format === 'jpeg') {
    // ── Canvas 2D rendering (replaces html2canvas to avoid CSS lab() color parse errors) ──
    const heading = type === 'dupes' ? translations.duplicateStickers : translations.missingStickers;
    const count = type === 'dupes' ? repesCount : missingCount;
    const items = type === 'dupes' ? dupes : missing;
    const siteDomain = siteUrl.replace(/^https?:\/\//, '');

    // ── Build content lines ──
    const CANVAS_W = 800;
    const PAD = 40;
    const CONTENT_W = CANVAS_W - PAD * 2;

    // Prepare page-grouped content
    interface PageGroup { title: string; pageNumber: number; lines: string[] }
    const pages: PageGroup[] = [];

    if (items.length > 0) {
      const pageMap = new Map<number, { page_title: string; page_number: number; items: SlotProgress[] }>();
      for (const slot of items) {
        if (!pageMap.has(slot.page_id)) {
          pageMap.set(slot.page_id, { page_title: slot.page_title, page_number: slot.page_number, items: [] });
        }
        pageMap.get(slot.page_id)!.items.push(slot);
      }

      const sorted = Array.from(pageMap.values()).sort((a, b) => a.page_number - b.page_number);
      for (const page of sorted) {
        page.items.sort((a, b) => a.slot_number !== b.slot_number ? a.slot_number - b.slot_number : (a.slot_variant || '').localeCompare(b.slot_variant || ''));

        const tokens = page.items.map((s) => {
          const base = `#${s.slot_number}${s.slot_variant || ''}`;
          if (type === 'dupes') {
            const spare = s.count - 1;
            return spare > 1 ? `${base} (x${spare})` : base;
          }
          return base;
        });

        // Wrap tokens into lines that fit CONTENT_W
        const wrappedLines: string[] = [];
        let currentLine = '';
        for (const token of tokens) {
          const test = currentLine ? `${currentLine}, ${token}` : token;
          if (test.length > 80 && currentLine) { // approx 80 chars per line at 14px
            wrappedLines.push(currentLine);
            currentLine = token;
          } else {
            currentLine = test;
          }
        }
        if (currentLine) wrappedLines.push(currentLine);

        pages.push({ title: page.page_title, pageNumber: page.page_number, lines: wrappedLines });
      }
    }

    // ── Calculate canvas height ──
    const TITLE_H = 32;
    const SUBTITLE_H = 20;
    const DIVIDER_H = 16;
    const PAGE_HEADER_H = 28;
    const LINE_H = 22;
    const PAGE_GAP = 16;
    const FOOTER_H = 50;
    const FOOTER_PAD = 20;

    let totalH = PAD + TITLE_H + SUBTITLE_H + DIVIDER_H;
    if (pages.length === 0) {
      totalH += 40; // empty message
    } else {
      for (let i = 0; i < pages.length; i++) {
        totalH += PAGE_HEADER_H + pages[i].lines.length * LINE_H;
        if (i < pages.length - 1) totalH += PAGE_GAP;
      }
    }
    totalH += FOOTER_PAD + FOOTER_H + 10;

    // ── Create canvas and draw ──
    const canvas = document.createElement('canvas');
    const dpr = 2; // retina
    canvas.width = CANVAS_W * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${totalH}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, totalH);

    let y = PAD;

    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Inter, system-ui, Arial, sans-serif';
    ctx.fillText(copyTitle, PAD, y + 20);
    y += TITLE_H;

    // Subtitle: heading (count) + date
    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px Inter, system-ui, Arial, sans-serif';
    ctx.fillText(`${heading} (${count})`, PAD, y + 14);
    ctx.font = '400 11px Inter, system-ui, Arial, sans-serif';
    const dateText = translations.pdfGeneratedOn.replace('{date}', dateStr);
    const dateW = ctx.measureText(dateText).width;
    ctx.fillText(dateText, CANVAS_W - PAD - dateW, y + 14);
    y += SUBTITLE_H;

    // Gold divider
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(PAD, y, CONTENT_W, 3);
    y += DIVIDER_H;

    // Content
    if (pages.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '400 15px Inter, system-ui, Arial, sans-serif';
      const emptyMsg = type === 'dupes' ? translations.noDupes : translations.noMissing;
      const emptyW = ctx.measureText(emptyMsg).width;
      ctx.fillText(emptyMsg, (CANVAS_W - emptyW) / 2, y + 24);
    } else {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // Gold bar + page title
        ctx.fillStyle = '#c5a059';
        ctx.fillRect(PAD, y + 4, 4, 14);
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 13px Inter, system-ui, Arial, sans-serif';
        ctx.fillText(page.title.toUpperCase(), PAD + 12, y + 15);
        y += PAGE_HEADER_H;

        // Slot lines
        ctx.fillStyle = '#334155';
        ctx.font = '500 13px Inter, system-ui, Arial, sans-serif';
        for (const line of page.lines) {
          ctx.fillText(line, PAD + 12, y + 14);
          y += LINE_H;
        }

        if (i < pages.length - 1) y += PAGE_GAP;
      }
    }

    // Footer bar
    const footerY = totalH - FOOTER_H;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, footerY, CANVAS_W, FOOTER_H);
    ctx.fillStyle = '#c5a059';
    ctx.fillRect(0, footerY, CANVAS_W, 3);

    // Footer text left: CAMBIOCROMOS
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, system-ui, Arial, sans-serif';
    ctx.fillText('CAMBIO', PAD, footerY + 30);
    const cambioW = ctx.measureText('CAMBIO').width;
    ctx.fillStyle = '#c5a059';
    ctx.fillText('CROMOS', PAD + cambioW, footerY + 30);

    // Footer text right: branding URL
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 12px Inter, system-ui, Arial, sans-serif';
    const brandingText = `${translations.pdfFooterBranding} `;
    const brandingW = ctx.measureText(brandingText).width;
    ctx.font = 'bold 12px Inter, system-ui, Arial, sans-serif';
    const domainW = ctx.measureText(siteDomain).width;
    const rightX = CANVAS_W - PAD - brandingW - domainW;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 12px Inter, system-ui, Arial, sans-serif';
    ctx.fillText(brandingText, rightX, footerY + 30);
    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 12px Inter, system-ui, Arial, sans-serif';
    ctx.fillText(siteDomain, rightX + brandingW, footerY + 30);

    // Export as JPEG
    canvas.toBlob(
      (blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
        }
      },
      'image/jpeg',
      0.95
    );
  }
}
