'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTemplateDetails } from '@/hooks/templates/useTemplateDetails';
import { useCopyTemplate } from '@/hooks/templates/useCopyTemplate';
import { useTemplateRatings } from '@/hooks/templates/useTemplateRatings';
import { useTemplateEditor } from '@/hooks/templates/useTemplateEditor';
import { useUser } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Star,
  User,
  FileText,
  Layout,
  Loader2,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createRipple } from '@/lib/animations';
import { TemplateRatingSummary } from '@/components/templates/TemplateRatingSummary';
import { TemplateRatingDialog } from '@/components/templates/TemplateRatingDialog';
import { TemplateReviewList } from '@/components/templates/TemplateReviewList';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function TemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const templateId = params.id as string;

  const { data, loading, error } = useTemplateDetails(templateId);
  const { copyTemplate, loading: copying } = useCopyTemplate();
  const {
    summary,
    ratings,
    loading: ratingsLoading,
    hasMore,
    myRating,
    rateTemplate,
    updateRating,
    deleteRating,
    loadMore,
    getIsAuthor
  } = useTemplateRatings(templateId);
  const { deleteTemplate } = useTemplateEditor(templateId);

  const [copied, setCopied] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);

  // Check if user is author
  useEffect(() => {
    const checkAuthor = async () => {
      const author = await getIsAuthor();
      setIsAuthor(author);
    };
    checkAuthor();
  }, [getIsAuthor]);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    createRipple(e, 'rgba(0, 0, 0, 0.3)');

    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const copyId = await copyTemplate(templateId);
      setCopied(true);
      toast.success('¡Plantilla copiada con éxito!');
      setTimeout(() => {
        router.push(`/mis-plantillas/${copyId}`);
      }, 1000);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al copiar plantilla'
      );
    }
  };

  const handleRateClick = () => {
    if (!user) {
      router.push(`/login?redirect=/templates/${templateId}`);
      return;
    }
    setRatingDialogOpen(true);
  };

  const handleRatingSubmit = async (rating: number, comment?: string) => {
    if (myRating) {
      // Get the rating ID from the ratings list
      const userRatingObj = ratings.find((r) => r.user_id === user?.id);
      if (userRatingObj) {
        await updateRating(userRatingObj.id, rating, comment);
      }
    } else {
      await rateTemplate(rating, comment);
    }
  };

  const handleRatingDelete = async () => {
    const userRatingObj = ratings.find((r) => r.user_id === user?.id);
    if (userRatingObj) {
      await deleteRating(userRatingObj.id);
    }
  };

  const handleDeleteTemplate = async () => {
    setDeleting(true);
    try {
      await deleteTemplate(deleteReason || undefined);
      toast.success('Plantilla eliminada con éxito');
      router.push('/templates');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al eliminar plantilla'
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#FFC000] animate-spin" />
          <p className="text-slate-400">Cargando plantilla...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <ModernCard className="max-w-md w-full">
          <ModernCardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-white">Error</h2>
            <p className="text-slate-400">
              {error?.message || 'No se pudo cargar la plantilla'}
            </p>
            <Button
              onClick={() => router.push('/templates')}
              className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
            >
              Volver a Plantillas
            </Button>
          </ModernCardContent>
        </ModernCard>
      </div>
    );
  }

  const { template, pages } = data;
  const totalSlots = pages.reduce((sum, page) => sum + page.slots_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Plantillas
          </Link>
        </div>

        {/* Template Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Info Card */}
          <ModernCard className="lg:col-span-2">
            <ModernCardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image */}
                <div className="relative w-full md:w-64 aspect-video bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                  {template.image_url ? (
                    <Image
                      src={template.image_url}
                      alt={template.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layout className="w-16 h-16 text-slate-400/50" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-grow space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {template.title}
                    </h1>
                    {template.description && (
                      <p className="text-slate-400">{template.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Star className="h-5 w-5 fill-[#FFC000] text-[#FFC000]" />
                      <span className="font-bold text-white text-base">
                        {template.rating_avg.toFixed(1)}
                      </span>
                      <span>({template.rating_count})</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Copy className="h-5 w-5" />
                      <span>{template.copies_count} copias</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400">
                      <FileText className="h-5 w-5" />
                      <span>{pages.length} páginas - {totalSlots} cromos</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <span>por {template.author_nickname}</span>
                  </div>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Action Card */}
          <ModernCard>
            <ModernCardContent className="p-6 space-y-4">
              {isAuthor ? (
                <>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-white">
                      Gestionar Plantilla
                    </h3>
                    <p className="text-sm text-slate-400">
                      Esta es tu plantilla. Puedes editarla o eliminarla.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Link href={`/templates/${templateId}/edit`} className="block">
                      <Button className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Plantilla
                      </Button>
                    </Link>
                    <Button
                      onClick={() => setDeleteDialogOpen(true)}
                      variant="outline"
                      className="w-full border-red-600 text-red-500 hover:bg-red-600/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar Plantilla
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-white">
                      ¿Quieres esta plantilla?
                    </h3>
                    <p className="text-sm text-slate-400">
                      Copia esta plantilla a tu colección y comienza a completarla
                    </p>
                  </div>

                  <Button
                    onClick={handleCopy}
                    disabled={copying || copied}
                    className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium py-6 text-lg"
                  >
                    {copied ? (
                      <>
                        <Copy className="mr-2 h-5 w-5" />
                        ¡Copiada!
                      </>
                    ) : copying ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Copiando...
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-5 w-5" />
                        Copiar Plantilla
                      </>
                    )}
                  </Button>
                </>
              )}

              <div className="pt-4 border-t border-slate-700 space-y-2 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Páginas totales:</span>
                  <span className="text-white font-medium">{pages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cromos totales:</span>
                  <span className="text-white font-medium">{totalSlots}</span>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Ratings Section */}
        {summary && (
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-bold text-white">Valoraciones</h2>
            <ModernCard>
              <ModernCardContent className="p-6">
                <TemplateRatingSummary
                  summary={summary}
                  onRateClick={handleRateClick}
                  isAuthor={isAuthor}
                  hasUserRated={!!myRating}
                />
              </ModernCardContent>
            </ModernCard>

            {/* Reviews List */}
            {!ratingsLoading && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Comentarios</h3>
                <TemplateReviewList
                  ratings={ratings}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  loading={ratingsLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* Pages Outline */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Contenido de la Plantilla</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => (
              <ModernCard key={page.id} className="hover:border-[#FFC000]/50 transition-colors">
                <ModernCardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#FFC000] bg-[#FFC000]/10 px-2 py-0.5 rounded">
                            Página {page.page_number}
                          </span>
                          <span className="text-xs font-medium text-slate-500 bg-slate-700 px-2 py-0.5 rounded capitalize">
                            {page.type}
                          </span>
                        </div>
                        <h3 className="font-bold text-white">{page.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Cromos:</span>
                      <span className="font-medium text-white">{page.slots_count}</span>
                    </div>

                    {/* Slots list */}
                    <div className="pt-2 border-t border-slate-700 max-h-32 overflow-y-auto">
                      <div className="space-y-1">
                        {page.slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="text-slate-500 font-mono w-6">
                              {slot.slot_number}.
                            </span>
                            <span className={slot.is_special ? 'text-yellow-500 font-medium' : 'text-slate-400'}>
                              {slot.label || `Cromo ${slot.slot_number}`}
                            </span>
                            {slot.is_special && (
                              <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">
                                ESPECIAL
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>

          {pages.length === 0 && (
            <ModernCard>
              <ModernCardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Esta plantilla aún no tiene páginas</p>
              </ModernCardContent>
            </ModernCard>
          )}
        </div>

        {/* Rating Dialog */}
        <TemplateRatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          templateTitle={template.title}
          currentRating={myRating}
          currentComment={
            ratings.find((r) => r.user_id === user?.id)?.comment || null
          }
          currentRatingId={
            ratings.find((r) => r.user_id === user?.id)?.id || null
          }
          onSubmit={handleRatingSubmit}
          onDelete={myRating ? handleRatingDelete : undefined}
        />

        {/* Delete Template Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-slate-800 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>Eliminar Plantilla</DialogTitle>
              <DialogDescription className="text-slate-400">
                ¿Estás seguro de que quieres eliminar esta plantilla? Se marcará como
                eliminada y ya no será visible públicamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Motivo (opcional)
                </label>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="¿Por qué eliminas esta plantilla?"
                  rows={3}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteTemplate}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
