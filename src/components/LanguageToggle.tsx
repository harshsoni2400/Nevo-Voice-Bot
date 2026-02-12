'use client';

import type { Language } from '@/lib/types';

interface LanguageToggleProps {
  language: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-nyvo-navy rounded-full p-1 border border-white/5">
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          language === 'en'
            ? 'bg-nyvo-blue text-white shadow-sm'
            : 'text-nyvo-muted hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => onChange('hi')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          language === 'hi'
            ? 'bg-nyvo-blue text-white shadow-sm'
            : 'text-nyvo-muted hover:text-white'
        }`}
      >
        हिं
      </button>
    </div>
  );
}
