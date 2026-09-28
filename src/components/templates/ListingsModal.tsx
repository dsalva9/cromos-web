'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle,
  ClipboardList,
  RefreshCcw,
  XCircle,
  QrCode,
} from 'lucide-react';
import { logger } from '@/lib/logger';

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
import { useUser } from '@/components/providers/SupabaseProvider';
import { TradeQRModal } from '@/components/qr/TradeQRModal';
import { shareContent, canNativeShare, getWhatsAppShareUrl, getTelegramShareUrl, getXShareUrl, getFacebookShareUrl } from '@/lib/share';
import { WhatsAppIcon, XTwitterIcon, TelegramIcon, FacebookIcon } from '@/components/ui/social-icons';

interface ListingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: SlotProgress[];
  copy: {
    title: string;
    copy_id?: number;
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
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<'download' | 'share' | 'qr'>('download');
  const [qrOpen, setQrOpen] = useState(false);
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
  // Clipboard and native device sharing should be untruncated (never limited)
  const generatedShareText = useMemo(() => {
    return generateShareText({
      type: shareType,
      progress,
      copyTitle: copy.title,
      translations: utilTranslations,
      limit: undefined, // no truncation
    });
  }, [shareType, progress, copy.title, utilTranslations]);

  // Smart-truncated version for URLs to avoid hitting browser URL limits (approx 3000 chars)
  const smartShareText = useMemo(() => {
    const encoded = encodeURIComponent(generatedShareText);
    if (encoded.length <= 3000) {
      return generatedShareText;
    }
    return generateShareText({
      type: shareType,
      progress,
      copyTitle: copy.title,
      translations: utilTranslations,
      limit: shareType === 'all' ? 150 : 200,
    });
  }, [generatedShareText, shareType, progress, copy.title, utilTranslations]);

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
      logger.error('Failed to generate listing document', { error: e });
      toast.error(t('downloadError'));
    } finally {
      setLoading(false);
    }
  };

  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    canNativeShare().then(setHasNativeShare);
  }, []);

  // ── Native Share API ────────────────────────────────────────────────
  const handleNativeShare = async () => {
    const res = await shareContent({
      title: t('modalTitle', { title: copy.title }),
      text: generatedShareText,
      dialogTitle: t('modalTitle', { title: copy.title }),
    });
    if (res.method === 'unsupported') {
      handleCopyText();
    } else if (!res.success && res.method !== 'aborted') {
      toast.error(t('shareError'));
    }
  };

  // ── Copy text ───────────────────────────────────────────────────────
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generatedShareText);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
      url: getWhatsAppShareUrl('', smartShareText),
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: <TelegramIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-[#26A5E4]/15 text-[#26A5E4] border-[#26A5E4]/30',
      url: getTelegramShareUrl(siteConfig.url, smartShareText),
    },
    {
      key: 'x',
      label: 'X',
      icon: <XTwitterIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30',
      url: getXShareUrl(siteConfig.url, smartShareText),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: <FacebookIcon className="h-5 w-5" />,
      colorClass: 'hover:bg-[#1877F2]/15 text-[#1877F2] border-[#1877F2]/30',
      url: getFacebookShareUrl(siteConfig.url),
    },
  ];

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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'download' | 'share' | 'qr')} className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="download">📥 {t('downloadTab')}</TabsTrigger>
              <TabsTrigger value="share">📤 {t('shareTab')}</TabsTrigger>
              <TabsTrigger value="qr">
                <QrCode className="w-3.5 h-3.5 mr-1" />
                QR
              </TabsTrigger>
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
                    <ClipboardList className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                    <RefreshCcw className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
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
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
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

            {/* TAB: QR */}
            <TabsContent value="qr" className="space-y-4 outline-none">
              {user && copy.copy_id ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
                    Genera tu código QR personal para que otro coleccionista lo escanee y vea instantáneamente qué cromos podéis intercambiar.
                  </p>
                  <Button
                    className="bg-gold text-black hover:bg-yellow-400 font-bold px-8"
                    onClick={() => setQrOpen(true)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Generar QR de intercambio
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                  Inicia sesión para generar tu QR de intercambio.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* QR Modal */}
        {user && copy.copy_id && (
          <TradeQRModal
            open={qrOpen}
            onOpenChange={setQrOpen}
            userId={user.id}
            copyId={copy.copy_id}
            copyTitle={copy.title}
            nickname={user.user_metadata?.nickname ?? user.email ?? 'yo'}
          />
        )}

      </DialogContent>
    </Dialog>
  );
}
