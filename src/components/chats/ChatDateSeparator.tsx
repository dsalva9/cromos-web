'use client';

import { formatChatDateSeparator } from '@/lib/chatDate';

interface ChatDateSeparatorProps {
  date: Date | string;
  locale?: string;
  className?: string;
}

export function ChatDateSeparator({
  date,
  locale = 'es',
  className,
}: ChatDateSeparatorProps) {
  const text = formatChatDateSeparator(date, locale);
  if (!text) return null;

  return (
    <div
      className={`flex items-center justify-center my-3 select-none ${className || ''}`}
      role="separator"
      aria-label={text}
    >
      <div className="h-px bg-gray-200 dark:bg-gray-700/60 flex-1 max-w-[40px] sm:max-w-[80px]" />
      <span className="mx-2 px-3 py-0.5 rounded-full text-[11px] font-medium tracking-wide bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
        {text}
      </span>
      <div className="h-px bg-gray-200 dark:bg-gray-700/60 flex-1 max-w-[40px] sm:max-w-[80px]" />
    </div>
  );
}
