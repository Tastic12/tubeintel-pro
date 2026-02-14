'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import { 
  FilterSlider, 
  TimeRangeSelector, 
  DateRangePicker, 
  AdvancedFilters,
  type TimeRange,
  type AdvancedFiltersState 
} from './filters';

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
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const parseDurationValue = (value: string): number | null => {
  if (!value) return null;
  
  const parts = value.split(':').map(part => parseInt(part, 10));
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  
  if (value.includes('+')) {
    return parseFloat(value.replace(/\+/g, ''));
  }
  
  return parseFloat(value);
};

export interface SearchFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: SearchFiltersResult) => void;
  onReset: () => void;
  onSavePreset?: (name: string) => void;
}

export interface SearchFiltersResult {
  timeRange: TimeRange | 'All Time';
  startDate: string;
  endDate: string;
  multiplierMin: string;
  multiplierMax: string;
  viewsMin: string;
  viewsMax: string;
  subscribersMin: string;
  subscribersMax: string;
  videoDurationMin: string;
  videoDurationMax: string;
  whenPosted: boolean;
  advancedFilters: AdvancedFiltersState;
}

const DEFAULT_ADVANCED_FILTERS: AdvancedFiltersState = {
  viewsToSubsRatioMin: '0.0',
  viewsToSubsRatioMax: '50.0+',
  medianViewsMin: '0',
  medianViewsMax: '10M+',
  channelTotalViewsMin: '0',
  channelTotalViewsMax: '1B+',
  channelVideoCountMin: '0',
  channelVideoCountMax: '1k+',
  videoLikesMin: '0',
  videoLikesMax: '1M+',
  videoCommentsMin: '0',
  videoCommentsMax: '100K+',
  engagementRateMin: '0',
  engagementRateMax: '20+',
  channelAgeMin: 'Brand new',
  channelAgeMax: '20 years ago+',
  includeChannels: '',
  excludeChannels: '',
  includeKeywords: '',
  excludeKeywords: '',
};

export default function SearchFilters({
  isOpen,
  onClose,
  onApply,
  onReset,
  onSavePreset
}: SearchFiltersProps) {
  // Time range state
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [startDate, setStartDate] = useState('2005-02-13');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  
  // Range sliders state
  const [multiplierMin, setMultiplierMin] = useState('0.0x');
  const [multiplierMax, setMultiplierMax] = useState('100.0x+');
  const [viewsMin, setViewsMin] = useState('0');
  const [viewsMax, setViewsMax] = useState('1M+');
  const [subscribersMin, setSubscribersMin] = useState('0');
  const [subscribersMax, setSubscribersMax] = useState('1M+');
  const [videoDurationMin, setVideoDurationMin] = useState('00:00:00');
  const [videoDurationMax, setVideoDurationMax] = useState('07:00:00+');
  
  // When posted checkbox
  const [whenPosted, setWhenPosted] = useState(false);
  
  // Advanced filters state
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>(DEFAULT_ADVANCED_FILTERS);

  // Reset all filters when opening the modal
  useEffect(() => {
    if (isOpen) {
      setTimeRange(null);
      setStartDate('2005-02-13');
      setEndDate(new Date().toISOString().split('T')[0]);
      setMultiplierMin('0.0x');
      setMultiplierMax('100.0x+');
      setViewsMin('0');
      setViewsMax('1M+');
      setSubscribersMin('0');
      setSubscribersMax('1M+');
      setVideoDurationMin('00:00:00');
      setVideoDurationMax('07:00:00+');
      setWhenPosted(false);
      setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
      setIsAdvancedFiltersOpen(false);
    }
  }, [isOpen]);

  const handleTimeRangeSelect = (range: TimeRange) => {
    if (timeRange === range) {
      setTimeRange(null);
      return;
    }
    
    setTimeRange(range);
    
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    let start = new Date(now);
    
    switch (range) {
      case '30 Days':
        start.setDate(now.getDate() - 30);
        setIsCalendarVisible(false);
        break;
      case '90 Days':
        start.setDate(now.getDate() - 90);
        setIsCalendarVisible(false);
        break;
      case '180 Days':
        start.setDate(now.getDate() - 180);
        setIsCalendarVisible(false);
        break;
      case '365 Days':
        start.setDate(now.getDate() - 365);
        setIsCalendarVisible(false);
        break;
      case '3 Years':
        start.setFullYear(now.getFullYear() - 3);
        setIsCalendarVisible(false);
        break;
      case 'All Time':
        start = new Date('2005-02-14');
        setIsCalendarVisible(false);
        break;
      case 'Custom':
        setIsCalendarVisible(false);
        return;
    }
    
    start.setHours(0, 0, 0, 0);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  const handleApply = () => {
    const filters: SearchFiltersResult = {
      timeRange: timeRange || 'All Time',
      startDate,
      endDate,
      multiplierMin,
      multiplierMax,
      viewsMin,
      viewsMax,
      subscribersMin,
      subscribersMax,
      videoDurationMin,
      videoDurationMax,
      whenPosted,
      advancedFilters,
    };
    
    onApply(filters);
  };

  const handleAdvancedFiltersChange = (updates: Partial<AdvancedFiltersState>) => {
    setAdvancedFilters(prev => ({ ...prev, ...updates }));
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (timeRange !== 'Custom') {
      setTimeRange('Custom');
    }
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    if (timeRange !== 'Custom') {
      setTimeRange('Custom');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div 
        className="fixed inset-0 bg-black bg-opacity-30" 
        onClick={onClose}
      />
      <div className="bg-black rounded-3xl w-[1200px] relative text-white p-5 mx-4 my-4 z-10 max-h-[85vh] overflow-y-auto">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Close"
        >
          <FaTimes size={18} />
        </button>
        
        {/* Header */}
        <h2 className="text-2xl font-normal mb-3">Search filters</h2>
        
        <div className="grid grid-cols-2 gap-x-10 gap-y-3">
          {/* LEFT COLUMN - All slider options */}
          <div>
            {/* Multiplier */}
            <FilterSlider
              label="Multiplier"
              min={0}
              max={100}
              step={0.1}
              minValue={parseNumberValue(multiplierMin.replace('x', '')) || 0}
              maxValue={parseNumberValue(multiplierMax.replace('x', '').replace('+', '')) || 100}
              minDisplay={multiplierMin}
              maxDisplay={multiplierMax}
              onMinChange={(value) => setMultiplierMin(`${value.toFixed(1)}x`)}
              onMaxChange={(value) => setMultiplierMax(value >= 100 ? '100.0x+' : `${value.toFixed(1)}x`)}
              onMinInputChange={setMultiplierMin}
              onMaxInputChange={setMultiplierMax}
              minLabel="0.0x"
              maxLabel="100.0x+"
            />
            
            {/* Views */}
            <FilterSlider
              label="Views"
              min={0}
              max={1000000}
              step={1000}
              minValue={parseNumberValue(viewsMin) || 0}
              maxValue={parseNumberValue(viewsMax.replace('+', '')) || 1000000}
              minDisplay={viewsMin}
              maxDisplay={viewsMax}
              onMinChange={(value) => setViewsMin(formatNumber(value))}
              onMaxChange={(value) => setViewsMax(value >= 1000000 ? '1M+' : formatNumber(value))}
              onMinInputChange={setViewsMin}
              onMaxInputChange={setViewsMax}
              minLabel="0"
              maxLabel="1M+"
            />
            
            {/* Subscribers */}
            <FilterSlider
              label="Subscribers"
              min={0}
              max={1000000}
              step={1000}
              minValue={parseNumberValue(subscribersMin) || 0}
              maxValue={parseNumberValue(subscribersMax.replace('+', '')) || 1000000}
              minDisplay={subscribersMin}
              maxDisplay={subscribersMax}
              onMinChange={(value) => setSubscribersMin(formatNumber(value))}
              onMaxChange={(value) => setSubscribersMax(value >= 1000000 ? '1M+' : formatNumber(value))}
              onMinInputChange={setSubscribersMin}
              onMaxInputChange={setSubscribersMax}
              minLabel="0"
              maxLabel="1M+"
            />
            
            {/* Video duration */}
            <FilterSlider
              label="Video duration"
              min={0}
              max={420}
              step={1}
              minValue={parseDurationValue(videoDurationMin) || 0}
              maxValue={parseDurationValue(videoDurationMax.replace('+', '')) || 420}
              minDisplay={videoDurationMin}
              maxDisplay={videoDurationMax}
              onMinChange={(value) => {
                const hours = Math.floor(value / 60);
                const mins = value % 60;
                setVideoDurationMin(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`);
              }}
              onMaxChange={(value) => {
                if (value >= 420) {
                  setVideoDurationMax('07:00:00+');
                } else {
                  const hours = Math.floor(value / 60);
                  const mins = value % 60;
                  setVideoDurationMax(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`);
                }
              }}
              onMinInputChange={setVideoDurationMin}
              onMaxInputChange={setVideoDurationMax}
              minLabel="00:00:00"
              maxLabel="07:00:00+"
            />
            
            {/* When posted checkbox */}
            <div className="mb-3">
              <label className="checkbox-container flex items-center">
                <input
                  type="checkbox"
                  checked={whenPosted}
                  onChange={(e) => setWhenPosted(e.target.checked)}
                  className="hidden"
                />
                <span className="checkmark"></span>
                <span className="ml-3 text-sm">When posted</span>
              </label>
            </div>
          </div>
          
          {/* RIGHT COLUMN - Time range and calendar */}
          <div>
            {/* Time range */}
            <div className="mb-3">
              <h3 className="text-sm font-normal mb-1">Time range</h3>
              
              <TimeRangeSelector
                selectedRange={timeRange}
                onRangeSelect={handleTimeRangeSelect}
              />
              
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                isCalendarVisible={isCalendarVisible}
                onCalendarVisibilityChange={setIsCalendarVisible}
                activeField={activeField}
                onActiveFieldChange={setActiveField}
              />
            </div>
          </div>
        </div>
        
        {/* Apply button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleApply}
            className="bg-red-600 text-white px-4 py-2 rounded-full"
          >
            Apply
          </button>
        </div>

        {/* Show more options button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
            className="text-red-600 hover:text-red-500"
          >
            {isAdvancedFiltersOpen ? 'Show less options' : 'Show more options'}
          </button>
        </div>

        {/* Advanced filters section */}
        {isAdvancedFiltersOpen && (
          <AdvancedFilters
            filters={advancedFilters}
            onFiltersChange={handleAdvancedFiltersChange}
          />
        )}
      </div>
    </div>
  );
}
