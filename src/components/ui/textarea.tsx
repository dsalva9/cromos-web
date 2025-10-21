import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[80px] w-full rounded-md border-2 border-black bg-[#374151] px-3 py-2 text-base text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F2937] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
