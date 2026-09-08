import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

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
    <html lang="en" className="dark">
      <body className="bg-[#0d0d0d] text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-zinc-700 selection:text-white">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 glass-card border-b border-zinc-800/80 px-6 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-zinc-700 via-zinc-400 to-white flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-white/5">
                @
              </div>
              <div>
                <Link href="/dashboard" className="text-base font-semibold tracking-tight text-white hover:text-zinc-200 transition">
                  Threads Creator Agent
                </Link>
                <p className="text-[11px] text-zinc-400 font-medium">Autonomous Content & Community</p>
              </div>
            </div>

            <nav className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/products"
                className="px-3.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition"
              >
                Product Vault
              </Link>
              <Link
                href="/persona"
                className="px-3.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition"
              >
                Persona Studio
              </Link>
              <Link
                href="/activity"
                className="px-3.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition"
              >
                Activity & Simulation
              </Link>
              <Link
                href="/settings"
                className="px-3.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition"
              >
                Settings
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          {children}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-zinc-800/60 py-4 px-6 text-center text-xs text-zinc-400">
          Threads Autonomous Creator Agent • Built for Vercel Serverless
        </footer>
      </body>
    </html>
  );
}
