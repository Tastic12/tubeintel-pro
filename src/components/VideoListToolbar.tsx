'use client';

import { FaFilter } from 'react-icons/fa';
import type { SearchFiltersResult } from '@/components/SearchFilters';
import { countActiveVideoFilters } from '@/lib/apply-video-filters';

type VideoListToolbarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  activeFilters: SearchFiltersResult | null;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  onRemoveFilterPatch: (patch: Partial<SearchFiltersResult>) => void;
  sortBy: 'date' | 'likes' | 'views';
  onSortChange: (value: 'date' | 'likes' | 'views') => void;
  gridColumns: number;
  onGridColumnsChange: (cols: number) => void;
  gridOptions?: number[];
  showVideoInfo: boolean;
  onToggleVideoInfo: () => void;
};

export default function VideoListToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search videos…',
  activeFilters,
  onOpenFilters,
  onClearFilters,
  onRemoveFilterPatch,
  sortBy,
  onSortChange,
  gridColumns,
  onGridColumnsChange,
  gridOptions = [1, 2, 3, 4, 5, 6],
  showVideoInfo,
  onToggleVideoInfo,
}: VideoListToolbarProps) {
  const filterCount = countActiveVideoFilters(activeFilters);

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="bg-white/10 hover:bg-white/15 p-2 rounded-xl text-white relative border border-white/10"
            onClick={onOpenFilters}
            title="Search filters"
          >
            <FaFilter size={18} />
            {filterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#4361ee] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>

          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-56 sm:w-60 bg-white/10 border border-white/20 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#4361ee]"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Per row:</span>
            <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/10">
              {gridOptions.map((columns) => (
                <button
                  key={columns}
                  type="button"
                  className={`px-2 py-1 text-sm rounded-lg transition-colors ${
                    gridColumns === columns
                      ? 'bg-[#4361ee] text-white'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                  onClick={() => onGridColumnsChange(columns)}
                >
                  {columns}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'date' | 'likes' | 'views')}
              className="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4361ee]"
            >
              <option value="date">Date</option>
              <option value="likes">Likes</option>
              <option value="views">Views</option>
            </select>
          </div>

          <button
            type="button"
            className="text-sm text-white/80 hover:text-white px-3 py-1.5 rounded-xl bg-white/10 border border-white/10"
            onClick={onToggleVideoInfo}
          >
            {showVideoInfo ? 'Hide info' : 'Show info'}
          </button>
        </div>
      </div>

      {activeFilters && filterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/50">Active filters:</span>

          {activeFilters.timeRange && activeFilters.timeRange !== 'All Time' && (
            <FilterPill
              label={activeFilters.timeRange}
              onRemove={() => onRemoveFilterPatch({ timeRange: 'All Time' })}
            />
          )}

          {activeFilters.viewsMin !== '0' && (
            <FilterPill
              label={`Min views: ${activeFilters.viewsMin}`}
              onRemove={() => onRemoveFilterPatch({ viewsMin: '0' })}
            />
          )}

          {activeFilters.multiplierMin !== '0.0x' && (
            <FilterPill
              label={`Min multiplier: ${activeFilters.multiplierMin}`}
              onRemove={() => onRemoveFilterPatch({ multiplierMin: '0.0x' })}
            />
          )}

          {(activeFilters.advancedFilters.includeKeywords ||
            activeFilters.advancedFilters.excludeKeywords) && (
            <FilterPill
              label="Keywords"
              onRemove={() =>
                onRemoveFilterPatch({
                  advancedFilters: {
                    ...activeFilters.advancedFilters,
                    includeKeywords: '',
                    excludeKeywords: '',
                  },
                })
              }
            />
          )}

          {(activeFilters.advancedFilters.includeChannels ||
            activeFilters.advancedFilters.excludeChannels) && (
            <FilterPill
              label="Channels"
              onRemove={() =>
                onRemoveFilterPatch({
                  advancedFilters: {
                    ...activeFilters.advancedFilters,
                    includeChannels: '',
                    excludeChannels: '',
                  },
                })
              }
            />
          )}

          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-[#4361ee] hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="text-xs bg-[#4361ee]/20 text-blue-200 rounded-full px-2 py-0.5 flex items-center border border-[#4361ee]/30">
      {label}
      <button type="button" onClick={onRemove} className="ml-1.5 hover:text-white">
        ×
      </button>
    </span>
  );
}
