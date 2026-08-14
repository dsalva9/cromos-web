'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAdminAffiliates } from '@/hooks/admin/useAdminAffiliates';
import type { AffiliateLink } from '@/types/affiliates';
import { toast } from 'sonner';
import { Star, Upload, Loader2, Image as ImageIcon, Smartphone, Monitor, ZoomIn, ZoomOut } from 'lucide-react';

interface AffiliateEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliate: AffiliateLink | null;
  placement: 'banner' | 'card_1' | 'card_2' | 'email';
  onSaved: () => void;
}

export function AffiliateEditModal({
  open,
  onOpenChange,
  affiliate,
  placement,
  onSaved,
}: AffiliateEditModalProps) {
  const { uploadImage, upsertAffiliate } = useAdminAffiliates();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [rating, setRating] = useState(5.0);
  const [url, setUrl] = useState('');
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [imageScale, setImageScale] = useState(1.0);

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (open) {
      if (affiliate) {
        setTitle(affiliate.title || '');
        setSubtitle(affiliate.subtitle || '');
        setRating(affiliate.rating || 5.0);
        setUrl(affiliate.destination_url || '');
        setActive(affiliate.is_active ?? true);
        setImageUrl(affiliate.image_url || '');
        setImageScale(affiliate.image_scale ?? 1.0);
      } else {
        setTitle('');
        setSubtitle('');
        setRating(5.0);
        setUrl('');
        setActive(placement !== 'email' ? true : false);
        setImageUrl('');
        setImageScale(1.0);
      }
    }
  }, [open, affiliate, placement]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El tamaño de la imagen no debe exceder 2MB');
      return;
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor sube una imagen jpg, png o webp');
      return;
    }

    try {
      setIsUploading(true);
      const uploadedUrl = await uploadImage(file);
      if (uploadedUrl) {
        setImageUrl(uploadedUrl);
        toast.success('Imagen subida con éxito');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = () => {
    if (!title) return 'El título es requerido';
    if (!url) return 'El enlace de afiliado es requerido';
    if (!url.startsWith('https://')) return 'El enlace debe comenzar con https://';
    if (!imageUrl) return 'La imagen es requerida';
    if (rating < 0 || rating > 5) return 'La valoración debe estar entre 0 y 5';
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setIsSaving(true);
      
      const payload = {
        ...(affiliate?.id ? { id: affiliate.id } : {}),
        placement,
        image_url: imageUrl,
        title,
        subtitle,
        rating,
        destination_url: url,
        is_active: placement === 'email' ? active : true,
        image_scale: imageScale,
      };

      await upsertAffiliate(payload);
      toast.success('Enlace de afiliado guardado');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar el enlace');
    } finally {
      setIsSaving(false);
    }
  };

  // Previews
  const renderStars = (currentRating: number) => {
    const stars = [];
    const fullStars = Math.floor(currentRating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3 h-3 ${i < fullStars ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      );
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  // ─── MOBILE PREVIEW ────────────────────────────────────────
  const renderMobilePreview = () => {
    if (placement === 'banner') {
      return (
        <div className="bg-[#f8f9fa] rounded-xl overflow-hidden shadow-sm border border-gray-200">
          <div className="bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-600 uppercase flex items-center justify-between">
            <span>⭐ Recomendado</span>
            <span>Anuncio</span>
          </div>
          <div className="flex p-3 gap-3">
            <div className="flex-1 flex flex-col justify-center">
              <h4 className="font-bold text-gray-900 text-xs leading-tight line-clamp-2">{title || 'Título principal'}</h4>
              <div className="flex items-center gap-1 mt-1">
                {renderStars(rating)}
                <span className="text-[10px] text-gray-500 font-medium">{rating.toFixed(1)}</span>
              </div>
              <div className="w-full h-7 mt-2 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                Ver oferta
              </div>
            </div>
            <div className="w-20 h-20 bg-white rounded-lg p-1 flex-shrink-0 flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain" style={{ transform: `scale(${imageScale})` }} />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-300" />
              )}
            </div>
          </div>
        </div>
      );
    }

    if (placement === 'card_1' || placement === 'card_2') {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="relative aspect-square w-full bg-white p-4 flex items-center justify-center">
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm z-10">
              N.º 1 más vendido
            </div>
            {imageUrl ? (
              <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain mix-blend-multiply" style={{ transform: `scale(${imageScale})` }} />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-300" />
            )}
          </div>
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-1 mb-1">
              {renderStars(rating)}
              <span className="text-[10px] text-gray-500">{rating.toFixed(1)}</span>
            </div>
            <h4 className="font-bold text-gray-900 text-xs leading-tight line-clamp-2 mb-1">{title || 'Título principal'}</h4>
            <p className="text-[10px] text-gray-500 line-clamp-1 mb-2">{subtitle || 'Subtítulo'}</p>
            <div className="w-full h-8 bg-purple-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
              Ver precio
            </div>
          </div>
        </div>
      );
    }

    if (placement === 'email') {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="w-20 h-20 mx-auto bg-white mb-3 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain" style={{ transform: `scale(${imageScale})` }} />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <h4 className="font-bold text-gray-900 text-sm mb-1">{title || 'Título principal'}</h4>
          <p className="text-xs text-gray-500 mb-2">{subtitle || 'Subtítulo'}</p>
          <div className="flex justify-center mb-3">
            {renderStars(rating)}
          </div>
          <div className="w-full h-9 bg-purple-600 text-white text-sm font-semibold rounded-md flex items-center justify-center">
            Ver en Amazon
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── DESKTOP PREVIEW ────────────────────────────────────────
  const renderDesktopPreview = () => {
    if (placement === 'banner') {
      return (
        <div className="bg-white rounded-2xl border border-purple-100 p-4 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between w-full gap-4">
            {/* Left: badge + title */}
            <div className="flex-1 min-w-0 flex flex-col items-start gap-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-[#E8E6F8] text-[#533FC6] border border-[#533FC6]/15">
                🛡️ Recomendado
              </span>
              <h2 className="text-sm font-black text-gray-900 uppercase leading-tight tracking-tight line-clamp-2">
                {title || 'Título principal'}
              </h2>
              <svg className="w-24 h-1 text-[#533FC6] opacity-80" viewBox="0 0 200 8" fill="none">
                <path d="M2 6C40 2 120 2 198 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            {/* Center: image */}
            <div className="relative w-16 h-14 flex items-center justify-center shrink-0">
              {imageUrl ? (
                <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain transform rotate-3" style={{ transform: `scale(${imageScale}) rotate(3deg)` }} />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-300" />
              )}
            </div>
            {/* Right: rating + CTA */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-gray-700">{rating.toFixed(1)}</span>
                {renderStars(rating)}
              </div>
              <div className="bg-[#533FC6] text-white font-black text-[8px] uppercase py-1.5 px-3 rounded-lg flex items-center gap-1">
                ⭐ Completar álbum →
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (placement === 'card_1' || placement === 'card_2') {
      // Desktop card is wider/horizontal layout
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex">
          <div className="w-28 bg-white p-3 flex items-center justify-center flex-shrink-0 relative">
            <div className="absolute top-1 left-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm z-10">
              N.º 1
            </div>
            {imageUrl ? (
              <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain mix-blend-multiply" style={{ transform: `scale(${imageScale})` }} />
            ) : (
              <ImageIcon className="w-10 h-10 text-gray-300" />
            )}
          </div>
          <div className="flex-1 p-3 border-l border-gray-100 flex flex-col justify-center">
            <div className="flex items-center gap-1 mb-1">
              {renderStars(rating)}
              <span className="text-[10px] text-gray-500">{rating.toFixed(1)}</span>
            </div>
            <h4 className="font-bold text-gray-900 text-xs leading-tight line-clamp-2 mb-0.5">{title || 'Título principal'}</h4>
            <p className="text-[10px] text-gray-500 line-clamp-1 mb-2">{subtitle || 'Subtítulo'}</p>
            <div className="w-full h-7 bg-purple-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
              Ver precio
            </div>
          </div>
        </div>
      );
    }

    if (placement === 'email') {
      // Desktop email preview: horizontal layout mimicking email client
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-16 h-16 bg-white flex items-center justify-center flex-shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain" style={{ transform: `scale(${imageScale})` }} />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-sm mb-0.5 truncate">{title || 'Título principal'}</h4>
            <p className="text-xs text-gray-500 mb-1 truncate">{subtitle || 'Subtítulo'}</p>
            <div className="flex items-center gap-1">
              {renderStars(rating)}
              <span className="text-[10px] text-gray-500">({rating.toFixed(1)})</span>
            </div>
          </div>
          <div className="shrink-0">
            <div className="h-8 px-4 bg-purple-600 text-white text-xs font-semibold rounded-md flex items-center justify-center whitespace-nowrap">
              Ver en Amazon
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[900px] p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-2 border-b border-gray-100">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {affiliate ? 'Editar enlace de afiliado' : 'Nuevo enlace de afiliado'}
            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full uppercase">
              {placement}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          {/* Form Side */}
          <div className="flex-1 space-y-4">
            {/* Image Upload */}
            <div>
              <Label className="text-sm font-medium mb-2 block text-gray-700">Imagen del producto</Label>
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                  ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-amber-500'}
                  ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                />
                
                {imageUrl ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-24 h-24 relative mb-3 bg-gray-50 rounded-lg p-2 flex items-center justify-center border border-gray-100">
                      <img src={imageUrl} alt="Uploaded" className="max-w-full max-h-full object-contain" />
                    </div>
                    <span className="text-xs text-gray-400">Clic o arrastrar para cambiar</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400 mb-3" />
                    )}
                    <span className="text-sm font-medium text-gray-600">
                      {isUploading ? 'Subiendo...' : 'Haz clic o arrastra una imagen'}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">JPG, PNG o WEBP (Max. 2MB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Image Zoom */}
            {imageUrl && (
              <div>
                <Label className="text-sm font-medium mb-2 block text-gray-700">Zoom de imagen</Label>
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={imageScale}
                    onChange={(e) => setImageScale(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    disabled={isUploading || isSaving}
                  />
                  <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-gray-500 w-10 text-right">{(imageScale * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-gray-700">Título principal</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border-gray-300 focus-visible:ring-amber-500 mt-1 text-gray-900"
                placeholder="Ej: Samsung Galaxy S24 Ultra"
                disabled={isUploading || isSaving}
              />
            </div>

            {/* Subtitle */}
            <div>
              <Label htmlFor="subtitle" className="text-gray-700">Subtítulo</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="bg-white border-gray-300 focus-visible:ring-amber-500 mt-1 text-gray-900"
                placeholder="Ej: Smartphone 5G, 256GB"
                disabled={isUploading || isSaving}
              />
            </div>

            {/* Rating */}
            <div>
              <Label htmlFor="rating" className="text-gray-700">Valoración Amazon</Label>
              <div className="flex items-center gap-4 mt-1">
                <Input
                  id="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value) || 0)}
                  className="bg-white border-gray-300 focus-visible:ring-amber-500 w-24 text-gray-900"
                  disabled={isUploading || isSaving}
                />
                <div className="flex items-center bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  {renderStars(rating)}
                  <span className="ml-2 text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* URL */}
            <div>
              <Label htmlFor="url" className="text-gray-700">Enlace de afiliado</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-white border-gray-300 focus-visible:ring-amber-500 mt-1 text-gray-900"
                placeholder="https://amazon.es/dp/..."
                disabled={isUploading || isSaving}
              />
            </div>

            {/* Active Toggle (Only Email) */}
            {placement === 'email' && (
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg mt-2">
                <div>
                  <p className="font-medium text-sm text-gray-700">Estado del enlace</p>
                  <p className="text-xs text-gray-400">Mostrar en los próximos emails</p>
                </div>
                <Switch
                  checked={active}
                  onCheckedChange={setActive}
                  disabled={isUploading || isSaving}
                />
              </div>
            )}
          </div>

          {/* Preview Side */}
          <div className="lg:w-[400px] flex-shrink-0 space-y-4">
            {/* Mobile Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-white p-3 border-b border-gray-100 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-600">Vista previa móvil</h3>
              </div>
              <div className="p-5 flex justify-center">
                <div className="w-[260px]">
                  {renderMobilePreview()}
                </div>
              </div>
            </div>

            {/* Desktop Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-white p-3 border-b border-gray-100 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-600">Vista previa escritorio</h3>
              </div>
              <div className="p-5">
                {renderDesktopPreview()}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUploading || isSaving}
            className="hover:bg-gray-100 text-gray-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUploading || isSaving}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar enlace'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
