import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDarkMode?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Caută...',
  isDarkMode = true,
  className = '',
  autoFocus = false,
}) => {
  return (
    <div className={`relative w-full sm:w-72 md:w-80 ${className}`}>
      <Search
        className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
          isDarkMode ? 'text-zinc-500' : 'text-zinc-400'
        }`}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-hidden transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
          isDarkMode
            ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-700'
            : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 shadow-xs'
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md cursor-pointer ${
            isDarkMode
              ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
