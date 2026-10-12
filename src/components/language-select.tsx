"use client";

import { ChevronDown, Globe } from "lucide-react";
import { locales, localeNames, parseLocale } from "@/lib/locale";
import { useLocale } from "./locale-provider";

export function LanguageSelect({ id = "interface-language" }: { id?: string }) {
  const { locale, t, setLocale } = useLocale();
  return (
    <label className="language-select" htmlFor={id}>
      <Globe size={17} aria-hidden="true" />
      <span className="sr-only">{t("Language")}</span>
      <span className="language-control">
        <select
          id={id}
          aria-label={t("Language")}
          value={locale}
          onChange={(event) => setLocale?.(parseLocale(event.target.value))}
        >
          {locales.map((item) => (
            <option key={item} value={item} lang={item} dir="auto">
              {localeNames[item]}
            </option>
          ))}
        </select>
        <span
          className="language-value"
          lang={locale}
          dir="auto"
          aria-hidden="true"
        >
          {localeNames[locale]}
        </span>
        <ChevronDown
          className="language-chevron"
          size={16}
          aria-hidden="true"
        />
      </span>
    </label>
  );
}
