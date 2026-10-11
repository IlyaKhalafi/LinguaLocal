"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { Compass } from "lucide-react";
export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="not-found">
      <Compass size={58} />
      <h1>{t("Page not found")}</h1>
      <p className="muted">{t("This page is unavailable.")}</p>
      <Link href="/" className="button primary">
        {t("Home")}
      </Link>
    </div>
  );
}
