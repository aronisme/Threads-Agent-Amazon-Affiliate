'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function Footer() {
  const pathname = usePathname();
  const { strings } = useLanguage();

  if (pathname === '/login') return null;

  return (
    <footer className="border-t border-zinc-800/60 py-4 px-6 text-center text-xs text-zinc-500">
      {strings.footerText}
    </footer>
  );
}
