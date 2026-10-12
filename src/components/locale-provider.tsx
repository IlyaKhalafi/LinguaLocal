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

import { offlineSnapshot, setOfflineLocale } from "@/lib/offline-client";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
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
        setLocale: async (input) => {
          const next = parseLocale(input);
          let persistent = false;
          try {
            document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
            persistent = document.cookie
              .split("; ")
              .includes(`${LOCALE_COOKIE}=${next}`);
          } catch {
            /* The current interface can still change temporarily. */
          }
          document.documentElement.lang = next;
          document.documentElement.dir = direction(next);
          setCurrentLocale(next);
          if (offlineSnapshot().enabled) {
            try {
              await setOfflineLocale(next);
              if (!navigator.onLine && persistent) window.location.reload();
            } catch {
              /* The current interface language still changes locally. */
            }
            if (!navigator.onLine) return;
          }
          if (persistent) router.refresh();
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
