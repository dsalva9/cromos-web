'use client';

import { useState } from 'react';
import { Package, X, CheckCircle, XCircle, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionMenuProps {
    // Seller actions
    canReserve?: boolean;
    canComplete?: boolean;
    canUnreserve?: boolean;
    onReserve?: () => void;
    onComplete?: () => void;
    onUnreserve?: () => void;
    reserving?: boolean;
    completing?: boolean;
    unreserving?: boolean;

    // Buyer actions
    canConfirm?: boolean;
    onConfirm?: () => void;
    confirming?: boolean;

    // Position
    className?: string;
}

export function FloatingActionMenu({
    canReserve,
    canComplete,
    canUnreserve,
    onReserve,
    onComplete,
    onUnreserve,
    reserving,
    completing,
    unreserving,
    canConfirm,
    onConfirm,
    confirming,
    className,
}: FloatingActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Don't render if no actions available
    if (!canReserve && !canComplete && !canUnreserve && !canConfirm) {
        return null;
    }

    const hasMultipleActions = [canReserve, canComplete, canUnreserve, canConfirm].filter(Boolean).length > 1;

    return (
        <div className={cn('fixed bottom-24 right-4 z-40', className)}>
            {/* Action buttons - shown when menu is open */}
            {isOpen && hasMultipleActions && (
                <div className="absolute bottom-16 right-0 space-y-2 mb-2">
                    {canReserve && (
                        <button
                            onClick={() => {
                                onReserve?.();
                                setIsOpen(false);
                            }}
                            disabled={reserving}
                            className="flex items-center gap-2 bg-white text-gray-900 px-4 py-3 rounded-full shadow-lg hover:bg-gray-100 transition-all whitespace-nowrap border-2 border-[#FFC000]"
                        >
                            <Package className="h-5 w-5" />
                            <span className="font-bold text-sm">
                                {reserving ? 'Marcando...' : 'Marcar Reservado'}
                            </span>
                        </button>
                    )}

                    {canComplete && (
                        <button
                            onClick={() => {
                                onComplete?.();
                                setIsOpen(false);
                            }}
                            disabled={completing}
                            className="flex items-center gap-2 bg-white text-gray-900 px-4 py-3 rounded-full shadow-lg hover:bg-gray-100 transition-all whitespace-nowrap border-2 border-green-500"
                        >
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-bold text-sm">
                                {completing ? 'Completando...' : 'Marcar Completado'}
                            </span>
                        </button>
                    )}

                    {canUnreserve && (
                        <button
                            onClick={() => {
                                onUnreserve?.();
                                setIsOpen(false);
                            }}
                            disabled={unreserving}
                            className="flex items-center gap-2 bg-white text-gray-900 px-4 py-3 rounded-full shadow-lg hover:bg-gray-100 transition-all whitespace-nowrap border-2 border-red-500"
                        >
                            <XCircle className="h-5 w-5" />
                            <span className="font-bold text-sm">
                                {unreserving ? 'Liberando...' : 'Liberar Reserva'}
                            </span>
                        </button>
                    )}

                    {canConfirm && (
                        <button
                            onClick={() => {
                                onConfirm?.();
                                setIsOpen(false);
                            }}
                            disabled={confirming}
                            className="flex items-center gap-2 bg-[#FFC000] text-black px-4 py-3 rounded-full shadow-lg hover:bg-yellow-400 transition-all whitespace-nowrap border-2 border-black font-bold"
                        >
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-bold text-sm">
                                {confirming ? 'Confirmando...' : 'Confirmar Recepción'}
                            </span>
                        </button>
                    )}
                </div>
            )}

            {/* Main FAB button */}
            {hasMultipleActions ? (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        'bg-[#FFC000] text-black rounded-full p-4 shadow-lg hover:bg-yellow-400 transition-all',
                        isOpen && 'rotate-45'
                    )}
                >
                    {isOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <MoreVertical className="h-6 w-6" />
                    )}
                </button>
            ) : (
                // Single action - direct button
                <>
                    {canReserve && (
                        <button
                            onClick={onReserve}
                            disabled={reserving}
                            className="bg-[#FFC000] text-black rounded-full p-4 shadow-lg hover:bg-yellow-400 transition-all"
                        >
                            <Package className="h-6 w-6" />
                        </button>
                    )}
                    {canComplete && (
                        <button
                            onClick={onComplete}
                            disabled={completing}
                            className="bg-[#FFC000] text-black rounded-full p-4 shadow-lg hover:bg-yellow-400 transition-all"
                        >
                            <CheckCircle className="h-6 w-6" />
                        </button>
                    )}
                    {canUnreserve && (
                        <button
                            onClick={onUnreserve}
                            disabled={unreserving}
                            className="bg-[#FFC000] text-black rounded-full p-4 shadow-lg hover:bg-yellow-400 transition-all"
                        >
                            <XCircle className="h-6 w-6" />
                        </button>
                    )}
                    {canConfirm && (
                        <button
                            onClick={onConfirm}
                            disabled={confirming}
                            className="bg-[#FFC000] text-black rounded-full p-4 shadow-lg hover:bg-yellow-400 transition-all"
                        >
                            <CheckCircle className="h-6 w-6" />
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
