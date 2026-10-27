'use client';

import { useState, useEffect } from 'react';
import { useAdminAffiliates } from '@/hooks/admin/useAdminAffiliates';
import type { AffiliateLink } from '@/types/affiliates';
import { ModernCard } from '@/components/ui/modern-card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Megaphone, 
  Image as ImageIcon, 
  Star, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  Plus, 
  Loader2, 
  Mail, 
  ShoppingCart, 
  LayoutTemplate,
  Maximize2,
  MousePointerClick,
  Eye,
  XCircle
} from 'lucide-react';
import { AffiliateEditModal } from '@/components/admin/AffiliateEditModal';

type EditablePlacement = 'banner' | 'card_1' | 'card_2' | 'email' | 'interstitial';

export function AffiliatesTab() {
  const {
    affiliates,
    interstitialStats,
    loading,
    fetchAffiliates,
    upsertAffiliate,
    deleteAffiliate,
  } = useAdminAffiliates();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateLink | null>(null);
  const [editingPlacement, setEditingPlacement] = useState<EditablePlacement>('banner');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [togglingInterstitial, setTogglingInterstitial] = useState(false);

  useEffect(() => {
    fetchAffiliates();
  }, [fetchAffiliates]);

  const interstitialAffiliate = affiliates?.find(a => a.placement === 'interstitial');
  const bannerAffiliate = affiliates?.find(a => a.placement === 'banner');
  const card1Affiliate = affiliates?.find(a => a.placement === 'card_1');
  const card2Affiliate = affiliates?.find(a => a.placement === 'card_2');
  const emailAffiliates = affiliates?.filter(a => a.placement === 'email') || [];

  const handleEdit = (affiliate: AffiliateLink | null, placement: EditablePlacement) => {
    setEditingAffiliate(affiliate);
    setEditingPlacement(placement);
    setModalOpen(true);
  };

  const handleToggleInterstitialActive = async (checked: boolean) => {
    if (!interstitialAffiliate) return;
    try {
      setTogglingInterstitial(true);
      await upsertAffiliate({
        id: interstitialAffiliate.id,
        placement: 'interstitial',
        image_url: interstitialAffiliate.image_url,
        title: interstitialAffiliate.title,
        subtitle: interstitialAffiliate.subtitle,
        rating: interstitialAffiliate.rating,
        destination_url: interstitialAffiliate.destination_url,
        is_active: checked,
        image_config: interstitialAffiliate.image_config,
        cta_text: interstitialAffiliate.cta_text,
      });
      toast.success(checked ? 'Intersticial activado' : 'Intersticial desactivado');
    } catch {
      toast.error('Error al actualizar el estado del intersticial');
    } finally {
      setTogglingInterstitial(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAffiliate(id);
      toast.success('Affiliate deleted successfully');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Failed to delete affiliate');
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`w-4 h-4 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'}`} 
          />
        ))}
        <span className="text-xs text-zinc-400 ml-2">{Number(rating).toFixed(1)}</span>
      </div>
    );
  };

  if (loading && (!affiliates || affiliates.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  const renderCompactCard = (
    affiliate: AffiliateLink | undefined,
    placement: 'banner' | 'card_1' | 'card_2' | 'interstitial',
    label: string
  ) => {
    if (!affiliate) {
      return (
        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-700 rounded-lg bg-[#1F2937]/50">
          <ImageIcon className="w-8 h-8 text-zinc-500 mb-3" />
          <p className="text-sm text-zinc-400 mb-4">No {label} configured</p>
          <button
            onClick={() => handleEdit(null, placement)}
            className="flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Configure {label}
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-start space-x-4 p-4 border border-zinc-800 rounded-lg bg-[#1F2937]">
        <div className="flex-shrink-0 w-16 h-16 bg-zinc-800 rounded-md overflow-hidden flex items-center justify-center">
          {affiliate.image_url ? (
            <img src={affiliate.image_url} alt={affiliate.title} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-zinc-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-white truncate">{affiliate.title}</h4>
                {placement === 'interstitial' && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      affiliate.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {affiliate.is_active ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{affiliate.subtitle}</p>
              {affiliate.cta_text && (
                <p className="text-[11px] text-purple-400 mt-0.5 truncate">CTA: {affiliate.cta_text}</p>
              )}
            </div>
            <button
              onClick={() => handleEdit(affiliate, placement)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
              title={`Edit ${label}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            {renderStars(affiliate.rating)}
            <a 
              href={affiliate.destination_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-xs text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Link
            </a>
          </div>
        </div>
      </div>
    );
  };

  const ctr =
    interstitialStats.impressions > 0
      ? ((interstitialStats.clicks / interstitialStats.impressions) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Affiliate Links</h2>
          <p className="text-zinc-400 mt-1">Manage sponsored product links for marketplace, interstitials and email campaigns.</p>
        </div>
      </div>

      {/* Full-Screen Interstitial Section */}
      <ModernCard>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Maximize2 className="w-5 h-5 text-gold" />
              <div>
                <h3 className="text-lg font-medium text-white">📺 Full-Screen Interstitial (Web & Login)</h3>
                <p className="text-xs text-zinc-400">
                  Appears on login (Web & Android) with 5s countdown, and on Web navigation with AdMob frequency.
                </p>
              </div>
            </div>

            {interstitialAffiliate && (
              <div className="flex items-center gap-3 bg-zinc-800/60 px-3 py-1.5 rounded-lg border border-zinc-700/60">
                <span className="text-xs text-zinc-300 font-medium">
                  {interstitialAffiliate.is_active ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={interstitialAffiliate.is_active}
                  onCheckedChange={handleToggleInterstitialActive}
                  disabled={togglingInterstitial}
                />
              </div>
            )}
          </div>

          {renderCompactCard(interstitialAffiliate, 'interstitial', 'Interstitial')}

          {/* Quick Analytics Bar */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[#1F2937]/70 border border-zinc-800 flex items-center gap-3">
              <Eye className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-400">Impressions</div>
                <div className="text-sm font-bold text-white">{interstitialStats.impressions}</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#1F2937]/70 border border-zinc-800 flex items-center gap-3">
              <MousePointerClick className="w-4 h-4 text-green-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-400">Clicks</div>
                <div className="text-sm font-bold text-white">{interstitialStats.clicks}</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#1F2937]/70 border border-zinc-800 flex items-center gap-3">
              <XCircle className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-400">Dismissals (X)</div>
                <div className="text-sm font-bold text-white">{interstitialStats.dismissals}</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#1F2937]/70 border border-zinc-800 flex items-center gap-3">
              <Star className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs text-zinc-400">CTR</div>
                <div className="text-sm font-bold text-amber-400">{ctr}%</div>
              </div>
            </div>
          </div>
        </div>
      </ModernCard>

      {/* Main Banner Section */}
      <ModernCard>
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <LayoutTemplate className="w-5 h-5 text-gold" />
            <h3 className="text-lg font-medium text-white">🎯 Main Banner</h3>
          </div>
          {renderCompactCard(bannerAffiliate, 'banner', 'Banner')}
        </div>
      </ModernCard>

      {/* Marketplace Cards Section */}
      <ModernCard>
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <ShoppingCart className="w-5 h-5 text-gold" />
            <h3 className="text-lg font-medium text-white">🛒 Marketplace Cards</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-zinc-400 mb-2 font-medium">Position 1</div>
              {renderCompactCard(card1Affiliate, 'card_1', 'Card 1')}
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-2 font-medium">Position 20</div>
              {renderCompactCard(card2Affiliate, 'card_2', 'Card 2')}
            </div>
          </div>
        </div>
      </ModernCard>

      {/* Email Links Section */}
      <ModernCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-gold" />
              <h3 className="text-lg font-medium text-white">📧 Email Links</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-full">
                {emailAffiliates.filter(a => a.is_active).length} active
              </span>
            </div>
            <button
              onClick={() => handleEdit(null, 'email')}
              className="flex items-center px-3 py-1.5 bg-gold hover:bg-gold/90 text-[#1F2937] font-medium rounded-md transition-colors text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add New
            </button>
          </div>

          {emailAffiliates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-zinc-700 rounded-lg bg-[#1F2937]/50">
              <Megaphone className="w-10 h-10 text-zinc-500 mb-3" />
              <p className="text-zinc-400 mb-4">No email affiliates configured</p>
              <button
                onClick={() => handleEdit(null, 'email')}
                className="flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Link
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Rating</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {emailAffiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {affiliate.image_url ? (
                              <img src={affiliate.image_url} alt={affiliate.title} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-zinc-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{affiliate.title}</div>
                            <a 
                              href={affiliate.destination_url}
                              target="_blank"
                              rel="noopener noreferrer" 
                              className="text-xs text-zinc-400 hover:text-blue-400 flex items-center mt-0.5 truncate max-w-[200px]"
                            >
                              <ExternalLink className="w-3 h-3 mr-1 inline-block" />
                              {affiliate.destination_url}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        {renderStars(affiliate.rating)}
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          affiliate.is_active 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {affiliate.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(affiliate, 'email')}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          
                          {deleteConfirmId === affiliate.id ? (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleDelete(affiliate.id)}
                                className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 rounded text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(affiliate.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModernCard>

      <AffiliateEditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        affiliate={editingAffiliate}
        placement={editingPlacement}
        onSaved={() => {
          fetchAffiliates();
          setModalOpen(false);
          toast.success('Affiliate saved');
        }}
      />
    </div>
  );
}
