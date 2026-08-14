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
import { Star, Upload, Loader2, Image as ImageIcon, Smartphone } from 'lucide-react';
import Image from 'next/image';

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
      } else {
        setTitle('');
        setSubtitle('');
        setRating(5.0);
        setUrl('');
        setActive(placement !== 'email' ? true : false); // active defaults to true mostly
        setImageUrl('');
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

  const renderPreview = () => {
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
              <Button size="sm" className="w-full h-7 mt-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] rounded-full">
                Ver oferta
              </Button>
            </div>
            <div className="w-20 h-20 bg-white rounded-lg p-1 flex-shrink-0 flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain" />
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
              <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain mix-blend-multiply" />
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
            <Button size="sm" className="w-full h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-full">
              Ver precio
            </Button>
          </div>
        </div>
      );
    }

    if (placement === 'email') {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="w-20 h-20 mx-auto bg-white mb-3 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-300" />
            )}
          </div>
          <h4 className="font-bold text-gray-900 text-sm mb-1">{title || 'Título principal'}</h4>
          <p className="text-xs text-gray-500 mb-2">{subtitle || 'Subtítulo'}</p>
          <div className="flex justify-center mb-3">
            {renderStars(rating)}
          </div>
          <Button size="sm" className="w-full h-9 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-md">
            Ver en Amazon
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[800px] p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">
            {affiliate ? 'Editar enlace de afiliado' : 'Nuevo enlace de afiliado'}
            <span className="ml-2 text-xs font-normal text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full uppercase">
              {placement}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          {/* Form Side */}
          <div className="flex-1 space-y-4">
            {/* Image Upload */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Imagen del producto</Label>
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                  ${isDragging ? 'border-gold bg-gold/5' : 'border-zinc-600 hover:border-gold'}
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
                    <div className="w-24 h-24 relative mb-3 bg-white rounded-lg p-2 flex items-center justify-center">
                      <img src={imageUrl} alt="Uploaded" className="max-w-full max-h-full object-contain" />
                    </div>
                    <span className="text-xs text-zinc-400">Clic o arrastrar para cambiar</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4">
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
                    ) : (
                      <Upload className="w-8 h-8 text-zinc-400 mb-3" />
                    )}
                    <span className="text-sm font-medium">
                      {isUploading ? 'Subiendo...' : 'Haz clic o arrastra una imagen'}
                    </span>
                    <span className="text-xs text-zinc-500 mt-1">JPG, PNG o WEBP (Max. 2MB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Título principal</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-gold mt-1"
                placeholder="Ej: Samsung Galaxy S24 Ultra"
                disabled={isUploading || isSaving}
              />
            </div>

            {/* Subtitle */}
            <div>
              <Label htmlFor="subtitle">Subtítulo</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-gold mt-1"
                placeholder="Ej: Smartphone 5G, 256GB"
                disabled={isUploading || isSaving}
              />
            </div>

            {/* Rating */}
            <div>
              <Label htmlFor="rating">Valoración Amazon</Label>
              <div className="flex items-center gap-4 mt-1">
                <Input
                  id="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(parseFloat(e.target.value) || 0)}
                  className="bg-zinc-800 border-zinc-700 focus-visible:ring-gold w-24"
                  disabled={isUploading || isSaving}
                />
                <div className="flex items-center bg-zinc-800 px-3 py-2 rounded-md border border-zinc-700">
                  {renderStars(rating)}
                  <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* URL */}
            <div>
              <Label htmlFor="url">Enlace de afiliado</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-zinc-800 border-zinc-700 focus-visible:ring-gold mt-1"
                placeholder="https://amazon.es/dp/..."
                disabled={isUploading || isSaving}
              />
            </div>

            {/* Active Toggle (Only Email) */}
            {placement === 'email' && (
              <div className="flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-lg mt-2">
                <div>
                  <p className="font-medium text-sm">Estado del enlace</p>
                  <p className="text-xs text-zinc-400">Mostrar en los próximos emails</p>
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
          <div className="lg:w-[360px] flex-shrink-0">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden sticky top-0">
              <div className="bg-zinc-800/50 p-3 border-b border-zinc-700 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-medium">Vista previa móvil</h3>
              </div>
              <div className="p-6 bg-zinc-900/50 flex justify-center">
                <div className="w-[320px] bg-white rounded-[2rem] p-4 shadow-xl border-4 border-zinc-800 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-xl z-20"></div>
                  <div className="pt-4 pb-2">
                    {renderPreview()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUploading || isSaving}
            className="hover:bg-zinc-800 text-zinc-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUploading || isSaving}
            className="bg-gold hover:bg-gold/90 text-zinc-900 font-bold"
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
