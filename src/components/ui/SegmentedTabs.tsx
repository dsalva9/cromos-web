import * as React from 'react';

export interface SegmentedTab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  value: string;
  onValueChange: (value: string) => void;
  'aria-label'?: string;
}

/**
 * SegmentedTabs - Equal-width paired tab control following Retro-Comic theme
 *
 * Features:
 * - Equal-width columns using grid
 * - Thick borders (border-2 border-black)
 * - Gold active state (#FFC000)
 * - Rounded only on outer corners
 * - Zero internal gap for flush seams
 * - Full keyboard navigation
 * - ARIA compliant
 */
export function SegmentedTabs({
  tabs,
  value,
  onValueChange,
  'aria-label': ariaLabel,
}: SegmentedTabsProps) {
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    tabValue: string
  ) => {
    const currentIndex = tabs.findIndex(t => t.value === tabValue);

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      onValueChange(tabs[nextIndex].value);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid gap-0 bg-gray-800 border-2 border-black rounded-md p-1 shadow-xl"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map((tab, index) => {
        const isActive = value === tab.value;
        const isFirst = index === 0;
        const isLast = index === tabs.length - 1;

        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.value}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onValueChange(tab.value)}
            onKeyDown={e => handleKeyDown(e, tab.value)}
            className={`
              relative px-4 py-2 font-bold uppercase text-sm
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800
              ${isActive ? 'bg-[#FFC000] text-gray-900 border-2 border-black z-10' : 'bg-transparent text-white border-2 border-transparent'}
              ${isFirst && isActive ? 'rounded-l-md' : ''}
              ${isLast && isActive ? 'rounded-r-md' : ''}
              ${!isActive ? 'hover:bg-gray-700' : ''}
            `}
          >
            <span className="flex items-center justify-center gap-2">
              {tab.icon}
              {tab.label}
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
