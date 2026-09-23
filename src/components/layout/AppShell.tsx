'use client';

import { Navbar } from '@/components/layout/Navbar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 flex flex-col relative selection:bg-violet-900 selection:text-violet-200">
      <Navbar>{children}</Navbar>
    </div>
  );
}

export default AppShell;
