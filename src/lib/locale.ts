import english from "@/content/locales/en.json";
import persian from "@/content/locales/fa.json";
import arabic from "@/content/locales/ar.json";
import turkish from "@/content/locales/tr.json";
import pluralTranslations from "@/content/locales/plurals.json";

export const locales = ["en", "fa", "ar", "tr"] as const;
export type Locale = (typeof locales)[number];
export const localeNames: Record<Locale, string> = {
  en: "English",
  fa: "فارسی",
  ar: "العربية",
  tr: "Türkçe",
};
export const LOCALE_COOKIE = "lingualocal.locale";
export function parseLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : "en";
}
export function direction(locale: Locale): "ltr" | "rtl" {
  return locale === "fa" || locale === "ar" ? "rtl" : "ltr";
}
export const messages: Record<Locale, Record<string, string>> = {
  en: english,
  fa: persian,
  ar: arabic,
  tr: turkish,
};
const pluralMessages = pluralTranslations as Record<
  Locale,
  Record<string, Partial<Record<Intl.LDMLPluralRule, string>>>
>;
const numberFormats = Object.fromEntries(
  locales.map((locale) => [
    locale,
    new Intl.NumberFormat(locale, {
      numberingSystem:
        locale === "ar" ? "arab" : locale === "fa" ? "arabext" : "latn",
    }),
  ]),
) as Record<Locale, Intl.NumberFormat>;
const pluralRules = Object.fromEntries(
  locales.map((locale) => [locale, new Intl.PluralRules(locale)]),
) as Record<Locale, Intl.PluralRules>;
export function translate(
  locale: Locale,
  message: string,
  values: Record<string, string | number> = {},
) {
  const variant =
    typeof values.count === "number"
      ? pluralMessages[locale][message]?.[
          pluralRules[locale].select(values.count)
        ]
      : undefined;
  const template = variant ?? messages[locale][message] ?? message;
  return template.replace(/\{(\w+)\}/g, (token, key: string) => {
    const value = values[key];
    if (value === undefined) return token;
    return typeof value === "number"
      ? numberFormats[locale].format(value)
      : value;
  });
}

export function textDirection(value: string, fallback: "ltr" | "rtl" = "ltr") {
  const firstLetter = value.match(/\p{L}/u)?.[0];
  if (!firstLetter) return fallback;
  return /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(firstLetter)
    ? "rtl"
    : "ltr";
}
