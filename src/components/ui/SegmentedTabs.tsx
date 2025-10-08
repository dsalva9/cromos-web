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
 * - Equal-width columns using CSS Grid
 * - Outer border on container only (border-2 border-black)
 * - Flush seams with single-pixel dividers (no double borders)
 * - Gold active state (#FFC000)
 * - Rounded outer corners only (inner corners square)
 * - No layout shift on focus/active (ring without border change)
 * - Full keyboard navigation (Arrow keys, Home, End)
 * - ARIA compliant
 */
export function SegmentedTabs({
  tabs,
  value,
  onValueChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedTabsProps & { className?: string }) {
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
    } else if (e.key === 'Home') {
      e.preventDefault();
      onValueChange(tabs[0].value);
    } else if (e.key === 'End') {
      e.preventDefault();
      onValueChange(tabs[tabs.length - 1].value);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      data-testid="segmented-tabs"
      className={`grid gap-0 border-2 border-black rounded-md overflow-hidden ${className || ''}`}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map((tab, index) => {
        const isActive = value === tab.value;
        const isFirst = index === 0;

        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.value}`}
            data-testid={`segmented-tab-${tab.value}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onValueChange(tab.value)}
            onKeyDown={e => handleKeyDown(e, tab.value)}
            title={tab.label}
            className={`
              relative inline-flex items-center justify-center px-4 py-2
              font-semibold text-sm uppercase w-full
              transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-inset
              ${isActive ? 'bg-[#FFC000] text-black z-10' : 'bg-gray-800 text-white hover:bg-gray-700'}
              ${!isFirst ? 'before:content-[""] before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-black' : ''}
            `}
          >
            <span className="flex items-center justify-center gap-2 truncate">
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}
