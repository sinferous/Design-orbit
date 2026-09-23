'use client';

import { useState, useEffect } from 'react';
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

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.matchPrefix
                ? pathname.startsWith(item.matchPrefix)
                : pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      if (item.isCollapsible) {
                        if (isInsideReports) {
                          e.preventDefault();
                          setReportsOpen((prev) => !prev);
                        } else {
                          setReportsOpen(true);
                          if (onCloseMobile) onCloseMobile();
                        }
                      } else {
                        if (onCloseMobile) onCloseMobile();
                      }
                    }}
                    className={cn(
                      'group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-transparent text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-violet-500/25'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
                    )}
                  >
                    {/* Left Active Glow Pill */}
                    {isActive && (
                      <span className="absolute left-1.5 w-1 h-5 rounded-full bg-gradient-to-b from-violet-400 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                    )}

                    <div className="flex items-center space-x-3 pl-1.5 min-w-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0',
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setReportsOpen((prev) => !prev);
                          }}
                          className="p-1 -mr-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                          title={reportsOpen ? 'Collapse report views' : 'Expand report views'}
                        >
                          <ChevronRight
                            className={cn(
                              'w-3.5 h-3.5 transition-transform duration-300',
                              reportsOpen ? 'rotate-90 text-violet-400' : 'text-slate-500'
                            )}
                          />
                        </button>
                      )}
                    </div>
                  </Link>

                  {/* Smooth Sliding Submenu Accordion */}
                  {item.isCollapsible && (
                    <div
                      className={cn(
                        'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
                        reportsOpen ? 'grid-rows-[1fr] opacity-100 my-1' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="border-l border-violet-500/20 ml-6 pl-2.5 py-0.5 space-y-0.5">
                          {reportSubItems.map((sub) => {
                            const isSubActive = pathname === sub.href;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={onCloseMobile}
                                className={cn(
                                  'group/sub relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                                  isSubActive
                                    ? 'text-violet-300 bg-violet-950/60 font-semibold shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                )}
                              >
                                {isSubActive && (
                                  <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.9)]" />
                                )}
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
