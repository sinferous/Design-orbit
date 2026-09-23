'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, PlusCircle, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { getLoggedInUser, isAdminUser } from '@/lib/services/work-entry';

interface NavbarProps {
  children?: React.ReactNode;
  userName?: string;
}

export function Navbar({ children }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = typeof window !== 'undefined' ? getLoggedInUser() : null;
  const isAdmin = user ? isAdminUser(user) : false;

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <div className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 lg:w-68">
        <Sidebar />
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#080C17]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 flex items-center justify-between">
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center py-1">
          <span className="font-bold text-slate-100 text-base tracking-tight">Design</span>
          <span className="font-display font-black text-base ml-1.5 tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            Orbit
          </span>
        </Link>

        <div className="flex items-center space-x-2">
          {!isAdmin && (
            <Link
              href="/work/new"
              className="p-1.5 text-white webtree-gradient-btn rounded-lg shadow-sm"
              title="Add Daily Work"
            >
              <PlusCircle className="w-4 h-4" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-slate-100" /> : <Menu className="w-5 h-5 text-slate-100" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {children && (
        <div className="md:pl-64 lg:pl-68 flex-1 min-w-0 min-h-screen flex flex-col pt-14 md:pt-0">
          {children}
        </div>
      )}
    </>
  );
}

export default Navbar;
