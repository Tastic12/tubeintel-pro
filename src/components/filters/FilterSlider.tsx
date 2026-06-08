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
    <div className="mb-5 last:mb-0">
      <div className="flex items-center mb-2.5">
        <h3 className="text-sm font-medium text-white/90">{label}</h3>
        {tooltip && (
          <div className="ml-2 text-white/40 cursor-help" title={tooltip}>
            <FaInfoCircle size={12} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <input
          type="text"
          value={minDisplay}
          onChange={(e) => onMinInputChange(e.target.value)}
          className="w-28 bg-white/5 border border-white/15 px-3 py-1.5 rounded-full text-white text-center text-sm focus:outline-none focus:border-[#4361ee]/60"
          aria-label={`${label} minimum`}
        />
        <span className="text-white/40 text-xs font-medium shrink-0">TO</span>
        <input
          type="text"
          value={maxDisplay}
          onChange={(e) => onMaxInputChange(e.target.value)}
          className="w-28 bg-white/5 border border-white/15 px-3 py-1.5 rounded-full text-white text-center text-sm focus:outline-none focus:border-[#4361ee]/60"
          aria-label={`${label} maximum`}
        />
      </div>

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
        showLabels={false}
        className="w-full px-1"
      />
    </div>
  );
}
