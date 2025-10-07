'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface StickerImageProps {
  thumbUrl?: string | null;
  imageUrl?: string | null;
  externalUrl?: string | null;
  alt: string;
  playerName?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * StickerImage component that implements the fallback chain:
 * thumb_public_url → image_public_url → image_url → initials placeholder
 */
export default function StickerImage({
  thumbUrl,
  imageUrl,
  externalUrl,
  alt,
  playerName,
  fill = false,
  width,
  height,
  priority = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
  className,
}: StickerImageProps) {
  // Determine which image source to use
  const imageSrc = thumbUrl || imageUrl || externalUrl;

  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        priority={priority}
        sizes={sizes}
        className={cn('object-cover', className)}
      />
    );
  }

  // Fallback: Initials placeholder
  const initials = playerName
    ? playerName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 text-white font-extrabold text-4xl',
        className
      )}
      role="img"
      aria-label={alt}
    >
      {initials}
    </div>
  );
}
