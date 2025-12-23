
import React, { useState, useEffect, useRef } from 'react';
import { searchAddress } from '../services/locationService';

/**
 * Robust helper to prevent [object Object] rendering.
 */
const safeStr = (val: any, fallback: string = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return isNaN(val) ? fallback : String(val);
    if (typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
        try {
            if (val.message && typeof val.message === 'string') return val.message;
            if (val.name && typeof val.name === 'string') return val.name;
            return fallback;
        } catch(e) { return fallback; }
    }
    return fallback;
};

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (lat: number, lng: number, address: string) => void;
  placeholder?: string;
  className?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Search location...",
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.length >= 3 && showSuggestions) {
        const results = await searchAddress(value);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 500); // 500ms delay to be gentle on free API

    return () => clearTimeout(timer);
  }, [value, showSuggestions]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: any) => {
    const addr = safeStr(item.display_name);
    onChange(addr); // Update input text
    onSelect(item.lat, item.lng, addr); // Pass data back
    setShowSuggestions(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <textarea
        value={safeStr(value)}
        onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
        placeholder={placeholder}
        className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-sm font-bold text-slate-700 placeholder-slate-300 focus:ring-2 focus:ring-brand-DEFAULT focus:bg-white resize-none shadow-inner transition-all"
        rows={3}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <div 
              key={idx}
              onClick={() => handleSelect(item)}
              className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none flex items-center gap-2"
            >
              <span className="text-lg">📍</span>
              <p className="text-xs font-medium text-slate-600 line-clamp-2">{safeStr(item.display_name)}</p>
            </div>
          ))}
          <div className="p-2 text-center bg-slate-50 text-[10px] text-slate-400 font-bold uppercase">
             Powered by OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
};
