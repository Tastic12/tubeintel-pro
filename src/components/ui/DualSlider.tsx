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
  // Ensure minValue doesn't exceed maxValue
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (newValue <= maxValue) {
      onMinChange(newValue);
    }
  };

  // Ensure maxValue doesn't fall below minValue
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (newValue >= minValue) {
      onMaxChange(newValue);
    }
  };

  return (
    <div className={className}>
      <div className="relative w-full h-6">
        {/* Custom track */}
        <div 
          className="absolute w-full h-1 bg-zinc-700 top-1/2 transform -translate-y-1/2 rounded" 
          style={{ zIndex: -10 }}
        />
        
        {/* Min value slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          className="absolute w-full thumb-left search-filter-range"
          style={{ height: '100%' }}
        />
        
        {/* Max value slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          className="absolute w-full thumb-right search-filter-range"
          style={{ height: '100%' }}
        />
      </div>
      
      {showLabels && (minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{minLabel ?? min}</span>
          <span>{maxLabel ?? max}</span>
        </div>
      )}
    </div>
  );
}
