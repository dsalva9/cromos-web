'use client';

import { useState } from 'react';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { UserLink } from '@/components/ui/user-link';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { User, Star, Copy, FileText, Layout, Eye, EyeOff, Edit } from 'lucide-react';
import { useCopyTemplate } from '@/hooks/templates/useCopyTemplate';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useRouter } from '@/hooks/use-router';
import { toast } from 'sonner';
import { createRipple } from '@/lib/animations';
import { DeletionCountdown } from '@/components/deletion';

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
  is_public?: boolean;
  deleted_at?: string | null;
  scheduled_for?: string | null;
}

interface TemplateCardProps {
  template: Template;
  showVisibility?: boolean;
  showEditButton?: boolean;
}

export function TemplateCard({
  template,
  showVisibility = false,
  showEditButton = false,
}: TemplateCardProps) {
  const { user } = useUser();
  const router = useRouter();
  const { copyTemplate, loading } = useCopyTemplate();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    createRipple(e, 'rgba(0, 0, 0, 0.3)');

    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const copyId = await copyTemplate(template.id);
      setCopied(true);
      toast.success('¡Colección copiada con Éxito!');
      setTimeout(() => {
        router.push(`/mis-plantillas/${copyId}`);
      }, 1000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al copiar colección'
      );
    }
  };

  return (
    <ModernCard className="hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-slate-900/50 transition-all duration-300 h-full border border-gray-200 dark:border-slate-700/50 shadow-md dark:shadow-lg dark:shadow-slate-900/30">
      <ModernCardContent className="p-0 flex flex-col h-full">
        {/* Image */}
        <Link
          href={`/templates/${template.id}`}
          aria-label={`Ver colección: ${template.title}`}
          className="block"
        >
          <div className="relative aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-800 cursor-pointer">
            {template.image_url ? (
              <Image
                src={template.image_url}
                alt={`Portada de la colección ${template.title}`}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Layout className="w-16 h-16 text-slate-400/50" />
              </div>
            )}

            {/* Badges (Visibility and Deletion) */}
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              {/* Deletion Badge (always show if deleted) */}
              {template.deleted_at && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/90 text-white">
                  <FileText className="h-3 w-3" />
                  Eliminada
                </div>
              )}

              {/* Visibility Badge */}
              {showVisibility && template.is_public !== undefined && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${template.is_public
                    ? 'bg-green-500/90 text-white'
                    : 'bg-slate-700/90 text-slate-300'
                    }`}
                >
                  {template.is_public ? (
                    <>
                      <Eye className="h-3 w-3" />
                      Pública
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3" />
                      Privada
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Content */}
        <div className="p-4 flex flex-col h-full">
          <div className="flex-grow space-y-3">
            <Link
              href={`/templates/${template.id}`}
              className="block hover:text-[#FFC000] transition-colors"
            >
              <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-2">
                {template.title}
              </h3>
            </Link>

            {template.description && (
              <p className="text-sm text-slate-400 line-clamp-2">
                {template.description}
              </p>
            )}

            {/* Deletion Countdown */}
            {template.deleted_at && template.scheduled_for && (
              <Alert className="bg-yellow-900/20 border-yellow-700 p-2">
                <DeletionCountdown
                  deletedAt={template.deleted_at}
                  scheduledFor={template.scheduled_for}
                  entityType="template"
                  className="text-xs"
                />
              </Alert>
            )}

            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-[#FFC000] text-[#FFC000]" />
                <span className="font-bold text-gray-900 dark:text-white">
                  {template.rating_avg.toFixed(1)}
                </span>
                <span className="text-gray-500 dark:text-slate-400">({template.rating_count})</span>
              </div>

              <div className="flex items-center gap-1">
                <Copy className="h-4 w-4" />
                <span>{template.copies_count}</span>
              </div>

              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>
                  {template.pages_count} páginas - {template.total_slots}{' '}
                  cromos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center p-1">
                  <User className="h-3 w-3 text-slate-400" />
                </div>
                <span className="line-clamp-1">
                  por{' '}
                  <UserLink
                    userId={template.author_id}
                    nickname={template.author_nickname}
                    variant="subtle"
                    forceSpan={true}
                  />
                </span>
              </div>
            </div>
          </div>

          {showEditButton ? (
            <Link
              href={`/templates/${template.id}/edit`}
              className="w-full mt-3 block"
            >
              <Button
                className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium relative overflow-hidden transition-all duration-300"
                size="sm"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Colección
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleCopy}
              disabled={loading || copied}
              className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium relative overflow-hidden transition-all duration-300 mt-3"
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
                  Copiar Colección
                </>
              )}
            </Button>
          )}
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
