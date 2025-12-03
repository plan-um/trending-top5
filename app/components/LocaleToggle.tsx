'use client';

import { useLocale } from '../context/LocaleContext';
import { LOCALES, Locale } from '@/lib/locale';
import { cn } from '@/lib/utils';

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  const locales: Locale[] = ['kr', 'us'];

  return (
    <div className="flex items-center border-2 border-black bg-white">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={cn(
            "px-2 py-1 text-lg font-bold transition-all",
            locale === loc
              ? "bg-black text-white"
              : "bg-white text-black hover:bg-gray-100"
          )}
          title={LOCALES[loc].name}
        >
          {LOCALES[loc].flag}
        </button>
      ))}
    </div>
  );
}
