"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  preferencesSchema,
  preferenceAttributes,
  PREFERENCES_COOKIE,
  type Preferences,
} from "@/lib/preferences";
import { ClientNotice } from "./client-notice";
import { useLocale } from "./locale-provider";
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
  const [temporary, setTemporary] = useState(false);
  const { t } = useLocale();
  function change(input: Partial<Preferences>) {
    const next = preferencesSchema.parse({ ...preferences, ...input });
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
    <context.Provider value={{ preferences, change }}>
      {children}
      {temporary && (
        <ClientNotice>
          {t("Preferences will last for this visit.")}
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
