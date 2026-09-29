'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { Search, X, Sparkles, Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClientDescriptionItem } from '@/lib/services/work-entry';

export interface DescriptionSuggestionItem {
  description: string;
  work_type_id?: string;
  count: number;
  timeSeconds?: number;
}

export interface DescriptionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (value: string, item?: DescriptionSuggestionItem) => void;
  suggestions: (string | ClientDescriptionItem | DescriptionSuggestionItem)[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  showRecentOnFocus?: boolean;
  maxSuggestions?: number;
  emptyMessage?: string;
  showSearchIcon?: boolean;
  allowClear?: boolean;
  autoHighlightFirst?: boolean;
  id?: string;
}

function formatTimeShort(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function DescriptionAutocomplete({
  value,
  onChange,
  onSelectSuggestion,
  suggestions,
  placeholder = 'Enter description...',
  required = false,
  disabled = false,
  className,
  inputClassName,
  size = 'md',
  showRecentOnFocus = true,
  maxSuggestions = 8,
  emptyMessage,
  showSearchIcon = false,
  allowClear = true,
  autoHighlightFirst = true,
  id,
}: DescriptionAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const inputId = id || generatedId;

  // Normalize suggestions into standard objects
  const normalizedSuggestions = useMemo(() => {
    return suggestions.map(item => {
      if (typeof item === 'string') {
        return { description: item, count: 1 } as DescriptionSuggestionItem;
      }
      return item as DescriptionSuggestionItem;
    });
  }, [suggestions]);

  // Filter suggestions based on current query
  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      if (!showRecentOnFocus) return [];
      // Show top recent/frequent suggestions
      return normalizedSuggestions.slice(0, maxSuggestions);
    }

    // Split into starts-with matches and contains matches
    const startsWith: DescriptionSuggestionItem[] = [];
    const contains: DescriptionSuggestionItem[] = [];

    normalizedSuggestions.forEach(item => {
      const descLower = item.description.toLowerCase();
      if (descLower === query) {
        // Exact match comes first
        startsWith.unshift(item);
      } else if (descLower.startsWith(query)) {
        startsWith.push(item);
      } else if (descLower.includes(query)) {
        contains.push(item);
      }
    });

    return [...startsWith, ...contains].slice(0, maxSuggestions);
  }, [value, normalizedSuggestions, showRecentOnFocus, maxSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  // Reset highlight index when filtered list changes
  useEffect(() => {
    if (autoHighlightFirst && filteredSuggestions.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [filteredSuggestions, autoHighlightFirst]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (item: DescriptionSuggestionItem) => {
    onChange(item.description);
    if (onSelectSuggestion) {
      onSelectSuggestion(item.description, item);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        handleSelect(filteredSuggestions[highlightedIndex]);
      } else {
        setIsOpen(false);
      }
    }
  };

  // Helper to highlight matching text
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) {
      return <span>{text}</span>;
    }

    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="text-violet-300 font-bold bg-violet-950/70 px-0.5 rounded">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        {showSearchIcon && (
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (filteredSuggestions.length > 0 || (showRecentOnFocus && normalizedSuggestions.length > 0)) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'w-full bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500',
            'focus:ring-2 focus:ring-violet-500 focus:border-violet-400 focus:outline-none transition-colors',
            sizeClasses[size],
            showSearchIcon && 'pl-9',
            allowClear && value && 'pr-8',
            inputClassName
          )}
        />

        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
              setIsOpen(true);
            }}
            className="absolute right-2.5 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Clear text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900/98 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {filteredSuggestions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              {emptyMessage || (
                <span>
                  No saved matches for &ldquo;<span className="text-slate-200">{value}</span>&rdquo;.
                  <br />
                  <span className="text-[11px] text-slate-500">Press enter or keep typing to use this new description.</span>
                </span>
              )}
            </div>
          ) : (
            <ul
              ref={listRef}
              className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-slate-800/60 p-1"
            >
              {filteredSuggestions.map((item, index) => {
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={`${item.description}_${index}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors',
                      isHighlighted
                        ? 'bg-violet-950/80 text-violet-200 border border-violet-800/60 shadow-2xs'
                        : 'text-slate-200 hover:bg-slate-800/70'
                    )}
                  >
                    <div className="flex items-center space-x-2 min-w-0 pr-2">
                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      <div className="truncate">
                        {renderHighlightedText(item.description, value)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      {item.timeSeconds !== undefined && item.timeSeconds > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 shadow-2xs">
                          ⏱ {formatTimeShort(item.timeSeconds)}
                        </span>
                      )}
                      {item.count !== undefined && item.count > 1 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          {item.count}x
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
