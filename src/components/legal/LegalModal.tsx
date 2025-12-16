'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LegalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LegalModal({ open, onOpenChange }: LegalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-gray-900 text-gray-200 border-2 border-black">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase text-white">
            Información Legal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Cambiocromos.com es una plataforma que pone en contacto a coleccionistas para intercambiar o vender cromos. Cumplimos con el RGPD y la LOPDGDD. Tratamos tus datos para ofrecerte servicios, mostrarte contenido personalizado y mantener la seguridad. Puedes ejercer tus derechos escribiendo a{' '}
            <a href="mailto:correo@cambiocromos.com" className="text-[#FFC000] hover:text-yellow-400 underline">
              correo@cambiocromos.com
            </a>
            . El contenido que subes sigue siendo tuyo, pero al publicarlo nos concedes permiso para mostrarlo dentro de la plataforma. Eres responsable de garantizar que tus publicaciones no vulneran derechos de terceros. Nos reservamos el derecho de eliminar contenidos o cuentas que incumplan las normas. Usamos herramientas de medición y publicidad; podrás configurar tus preferencias desde tu cuenta. La plataforma está dirigida a mayores de 18 años o menores con autorización legal.
          </p>
          <div className="pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold uppercase"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
