import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Select({ options, value, onChange, placeholder = "Chọn một mục", className = "" }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-3.5 py-2 min-w-[200px]
          bg-white border text-sm font-semibold text-slate-700
          rounded-xl shadow-sm transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]
          ${isOpen ? "border-[#0057cd] ring-2 ring-[#0057cd]/20" : "border-slate-200 hover:border-slate-300"}
        `}
      >
        <span className="truncate pr-4">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown 
          size={16} 
          className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-lg py-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          {options.length === 0 ? (
            <div className="px-3.5 py-2.5 text-sm text-slate-500 italic text-center">Không có dữ liệu</div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2 text-sm font-medium transition-colors
                    ${isSelected 
                      ? "bg-[#f2f3ff] text-[#0057cd]" 
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check size={16} className="text-[#0057cd] flex-shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
