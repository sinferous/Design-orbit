'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, PlusCircle } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Fireworks } from '@/components/ui/Fireworks';
import { BrandMark } from '@/components/ui/BrandMark';
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
      {/* Diwali fireworks in the empty side gutters (every page) */}
      <Fireworks />

      {/* Desktop Fixed Left Sidebar */}
      <div className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 lg:w-68">
        <Sidebar />
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#0c0c0b] border-b border-white/[0.07] px-4 flex items-center justify-between">
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center space-x-2 py-1">
          <BrandMark size={24} />
          <span className="font-display font-bold text-slate-50 text-base">Design Orbit</span>
        </Link>

        <div className="flex items-center space-x-2">
          {!isAdmin && (
            <Link
              href="/work/new"
              className="p-2 webtree-gradient-btn rounded-full"
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
          className="md:hidden fixed inset-0 z-50 bg-black/70 animate-in fade-in duration-200"
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
