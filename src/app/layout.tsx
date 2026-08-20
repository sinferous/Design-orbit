import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
    <html lang="en" className="h-full bg-slate-50">
      <body className={`${inter.className} min-h-full flex flex-col text-slate-900 bg-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
