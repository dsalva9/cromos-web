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
 * SegmentedTabs - Equal-width paired tab control
 *
 * Features:
 * - Equal-width columns using CSS Grid
 * - Modern light mode aesthetic
 * - Flush seams with single-pixel dividers
 * - Gold active state (#FFC000)
 * - Rounded outer corners
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
      className={`grid gap-0 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-1 ${className || ''}`}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
    >
      {tabs.map((tab, index) => {
        const isActive = value === tab.value;

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
              font-bold text-sm uppercase w-full rounded-md
              transition-all duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-inset
              ${isActive
                ? 'bg-white text-black shadow-sm'
                : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }
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
