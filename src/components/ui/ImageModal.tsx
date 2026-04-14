'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useCallback, useRef, useState } from 'react';

interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    alt: string;
}

function getDistance(t1: React.Touch, t2: React.Touch) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function getMidpoint(t1: React.Touch, t2: React.Touch) {
    return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
    };
}

export function ImageModal({ isOpen, onClose, imageUrl, alt }: ImageModalProps) {
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });

    const scaleRef = useRef(1);
    const translateRef = useRef({ x: 0, y: 0 });
    const initialDistRef = useRef(0);
    const initialScaleRef = useRef(1);
    const initialMidRef = useRef({ x: 0, y: 0 });
    const initialTranslateRef = useRef({ x: 0, y: 0 });

    // Single-finger pan state
    const panStartRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);

    // Double-tap detection
    const lastTapRef = useRef(0);

    const containerRef = useRef<HTMLDivElement>(null);

    const resetTransform = useCallback(() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        scaleRef.current = 1;
        translateRef.current = { x: 0, y: 0 };
    }, []);

    const handleOpenChange = useCallback(
        (open: boolean) => {
            if (!open) {
                resetTransform();
                onClose();
            }
        },
        [onClose, resetTransform],
    );

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch start
            isPanningRef.current = false;
            initialDistRef.current = getDistance(e.touches[0], e.touches[1]);
            initialScaleRef.current = scaleRef.current;
            const mid = getMidpoint(e.touches[0], e.touches[1]);
            initialMidRef.current = mid;
            initialTranslateRef.current = { ...translateRef.current };
            e.preventDefault();
        } else if (e.touches.length === 1) {
            // Check for double-tap
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
                // Double-tap: toggle zoom
                if (scaleRef.current > 1.1) {
                    scaleRef.current = 1;
                    translateRef.current = { x: 0, y: 0 };
                    setScale(1);
                    setTranslate({ x: 0, y: 0 });
                } else {
                    // Zoom to 2.5x centered on tap point
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                        const cx = rect.left + rect.width / 2;
                        const cy = rect.top + rect.height / 2;
                        const tx = (cx - e.touches[0].clientX) * 1.5;
                        const ty = (cy - e.touches[0].clientY) * 1.5;
                        scaleRef.current = 2.5;
                        translateRef.current = { x: tx, y: ty };
                        setScale(2.5);
                        setTranslate({ x: tx, y: ty });
                    }
                }
                lastTapRef.current = 0;
                e.preventDefault();
                return;
            }
            lastTapRef.current = now;

            // Single-finger pan (only when zoomed)
            if (scaleRef.current > 1.1) {
                isPanningRef.current = true;
                panStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                };
                initialTranslateRef.current = { ...translateRef.current };
                e.preventDefault();
            }
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch move
            const dist = getDistance(e.touches[0], e.touches[1]);
            const ratio = dist / initialDistRef.current;
            const newScale = Math.min(Math.max(initialScaleRef.current * ratio, 1), 5);

            const mid = getMidpoint(e.touches[0], e.touches[1]);
            const dx = mid.x - initialMidRef.current.x;
            const dy = mid.y - initialMidRef.current.y;

            scaleRef.current = newScale;
            translateRef.current = {
                x: initialTranslateRef.current.x + dx,
                y: initialTranslateRef.current.y + dy,
            };
            setScale(newScale);
            setTranslate({ ...translateRef.current });
            e.preventDefault();
        } else if (e.touches.length === 1 && isPanningRef.current) {
            // Single-finger pan
            const dx = e.touches[0].clientX - panStartRef.current.x;
            const dy = e.touches[0].clientY - panStartRef.current.y;
            translateRef.current = {
                x: initialTranslateRef.current.x + dx,
                y: initialTranslateRef.current.y + dy,
            };
            setTranslate({ ...translateRef.current });
            e.preventDefault();
        }
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        // If scale snapped below 1, reset
        if (scaleRef.current <= 1.05) {
            scaleRef.current = 1;
            translateRef.current = { x: 0, y: 0 };
            setScale(1);
            setTranslate({ x: 0, y: 0 });
        }
        if (e.touches.length === 0) {
            isPanningRef.current = false;
        }
    }, []);

    const handleClick = useCallback(() => {
        // Only close on click (desktop) if not zoomed
        if (scaleRef.current <= 1.05) {
            resetTransform();
            onClose();
        }
    }, [onClose, resetTransform]);

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center overflow-hidden">
                <VisuallyHidden>
                    <DialogTitle>{alt}</DialogTitle>
                </VisuallyHidden>
                <div
                    ref={containerRef}
                    className="relative w-full h-full flex items-center justify-center cursor-zoom-out touch-none"
                    onClick={handleClick}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div
                        className="relative w-full h-[90vh] md:h-[95vh] will-change-transform"
                        style={{
                            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                            transition: scale === 1 ? 'transform 0.2s ease-out' : 'none',
                        }}
                    >
                        <Image
                            src={imageUrl}
                            alt={alt}
                            fill
                            className="object-contain"
                            quality={100}
                            priority
                        />
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            resetTransform();
                            onClose();
                        }}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-50"
                        aria-label="Cerrar"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Zoom hint — only on touch devices when not zoomed */}
                    {scale <= 1.05 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/40 text-white/80 text-xs pointer-events-none select-none md:hidden animate-in fade-in duration-500">
                            Pellizca para ampliar
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
