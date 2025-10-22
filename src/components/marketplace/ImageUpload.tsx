'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import Image from 'next/image';
import { logger } from '@/lib/logger';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const supabase = useSupabaseClient();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setUploading(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `marketplace/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('sticker-images') // Reuse existing bucket
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('sticker-images').getPublicUrl(filePath);

      onChange(publicUrl);
      toast.success('Imagen subida con éxito');
    } catch (error) {
      logger.error('Upload error:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div className="space-y-4">
      {value ? (
        <div className="relative">
          <ModernCard>
            <ModernCardContent className="p-0">
              <div className="relative aspect-square bg-[#374151]">
                <Image
                  src={value}
                  alt="Listing preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>
      ) : (
        <ModernCard>
          <ModernCardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#374151] border-2 border-black flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold mb-2">Add Listing Image</p>
                <p className="text-gray-400 text-sm mb-4">
                  Upload a photo of your card for better visibility
                </p>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Button
                    type="button"
                    disabled={uploading}
                    className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-black border-r-transparent rounded-full mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  JPG, PNG, or WebP (max 5MB)
                </p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      )}
    </div>
  );
}
