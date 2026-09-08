'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageToggle from './LanguageToggle';

export default function Header() {
  const pathname = usePathname();
  const { strings } = useLanguage();

  const navItems = [
    { href: '/dashboard', label: strings.navDashboard },
    { href: '/products', label: strings.navProducts },
    { href: '/persona', label: strings.navPersona },
    { href: '/activity', label: strings.navActivity },
    { href: '/settings', label: strings.navSettings },
  ];

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-zinc-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-zinc-700 via-zinc-400 to-white flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-white/5 select-none">
            @
          </div>
          <div>
            <Link
              href="/dashboard"
              className="text-base font-semibold tracking-tight text-white hover:text-zinc-200 transition"
            >
              {strings.brandName}
            </Link>
            <p className="text-[11px] text-zinc-400 font-medium">
              {strings.brandTagline}
            </p>
          </div>
        </div>

        {/* Navigation Links & Language Switcher */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Language Switcher */}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
