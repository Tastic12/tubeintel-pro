'use client';

import React from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

export type TimeRange = '30 Days' | '90 Days' | '180 Days' | '365 Days' | '3 Years' | 'All Time' | 'Custom';

export interface TimeRangeSelectorProps {
  selectedRange: TimeRange | null;
  onRangeSelect: (range: TimeRange) => void;
}

const TIME_RANGES: { value: TimeRange; label: string; icon?: boolean }[] = [
  { value: '30 Days', label: 'Last 30 Days' },
  { value: '90 Days', label: 'Last 90 Days' },
  { value: '180 Days', label: 'Last 180 Days' },
  { value: '365 Days', label: 'Last 365 Days' },
  { value: '3 Years', label: 'Last 3 Years' },
  { value: 'All Time', label: 'All Time' },
  { value: 'Custom', label: 'Custom', icon: true },
];

export default function TimeRangeSelector({
  selectedRange,
  onRangeSelect,
}: TimeRangeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        {TIME_RANGES.slice(0, 4).map((range) => (
          <button
            key={range.value}
            className={`flex justify-between items-center w-full ${
              selectedRange === range.value ? 'bg-red-600' : 'bg-zinc-900 hover:bg-zinc-800'
            } px-3 py-1 rounded-full`}
            onClick={() => onRangeSelect(range.value)}
          >
            <span className="text-xs">{range.label}</span>
            <span className="text-gray-400 text-xs">▶</span>
          </button>
        ))}
      </div>
      
      <div className="space-y-1">
        {TIME_RANGES.slice(4).map((range) => (
          <button
            key={range.value}
            className={`flex justify-between items-center w-full ${
              selectedRange === range.value ? 'bg-red-600' : 'bg-zinc-900 hover:bg-zinc-800'
            } px-3 py-1 rounded-full`}
            onClick={() => onRangeSelect(range.value)}
          >
            <span className="text-xs flex items-center">
              {range.icon && <FaCalendarAlt className="mr-1" size={10} />}
              {range.label}
            </span>
            <span className={`text-xs ${selectedRange === range.value ? 'text-white' : 'text-gray-400'}`}>
              ▶
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
