'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTemplateDetails } from '@/hooks/templates/useTemplateDetails';
import { useTemplateEditor } from '@/hooks/templates/useTemplateEditor';
import { useUser } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Eye, EyeOff, Save, FileText, Layout, Trash2, Edit2, X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const templateId = params.id as string;

  const { data, loading, error } = useTemplateDetails(templateId);
  const {
    updateMetadata,
    updatePage,
    updateSlot,
    deletePage,
    deleteSlot,
    addPage,
    addSlot,
    loading: updating
  } = useTemplateEditor(templateId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [initialIsPublic, setInitialIsPublic] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [editingSlot, setEditingSlot] = useState<{ pageId: string; slotId: string; label: string } | null>(null);
  const [editingPage, setEditingPage] = useState<{ pageId: string; title: string } | null>(null);
  const [addingSlot, setAddingSlot] = useState<{ pageId: string; label: string } | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageType, setNewPageType] = useState<'team' | 'special'>('team');
  const [newPageSlots, setNewPageSlots] = useState<Array<{ label: string; is_special: boolean }>>([
    { label: '', is_special: false }
  ]);

  // Load template data
  useEffect(() => {
    if (data?.template) {
      setTitle(data.template.title);
      setDescription(data.template.description || '');
      setImageUrl(data.template.image_url || '');
      setIsPublic(data.template.is_public);
      setInitialIsPublic(data.template.is_public);
      // If already public, consider terms already accepted
      if (data.template.is_public) {
        setTermsAccepted(true);
      }
    }
  }, [data]);

  // Check if user is owner
  useEffect(() => {
    if (data?.template && user && data.template.author_id !== user.id) {
      toast.error('No tienes permiso para editar esta plantilla');
      router.push(`/templates/${templateId}`);
    }
  }, [data, user, templateId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate terms if making template public
    if (isPublic && !initialIsPublic && !termsAccepted) {
      toast.error('Debes aceptar los términos de uso para hacer la plantilla pública');
      return;
    }

    try {
      await updateMetadata({
        title,
        description,
        image_url: imageUrl || null,
        is_public: isPublic,
      });

      toast.success('Plantilla actualizada con éxito');
      router.push(`/templates/${templateId}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Error al actualizar plantilla'
      );
    }
  };

  const handleUpdatePage = async (pageId: string, newTitle: string) => {
    try {
      await updatePage(pageId, { title: newTitle });
      toast.success('Página actualizada');
      setEditingPage(null);
      // Refresh data
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar página');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta página?')) return;

    try {
      await deletePage(pageId);
      toast.success('Página eliminada');
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar página');
    }
  };

  const handleUpdateSlot = async (slotId: string, label: string) => {
    try {
      await updateSlot(slotId, { label });
      toast.success('Cromo actualizado');
      setEditingSlot(null);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar cromo');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('¿Estás seguro de eliminar este cromo?')) return;

    try {
      await deleteSlot(slotId);
      toast.success('Cromo eliminado');
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar cromo');
    }
  };

  const handleAddPage = async () => {
    if (!newPageTitle.trim()) {
      toast.error('El título de la página es obligatorio');
      return;
    }

    const validSlots = newPageSlots.filter(s => s.label.trim());
    if (validSlots.length === 0) {
      toast.error('Debes añadir al menos un cromo');
      return;
    }

    try {
      await addPage({
        title: newPageTitle,
        type: newPageType,
        slots: validSlots
      });
      toast.success('Página añadida con éxito');
      setAddingPage(false);
      setNewPageTitle('');
      setNewPageSlots([{ label: '', is_special: false }]);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al añadir página');
    }
  };

  const handleAddSlot = async (pageId: string, label: string) => {
    if (!label.trim()) {
      toast.error('La etiqueta del cromo es obligatoria');
      return;
    }

    try {
      await addSlot(pageId, { label, is_special: false });
      toast.success('Cromo añadido');
      setAddingSlot(null);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al añadir cromo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#FFC000] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error al cargar la plantilla</p>
          <Link href="/templates">
            <Button>Volver a Plantillas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#1F2937]">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Header */}
          <Link
            href={`/templates/${templateId}`}
            className="inline-flex items-center text-[#FFC000] hover:text-[#FFD700] mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la plantilla
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase text-white mb-2">
              Editar Plantilla
            </h1>
            <p className="text-gray-400">Modifica la información de tu plantilla</p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Información
              </TabsTrigger>
              <TabsTrigger value="pages" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Páginas y Cromos
              </TabsTrigger>
            </TabsList>

            {/* Info Tab */}
            <TabsContent value="info">
              <form onSubmit={handleSubmit}>
                <ModernCard>
                  <ModernCardContent className="p-6 space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Título <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. LaLiga 2024/25"
                    className="bg-[#374151] border-2 border-black text-white"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (Opcional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe tu plantilla..."
                    rows={4}
                    className="bg-[#374151] border-2 border-black text-white resize-none"
                  />
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL de Imagen (Opcional)</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-[#374151] border-2 border-black text-white"
                  />
                </div>

                {/* Public/Private Toggle */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                  <div className="space-y-0.5">
                    <Label>Visibilidad</Label>
                    <p className="text-sm text-gray-400">
                      {isPublic
                        ? 'Pública - Otros usuarios pueden verla'
                        : 'Privada - Solo tú puedes verla'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                    <span className="text-white">
                      {isPublic ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Terms of Use - Show only when changing from private to public */}
                {isPublic && !initialIsPublic && (
                  <div className="space-y-2 pt-2 border-t border-gray-600">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) =>
                          setTermsAccepted(checked === true)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="terms"
                          className="text-sm text-gray-300 cursor-pointer"
                        >
                          Al crear esta plantilla pública acepto los{' '}
                          <button
                            type="button"
                            onClick={() => setTermsDialogOpen(true)}
                            className="text-[#FFC000] hover:text-[#FFD700] underline"
                          >
                            términos de uso
                          </button>
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={updating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updating || (isPublic && !initialIsPublic && !termsAccepted)}
                    className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
                  </ModernCardContent>
                </ModernCard>
              </form>
            </TabsContent>

            {/* Pages Tab */}
            <TabsContent value="pages">
              <div className="space-y-4">
                {/* Add Page Button */}
                {!addingPage && (
                  <Button
                    onClick={() => setAddingPage(true)}
                    className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Nueva Página
                  </Button>
                )}

                {/* Add Page Form */}
                {addingPage && (
                  <ModernCard>
                    <ModernCardContent className="p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Nueva Página</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="newPageTitle">Título</Label>
                          <Input
                            id="newPageTitle"
                            value={newPageTitle}
                            onChange={(e) => setNewPageTitle(e.target.value)}
                            className="bg-[#374151] border-2 border-black text-white"
                            placeholder="Ej. Equipo Principal"
                          />
                        </div>
                        <div>
                          <Label htmlFor="newPageType">Tipo</Label>
                          <select
                            id="newPageType"
                            value={newPageType}
                            onChange={(e) => setNewPageType(e.target.value as 'team' | 'special')}
                            className="w-full bg-[#374151] border-2 border-black text-white rounded-md p-2"
                          >
                            <option value="team">Equipo</option>
                            <option value="special">Especial</option>
                          </select>
                        </div>
                        <div>
                          <Label>Cromos</Label>
                          {newPageSlots.map((slot, index) => (
                            <div key={index} className="flex gap-2 mt-2">
                              <Input
                                value={slot.label}
                                onChange={(e) => {
                                  const updated = [...newPageSlots];
                                  updated[index].label = e.target.value;
                                  setNewPageSlots(updated);
                                }}
                                className="bg-[#374151] border-2 border-black text-white"
                                placeholder={`Cromo ${index + 1}`}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const updated = newPageSlots.filter((_, i) => i !== index);
                                  setNewPageSlots(updated);
                                }}
                                disabled={newPageSlots.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNewPageSlots([...newPageSlots, { label: '', is_special: false }])}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Añadir Cromo
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAddPage}
                            disabled={updating}
                            className="flex-1 bg-[#FFC000] text-black hover:bg-[#FFD700]"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Guardar Página
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setAddingPage(false);
                              setNewPageTitle('');
                              setNewPageSlots([{ label: '', is_special: false }]);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                )}

                {data?.pages.map((page) => (
                  <ModernCard key={page.id}>
                    <ModernCardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        {editingPage?.pageId === page.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editingPage.title}
                              onChange={(e) =>
                                setEditingPage({ ...editingPage, title: e.target.value })
                              }
                              className="bg-[#374151] border-2 border-black text-white"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdatePage(page.id, editingPage.title)}
                              disabled={updating}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPage(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-xl font-bold text-white">{page.title}</h3>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingPage({ pageId: page.id, title: page.title })
                                }
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeletePage(page.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {page.slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="p-3 bg-[#374151] border-2 border-black rounded-md"
                          >
                            {editingSlot?.slotId === slot.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingSlot.label}
                                  onChange={(e) =>
                                    setEditingSlot({ ...editingSlot, label: e.target.value })
                                  }
                                  className="bg-[#1F2937] border-gray-600 text-white text-sm"
                                  placeholder="Etiqueta del cromo"
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleUpdateSlot(slot.id, editingSlot.label)
                                    }
                                    disabled={updating}
                                    className="flex-1"
                                  >
                                    Guardar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingSlot(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-white text-sm">
                                  {slot.label || `Cromo ${slot.slot_number}`}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setEditingSlot({
                                        pageId: page.id,
                                        slotId: slot.id,
                                        label: slot.label || '',
                                      })
                                    }
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Add Slot Button */}
                        {addingSlot?.pageId === page.id ? (
                          <div className="p-3 bg-[#374151] border-2 border-black rounded-md">
                            <div className="space-y-2">
                              <Input
                                value={addingSlot.label}
                                onChange={(e) =>
                                  setAddingSlot({ ...addingSlot, label: e.target.value })
                                }
                                className="bg-[#1F2937] border-gray-600 text-white text-sm"
                                placeholder="Etiqueta del cromo"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleAddSlot(page.id, addingSlot.label)}
                                  disabled={updating}
                                  className="flex-1"
                                >
                                  Añadir
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingSlot(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingSlot({ pageId: page.id, label: '' })}
                            className="p-3 bg-[#1F2937] border-2 border-dashed border-[#FFC000] rounded-md hover:bg-[#374151] transition-colors flex items-center justify-center gap-2 text-[#FFC000]"
                          >
                            <Plus className="h-4 w-4" />
                            <span className="text-sm font-medium">Añadir Cromo</span>
                          </button>
                        )}
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Terms Dialog */}
          <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  Términos de Uso
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-gray-300">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                  eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                  enim ad minim veniam, quis nostrud exercitation ullamco laboris
                  nisi ut aliquip ex ea commodo consequat.
                </p>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse
                  cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                  cupidatat non proident, sunt in culpa qui officia deserunt mollit
                  anim id est laborum.
                </p>
                <h3 className="text-lg font-semibold text-white">
                  1. Aceptación de los Términos
                </h3>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                  eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
                <h3 className="text-lg font-semibold text-white">
                  2. Uso del Servicio
                </h3>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse
                  cillum dolore eu fugiat nulla pariatur.
                </p>
                <h3 className="text-lg font-semibold text-white">
                  3. Contenido del Usuario
                </h3>
                <p>
                  Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                  officia deserunt mollit anim id est laborum.
                </p>
                <h3 className="text-lg font-semibold text-white">
                  4. Privacidad y Protección de Datos
                </h3>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                  eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => setTermsDialogOpen(false)}
                    className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700]"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AuthGuard>
  );
}
