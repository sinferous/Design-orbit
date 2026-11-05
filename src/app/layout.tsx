import type { Metadata } from 'next';
import { Instrument_Sans, Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { CreativeBackground } from '@/components/ui/CreativeBackground';
import { ToastProvider } from '@/components/ui/ToastContext';
import { FloatingPipTimer } from '@/components/timer/FloatingPipTimer';

const uiFont = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
});
const brandFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Creative Team Work Tracker | Design Orbit',
  description: 'Internal daily work entry and reporting web application for the Webtree creative team.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${uiFont.variable} ${brandFont.variable} h-full bg-[#0c0c0b] dark`}>
      <body className={`font-sans min-h-full flex flex-col bg-[#0c0c0b] text-slate-100 antialiased relative`}>
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
