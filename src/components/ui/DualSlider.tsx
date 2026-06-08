'use client';

import React from 'react';
import '@/styles/dualSlider.css';

export interface DualSliderProps {
  min: number;
  max: number;
  step: number | string;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  className?: string;
  minLabel?: string;
  maxLabel?: string;
  showLabels?: boolean;
}

export default function DualSlider({
  min,
  max,
  step,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  className = '',
  minLabel,
  maxLabel,
  showLabels = true,
}: DualSliderProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (newValue <= maxValue) {
      onMinChange(newValue);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (newValue >= minValue) {
      onMaxChange(newValue);
    }
  };

  const span = max - min || 1;
  const rangeLeft = ((minValue - min) / span) * 100;
  const rangeWidth = ((maxValue - minValue) / span) * 100;

  return (
    <div className={className}>
      <div className="relative w-full h-8 flex items-center">
        <div className="absolute inset-x-0 h-1.5 bg-white/10 rounded-full top-1/2 -translate-y-1/2" />

        <div
          className="absolute h-1.5 bg-[#4361ee]/70 rounded-full top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${rangeLeft}%`, width: `${rangeWidth}%` }}
        />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          className="absolute w-full thumb-left search-filter-range"
          style={{ height: '100%' }}
          aria-label="Minimum value"
        />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          className="absolute w-full thumb-right search-filter-range"
          style={{ height: '100%' }}
          aria-label="Maximum value"
        />
      </div>

      {showLabels && (minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-white/40 mt-2">
          <span>{minLabel ?? min}</span>
          <span>{maxLabel ?? max}</span>
        </div>
      )}
    </div>
  );
}
