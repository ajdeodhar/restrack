import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import { ToastProvider } from '@/components/Toast';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'ResTrack',
  description: 'AI-powered resume tailoring with GitHub sync and application tracking',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><rect width=%2232%22 height=%2232%22 rx=%228%22 fill=%22%234f46e5%22/><path d=%22M10 8h9l5 5v11a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22/><path d=%22M19 8v5h5%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22/></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <SessionProviderWrapper>
          <ToastProvider>
            <Navigation />
            <main className="pt-14 min-h-screen">{children}</main>
          </ToastProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
