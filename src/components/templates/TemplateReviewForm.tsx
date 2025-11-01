'use client';

import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, EyeOff, FileText, Star } from 'lucide-react';
import Image from 'next/image';

interface TemplateSlotData {
  label: string;
  slot_number: number;
  slot_variant?: string;
  global_number?: number;
  is_special: boolean;
}

interface TemplatePageData {
  title: string;
  type: 'team' | 'special';
  slots: TemplateSlotData[];
}

interface TemplateReviewFormProps {
  data: {
    title: string;
    description: string;
    image_url: string;
    is_public: boolean;
    pages: TemplatePageData[];
    terms_accepted?: boolean;
  };
  onChange: (
    data: Partial<{
      title: string;
      description: string;
      image_url: string;
      is_public: boolean;
      pages: TemplatePageData[];
      terms_accepted?: boolean;
    }>
  ) => void;
}

export function TemplateReviewForm({
  data,
  onChange,
}: TemplateReviewFormProps) {
  const [isEditing, setIsEditing] = useState({
    title: false,
    description: false,
    is_public: false,
  });
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

  const toggleEdit = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const totalSlots = data.pages.reduce(
    (sum, page) => sum + page.slots.length,
    0
  );
  const totalSpecialSlots = data.pages.reduce(
    (sum, page) => sum + page.slots.filter(slot => slot.is_special).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Basic Info Review */}
      <Card className="bg-[#1F2937] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            Información Básica
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleEdit('title')}
              className="text-[#FFC000] hover:text-[#FFD700]"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Título</Label>
            {isEditing.title ? (
              <Input
                value={data.title}
                onChange={e => onChange({ title: e.target.value })}
                className="bg-[#374151] border-gray-600 text-white"
              />
            ) : (
              <p className="text-white">{data.title || 'Sin título'}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descripción</Label>
            {isEditing.description ? (
              <Textarea
                value={data.description}
                onChange={e => onChange({ description: e.target.value })}
                rows={3}
                className="bg-[#374151] border-gray-600 text-white resize-none"
              />
            ) : (
              <p className="text-white">
                {data.description || 'Sin descripción'}
              </p>
            )}
          </div>

          {/* Image */}
          {data.image_url && (
            <div className="space-y-2">
              <Label>Imagen</Label>
              <div className="relative h-48 w-full">
                <Image
                  src={data.image_url}
                  alt="Template preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover rounded-md"
                />
              </div>
            </div>
          )}

          {/* Public/Private */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Visibilidad</Label>
              <p className="text-sm text-gray-400">
                {data.is_public
                  ? 'Pública - Otros usuarios pueden verla'
                  : 'Privada - Solo tú puedes verla'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={data.is_public}
                onCheckedChange={checked => onChange({ is_public: checked })}
              />
              <span className="text-white">
                {data.is_public ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages and Slots Summary */}
      <Card className="bg-[#1F2937] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">
            Resumen de Páginas y Cromos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FFC000]">
                {data.pages.length}
              </div>
              <div className="text-sm text-gray-400">Páginas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FFC000]">
                {totalSlots}
              </div>
              <div className="text-sm text-gray-400">Cromos Totales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FFC000]">
                {totalSpecialSlots}
              </div>
              <div className="text-sm text-gray-400">Cromos Especiales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FFC000]">
                {totalSlots - totalSpecialSlots}
              </div>
              <div className="text-sm text-gray-400">Cromos Normales</div>
            </div>
          </div>

          {/* Pages List */}
          <div className="space-y-3">
            {data.pages.map((page, pageIndex) => (
              <Card key={pageIndex} className="bg-[#374151] border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-white">{page.title}</h4>
                    <Badge
                      variant={page.type === 'team' ? 'default' : 'secondary'}
                    >
                      {page.type === 'team' ? 'Equipo' : 'Especial'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <FileText className="h-4 w-4" />
                    <span>{page.slots.length} cromos</span>
                    {page.slots.some(slot => slot.is_special) && (
                      <>
                        <Star className="h-4 w-4 text-[#FFC000]" />
                        <span>
                          {page.slots.filter(slot => slot.is_special).length}{' '}
                          especiales
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {page.slots.map((slot, slotIndex) => {
                      const slotDisplay = `${slot.slot_number}${slot.slot_variant || ''}`;
                      const labelText = slot.label || `Cromo ${slotIndex + 1}`;
                      const globalNum = slot.global_number ? ` (#${slot.global_number})` : '';

                      return (
                        <span
                          key={slotIndex}
                          className={`inline-block px-2 py-1 text-xs rounded ${
                            slot.is_special
                              ? 'bg-[#FFC000] text-black'
                              : 'bg-gray-600 text-white'
                          }`}
                          title={`Slot ${slotDisplay}${globalNum}`}
                        >
                          {slotDisplay}. {labelText}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terms of Use for Public Templates */}
      {data.is_public && (
        <Card className="bg-[#1F2937] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Términos de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="template-terms"
                checked={data.terms_accepted || false}
                onCheckedChange={(checked) =>
                  onChange({ terms_accepted: checked === true })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor="template-terms"
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
          </CardContent>
        </Card>
      )}

      {/* Final Confirmation */}
      <Card className="bg-[#1F2937] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Confirmación Final</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-white">
              Estás a punto de crear una plantilla con:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              <li>{data.pages.length} página(s)</li>
              <li>{totalSlots} cromo(s) en total</li>
              <li>{totalSpecialSlots} cromo(s) especial(es)</li>
              <li>Visibilidad: {data.is_public ? 'Pública' : 'Privada'}</li>
            </ul>
            <p className="text-sm text-gray-400 mt-4">
              Una vez creada, la plantilla estará disponible para que tú y otros
              usuarios (si es pública) puedan usarla como base para sus
              colecciones.
            </p>
          </div>
        </CardContent>
      </Card>

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
  );
}
