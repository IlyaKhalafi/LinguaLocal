"use client";
import {
  createContext,
  useContext,
  useState,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  preferencesSchema,
  preferenceAttributes,
  PREFERENCES_COOKIE,
  parsePreferences,
  type Preferences,
} from "@/lib/preferences";
import { ClientNotice } from "./client-notice";
import { useLocale } from "./locale-provider";
const subscribeCapabilities = () => () => {};
const supportsAppearance = () =>
  CSS.supports("color", "light-dark(white, black)");
const context = createContext<{
  preferences: Preferences;
  change: (input: Partial<Preferences>) => void;
} | null>(null);

export function PreferencesProvider({
  initialPreferences,
  children,
}: {
  initialPreferences: Preferences;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const current = useRef(initialPreferences);
  const themeSupported = useSyncExternalStore(
    subscribeCapabilities,
    supportsAppearance,
    () => true,
  );
  const [temporary, setTemporary] = useState(false);
  const [appearanceUnavailable, setAppearanceUnavailable] = useState(false);
  const { t } = useLocale();
  function change(input: Partial<Preferences>) {
    if (
      input.appearance &&
      input.appearance !== "light" &&
      !CSS.supports("color", "light-dark(white, black)")
    ) {
      setAppearanceUnavailable(true);
      return;
    }
    setAppearanceUnavailable(false);
    let base = current.current;
    try {
      const cookie = document.cookie
        .split("; ")
        .find((value) => value.startsWith(`${PREFERENCES_COOKIE}=`));
      if (cookie)
        base = parsePreferences(cookie.slice(PREFERENCES_COOKIE.length + 1));
    } catch {
      // Blocked cookies still allow temporary preferences in this tab.
    }
    const next = preferencesSchema.parse({ ...base, ...input });
    current.current = next;
    setPreferences(next);
    for (const [key, value] of Object.entries(preferenceAttributes(next)))
      document.documentElement.setAttribute(key, value);
    try {
      const value = encodeURIComponent(JSON.stringify(next));
      document.cookie = `${PREFERENCES_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
      setTemporary(
        !document.cookie.split("; ").includes(`${PREFERENCES_COOKIE}=${value}`),
      );
    } catch {
      setTemporary(true);
    }
  }
  return (
    <context.Provider
      value={{
        preferences: themeSupported
          ? preferences
          : { ...preferences, appearance: "light" },
        change,
      }}
    >
      {children}
      {appearanceUnavailable && (
        <ClientNotice>
          {t("Dark appearance is unavailable in this browser.")}
        </ClientNotice>
      )}
      {temporary && (
        <ClientNotice>
          {t("Preferences will reset when this page is reloaded.")}
        </ClientNotice>
      )}
    </context.Provider>
  );
}
export function usePreferences() {
  const value = useContext(context);
  if (!value) throw new Error("PreferencesProvider is required");
  return value;
}
