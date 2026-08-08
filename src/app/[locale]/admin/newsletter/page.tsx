'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Download, Mail, Calendar, Users } from 'lucide-react';

export default function NewsletterPage() {
  const t = useTranslations('admin.newsletter');
  const supabase = useSupabaseClient();

  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(today);
  const [includeStart, setIncludeStart] = useState(true);
  const [includeEnd, setIncludeEnd] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  async function handleDownload() {
    if (!startDate) {
      toast(t('errorFetch'), 'error');
      return;
    }

    setDownloading(true);
    setSubscriberCount(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const params = new URLSearchParams({
        startDate,
        endDate: endDate || today,
        includeStart: String(includeStart),
        includeEnd: String(includeEnd),
      });

      const response = await fetch(`/api/admin/newsletter-subscribers?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || t('errorFetch'));
      }

      const { emails, count } = await response.json();

      if (count === 0) {
        toast(t('noResults'), 'info');
        setSubscriberCount(0);
        return;
      }

      setSubscriberCount(count);

      // Generate CSV with only emails
      const csvContent = emails.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subscribers_${startDate}_to_${endDate || today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast(t('successDownload', { count }), 'success');
    } catch (e: unknown) {
      logger.error('Newsletter export error', e);
      toast(e instanceof Error ? e.message : t('errorFetch'), 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Mail className="h-7 w-7 text-amber-400" />
          <h1 className="text-3xl font-black uppercase text-white">{t('title')}</h1>
        </div>
        <p className="text-gray-400 text-sm">{t('description')}</p>
      </div>

      <div className="bg-[#2D3748] border-2 border-black rounded-lg p-6 space-y-6">
        {/* Start Date */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            {t('startDate')}
          </label>
          <div className="flex items-center gap-4">
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              max={endDate || today}
              className="bg-[#1A202C] border-2 border-black text-white flex-1 [color-scheme:dark]"
            />
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={includeStart}
                onChange={e => setIncludeStart(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-[#1A202C] text-amber-500 focus:ring-amber-500 accent-amber-500"
              />
              {t('includeDate')}
            </label>
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <label className="text-sm text-gray-300 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            {t('endDate')}
          </label>
          <div className="flex items-center gap-4">
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              min={startDate}
              max={today}
              className="bg-[#1A202C] border-2 border-black text-white flex-1 [color-scheme:dark]"
            />
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={includeEnd}
                onChange={e => setIncludeEnd(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-[#1A202C] text-amber-500 focus:ring-amber-500 accent-amber-500"
              />
              {t('includeDate')}
            </label>
          </div>
        </div>

        {/* Result count */}
        {subscriberCount !== null && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#1A202C] rounded-md border border-gray-700">
            <Users className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-gray-300">
              {t('subscribersFound', { count: subscriberCount })}
            </span>
          </div>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          disabled={!startDate || downloading}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
        >
          <Download className="h-4 w-4 mr-2" />
          {downloading ? t('downloading') : t('download')}
        </Button>
      </div>
    </div>
  );
}
