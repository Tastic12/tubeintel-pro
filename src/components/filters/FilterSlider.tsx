'use client';

import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import DualSlider from '@/components/ui/DualSlider';

export interface FilterSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  minValue: number;
  maxValue: number;
  minDisplay: string;
  maxDisplay: string;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  onMinInputChange: (value: string) => void;
  onMaxInputChange: (value: string) => void;
  minLabel?: string;
  maxLabel?: string;
  tooltip?: string;
}

export default function FilterSlider({
  label,
  min,
  max,
  step,
  minValue,
  maxValue,
  minDisplay,
  maxDisplay,
  onMinChange,
  onMaxChange,
  onMinInputChange,
  onMaxInputChange,
  minLabel,
  maxLabel,
  tooltip,
}: FilterSliderProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center mb-1">
        <h3 className="text-sm font-normal">{label}</h3>
        {tooltip && (
          <div className="ml-2 text-gray-400 cursor-help" title={tooltip}>
            <FaInfoCircle size={12} />
          </div>
        )}
      </div>
      
      <div className="mb-1">
        <DualSlider
          min={min}
          max={max}
          step={step}
          minValue={minValue}
          maxValue={maxValue}
          onMinChange={onMinChange}
          onMaxChange={onMaxChange}
          minLabel={minLabel}
          maxLabel={maxLabel}
          className="search-filter-range w-full"
        />
      </div>
      
      <div className="flex justify-between mt-1">
        <div>
          <input
            type="text"
            value={minDisplay}
            onChange={(e) => onMinInputChange(e.target.value)}
            className="w-24 bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-white text-center text-sm"
          />
        </div>
        <div className="flex items-center">
          <span className="mx-2 text-gray-400 text-xs">TO</span>
        </div>
        <div>
          <input
            type="text"
            value={maxDisplay}
            onChange={(e) => onMaxInputChange(e.target.value)}
            className="w-24 bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full text-white text-center text-sm"
          />
        </div>
      </div>
    </div>
  );
}
