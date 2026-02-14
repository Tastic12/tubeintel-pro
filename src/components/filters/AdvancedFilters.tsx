'use client';

import React from 'react';
import FilterSlider from './FilterSlider';

export interface AdvancedFiltersState {
  viewsToSubsRatioMin: string;
  viewsToSubsRatioMax: string;
  medianViewsMin: string;
  medianViewsMax: string;
  channelTotalViewsMin: string;
  channelTotalViewsMax: string;
  channelVideoCountMin: string;
  channelVideoCountMax: string;
  videoLikesMin: string;
  videoLikesMax: string;
  videoCommentsMin: string;
  videoCommentsMax: string;
  engagementRateMin: string;
  engagementRateMax: string;
  channelAgeMin: string;
  channelAgeMax: string;
  includeChannels: string;
  excludeChannels: string;
  includeKeywords: string;
  excludeKeywords: string;
}

export interface AdvancedFiltersProps {
  filters: AdvancedFiltersState;
  onFiltersChange: (filters: Partial<AdvancedFiltersState>) => void;
}

// Helper functions
const parseNumberValue = (value: string): number | null => {
  if (!value) return null;
  
  if (value.includes('+')) {
    value = value.replace('+', '');
  }
  
  if (value.includes('K') || value.includes('k')) {
    return parseFloat(value.replace(/[Kk]/g, '')) * 1000;
  } else if (value.includes('M') || value.includes('m')) {
    return parseFloat(value.replace(/[Mm]/g, '')) * 1000000;
  } else if (value.includes('B') || value.includes('b')) {
    return parseFloat(value.replace(/[Bb]/g, '')) * 1000000000;
  }
  
  return parseFloat(value);
};

const formatNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

export default function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-normal mb-2">Advanced Filters</h3>
      <div className="grid grid-cols-2 gap-x-10 gap-y-3">
        {/* Views to Subs Ratio */}
        <FilterSlider
          label="Views : Subs Ratio"
          min={0}
          max={50}
          step={0.1}
          minValue={parseNumberValue(filters.viewsToSubsRatioMin) || 0}
          maxValue={parseNumberValue(filters.viewsToSubsRatioMax.replace('+', '')) || 50}
          minDisplay={filters.viewsToSubsRatioMin}
          maxDisplay={filters.viewsToSubsRatioMax}
          onMinChange={(value) => onFiltersChange({ viewsToSubsRatioMin: value.toFixed(1) })}
          onMaxChange={(value) => onFiltersChange({ viewsToSubsRatioMax: value >= 50 ? '50.0+' : value.toFixed(1) })}
          onMinInputChange={(value) => onFiltersChange({ viewsToSubsRatioMin: value })}
          onMaxInputChange={(value) => onFiltersChange({ viewsToSubsRatioMax: value })}
          minLabel="0.0"
          maxLabel="50.0+"
        />

        {/* Median Views */}
        <FilterSlider
          label="Median Views"
          min={0}
          max={10000000}
          step={1000}
          minValue={parseNumberValue(filters.medianViewsMin) || 0}
          maxValue={parseNumberValue(filters.medianViewsMax.replace('+', '')) || 10000000}
          minDisplay={filters.medianViewsMin}
          maxDisplay={filters.medianViewsMax}
          onMinChange={(value) => onFiltersChange({ medianViewsMin: formatNumber(value) })}
          onMaxChange={(value) => onFiltersChange({ medianViewsMax: value >= 10000000 ? '10M+' : formatNumber(value) })}
          onMinInputChange={(value) => onFiltersChange({ medianViewsMin: value })}
          onMaxInputChange={(value) => onFiltersChange({ medianViewsMax: value })}
          minLabel="0"
          maxLabel="10M+"
        />

        {/* Channel Total Views */}
        <FilterSlider
          label="Channel Total Views"
          min={0}
          max={1000000000}
          step={100000}
          minValue={parseNumberValue(filters.channelTotalViewsMin) || 0}
          maxValue={parseNumberValue(filters.channelTotalViewsMax.replace('+', '')) || 1000000000}
          minDisplay={filters.channelTotalViewsMin}
          maxDisplay={filters.channelTotalViewsMax}
          onMinChange={(value) => onFiltersChange({ channelTotalViewsMin: formatNumber(value) })}
          onMaxChange={(value) => onFiltersChange({ channelTotalViewsMax: value >= 1000000000 ? '1B+' : formatNumber(value) })}
          onMinInputChange={(value) => onFiltersChange({ channelTotalViewsMin: value })}
          onMaxInputChange={(value) => onFiltersChange({ channelTotalViewsMax: value })}
          minLabel="0"
          maxLabel="1B+"
        />

        {/* Channel Video Count */}
        <FilterSlider
          label="Channel Video Count"
          min={0}
          max={1000}
          step={10}
          minValue={parseNumberValue(filters.channelVideoCountMin) || 0}
          maxValue={parseNumberValue(filters.channelVideoCountMax.replace('+', '')) || 1000}
          minDisplay={filters.channelVideoCountMin}
          maxDisplay={filters.channelVideoCountMax}
          onMinChange={(value) => onFiltersChange({ channelVideoCountMin: value.toString() })}
          onMaxChange={(value) => onFiltersChange({ channelVideoCountMax: value >= 1000 ? '1k+' : value.toString() })}
          onMinInputChange={(value) => onFiltersChange({ channelVideoCountMin: value })}
          onMaxInputChange={(value) => onFiltersChange({ channelVideoCountMax: value })}
          minLabel="0"
          maxLabel="1k+"
        />

        {/* Video Likes */}
        <FilterSlider
          label="Video Likes"
          min={0}
          max={1000000}
          step={1000}
          minValue={parseNumberValue(filters.videoLikesMin) || 0}
          maxValue={parseNumberValue(filters.videoLikesMax.replace('+', '')) || 1000000}
          minDisplay={filters.videoLikesMin}
          maxDisplay={filters.videoLikesMax}
          onMinChange={(value) => onFiltersChange({ videoLikesMin: formatNumber(value) })}
          onMaxChange={(value) => onFiltersChange({ videoLikesMax: value >= 1000000 ? '1M+' : formatNumber(value) })}
          onMinInputChange={(value) => onFiltersChange({ videoLikesMin: value })}
          onMaxInputChange={(value) => onFiltersChange({ videoLikesMax: value })}
          minLabel="0"
          maxLabel="1M+"
        />

        {/* Video Comments */}
        <FilterSlider
          label="Video Comments"
          min={0}
          max={100000}
          step={100}
          minValue={parseNumberValue(filters.videoCommentsMin) || 0}
          maxValue={parseNumberValue(filters.videoCommentsMax.replace('+', '')) || 100000}
          minDisplay={filters.videoCommentsMin}
          maxDisplay={filters.videoCommentsMax}
          onMinChange={(value) => onFiltersChange({ videoCommentsMin: formatNumber(value) })}
          onMaxChange={(value) => onFiltersChange({ videoCommentsMax: value >= 100000 ? '100K+' : formatNumber(value) })}
          onMinInputChange={(value) => onFiltersChange({ videoCommentsMin: value })}
          onMaxInputChange={(value) => onFiltersChange({ videoCommentsMax: value })}
          minLabel="0"
          maxLabel="100K+"
        />

        {/* Engagement Rate */}
        <FilterSlider
          label="Engagement Rate"
          min={0}
          max={20}
          step={0.1}
          minValue={parseNumberValue(filters.engagementRateMin) || 0}
          maxValue={parseNumberValue(filters.engagementRateMax.replace('+', '')) || 20}
          minDisplay={filters.engagementRateMin}
          maxDisplay={filters.engagementRateMax}
          onMinChange={(value) => onFiltersChange({ engagementRateMin: value.toFixed(1) })}
          onMaxChange={(value) => onFiltersChange({ engagementRateMax: value >= 20 ? '20+' : value.toFixed(1) })}
          onMinInputChange={(value) => onFiltersChange({ engagementRateMin: value })}
          onMaxInputChange={(value) => onFiltersChange({ engagementRateMax: value })}
          minLabel="0"
          maxLabel="20+"
        />

        {/* Channel Age */}
        <FilterSlider
          label="Channel Age"
          min={0}
          max={20}
          step={1}
          minValue={filters.channelAgeMin === 'Brand new' ? 0 : parseNumberValue(filters.channelAgeMin) || 0}
          maxValue={filters.channelAgeMax.includes('+') ? 20 : parseNumberValue(filters.channelAgeMax) || 20}
          minDisplay={filters.channelAgeMin}
          maxDisplay={filters.channelAgeMax}
          onMinChange={(value) => onFiltersChange({ channelAgeMin: value === 0 ? 'Brand new' : `${value} years ago` })}
          onMaxChange={(value) => onFiltersChange({ channelAgeMax: value >= 20 ? '20 years ago+' : `${value} years ago` })}
          onMinInputChange={(value) => onFiltersChange({ channelAgeMin: value })}
          onMaxInputChange={(value) => onFiltersChange({ channelAgeMax: value })}
          minLabel="Brand new"
          maxLabel="20 years ago+"
        />

        {/* Include Channels */}
        <div className="mb-3">
          <label className="text-xs text-gray-300 mb-1 block">Include Channels</label>
          <input
            type="text"
            value={filters.includeChannels}
            onChange={(e) => onFiltersChange({ includeChannels: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-white text-sm"
            placeholder="Enter channel names"
          />
        </div>

        {/* Exclude Channels */}
        <div className="mb-3">
          <label className="text-xs text-gray-300 mb-1 block">Exclude Channels</label>
          <input
            type="text"
            value={filters.excludeChannels}
            onChange={(e) => onFiltersChange({ excludeChannels: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-white text-sm"
            placeholder="Enter channel names"
          />
        </div>

        {/* Include Keywords */}
        <div className="mb-3">
          <label className="text-xs text-gray-300 mb-1 block">Include Keywords</label>
          <input
            type="text"
            value={filters.includeKeywords}
            onChange={(e) => onFiltersChange({ includeKeywords: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-white text-sm"
            placeholder="Enter keywords"
          />
        </div>

        {/* Exclude Keywords */}
        <div className="mb-3">
          <label className="text-xs text-gray-300 mb-1 block">Exclude Keywords</label>
          <input
            type="text"
            value={filters.excludeKeywords}
            onChange={(e) => onFiltersChange({ excludeKeywords: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-white text-sm"
            placeholder="Enter keywords"
          />
        </div>
      </div>
    </div>
  );
}
