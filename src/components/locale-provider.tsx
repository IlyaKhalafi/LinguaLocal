"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  direction,
  LOCALE_COOKIE,
  parseLocale,
  translate,
  type Locale,
} from "@/lib/locale";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setCurrentLocale] = useState(initialLocale);
  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale: (input) => {
          const next = parseLocale(input);
          document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
          document.documentElement.lang = next;
          document.documentElement.dir = direction(next);
          setCurrentLocale(next);
          if (document.cookie.split("; ").includes(`${LOCALE_COOKIE}=${next}`))
            router.refresh();
        },
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  const locale = context?.locale ?? "en";
  const t = useMemo(
    () => (message: string, values?: Record<string, string | number>) =>
      translate(locale, message, values),
    [locale],
  );
  return { locale, dir: direction(locale), t, setLocale: context?.setLocale };
}
