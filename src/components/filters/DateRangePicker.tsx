'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaCalendarAlt, FaTimes } from 'react-icons/fa';

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  isCalendarVisible: boolean;
  onCalendarVisibilityChange: (visible: boolean) => void;
  activeField: 'start' | 'end' | null;
  onActiveFieldChange: (field: 'start' | 'end' | null) => void;
}

interface CalendarDay {
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isCalendarVisible,
  onCalendarVisibilityChange,
  activeField,
  onActiveFieldChange,
}: DateRangePickerProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  const formatDateForDisplay = (date: string) => {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const generateCalendarDays = useCallback(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const days: CalendarDay[] = [];
    
    // Add days from previous month
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevMonthYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const lastDayOfPrevMonth = new Date(prevMonthYear, selectedMonth, 0).getDate();
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({
        day: lastDayOfPrevMonth - startingDayOfWeek + i + 1,
        month: prevMonth,
        year: prevMonthYear,
        isCurrentMonth: false
      });
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: selectedMonth,
        year: selectedYear,
        isCurrentMonth: true
      });
    }
    
    // Add days from next month
    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextMonthYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    const totalDaysAdded = days.length;
    const daysNeeded = Math.ceil(totalDaysAdded / 7) * 7 - totalDaysAdded;
    
    for (let i = 1; i <= daysNeeded; i++) {
      days.push({
        day: i,
        month: nextMonth,
        year: nextMonthYear,
        isCurrentMonth: false
      });
    }
    
    setCalendarDays(days);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    generateCalendarDays();
  }, [generateCalendarDays]);

  const handleDateClick = (day: number, month: number, year: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (activeField === 'start') {
      onStartDateChange(dateStr);
      const newStart = new Date(dateStr);
      const currentEnd = new Date(endDate);
      if (newStart > currentEnd) {
        onEndDateChange(dateStr);
      }
      onActiveFieldChange('end');
    } else if (activeField === 'end') {
      const currentStart = new Date(startDate);
      const newEnd = new Date(dateStr);
      if (newEnd < currentStart) {
        onStartDateChange(dateStr);
      } else {
        onEndDateChange(dateStr);
      }
      onCalendarVisibilityChange(false);
      onActiveFieldChange(null);
    }
  };

  const handleStartInputClick = () => {
    onActiveFieldChange('start');
    onCalendarVisibilityChange(true);
    const startDateObj = new Date(startDate);
    setSelectedMonth(startDateObj.getMonth());
    setSelectedYear(startDateObj.getFullYear());
  };

  const handleEndInputClick = () => {
    onActiveFieldChange('end');
    onCalendarVisibilityChange(true);
    const endDateObj = new Date(endDate);
    setSelectedMonth(endDateObj.getMonth());
    setSelectedYear(endDateObj.getFullYear());
  };

  return (
    <div>
      {/* Date input fields */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="relative">
          <input
            type="text"
            value={formatDateForDisplay(startDate)}
            onClick={handleStartInputClick}
            className="w-full bg-zinc-900 border border-zinc-700 px-2 pl-7 py-1 rounded-full text-white text-xs cursor-pointer"
            placeholder="Start date"
            readOnly
            title={`Selected start date: ${formatDateForDisplay(startDate)}`}
          />
          <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaCalendarAlt size={10} />
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            value={formatDateForDisplay(endDate)}
            onClick={handleEndInputClick}
            className="w-full bg-zinc-900 border border-zinc-700 px-2 pl-7 py-1 rounded-full text-white text-xs cursor-pointer"
            placeholder="End date"
            readOnly
            title={`Selected end date: ${formatDateForDisplay(endDate)}`}
          />
          <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaCalendarAlt size={10} />
          </div>
        </div>
      </div>
      
      {/* Calendar */}
      {isCalendarVisible && (
        <div className="mt-2 bg-zinc-900 p-2 rounded-2xl relative">
          <button 
            onClick={() => {
              onCalendarVisibilityChange(false);
              onActiveFieldChange(null);
            }}
            className="absolute top-1 right-1 text-gray-400 hover:text-white"
            aria-label="Close calendar"
          >
            <FaTimes size={12} />
          </button>
          
          <div className="text-xs">
            {/* Calendar title */}
            <div className="text-center mb-1 text-gray-300">
              {activeField === 'start' ? (
                <span>Select Start Date: {formatDateForDisplay(startDate)}</span>
              ) : (
                <span>Select End Date: {formatDateForDisplay(endDate)}</span>
              )}
            </div>
            
            {/* Month & Year Navigation */}
            <div className="flex justify-between mb-1 text-xxs gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 bg-zinc-800 text-gray-300 px-2 py-0.5 rounded-full text-center text-xxs border-none outline-none cursor-pointer"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((month, index) => (
                  <option key={month} value={index}>{month}</option>
                ))}
              </select>
              
              <div className="flex items-center gap-1 flex-1">
                <button 
                  onClick={() => setSelectedYear(selectedYear - 1)}
                  className="bg-zinc-800 text-gray-400 hover:text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1970"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => {
                    const year = parseInt(e.target.value);
                    if (!isNaN(year) && year >= 1970 && year <= 2100) {
                      setSelectedYear(year);
                    }
                  }}
                  className="flex-1 bg-zinc-800 text-gray-300 px-2 py-0.5 rounded-full text-center text-xxs border-none outline-none"
                />
                <button 
                  onClick={() => setSelectedYear(selectedYear + 1)}
                  className="bg-zinc-800 text-gray-400 hover:text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={`${day}-${index}`} className="text-center text-xxs text-gray-400">{day}</div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((dateObj, i) => {
                const currentDate = new Date(dateObj.year, dateObj.month, dateObj.day);
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                currentDate.setHours(12, 0, 0, 0);
                
                const isStartDate = dateObj.day === start.getDate() && 
                                  dateObj.month === start.getMonth() && 
                                  dateObj.year === start.getFullYear();
                const isEndDate = dateObj.day === end.getDate() && 
                                dateObj.month === end.getMonth() && 
                                dateObj.year === end.getFullYear();
                const isInRange = currentDate >= start && currentDate <= end;
                
                return (
                  <div 
                    key={i}
                    onClick={() => handleDateClick(dateObj.day, dateObj.month, dateObj.year)}
                    className={`text-center py-0.5 text-xxs cursor-pointer hover:bg-red-600/50 rounded-full
                      ${!dateObj.isCurrentMonth ? 'text-gray-400' : ''}
                      ${isStartDate ? 'bg-red-600 font-bold' : ''}
                      ${isEndDate ? 'bg-red-600 font-bold' : ''}
                      ${isInRange && !isStartDate && !isEndDate ? 'bg-red-600/50' : ''}
                    `}
                    title={`${dateObj.month + 1}/${dateObj.day}/${dateObj.year}`}
                  >
                    {dateObj.day}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
