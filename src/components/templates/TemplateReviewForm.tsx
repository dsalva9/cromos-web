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
import { Edit, Eye, EyeOff, FileText } from 'lucide-react';
import Image from 'next/image';

interface TemplateSlotData {
  data: Record<string, string | number | boolean>;
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

  return (
    <div className="space-y-6">
      {/* Basic Info Review */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center justify-between">
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
                className="bg-white border-gray-200 text-gray-900"
              />
            ) : (
              <p className="text-gray-900">{data.title || 'Sin título'}</p>
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
                className="bg-white border-gray-200 text-gray-900 resize-none"
              />
            ) : (
              <p className="text-gray-900">
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
              <p className="text-sm text-gray-600">
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
              <span className="text-gray-900">
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
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">
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
              <div className="text-sm text-gray-600">Páginas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#FFC000]">
                {totalSlots}
              </div>
              <div className="text-sm text-gray-600">Cromos Totales</div>
            </div>
          </div>

          {/* Pages List */}
          <div className="space-y-3">
            {data.pages.map((page, pageIndex) => (
              <Card key={pageIndex} className="bg-white border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900">{page.title}</h4>
                    <Badge
                      variant={page.type === 'team' ? 'default' : 'secondary'}
                    >
                      {page.type === 'team' ? 'Normal' : 'Especial'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>{page.slots.length} cromos</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {page.slots.length} cromo(s) configurado(s) con campos personalizados
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terms of Use for Public Templates */}
      {data.is_public && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Términos de Uso</CardTitle>
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
                  className="text-sm text-gray-600 cursor-pointer"
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
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Confirmación Final</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-gray-900">
              Estás a punto de crear una plantilla con:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>{data.pages.length} página(s)</li>
              <li>{totalSlots} cromo(s) en total</li>
              <li>Visibilidad: {data.is_public ? 'Pública' : 'Privada'}</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">
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
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Términos de Uso - Plantillas Públicas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-gray-600">
            <p>
              Si decides compartir una plantilla o listado público, recuerda que esta información quedará visible para otros usuarios. Solo subas contenido original o sobre el que tengas derechos de uso. Al publicarlo, autorizas a Cambiocromos.com a mostrarlo dentro de la plataforma con fines informativos o de comunidad, sin adquirir derechos de propiedad sobre él. Podrás eliminar tu plantilla cuando quieras. Al continuar, aceptas las Condiciones de uso y garantizas que el contenido que compartes cumple la ley y los derechos de terceros.
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
