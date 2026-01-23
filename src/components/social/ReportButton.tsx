'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Flag } from 'lucide-react';
import { ReportModal } from './ReportModal';

interface ReportButtonProps {
  entityType: 'user' | 'listing' | 'template' | 'chat';
  entityId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string; // Add className prop
}

export function ReportButton({
  entityType,
  entityId,
  variant = 'outline',
  size = 'sm',
  className, // Destructure className
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}

        onClick={() => setOpen(true)}
        className={`text-gray-400 hover:text-red-500 ${className}`} // Append className
      >
        <Flag className="h-4 w-4 mr-2" />
        Denunciar
      </Button>

      <ReportModal
        open={open}
        onClose={() => setOpen(false)}
        entityType={entityType}
        entityId={entityId}
      />
    </>
  );
}
