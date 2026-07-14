import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export interface MonthPickerProps {
  value: string; // Format: "YYYY-MM"
  onChange: (value: string) => void;
  className?: string;
}

const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", 
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", 
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const MONTH_SHORT = [
  "Th 1", "Th 2", "Th 3", "Th 4", 
  "Th 5", "Th 6", "Th 7", "Th 8", 
  "Th 9", "Th 10", "Th 11", "Th 12"
];

export function MonthPicker({ value, onChange, className = "" }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse current value or use current date
  const initialDate = value ? new Date(value + "-01") : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update view year when opening if value changed externally
  useEffect(() => {
    if (isOpen && value) {
      setViewYear(new Date(value + "-01").getFullYear());
    }
  }, [isOpen, value]);

  const handleSelectMonth = (monthIndex: number) => {
    const formattedMonth = (monthIndex + 1).toString().padStart(2, "0");
    onChange(`${viewYear}-${formattedMonth}`);
    setIsOpen(false);
  };

  const handleSelectCurrentMonth = () => {
    const now = new Date();
    const formattedMonth = (now.getMonth() + 1).toString().padStart(2, "0");
    onChange(`${now.getFullYear()}-${formattedMonth}`);
    setIsOpen(false);
  };

  // Format display string
  const displayString = value 
    ? `Tháng ${parseInt(value.split("-")[1], 10)} / ${value.split("-")[0]}`
    : "Chọn tháng";

  const selectedYear = value ? parseInt(value.split("-")[0], 10) : null;
  const selectedMonth = value ? parseInt(value.split("-")[1], 10) - 1 : null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-3.5 py-2 min-w-[160px]
          bg-white border text-sm font-semibold text-slate-700
          rounded-xl shadow-sm transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]
          ${isOpen ? "border-[#0057cd] ring-2 ring-[#0057cd]/20" : "border-slate-200 hover:border-slate-300"}
        `}
      >
        <span className="truncate pr-4">{displayString}</span>
        <Calendar size={16} className="text-slate-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-[240px] mt-1.5 bg-white border border-slate-100 rounded-xl shadow-lg p-3 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 bg-slate-50 p-1 rounded-lg border border-slate-100">
            <button 
              type="button"
              onClick={() => setViewYear(y => y - 1)}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-slate-800 text-sm">{viewYear}</span>
            <button 
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {MONTH_SHORT.map((monthStr, index) => {
              const isSelected = selectedYear === viewYear && selectedMonth === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectMonth(index)}
                  className={`
                    py-2 text-[13px] font-semibold rounded-lg transition-colors
                    ${isSelected 
                      ? "bg-[#0057cd] text-white shadow-sm" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                  `}
                >
                  {monthStr}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSelectCurrentMonth}
              className="text-[13px] font-bold text-[#0057cd] hover:text-[#00419e] transition-colors"
            >
              Tháng này
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
