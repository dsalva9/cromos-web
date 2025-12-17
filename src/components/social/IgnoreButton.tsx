'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye } from 'lucide-react';
import { useIgnore } from '@/hooks/social/useIgnore';
import { useUser } from '@/components/providers/SupabaseProvider';

interface IgnoreButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function IgnoreButton({
  userId,
  variant = 'outline',
  size = 'sm',
  className,
}: IgnoreButtonProps) {
  const { user: currentUser } = useUser();
  const { ignoreUser, unignoreUser, isUserIgnored, loading } = useIgnore();
  const [isIgnored, setIsIgnored] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if user is already ignored
  useEffect(() => {
    async function checkIgnoredStatus() {
      if (!currentUser || currentUser.id === userId) {
        setChecking(false);
        return;
      }

      try {
        const ignored = await isUserIgnored(userId);
        setIsIgnored(ignored);
      } catch (error) {
        console.error('Error checking ignored status:', error);
      } finally {
        setChecking(false);
      }
    }

    void checkIgnoredStatus();
  }, [currentUser, userId, isUserIgnored]);

  const handleToggleIgnore = async () => {
    if (!currentUser || currentUser.id === userId) return;

    let success = false;
    if (isIgnored) {
      success = await unignoreUser(userId);
    } else {
      success = await ignoreUser(userId);
    }

    if (success) {
      setIsIgnored(!isIgnored);
    }
  };

  // Don't show for own profile or while checking
  if (!currentUser || currentUser.id === userId || checking) {
    return null;
  }

  return (
    <Button
      variant={isIgnored ? 'default' : variant}
      size={size}
      onClick={handleToggleIgnore}
      disabled={loading}
      className={className}
    >
      {isIgnored ? (
        <>
          <Eye className="h-4 w-4 mr-2" />
          Desbloquear
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4 mr-2" />
          Bloquear
        </>
      )}
    </Button>
  );
}
