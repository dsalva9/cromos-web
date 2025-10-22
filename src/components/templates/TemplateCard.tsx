'use client';

import { useState } from 'react';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { User, Star, Copy, FileText } from 'lucide-react';
import { useCopyTemplate } from '@/hooks/templates/useCopyTemplate';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Template {
  id: string;
  author_id: string;
  author_nickname: string;
  title: string;
  description: string | null;
  image_url: string | null;
  rating_avg: number;
  rating_count: number;
  copies_count: number;
  pages_count: number;
  total_slots: number;
  created_at: string;
}

interface TemplateCardProps {
  template: Template;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const { user } = useUser();
  const router = useRouter();
  const { copyTemplate, loading } = useCopyTemplate();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to detail page

    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const copyId = await copyTemplate(template.id);
      setCopied(true);
      toast.success('¡Plantilla copiada con éxito!');
      setTimeout(() => {
        router.push(`/mis-plantillas/${copyId}`);
      }, 1000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al copiar plantilla'
      );
    }
  };

  return (
    <Link href={`/templates/${template.id}`}>
      <ModernCard className="hover:scale-105 transition-transform cursor-pointer h-full">
        <ModernCardContent className="p-0">
          {/* Image */}
          <div className="relative aspect-video bg-[#374151]">
            {template.image_url ? (
              <Image
                src={template.image_url}
                alt={template.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-6xl font-black text-gray-600">
                  {template.title.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <h3 className="font-bold text-white text-lg line-clamp-2">
              {template.title}
            </h3>

            {/* Description */}
            {template.description && (
              <p className="text-sm text-gray-400 line-clamp-2">
                {template.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              {/* Rating */}
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-[#FFC000] text-[#FFC000]" />
                <span className="font-bold text-white">
                  {template.rating_avg.toFixed(1)}
                </span>
                <span>({template.rating_count})</span>
              </div>

              {/* Copies */}
              <div className="flex items-center gap-1">
                <Copy className="h-4 w-4" />
                <span>{template.copies_count}</span>
              </div>

              {/* Pages */}
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>
                  {template.pages_count} páginas • {template.total_slots} cromos
                </span>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User className="h-4 w-4" />
              <span className="line-clamp-1">
                por {template.author_nickname}
              </span>
            </div>

            {/* Copy Button */}
            <Button
              onClick={handleCopy}
              disabled={loading || copied}
              className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
              size="sm"
            >
              {copied ? (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  ¡Copiada!
                </>
              ) : loading ? (
                'Copiando...'
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Plantilla
                </>
              )}
            </Button>
          </div>
        </ModernCardContent>
      </ModernCard>
    </Link>
  );
}
