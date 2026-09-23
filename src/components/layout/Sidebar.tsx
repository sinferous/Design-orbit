'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  BarChart3,
  FileSpreadsheet,
  PlusCircle,
  LogOut,
  Settings,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLoggedInUser, logoutUser, isAdminUser } from '@/lib/services/work-entry';

interface SidebarProps {
  onCloseMobile?: () => void;
}

// Persistent module cache for seamless indicator animation across page transitions
let globalLastNavState: { top: number; height: number; href: string } | null = null;
let globalLastSubNavState: { top: number; height: number; href: string } | null = null;

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('Team Member');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = getLoggedInUser();
    if (user) {
      setCurrentUser(user.name);
      setUserEmail(user.email || '');
      setIsAdmin(isAdminUser(user));
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logoutUser();
    router.push('/login');
  };

  const isInsideReports = pathname.startsWith('/reports');
  const [reportsOpen, setReportsOpen] = useState(isInsideReports);

  useEffect(() => {
    if (isInsideReports) {
      setReportsOpen(true);
    }
  }, [isInsideReports]);

  const reportSubItems = [
    { label: 'Weekly Meeting', href: '/reports/weekly' },
    { label: 'Monthly Summary', href: '/reports/monthly' },
    { label: 'Overall Analytics', href: '/reports/overall' },
    { label: 'Client Hours & Billing', href: '/reports/billing' },
  ];

  const navItems = [
    {
      label: 'Dashboard',
      href: isAdmin ? '/admin' : '/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: isAdmin ? 'Team Log' : 'My Daily Log',
      href: '/work',
      icon: Calendar,
      badge: null,
    },
    {
      label: 'Clients Directory',
      href: '/clients',
      icon: Building2,
      badge: null,
    },
    {
      label: 'Reports & Analytics',
      href: '/reports/weekly',
      matchPrefix: '/reports',
      icon: BarChart3,
      badge: null,
      isCollapsible: true,
    },
    ...(!isAdmin
      ? [
          {
            label: 'Excel Sync',
            href: '/excel-sync',
            icon: FileSpreadsheet,
            badge: 'Pro',
          },
        ]
      : []),
  ];

  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeNavHref, setActiveNavHref] = useState<string>(globalLastNavState?.href || pathname);
  const [indicator, setIndicator] = useState<{ top: number; height: number; ready: boolean; animate: boolean }>({
    top: globalLastNavState?.top || 0,
    height: globalLastNavState?.height || 0,
    ready: Boolean(globalLastNavState),
    animate: Boolean(globalLastNavState),
  });

  const subnavRef = useRef<HTMLDivElement>(null);
  const subItemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSubHref, setActiveSubHref] = useState<string>(globalLastSubNavState?.href || pathname);
  const [subIndicator, setSubIndicator] = useState<{ top: number; height: number; ready: boolean; animate: boolean }>({
    top: globalLastSubNavState?.top || 0,
    height: globalLastSubNavState?.height || 0,
    ready: Boolean(globalLastSubNavState),
    animate: Boolean(globalLastSubNavState),
  });

  const handleNavClick = (item: (typeof navItems)[0], e: React.MouseEvent) => {
    if (item.isCollapsible) {
      e.preventDefault();
      setReportsOpen((prev) => !prev);
      return;
    }

    const el = itemRefs.current[item.href];
    if (el) {
      const top = el.offsetTop;
      const height = el.offsetHeight;
      globalLastNavState = { top, height, href: item.href };
      setIndicator({ top, height, ready: true, animate: true });
      setActiveNavHref(item.href);
    }

    if (onCloseMobile) onCloseMobile();
  };

  const handleSubNavClick = (sub: (typeof reportSubItems)[0]) => {
    // 1. Keep parent "Reports & Analytics" indicator firmly locked in place (no animation or flicker)
    const reportsParent = navItems.find((item) => item.matchPrefix === '/reports');
    if (reportsParent) {
      const parentEl = itemRefs.current[reportsParent.href];
      if (parentEl) {
        const pTop = parentEl.offsetTop;
        const pHeight = parentEl.offsetHeight;
        globalLastNavState = { top: pTop, height: pHeight, href: reportsParent.href };
        setIndicator({ top: pTop, height: pHeight, ready: true, animate: false });
        setActiveNavHref(reportsParent.href);
      }
    }

    // 2. Glide ONLY the inner sub-menu indicator smoothly
    const el = subItemRefs.current[sub.href];
    if (el) {
      const top = el.offsetTop;
      const height = el.offsetHeight;
      globalLastSubNavState = { top, height, href: sub.href };
      setSubIndicator({ top, height, ready: true, animate: true });
      setActiveSubHref(sub.href);
    }

    if (onCloseMobile) onCloseMobile();
  };

  useEffect(() => {
    setActiveNavHref(pathname);

    const updateNav = () => {
      const nav = navRef.current;
      if (!nav) return;

      const activeItem = navItems.find((item) =>
        item.matchPrefix
          ? pathname.startsWith(item.matchPrefix)
          : pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href))
      );

      if (!activeItem) {
        setIndicator((prev) => ({ ...prev, ready: false }));
        return;
      }

      const el = itemRefs.current[activeItem.href];
      if (!el) return;

      const top = el.offsetTop;
      const height = el.offsetHeight;
      const hadPrevious = Boolean(globalLastNavState);
      const isSameParent = globalLastNavState?.href === activeItem.href;

      globalLastNavState = { top, height, href: activeItem.href };

      // If staying within the same parent (e.g. between report subcategories), do NOT animate the parent
      setIndicator({
        top,
        height,
        ready: true,
        animate: hadPrevious && !isSameParent,
      });

      if (!hadPrevious) {
        setTimeout(() => {
          setIndicator((prev) => ({ ...prev, animate: true }));
        }, 50);
      }
    };

    updateNav();
    const timer = setTimeout(updateNav, 20);

    const nav = navRef.current;
    let ro: ResizeObserver | null = null;
    if (nav && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateNav());
      ro.observe(nav);
    }

    window.addEventListener('resize', updateNav);
    return () => {
      clearTimeout(timer);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateNav);
    };
  }, [pathname, isAdmin]);

  useEffect(() => {
    if (!reportsOpen) {
      setSubIndicator((prev) => ({ ...prev, ready: false }));
      return;
    }

    setActiveSubHref(pathname);

    const updateSub = () => {
      const subnav = subnavRef.current;
      if (!subnav) return;

      const activeSub = reportSubItems.find((sub) => pathname === sub.href);
      if (!activeSub) {
        setSubIndicator((prev) => ({ ...prev, ready: false }));
        return;
      }

      const el = subItemRefs.current[activeSub.href];
      if (!el) return;

      const top = el.offsetTop;
      const height = el.offsetHeight;
      const hadPrevious = Boolean(globalLastSubNavState);

      globalLastSubNavState = { top, height, href: activeSub.href };

      setSubIndicator({
        top,
        height,
        ready: true,
        animate: hadPrevious,
      });

      if (!hadPrevious) {
        setTimeout(() => {
          setSubIndicator((prev) => ({ ...prev, animate: true }));
        }, 50);
      }
    };

    const timer = setTimeout(updateSub, 20);
    window.addEventListener('resize', updateSub);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSub);
    };
  }, [pathname, reportsOpen]);

  return (
    <aside className="w-64 lg:w-68 h-full flex flex-col justify-between bg-[#080C17]/95 backdrop-blur-2xl border-r border-white/[0.08] select-none text-slate-200">
      {/* Top Section */}
      <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <Link
            href={isAdmin ? '/admin' : '/dashboard'}
            onClick={onCloseMobile}
            className="flex items-center group py-1"
          >
            <span className="font-bold text-slate-100 text-xl tracking-tight">Design</span>
            <span className="font-display font-black text-xl ml-1.5 tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.45)] group-hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.7)] transition-all">
              Orbit
            </span>
          </Link>
        </div>

        {/* Quick Action Button (Non-Admin only) */}
        {!isAdmin && (
          <div className="px-1">
            <Link
              href="/work/new"
              onClick={onCloseMobile}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white webtree-gradient-btn rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_28px_rgba(168,85,247,0.5)] btn-tactile"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Daily Work</span>
            </Link>
          </div>
        )}

        {/* Navigation Rail */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 mb-2">
            Navigation
          </div>

          <nav ref={navRef} className="space-y-1 relative">
            {/* Smooth Gliding Active Indicator Pill (a bit slow, buttery smooth transition) */}
            <div
              className={cn(
                'absolute top-0 left-0 right-0 pointer-events-none rounded-xl bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-transparent border border-violet-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_16px_rgba(168,85,247,0.25)] z-0',
                indicator.animate ? 'transition-all duration-[480ms] ease-[cubic-bezier(0.16,1,0.3,1)]' : 'transition-none'
              )}
              style={{
                transform: `translate3d(0, ${indicator.top}px, 0)`,
                height: `${indicator.height}px`,
                opacity: indicator.ready ? 1 : 0,
              }}
            >
              {/* Left Active Glow Pill */}
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.matchPrefix
                ? activeNavHref.startsWith(item.matchPrefix) || pathname.startsWith(item.matchPrefix)
                : activeNavHref === item.href || pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && activeNavHref.startsWith(item.href));

              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    ref={(el) => {
                      itemRefs.current[item.href] = el;
                    }}
                    href={item.href}
                    onClick={(e) => handleNavClick(item, e)}
                    className={cn(
                      'group relative z-10 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-[480ms] cursor-pointer',
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                    )}
                  >
                    <div className="flex items-center space-x-3 pl-1.5 min-w-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-[480ms] shrink-0',
                          isActive
                            ? 'bg-violet-600/30 text-violet-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                            : 'bg-white/[0.03] text-slate-400 group-hover:text-slate-200 group-hover:bg-white/[0.06]'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {item.badge && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-violet-950/80 text-violet-300 border border-violet-700/40">
                          {item.badge}
                        </span>
                      )}

                      {item.isCollapsible && (
                        <div
                          className="p-1 -mr-1 rounded-md text-slate-400 group-hover:text-slate-200 transition-colors"
                          title={reportsOpen ? 'Collapse report views' : 'Expand report views'}
                        >
                          <ChevronRight
                            className={cn(
                              'w-3.5 h-3.5 transition-transform duration-300',
                              reportsOpen ? 'rotate-90 text-violet-400' : 'text-slate-500'
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Smooth Sliding Submenu Accordion */}
                  {item.isCollapsible && (
                    <div
                      className={cn(
                        'sidebar-submenu-grid',
                        reportsOpen && 'is-open'
                      )}
                    >
                      <div className="sidebar-submenu-inner">
                        <div ref={subnavRef} className="border-l border-violet-500/20 ml-6 pl-2.5 py-0.5 space-y-0.5 relative">
                          {/* Gliding sub-pill */}
                          <div
                            className={cn(
                              'absolute top-0 left-0 right-0 pointer-events-none rounded-lg bg-violet-950/60 border border-violet-700/40 shadow-xs z-0',
                              subIndicator.animate ? 'transition-all duration-[480ms] ease-[cubic-bezier(0.16,1,0.3,1)]' : 'transition-none'
                            )}
                            style={{
                              transform: `translate3d(0, ${subIndicator.top}px, 0)`,
                              height: `${subIndicator.height}px`,
                              opacity: subIndicator.ready ? 1 : 0,
                            }}
                          >
                            <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.9)]" />
                          </div>

                          {reportSubItems.map((sub) => {
                            const isSubActive = activeSubHref === sub.href || pathname === sub.href;
                            return (
                              <Link
                                key={sub.href}
                                ref={(el) => {
                                  subItemRefs.current[sub.href] = el;
                                }}
                                href={sub.href}
                                onClick={() => handleSubNavClick(sub)}
                                className={cn(
                                  'sidebar-sub-link group/sub relative z-10 flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-[480ms]',
                                  isSubActive
                                    ? 'text-violet-300 font-semibold'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                )}
                              >
                                <span className="truncate">{sub.label}</span>
                                <ChevronRight
                                  className={cn(
                                    'w-3 h-3 transition-transform group-hover/sub:translate-x-0.5',
                                    isSubActive ? 'text-violet-400' : 'text-slate-600'
                                  )}
                                />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom User Profile Dock */}
      <div className="p-3 border-t border-white/[0.08] bg-[#060A14]/80">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-violet-500/30 transition-all group">
          <Link
            href="/settings"
            onClick={onCloseMobile}
            className="flex items-center space-x-2.5 min-w-0 flex-1"
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-800/40 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-200">
                {currentUser.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#080C17]" />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="text-xs font-bold text-slate-200 truncate group-hover:text-violet-400 transition-colors">
                {currentUser}
              </div>
              <div className="text-[10px] text-slate-500 truncate flex items-center">
                {isAdmin ? (
                  <span className="text-amber-400 font-semibold flex items-center">
                    <ShieldAlert className="w-2.5 h-2.5 mr-0.5" /> Admin
                  </span>
                ) : (
                  <span>Settings & Profile</span>
                )}
              </div>
            </div>
          </Link>

          <div className="flex items-center space-x-1 pl-1">
            <Link
              href="/settings"
              onClick={onCloseMobile}
              title="Settings"
              className="p-1.5 text-slate-400 hover:text-violet-300 hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
