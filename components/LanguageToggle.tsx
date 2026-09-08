'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl shadow-inner">
      <div className="pl-1.5 pr-0.5 text-zinc-500 flex items-center">
        <Globe className="w-3.5 h-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage('id')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
          language === 'id'
            ? 'bg-gradient-to-r from-red-600/30 to-zinc-800 text-white border border-red-500/40 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
        }`}
        title="Beralih ke Bahasa Indonesia"
      >
        <span className="text-[13px] leading-none">🇮🇩</span>
        <span>ID</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
          language === 'en'
            ? 'bg-gradient-to-r from-blue-600/30 to-zinc-800 text-white border border-blue-500/40 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
        }`}
        title="Switch to English"
      >
        <span className="text-[13px] leading-none">🇺🇸</span>
        <span>EN</span>
      </button>
    </div>
  );
}
