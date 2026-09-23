'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SlideTabOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  badgeClassName?: string;
}

interface SlideTabsProps<T extends string = string> {
  options: SlideTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  pillClassName?: string;
  activeTextClassName?: string;
  inactiveTextClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function SlideTabs<T extends string = string>({
  options,
  value,
  onChange,
  className,
  pillClassName,
  activeTextClassName = 'text-white font-bold',
  inactiveTextClassName = 'text-slate-400 hover:text-slate-200',
  size = 'sm',
  fullWidth = true,
}: SlideTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [style, setStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const updatePill = () => {
    const activeTab = tabRefs.current[value];
    if (!activeTab) return;

    setStyle({
      left: activeTab.offsetLeft,
      width: activeTab.offsetWidth,
      ready: true,
    });
  };

  useEffect(() => {
    updatePill();
    const timer = setTimeout(updatePill, 20);

    const container = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updatePill();
      });
      ro.observe(container);
    }

    window.addEventListener('resize', updatePill);
    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updatePill);
    };
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08] select-none',
        className
      )}
    >
      {/* Smooth Gliding Highlight Pill (a bit slow, buttery smooth transition) */}
      <div
        className={cn(
          'absolute inset-y-1 left-0 rounded-lg transition-all duration-[480ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-0',
          pillClassName || 'bg-violet-600/35 border border-violet-500/40 shadow-[0_0_14px_rgba(168,85,247,0.35)]'
        )}
        style={{
          transform: `translate3d(${style.left}px, 0, 0)`,
          width: `${style.width}px`,
          opacity: style.ready ? 1 : 0,
        }}
      />

      {/* Interactive Tabs */}
      {options.map(tab => {
        const isActive = tab.id === value;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            ref={el => {
              tabRefs.current[tab.id] = el;
            }}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative z-10 flex items-center justify-center transition-colors duration-[480ms] cursor-pointer rounded-lg font-medium',
              fullWidth ? 'flex-1' : 'flex-initial',
              size === 'xs' && 'py-1 px-2.5 text-[11px]',
              size === 'sm' && 'py-1.5 px-3 text-xs',
              size === 'md' && 'py-2 px-4 text-xs sm:text-sm',
              size === 'lg' && 'h-10 px-4 text-xs sm:text-sm font-bold',
              isActive ? activeTextClassName : inactiveTextClassName
            )}
          >
            {Icon && <Icon className={cn('shrink-0 mr-1.5', size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />}
            <span className="truncate">{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span className={cn('ml-1.5', tab.badgeClassName)}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
