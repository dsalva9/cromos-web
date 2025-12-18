'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useReport } from '@/hooks/social/useReport';
import { toast } from 'sonner';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  entityType: 'user' | 'listing' | 'template' | 'chat';
  entityId: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam o engañoso' },
  { value: 'inappropriate_content', label: 'Contenido inapropiado' },
  { value: 'harassment', label: 'Acoso o abuso' },
  { value: 'copyright_violation', label: 'Violación de derechos de autor' },
  { value: 'misleading_information', label: 'Información engañosa' },
  { value: 'fake_listing', label: 'Anuncio falso' },
  { value: 'offensive_language', label: 'Lenguaje ofensivo' },
  { value: 'other', label: 'Otro' },
];

export function ReportModal({
  open,
  onClose,
  entityType,
  entityId,
}: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { submitReport, loading } = useReport();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error('Por favor selecciona un motivo');
      return;
    }

    if (description.length > 500) {
      toast.error('La descripción debe tener 500 caracteres o menos');
      return;
    }

    try {
      await submitReport(entityType, entityId, reason, description);
      toast.success(
        'Denuncia enviada correctamente. Nuestro equipo la revisará.'
      );
      onClose();
      // Reset form
      setReason('');
      setDescription('');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al enviar la denuncia'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-50 border-2 border-black">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Denunciar Contenido</DialogTitle>
          <DialogDescription className="text-gray-600">
            Ayúdanos a mantener una comunidad segura denunciando contenido
            inapropiado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reason */}
          <div className="space-y-3">
            <Label className="text-gray-900">
              ¿Por qué estás denunciando esto?
            </Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="text-gray-600 cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-900">
              Detalles adicionales (opcional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Proporciona cualquier información adicional..."
              rows={4}
              maxLength={500}
              className="bg-white border-2 border-black text-gray-900"
            />
            <p className="text-sm text-gray-600">
              {description.length} / 500 caracteres
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !reason}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Enviando...' : 'Enviar Denuncia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
