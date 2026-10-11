"use client";

import { useLocale } from "./locale-provider";

export function LocalizedText({ text }: { text: string }) {
  const { t } = useLocale();
  return t(text);
}
