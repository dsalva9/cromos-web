'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Loader2, 
  List,
  AlertCircle
} from 'lucide-react';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateShareText } from '@/utils/generateShareText';
import { generateListingDocument } from '@/utils/generateListingDocument';
import type { SlotProgress } from '@/types/v1.6.0';
import { siteConfig } from '@/config/site';

// ── SVG Brand Icons (from ShareButton.tsx) ────────────────────────
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface ListingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: SlotProgress[];
  copy: {
    title: string;
  };
}

export function ListingsModal({
  open,
  onOpenChange,
  progress,
  copy,
}: ListingsModalProps) {
  const t = useTranslations('templates.listings');
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<'download' | 'share'>('download');
  const [downloadType, setDownloadType] = useState<'dupes' | 'missing' | 'summary'>('dupes');
  const [shareType, setShareType] = useState<'dupes' | 'missing' | 'all'>('all');
  const [format, setFormat] = useState<'pdf' | 'jpeg'>('pdf');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Compute Stats ───────────────────────────────────────────────────
  const { repesCount, missingCount } = useMemo(() => {
    const dupesSlots = progress.filter((s) => s.status === 'duplicate' && s.count > 1);
    const spares = dupesSlots.reduce((sum, s) => sum + (s.count - 1), 0);
    const missing = progress.filter((s) => s.status === 'missing').length;
    return { repesCount: spares, missingCount: missing };
  }, [progress]);

  // Adjust card selection if some lists are empty
  useEffect(() => {
    if (open) {
      if (repesCount === 0 && downloadType === 'dupes') {
        setDownloadType(missingCount > 0 ? 'missing' : 'summary');
      }
      if (repesCount === 0 && shareType === 'dupes') {
        setShareType(missingCount > 0 ? 'missing' : 'all');
      }
    }
  }, [open, repesCount, missingCount]);

  // If downloadType is summary, force pdf format
  const handleDownloadTypeChange = (type: 'dupes' | 'missing' | 'summary') => {
    setDownloadType(type);
    if (type === 'summary') {
      setFormat('pdf');
    }
  };

  // Get active translations map for document utilities
  const utilTranslations = useMemo(() => {
    return {
      shareDupesHeader: t('shareDupesHeader'),
      shareMissingHeader: t('shareMissingHeader'),
      shareAllHeader: t('shareAllHeader'),
      shareDupesCTA: t('shareDupesCTA'),
      shareMissingCTA: t('shareMissingCTA'),
      shareAllCTA: t('shareAllCTA'),
      emptyList: t('emptyList'),
      pdfGeneratedOn: t('pdfGeneratedOn'),
      pdfFooterBranding: t('pdfFooterBranding'),
      missingStickers: t('missingStickers'),
      duplicateStickers: t('duplicateStickers'),
      fullSummaryTitle: t('fullSummaryTitle'),
      summaryStats: t('summaryStats'),
      summaryProgress: t('summaryProgress'),
      summaryCompletedSlots: t('summaryCompletedSlots'),
      summaryDuplicateSlots: t('summaryDuplicateSlots'),
      summaryMissingSlots: t('summaryMissingSlots'),
      summaryTotalSlots: t('summaryTotalSlots'),
      summaryCompletion: t('summaryCompletion'),
      summaryDuplicateLabel: t('summaryDuplicateLabel'),
      summaryPageBreakdown: t('summaryPageBreakdown'),
      summaryPageColumn: t('summaryPageColumn'),
      summaryTotalColumn: t('summaryTotalColumn'),
      summaryHaveColumn: t('summaryHaveColumn'),
      summaryMissingColumn: t('summaryMissingColumn'),
      summaryProgressColumn: t('summaryProgressColumn'),
      noDupes: t('noDupes'),
      noMissing: t('noMissing'),
      shareTruncated: t('shareTruncated'),
    };
  }, [t]);

  // ── Share text generation ───────────────────────────────────────────
  const generatedShareText = useMemo(() => {
    return generateShareText({
      type: shareType,
      progress,
      copyTitle: copy.title,
      translations: utilTranslations,
    });
  }, [shareType, progress, copy.title, utilTranslations]);

  // ── Trigger Download ────────────────────────────────────────────────
  const handleDownload = async () => {
    setLoading(true);
    try {
      await generateListingDocument({
        type: downloadType,
        format,
        progress,
        copyTitle: copy.title,
        translations: utilTranslations,
        locale,
        siteUrl: siteConfig.url,
      });
      toast.success(t('downloadSuccess'));
    } catch (e) {
      console.error(e);
      toast.error(t('downloadError'));
    } finally {
      setLoading(false);
    }
  };

  // ── Native Share API ────────────────────────────────────────────────
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: t('modalTitle', { title: copy.title }),
          text: generatedShareText,
        });
      } catch (e) {
        // Share cancelled or failed, show error if not user cancel
        if (e instanceof Error && e.name !== 'AbortError') {
          toast.error(t('shareError'));
        }
      }
    } else {
      handleCopyText();
    }
  };

  // ── Copy text ───────────────────────────────────────────────────────
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedShareText);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = generatedShareText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Social target sharing links ──────────────────────────────────────
  const shareTargets = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30',
      url: `https://wa.me/?text=${encodeURIComponent(generatedShareText)}`,
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: <TelegramIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-[#26A5E4]/15 text-[#26A5E4] border-[#26A5E4]/30',
      url: `https://t.me/share/url?url=${encodeURIComponent(siteConfig.url)}&text=${encodeURIComponent(generatedShareText)}`,
    },
    {
      key: 'x',
      label: 'X',
      icon: <XTwitterIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedShareText)}`,
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <FacebookIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-[#1877F2]/15 text-[#1877F2] border-[#1877F2]/30',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteConfig.url)}`,
    },
  ];

  const hasNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-black dark:border-white rounded-xl shadow-xl flex flex-col p-0 overflow-hidden">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-2 border-b border-gray-100 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="bg-gold/20 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-yellow-700 dark:text-yellow-500" />
            </div>
            <div>
              <span className="block">{t('buttonLabel')}</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 truncate max-w-[320px] block">
                {copy.title}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('modalTitle', { title: copy.title })}
          </DialogDescription>
        </DialogHeader>

        {/* Tab content wrapper */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="download">📥 {t('downloadTab')}</TabsTrigger>
              <TabsTrigger value="share">📤 {t('shareTab')}</TabsTrigger>
            </TabsList>

            {/* TAB: DOWNLOAD */}
            <TabsContent value="download" className="space-y-6 outline-none">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  {t('selectDownloadType')}
                </label>

                {/* Cards Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Card: Dupes */}
                  <button
                    disabled={repesCount === 0}
                    onClick={() => handleDownloadTypeChange('dupes')}
                    className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all text-center h-28 relative ${
                      repesCount === 0
                        ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700'
                        : downloadType === 'dupes'
                        ? 'border-gold bg-gold/5 dark:bg-gold/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">🔄</span>
                    <span className="text-sm font-bold block">{t('dupesTitle')}</span>
                    <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-100 font-bold border-yellow-200 border text-xs">
                      {repesCount}
                    </Badge>
                  </button>

                  {/* Card: Missing */}
                  <button
                    disabled={missingCount === 0}
                    onClick={() => handleDownloadTypeChange('missing')}
                    className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all text-center h-28 relative ${
                      missingCount === 0
                        ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700'
                        : downloadType === 'missing'
                        ? 'border-gold bg-gold/5 dark:bg-gold/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">❌</span>
                    <span className="text-sm font-bold block">{t('missingTitle')}</span>
                    <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 hover:bg-red-100 font-bold border-red-200 border text-xs">
                      {missingCount}
                    </Badge>
                  </button>

                  {/* Card: Summary */}
                  <button
                    onClick={() => handleDownloadTypeChange('summary')}
                    className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all text-center h-28 relative ${
                      downloadType === 'summary'
                        ? 'border-gold bg-gold/5 dark:bg-gold/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">📊</span>
                    <span className="text-sm font-bold block">{t('summaryTitle')}</span>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 hover:bg-blue-100 font-bold border-blue-200 border text-xs">
                      PDF
                    </Badge>
                  </button>
                </div>
              </div>

              {/* Format selection */}
              <div className="space-y-3">
                <span className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  {t('formatLabel')}
                </span>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={format === 'pdf'}
                      onChange={() => setFormat('pdf')}
                      className="accent-gold h-4 w-4"
                    />
                    {t('pdfLabel')}
                  </label>

                  <label 
                    className={`flex items-center gap-2 font-semibold text-sm ${
                      downloadType === 'summary' 
                        ? 'opacity-40 cursor-not-allowed text-gray-400' 
                        : 'cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value="jpeg"
                      disabled={downloadType === 'summary'}
                      checked={format === 'jpeg'}
                      onChange={() => setFormat('jpeg')}
                      className="accent-gold h-4 w-4 disabled:opacity-40"
                    />
                    {t('jpegLabel')}
                  </label>
                </div>

                {downloadType === 'summary' && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <AlertCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{t('pdfOnlyNote')}</span>
                  </div>
                )}
              </div>

              {/* Download CTA Button */}
              <Button
                disabled={loading}
                onClick={handleDownload}
                className="w-full bg-gold text-black hover:bg-gold/90 font-bold h-12 text-base transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    {t('downloadBtn', { format: format.toUpperCase() })}
                  </>
                )}
              </Button>
            </TabsContent>

            {/* TAB: SHARE */}
            <TabsContent value="share" className="space-y-6 outline-none">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  {t('selectShareType')}
                </label>

                {/* Cards Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Card: All */}
                  <button
                    onClick={() => setShareType('all')}
                    className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all text-center h-28 relative ${
                      shareType === 'all'
                        ? 'border-gold bg-gold/5 dark:bg-gold/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{"\u{1F4CB}"}</span>
                    <span className="text-sm font-bold block">{t('allTitle')}</span>
                    <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 hover:bg-purple-100 font-bold border-purple-200 border text-xs">
                      {repesCount + missingCount}
                    </Badge>
                  </button>

                  {/* Card: Dupes */}
                  <button
                    disabled={repesCount === 0}
                    onClick={() => setShareType('dupes')}
                    className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all text-center h-28 relative ${
                      repesCount === 0
                        ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700'
                        : shareType === 'dupes'
                        ? 'border-gold bg-gold/5 dark:bg-gold/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{"\u{1F504}"}</span>
                    <span className="text-sm font-bold block">{t('dupesTitle')}</span>
                    <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-100 font-bold border-yellow-200 border text-xs">
                      {repesCount}
                    </Badge>
                  </button>

                  {/* Card: Missing */}
                  <button
                    disabled={missingCount === 0}
                    onClick={() => setShareType('missing')}
                    className={`flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all text-center h-28 relative ${
                      missingCount === 0
                        ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700'
                        : shareType === 'missing'
                        ? 'border-gold bg-gold/5 dark:bg-gold/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{"\u{274C}"}</span>
                    <span className="text-sm font-bold block">{t('missingTitle')}</span>
                    <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 hover:bg-red-100 font-bold border-red-200 border text-xs">
                      {missingCount}
                    </Badge>
                  </button>
                </div>
              </div>

              {/* Preview Box */}
              <div className="space-y-2">
                <span className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  {t('preview')}
                </span>
                <div 
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap select-all cursor-text text-slate-700 dark:text-slate-300 shadow-inner"
                  style={{ direction: 'ltr' }}
                >
                  {generatedShareText}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* On mobile: Primary native share or copy */}
                {hasNativeShare ? (
                  <Button
                    onClick={handleNativeShare}
                    className="w-full bg-gold text-black hover:bg-gold/90 font-bold h-12 text-base transition-colors"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    {t('shareBtn')}
                  </Button>
                ) : null}

                {/* Social media grid targets */}
                <div className="grid grid-cols-4 gap-2">
                  {shareTargets.map((target) => (
                    <a
                      key={target.key}
                      href={target.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all text-center ${target.colorClass}`}
                    >
                      {target.icon}
                      <span className="text-[10px] font-bold mt-1 block leading-tight">
                        {target.label}
                      </span>
                    </a>
                  ))}
                </div>

                {/* Clipboard copy button */}
                <Button
                  variant="outline"
                  onClick={handleCopyText}
                  className="w-full border-2 border-black dark:border-white font-bold h-11 transition-all mt-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      {t('copyBtn')}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </DialogContent>
    </Dialog>
  );
}
