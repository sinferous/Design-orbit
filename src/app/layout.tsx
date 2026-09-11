import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { CreativeBackground } from '@/components/ui/CreativeBackground';
import { ToastProvider } from '@/components/ui/ToastContext';
import { FloatingPipTimer } from '@/components/timer/FloatingPipTimer';

const inter = Inter({ subsets: ['latin'] });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Creative Team Work Tracker | Design Orbit',
  description: 'Internal daily work entry and reporting web application for the Webtree creative team.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#f8fafc]">
      <body className={`${inter.className} ${plusJakarta.variable} min-h-full flex flex-col text-slate-900 antialiased relative selection:bg-sky-100 selection:text-sky-900`}>
        <ToastProvider>
          <CreativeBackground />
          <div className="relative z-10 flex-1 flex flex-col">
            {children}
          </div>
          <FloatingPipTimer />
        </ToastProvider>
      </body>
    </html>
  );
}
