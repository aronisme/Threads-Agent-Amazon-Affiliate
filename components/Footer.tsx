'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function Footer() {
  const { strings } = useLanguage();

  return (
    <footer className="border-t border-zinc-800/60 py-4 px-6 text-center text-xs text-zinc-500">
      {strings.footerText}
    </footer>
  );
}
