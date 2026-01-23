'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    alt: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, alt }: ImageModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center overflow-hidden">
                <VisuallyHidden>
                    <DialogTitle>{alt}</DialogTitle>
                </VisuallyHidden>
                <div
                    className="relative w-full h-full flex items-center justify-center cursor-zoom-out"
                    onClick={onClose}
                >
                    <div className="relative w-full h-[90vh] md:h-[95vh]">
                        <Image
                            src={imageUrl}
                            alt={alt}
                            fill
                            className="object-contain"
                            quality={100}
                            priority
                        />
                    </div>

                    {/* Close Button Hint */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-50"
                        aria-label="Cerrar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
