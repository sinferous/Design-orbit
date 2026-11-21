'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface ReportTab {
  href: string;
  label: string;
}

export const REPORT_TABS: ReportTab[] = [
  { href: '/reports/weekly', label: 'Weekly review' },
  { href: '/reports/monthly', label: 'Monthly' },
  { href: '/reports/overall', label: 'All time' },
  { href: '/reports/billing', label: 'Client hours' },
];

// Persistent module cache for seamless line animation across Next.js page transitions
let globalLastLineState: { left: number; width: number; href: string } | null = null;

interface ReportsSubNavProps {
  children?: React.ReactNode;
}

export function ReportsSubNav({ children }: ReportsSubNavProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const [activeHref, setActiveHref] = useState<string>(pathname);
  const [lineStyle, setLineStyle] = useState<{ left: number; width: number; ready: boolean }>({
    left: globalLastLineState?.left || 0,
    width: globalLastLineState?.width || 0,
    ready: Boolean(globalLastLineState),
  });

  const updateLineToTab = (href: string) => {
    const tabEl = tabRefs.current[href];
    if (!tabEl) return;

    const left = tabEl.offsetLeft;
    const width = tabEl.offsetWidth;

    globalLastLineState = { left, width, href };

    setLineStyle({
      left,
      width,
      ready: true,
    });
  };

  useEffect(() => {
    setActiveHref(pathname);
    updateLineToTab(pathname);

    const timer = setTimeout(() => {
      updateLineToTab(pathname);
    }, 20);

    const container = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateLineToTab(pathname);
      });
      ro.observe(container);
    }

    const handleResize = () => updateLineToTab(pathname);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [pathname]);

  const handleTabClick = (href: string) => {
    setActiveHref(href);
    updateLineToTab(href);
  };

  return (
    <div className="bg-[#0c0c0b]/90 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 overflow-x-auto">
        <div ref={containerRef} className="flex space-x-4 sm:space-x-6 min-w-max relative py-1">
          {/* Animated Gliding Underline (a bit slow, buttery smooth transition) */}
          <div
            className="absolute left-0 bottom-0 h-0.5 rounded-full bg-emerald-400 pointer-events-none transition duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-20"
            style={{
              transform: `translate3d(${lineStyle.left}px, 0, 0)`,
              width: `${lineStyle.width}px`,
              opacity: lineStyle.ready ? 1 : 0,
            }}
          />

          {REPORT_TABS.map((tab) => {
            const isActive = tab.href === activeHref || pathname === tab.href;

            return (
              <Link
                key={tab.href}
                ref={(el) => {
                  tabRefs.current[tab.href] = el;
                }}
                href={tab.href}
                onClick={() => handleTabClick(tab.href)}
                className={cn(
                  'py-3.5 text-sm whitespace-nowrap transition-colors duration-300 cursor-pointer relative z-10',
                  isActive
                    ? 'text-slate-50'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Right side actions (e.g. Export CSV button) */}
        {children && <div className="flex items-center space-x-2 shrink-0">{children}</div>}
      </div>
    </div>
  );
}
