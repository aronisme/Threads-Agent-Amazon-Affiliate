import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Threads Autonomous Creator Agent',
  description: 'AI-powered autonomous content and community agent for Threads with product knowledge vault.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-[#0d0d0d] text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-zinc-700 selection:text-white">
        <LanguageProvider>
          {/* Top Navigation */}
          <Header />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
            {children}
          </main>

          {/* Minimal Footer */}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
