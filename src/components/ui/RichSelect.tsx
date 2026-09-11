'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RichSelectOption<T extends string | number = string | number> {
  value: T;
  label: string;
  badge?: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface RichSelectProps<T extends string | number = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: RichSelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  id?: string;
  ariaLabel?: string;
}

export function RichSelect<T extends string | number = string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className,
  triggerClassName,
  menuClassName,
  disabled = false,
  searchable,
  size = 'md',
  icon,
  id,
  ariaLabel,
}: RichSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Auto-enable search if there are 7 or more options, unless explicitly disabled
  const isSearchable = searchable !== undefined ? searchable : options.length >= 7;

  // Find the selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options by search query
  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (opt.badge && opt.badge.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
        (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      )
    : options;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && isSearchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isSearchable]);

  // Reset highlight on search change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredOptions[highlightedIndex];
      if (current && !current.disabled) {
        onChange(current.value);
        setIsOpen(false);
        setSearchQuery('');
      }
    }
  };

  const handleSelectOption = (opt: RichSelectOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Size styling classes
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs rounded-lg',
    md: 'py-2 px-3 text-sm rounded-lg',
    lg: 'py-2.5 px-4 text-base rounded-xl font-bold',
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full text-left', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setSearchQuery('');
          }
        }}
        className={cn(
          'w-full flex items-center justify-between border bg-white text-slate-900 transition-all duration-150 cursor-pointer select-none',
          'border-slate-300 hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs',
          sizeClasses[size],
          isOpen && 'border-sky-500 ring-2 ring-sky-500/20',
          disabled && 'opacity-60 bg-slate-100 cursor-not-allowed border-slate-200',
          triggerClassName
        )}
      >
        <div className="flex items-center space-x-2 truncate min-w-0 pr-2">
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={cn(
              'truncate font-medium',
              size === 'lg' ? 'font-bold' : size === 'sm' ? 'text-xs' : 'text-sm',
              !selectedOption && 'text-slate-400 font-normal'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-sky-600'
          )}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150',
            menuClassName
          )}
        >
          {/* Search bar inside dropdown for quick filtering */}
          {isSearchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto py-1.5 focus:outline-none scrollbar-thin divide-y divide-slate-50"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-center text-xs text-slate-400 italic">
                No matching options found
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      'px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors select-none',
                      isSelected
                        ? 'bg-sky-50 text-sky-800 font-bold'
                        : isHighlighted
                        ? 'bg-slate-50 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50',
                      opt.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
                    )}
                  >
                    <div className="flex items-center space-x-2 truncate min-w-0 pr-2">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="block text-[10px] font-normal text-slate-400 truncate mt-0.5">
                            {opt.description}
                          </span>
                        )}
                      </div>
                      {opt.badge && (
                        <span className="shrink-0 ml-1 px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 text-slate-600 rounded">
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-sky-600 ml-2" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
